import { describe, expect, it } from "vitest";
import { createNutriClockApplication } from "../src";
import {
  loadKnowledgeSnapshot,
  type CanonicalRegimen,
  type SupplementEntry,
} from "@nutriclock/domain";
import { decodeState, type RegimenRepository } from "@nutriclock/persistence";

const emptyRegimen: CanonicalRegimen = {
  routine: {
    wakeTime: { minuteOfDay: 420 },
    bedtime: { minuteOfDay: 1380 },
    meals: [],
    beverages: [],
  },
  supplements: [],
  medications: [],
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
};

function memoryRepository(
  initial: string | null = null,
): RegimenRepository & { value: string | null } {
  return {
    value: initial,
    async load() {
      return this.value ? decodeState(JSON.parse(this.value) as unknown) : null;
    },
    async save(state) {
      this.value = JSON.stringify(state);
    },
    async clear() {
      this.value = null;
    },
  };
}

describe("application orchestration", () => {
  it("exposes the next minimum-context question without persisting a derived schedule", async () => {
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    const d3: SupplementEntry = {
      id: "d3-1",
      supplementId: "vitamin_d3",
      formId: "unspecified",
      dose: 1000,
      unit: "IU",
      doseBasis: "unknown",
      frequency: { kind: "once_daily" },
    };
    await app.replaceRegimen({ ...emptyRegimen, supplements: [d3] });

    const question = app.getNextQuestion();

    expect(question?.contextKey).toBe("dietary_fat_meal");
    expect(app.state.schedule).toBeNull();
    expect(JSON.parse(repository.value ?? "null").schedule).toBeUndefined();
  });

  it("persists only canonical regimen and version metadata when deriving a schedule", async () => {
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    await app.replaceRegimen(emptyRegimen);
    const view = await app.generate();
    const persisted = JSON.parse(repository.value ?? "null") as Record<string, unknown>;

    expect(view?.schedule.status).toBe("complete");
    expect(persisted.regimen).toEqual(emptyRegimen);
    expect(persisted.rulesetVersionLastEvaluated).toBe(loadKnowledgeSnapshot().rulesetVersion);
    expect(persisted.evidenceRegistryVersionLastEvaluated).toBe(
      loadKnowledgeSnapshot().evidenceRegistryVersion,
    );
    expect(persisted.schedule).toBeUndefined();
    expect(app.state.schedule?.schedule).toEqual(view?.schedule);
  });

  it("surfaces a knowledge update without presenting a persisted schedule as current", async () => {
    const snapshot = loadKnowledgeSnapshot();
    const repository = memoryRepository(
      JSON.stringify({
        schemaVersion: 1,
        rulesetVersionLastEvaluated: "older-ruleset",
        evidenceRegistryVersionLastEvaluated: "older-evidence",
        regimen: emptyRegimen,
      }),
    );
    const app = createNutriClockApplication(repository, {
      ...snapshot,
      rulesetVersion: "current-ruleset",
      evidenceRegistryVersion: "current-evidence",
    });
    await app.load();

    expect(app.state.knowledgeUpdateAvailable).toBe(true);
    expect(app.state.schedule).toBeNull();
  });

  it("persists explicit daily events separately from the canonical regimen", async () => {
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    await app.replaceRegimen(emptyRegimen);
    const today = await app.recordDayEvent(
      "2026-09-08",
      { minuteOfDay: 600 },
      {
        id: "taken-1",
        kind: "supplement_taken",
        itemId: "missing-item",
        time: { minuteOfDay: 600 },
      },
    );
    expect(today?.context.localDate).toBe("2026-09-08");
    const persisted = JSON.parse(repository.value ?? "null") as {
      regimen: CanonicalRegimen;
      dailyLogs?: Array<{ localDate: string }>;
    };
    expect(persisted.regimen).toEqual(emptyRegimen);
    expect(persisted.dailyLogs?.[0]?.localDate).toBe("2026-09-08");
    expect(app.getWeeklyReview("2026-09-07")).toMatchObject({
      weekStart: "2026-09-07",
      daysWithActivity: 1,
    });
    expect(app.getScheduleQuality()?.complexity).toBe("simple");
  });

  it("derives a local schedule-repair summary from today's events", async () => {
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    const b12: SupplementEntry = {
      id: "b12-1",
      supplementId: "vitamin_b12",
      formId: "unspecified",
      dose: 1,
      unit: "mcg",
      doseBasis: "unknown",
      frequency: { kind: "once_daily" },
    };
    await app.replaceRegimen({ ...emptyRegimen, supplements: [b12] });
    app.loadToday("2026-09-08", { minuteOfDay: 600 });
    await app.recordDayEvent(
      "2026-09-08",
      { minuteOfDay: 600 },
      {
        id: "b12-taken",
        kind: "supplement_taken",
        itemId: "b12-1",
        time: { minuteOfDay: 600 },
      },
    );

    expect(app.getScheduleRepair()?.changes).toContainEqual({
      itemId: "b12-1",
      kind: "completed",
      message: "Vitamin B12 is preserved as taken for today.",
    });
  });

  it("saves and applies local routine templates without changing supplements or medications", async () => {
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    await app.replaceRegimen(emptyRegimen);
    await app.saveRoutineTemplate({
      id: "office-day",
      name: "Office day",
      routine: {
        wakeTime: { minuteOfDay: 360 },
        bedtime: { minuteOfDay: 1320 },
        meals: [{ id: "breakfast-office", name: "breakfast", time: { minuteOfDay: 420 } }],
        beverages: [{ id: "coffee-office", kind: "coffee", time: { minuteOfDay: 450 } }],
      },
    });
    await app.applyRoutineTemplate("office-day");

    expect(app.state.routineTemplates).toHaveLength(1);
    expect(app.state.regimen?.routine.wakeTime).toEqual({ minuteOfDay: 360 });
    expect(JSON.parse(repository.value ?? "null").routineTemplates).toHaveLength(1);
    await app.generate();
    expect(JSON.parse(repository.value ?? "null").routineTemplates).toHaveLength(1);
    await app.setReminderPreferences(true, 15);
    expect(app.state.regimen?.preferences).toMatchObject({
      remindersEnabled: true,
      reminderLeadMinutes: 15,
    });
  });
});
