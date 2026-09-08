import {
  canonicalizeRegimen,
  assessScheduleQuality,
  buildWeeklyReview,
  compareScheduleSimplification,
  generateAdaptiveSchedule,
  generateSchedule,
  loadKnowledgeSnapshot,
  type AdaptiveScheduleResult,
  type CanonicalRegimen,
  type DayContext,
  type DayEvent,
  type DailyExecutionLog,
  type GeneratedScheduleView,
  type KnowledgeSnapshot,
  type ScheduleQualitySummary,
  type ScheduleSimplificationComparison,
  type ScheduleResult,
  type UserOverride,
  type WeeklyReviewSummary,
} from "@nutriclock/domain";
import { createEmptyState, type RegimenRepository } from "@nutriclock/persistence";
import type { PersistedNutriClockState } from "@nutriclock/domain";

export interface NutriClockAppState {
  regimen: CanonicalRegimen | null;
  schedule: GeneratedScheduleView | null;
  today: AdaptiveScheduleResult | null;
  dailyLogs: DailyExecutionLog[];
  rulesetVersionLastEvaluated: string | null;
  evidenceRegistryVersionLastEvaluated: string | null;
  loading: boolean;
  error: string | null;
  knowledgeUpdateAvailable: boolean;
}

export interface NutriClockApplication {
  readonly state: NutriClockAppState;
  load(): Promise<NutriClockAppState>;
  replaceRegimen(regimen: CanonicalRegimen): Promise<NutriClockAppState>;
  setOverride(override: UserOverride): Promise<NutriClockAppState>;
  generate(): Promise<GeneratedScheduleView | null>;
  loadToday(localDate: string, now: DayContext["now"]): AdaptiveScheduleResult | null;
  recordDayEvent(
    localDate: string,
    now: DayContext["now"],
    event: DayEvent,
  ): Promise<AdaptiveScheduleResult | null>;
  getScheduleQuality(): ScheduleQualitySummary | null;
  getScheduleSimplification(): ScheduleSimplificationComparison | null;
  getWeeklyReview(weekStart: string): WeeklyReviewSummary | null;
  clear(): Promise<void>;
}

