import { describe, expect, it } from "vitest";
import { createNutriClockApplication } from "../src";
import { loadKnowledgeSnapshot, type CanonicalRegimen } from "@nutriclock/domain";
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
});
