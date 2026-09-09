import {
  canonicalizeRegimen,
  assessScheduleQuality,
  applyConvenienceProfile,
  buildConvenienceProfile,
  buildConvenienceInsights,
  buildReminderDecisions,
  buildWeeklyReview,
  compareScheduleSimplification,
  generateAdaptiveSchedule,
  generateSchedule,
  loadKnowledgeSnapshot,
  queryWhatCanITakeNow,
  type AdaptiveScheduleResult,
  type CanonicalRegimen,
  type ConvenienceInsight,
  type DayContext,
  type DayEvent,
  type DailyExecutionLog,
  type GeneratedScheduleView,
  type KnowledgeSnapshot,
  type ScheduleQualitySummary,
  type ScheduleSimplificationComparison,
  type ScheduleResult,
  type ReminderDecision,
  type RoutineTemplate,
  type UserOverride,
  type WeeklyReviewSummary,
  type WhatCanITakeNowResult,
} from "@nutriclock/domain";
import { createEmptyState, type RegimenRepository } from "@nutriclock/persistence";
import type { PersistedNutriClockState } from "@nutriclock/domain";

export interface NutriClockAppState {
  regimen: CanonicalRegimen | null;
  schedule: GeneratedScheduleView | null;
  today: AdaptiveScheduleResult | null;
  dailyLogs: DailyExecutionLog[];
  routineTemplates: RoutineTemplate[];
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
  getReminderDecisions(): ReminderDecision[];
  getWhatCanITakeNow(): WhatCanITakeNowResult | null;
  getConvenienceInsights(): ConvenienceInsight[];
  getWeeklyReview(weekStart: string): WeeklyReviewSummary | null;
  saveRoutineTemplate(template: RoutineTemplate): Promise<NutriClockAppState>;
  applyRoutineTemplate(templateId: string): Promise<NutriClockAppState>;
  applyScheduleSimplification(): Promise<NutriClockAppState>;
  setReminderPreferences(enabled: boolean, leadMinutes: 0 | 15 | 30): Promise<NutriClockAppState>;
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
    routineTemplates: [],
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
      routineTemplates: previous?.routineTemplates ?? current.routineTemplates,
    };
    await repository.save(state);
    return state;
  };

  const regimenForScheduling = (): CanonicalRegimen | null =>
    current.regimen
      ? applyConvenienceProfile(current.regimen, buildConvenienceProfile(current.dailyLogs))
      : null;

  const generate = async (): Promise<GeneratedScheduleView | null> => {
    const schedulingRegimen = regimenForScheduling();
    if (!schedulingRegimen) return null;
    const schedule: ScheduleResult = generateSchedule(schedulingRegimen, knowledge);
    const view: GeneratedScheduleView = { schedule, generatedAt: new Date().toISOString() };
    try {
      await repository.save({
        ...createEmptyState(schedulingRegimen),
        rulesetVersionLastEvaluated: knowledge.rulesetVersion,
        evidenceRegistryVersionLastEvaluated: knowledge.evidenceRegistryVersion,
        dailyLogs: current.dailyLogs,
        routineTemplates: current.routineTemplates,
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
            routineTemplates: [],
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
          routineTemplates: persisted.routineTemplates ?? [],
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
      const schedulingRegimen = regimenForScheduling();
      const today = schedulingRegimen
        ? generateAdaptiveSchedule(schedulingRegimen, context, knowledge)
        : null;
      if (!today) return null;
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
          routineTemplates: current.routineTemplates,
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
      const schedulingRegimen = regimenForScheduling();
      if (!schedulingRegimen) return null;
      return assessScheduleQuality(generateSchedule(schedulingRegimen, knowledge));
    },
    getScheduleSimplification() {
      const schedulingRegimen = regimenForScheduling();
      if (!schedulingRegimen) return null;
      return compareScheduleSimplification(schedulingRegimen, knowledge);
    },
    getReminderDecisions() {
      if (!current.regimen || !current.today) return [];
      return buildReminderDecisions(current.today, current.regimen.preferences);
    },
    getWhatCanITakeNow() {
      return current.today ? queryWhatCanITakeNow(current.today) : null;
    },
    getConvenienceInsights() {
      if (!current.regimen) return [];
      return buildConvenienceInsights(current.regimen, current.dailyLogs);
    },
    getWeeklyReview(weekStart) {
      if (!current.regimen) return null;
      return buildWeeklyReview(current.regimen, current.dailyLogs, weekStart);
    },
    async saveRoutineTemplate(template) {
      if (!current.regimen) return current;
      try {
        const routineTemplates = [
          ...current.routineTemplates.filter((entry) => entry.id !== template.id),
          template,
        ].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
        await save(current.regimen, {
          ...createEmptyState(current.regimen),
          routineTemplates,
          dailyLogs: current.dailyLogs,
          rulesetVersionLastEvaluated: current.rulesetVersionLastEvaluated,
          evidenceRegistryVersionLastEvaluated: current.evidenceRegistryVersionLastEvaluated,
        });
        current = { ...current, routineTemplates, error: null };
        return current;
      } catch (error) {
        current = {
          ...current,
          error: error instanceof Error ? error.message : "Unable to save the routine template.",
        };
        return current;
      }
    },
    async applyRoutineTemplate(templateId) {
      const template = current.routineTemplates.find((entry) => entry.id === templateId);
      if (!current.regimen || !template) return current;
      return this.replaceRegimen({ ...current.regimen, routine: template.routine });
    },
    async applyScheduleSimplification() {
      if (!current.regimen) return current;
      const schedulingRegimen = regimenForScheduling();
      if (!schedulingRegimen) return current;
      const comparison = compareScheduleSimplification(schedulingRegimen, knowledge);
      if (!comparison.canSimplify) return current;
      const simplerTimes = new Map(
        comparison.simpler.items
          .filter((item) => item.kind === "supplement" && item.time)
          .map((item) => [item.sourceId, item]),
      );
      const overrides = [
        ...current.regimen.overrides.filter((override) => !simplerTimes.has(override.itemId)),
        ...[...simplerTimes.entries()].map(([itemId, item]) => ({
          id: `simplification:${itemId}`,
          itemId,
          selectedTime: item.time!,
          kind: "preference_override" as const,
          acknowledgedRuleIds: item.influencingRuleIds,
          createdFromRulesetVersion: knowledge.rulesetVersion,
        })),
      ];
      return this.replaceRegimen({ ...current.regimen, overrides });
    },
    async setReminderPreferences(enabled, leadMinutes) {
      if (!current.regimen) return current;
      return this.replaceRegimen({
        ...current.regimen,
        preferences: {
          ...current.regimen.preferences,
          remindersEnabled: enabled,
          reminderLeadMinutes: leadMinutes,
        },
      });
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
          routineTemplates: [],
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