export function createNutriClockApplication(
  repository: RegimenRepository,
  knowledge: KnowledgeSnapshot = loadKnowledgeSnapshot(),
): NutriClockApplication {
  let current: NutriClockAppState = {
    regimen: null,
    schedule: null,
    today: null,
    dailyLogs: [],
    rulesetVersionLastEvaluated: null,
    evidenceRegistryVersionLastEvaluated: null,
    loading: false,
    error: null,
    knowledgeUpdateAvailable: false,
  };

  const save = async (regimen: CanonicalRegimen, previous?: PersistedNutriClockState) => {
    const state: PersistedNutriClockState = {
      ...(previous ?? createEmptyState(regimen)),
      schemaVersion: 1,
      rulesetVersionLastEvaluated:
        previous?.rulesetVersionLastEvaluated ?? current.rulesetVersionLastEvaluated,
      evidenceRegistryVersionLastEvaluated:
        previous?.evidenceRegistryVersionLastEvaluated ??
        current.evidenceRegistryVersionLastEvaluated,
      regimen: canonicalizeRegimen(regimen),
      dailyLogs: previous?.dailyLogs ?? current.dailyLogs,
    };
    await repository.save(state);
    return state;
  };

  const generate = async (): Promise<GeneratedScheduleView | null> => {
    if (!current.regimen) return null;
    const schedule: ScheduleResult = generateSchedule(current.regimen, knowledge);
    const view: GeneratedScheduleView = { schedule, generatedAt: new Date().toISOString() };
    try {
      await repository.save({
        ...createEmptyState(current.regimen),
        rulesetVersionLastEvaluated: knowledge.rulesetVersion,
        evidenceRegistryVersionLastEvaluated: knowledge.evidenceRegistryVersion,
        dailyLogs: current.dailyLogs,
      });
    } catch (error) {
      current = {
        ...current,
        schedule: view,
        error:
          error instanceof Error
            ? error.message
            : "Unable to persist NutriClock version metadata locally.",
      };
      return view;
    }
    current = {
      ...current,
      schedule: view,
      rulesetVersionLastEvaluated: knowledge.rulesetVersion,
      evidenceRegistryVersionLastEvaluated: knowledge.evidenceRegistryVersion,
      knowledgeUpdateAvailable: false,
      error: null,
    };
    return view;
  };

  return {
    get state() {
      return current;
    },
    async load() {
      current = { ...current, loading: true, error: null };
      try {
        const persisted = await repository.load();
        if (!persisted) {
          current = {
            ...current,
            loading: false,
            regimen: null,
            schedule: null,
            today: null,
            dailyLogs: [],
            rulesetVersionLastEvaluated: null,
            evidenceRegistryVersionLastEvaluated: null,
          };
          return current;
        }
        const canonical = canonicalizeRegimen(persisted.regimen);
        const knowledgeUpdateAvailable =
          persisted.rulesetVersionLastEvaluated !== knowledge.rulesetVersion ||
          persisted.evidenceRegistryVersionLastEvaluated !== knowledge.evidenceRegistryVersion;
        current = {
          ...current,
          loading: false,
          regimen: canonical,
          schedule: null,
          today: null,
          dailyLogs: persisted.dailyLogs ?? [],
          rulesetVersionLastEvaluated: persisted.rulesetVersionLastEvaluated,
          evidenceRegistryVersionLastEvaluated: persisted.evidenceRegistryVersionLastEvaluated,
          knowledgeUpdateAvailable,
        };
        return current;
      } catch (error) {
        current = {
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Unable to load local NutriClock data.",
        };
        return current;
      }
    },
    async replaceRegimen(regimen) {
      try {
        await save(regimen);
        current = {
          ...current,
          regimen: canonicalizeRegimen(regimen),
          schedule: null,
          today: null,
          error: null,
        };
        return current;
      } catch (error) {
        current = {
          ...current,
          error: error instanceof Error ? error.message : "Unable to save local NutriClock data.",
        };
        return current;
      }
    },
    async setOverride(override) {
      if (!current.regimen) return current;
      const next = {
        ...current.regimen,
        overrides: [
          ...current.regimen.overrides.filter((entry) => entry.itemId !== override.itemId),
          override,
        ],
      };
      return this.replaceRegimen(next);
    },
    loadToday(localDate, now) {
      if (!current.regimen) return null;
      const log = current.dailyLogs.find((entry) => entry.localDate === localDate);
      const context: DayContext = { localDate, now, events: log?.events ?? [] };
      const today = generateAdaptiveSchedule(current.regimen, context, knowledge);
      current = { ...current, today };
      return today;
    },
    async recordDayEvent(localDate, now, event) {
      if (!current.regimen) return null;
      try {
        const existing = current.dailyLogs.find((entry) => entry.localDate === localDate);
        const nextLog: DailyExecutionLog = {
          localDate,
          events: [...(existing?.events ?? []), event],
        };
        const dailyLogs = [
          ...current.dailyLogs.filter((entry) => entry.localDate !== localDate),
          nextLog,
        ].sort((a, b) => a.localDate.localeCompare(b.localDate));
        await save(current.regimen, {
          ...createEmptyState(current.regimen),
          dailyLogs,
          rulesetVersionLastEvaluated: current.rulesetVersionLastEvaluated,
          evidenceRegistryVersionLastEvaluated: current.evidenceRegistryVersionLastEvaluated,
        });
        current = { ...current, dailyLogs, error: null };
        return this.loadToday(localDate, now);
      } catch (error) {
        current = {
          ...current,
          error: error instanceof Error ? error.message : "Unable to save today's local activity.",
        };
        return null;
      }
    },
    getScheduleQuality() {
      if (!current.regimen) return null;
      return assessScheduleQuality(generateSchedule(current.regimen, knowledge));
    },
    getScheduleSimplification() {
      if (!current.regimen) return null;
      return compareScheduleSimplification(current.regimen, knowledge);
    },
    getWeeklyReview(weekStart) {
      if (!current.regimen) return null;
      return buildWeeklyReview(current.regimen, current.dailyLogs, weekStart);
    },
    generate,
    async clear() {
      try {
        await repository.clear();
        current = {
          regimen: null,
          schedule: null,
          today: null,
          dailyLogs: [],
          rulesetVersionLastEvaluated: null,
          evidenceRegistryVersionLastEvaluated: null,
          loading: false,
          error: null,
          knowledgeUpdateAvailable: false,
        };
      } catch (error) {
        current = {
          ...current,
          error: error instanceof Error ? error.message : "Unable to delete local NutriClock data.",
        };
      }
    },
  };
}
