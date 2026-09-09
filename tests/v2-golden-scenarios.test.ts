import { describe, expect, it } from "vitest";
import {
  buildReminderDecisions,
  generateAdaptiveSchedule,
  generateSchedule,
  loadKnowledgeSnapshot,
  type CanonicalRegimen,
  type MedicationAnchor,
  type RoutineTemplate,
  type SupplementEntry,
} from "@nutriclock/domain";
import { createNutriClockApplication } from "@nutriclock/application";
import { decodeState, type RegimenRepository } from "@nutriclock/persistence";

const t = (hour: number, minute = 0) => ({ minuteOfDay: hour * 60 + minute });

const supplement = (
  value: Partial<SupplementEntry> & Pick<SupplementEntry, "id" | "supplementId">,
): SupplementEntry => ({
  formId: "unspecified",
  dose: 1,
  unit: "mg",
  doseBasis: "unknown",
  frequency: { kind: "once_daily" },
  ...value,
});

const medication = (
  value: Partial<MedicationAnchor> & Pick<MedicationAnchor, "id" | "displayName" | "reference">,
): MedicationAnchor => ({ administrationTime: t(7), ...value });

const regimen = (
  supplements: SupplementEntry[],
  medications: MedicationAnchor[] = [],
): CanonicalRegimen => ({
  routine: {
    wakeTime: t(7),
    bedtime: t(23),
    meals: [{ id: "breakfast", name: "breakfast", time: t(8), containsDietaryFat: true }],
    beverages: [{ id: "coffee", kind: "coffee", time: t(8, 30) }],
  },
  supplements,
  medications,
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
});

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

describe("NutriClock V2 deterministic golden scenarios", () => {
  it("adapts the remaining day to a recorded medication event while preserving the canonical anchor", () => {
    const input = regimen(
      [supplement({ id: "iron-1", supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: "levothyroxine-1",
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
          administrationTime: t(7),
        }),
      ],
    );
    const context = {
      localDate: "2026-09-08",
      now: t(12),
      events: [
        {
          id: "med-taken-early",
          kind: "medication_taken" as const,
          anchorId: "levothyroxine-1",
          time: t(8),
        },
      ],
    };

    const result = generateAdaptiveSchedule(input, context, loadKnowledgeSnapshot());
    const medicationItem = result.items.find((entry) => entry.item.id === "levothyroxine-1");
    const ironItem = result.items.find((entry) => entry.item.id === "iron-1");

    expect(result).toEqual(generateAdaptiveSchedule(input, context, loadKnowledgeSnapshot()));
    expect(result.context).toEqual(context);
    expect(result.schedule.status).toBe("complete");
    expect(medicationItem).toMatchObject({
      executionStatus: "taken",
      availableNow: false,
      item: { time: t(7), fixed: true, timingState: "scheduled" },
    });
    expect(result.medications).toContainEqual({
      anchorId: "levothyroxine-1",
      displayName: "Levothyroxine / Synthroid",
      status: "taken",
      scheduledTime: t(7),
      recordedTime: t(8),
    });
    expect(ironItem).toMatchObject({
      executionStatus: "planned",
      availableNow: true,
      item: { time: t(12), fixed: false },
    });
    expect(result.availability.find((entry) => entry.itemId === "iron-1")).toMatchObject({
      status: "available_now",
      nextValidTime: t(12),
    });
    expect(input.medications[0]?.administrationTime).toEqual(t(7));
  });

  it("keeps unsupported medication coverage explicit and adds no inferred clinical rule", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: "d3-1", supplementId: "vitamin_d3", unit: "IU" })],
        [
          medication({
            id: "unsupported-1",
            displayName: "Losartan",
            reference: { kind: "unsupported", userEnteredName: "Losartan" },
            administrationTime: t(9),
          }),
        ],
      ),
      loadKnowledgeSnapshot(),
    );

    expect(result.unsupportedMedications).toEqual([
      {
        anchorId: "unsupported-1",
        displayName: "Losartan",
        message:
          "We don't currently have validated timing rules for this medication. Continue following your pharmacist or clinician's instructions.",
      },
    ]);
    expect(result.warnings).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.items.find((item) => item.id === "unsupported-1")).toMatchObject({
      time: t(9),
      fixed: true,
    });
  });

  it("derives local reminder guidance from a valid current window and keeps it opt-in", () => {
    const input = regimen([
      supplement({ id: "b12-1", supplementId: "vitamin_b12", preferredTime: t(10) }),
    ]);
    const today = generateAdaptiveSchedule(
      input,
      { localDate: "2026-09-08", now: t(10), events: [] },
      loadKnowledgeSnapshot(),
    );

    expect(buildReminderDecisions(today, { flexibleItemGrouping: "prefer_grouping" })).toEqual([]);
    expect(
      buildReminderDecisions(today, {
        flexibleItemGrouping: "prefer_grouping",
        remindersEnabled: true,
        reminderLeadMinutes: 0,
      }),
    ).toEqual([
      {
        itemId: "b12-1",
        status: "due",
        scheduledTime: t(10),
        message: "Vitamin B12 is available now based on your recorded context.",
        ruleIds: [],
        evidenceIds: [],
      },
    ]);
  });

  it("applies simplification only through an explicit application command and persists supplement timing preferences", async () => {
    const input: CanonicalRegimen = {
      ...regimen([
        supplement({ id: "b12-1", supplementId: "vitamin_b12", preferredTime: t(8) }),
        supplement({ id: "c-1", supplementId: "vitamin_c", preferredTime: t(10) }),
        supplement({ id: "d3-1", supplementId: "vitamin_d3", preferredTime: t(12) }),
        supplement({ id: "mg-1", supplementId: "magnesium", preferredTime: t(14) }),
      ]),
      preferences: { flexibleItemGrouping: "prefer_separate" },
    };
    const repository = memoryRepository();
    const app = createNutriClockApplication(repository);
    await app.replaceRegimen(input);

    const comparison = app.getScheduleSimplification();
    expect(comparison?.canSimplify).toBe(true);
    expect(app.state.regimen?.overrides).toEqual([]);

    await app.applyScheduleSimplification();
    expect(app.state.regimen?.overrides.map((override) => override.itemId)).toEqual([
      "b12-1",
      "c-1",
      "d3-1",
      "mg-1",
    ]);
    expect(JSON.parse(repository.value ?? "null").regimen.medications).toEqual([]);
  });

  it("round-trips local regimen, routine template, preferences, and daily execution state without persisting a derived schedule", async () => {
    const input = regimen(
      [supplement({ id: "iron-1", supplementId: "iron" })],
      [
        medication({
          id: "med-1",
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
          administrationTime: t(7),
        }),
      ],
    );
    const template: RoutineTemplate = {
      id: "office-day",
      name: "Office day",
      routine: {
        wakeTime: t(6),
        bedtime: t(22),
        meals: [{ id: "office-breakfast", name: "breakfast", time: t(7, 30) }],
        beverages: [{ id: "office-coffee", kind: "coffee", time: t(8) }],
      },
    };
    const repository = memoryRepository();
    const firstApp = createNutriClockApplication(repository);
    await firstApp.replaceRegimen(input);
    await firstApp.saveRoutineTemplate(template);
    await firstApp.setReminderPreferences(true, 15);
    await firstApp.recordDayEvent("2026-09-08", t(11), {
      id: "taken-iron",
      kind: "supplement_taken",
      itemId: "iron-1",
      time: t(11),
    });
    await firstApp.applyRoutineTemplate("office-day");

    const persisted = JSON.parse(repository.value ?? "null") as Record<string, unknown>;
    expect(persisted).not.toHaveProperty("schedule");
    expect(persisted).toMatchObject({
      schemaVersion: 1,
      routineTemplates: [template],
      dailyLogs: [
        {
          localDate: "2026-09-08",
          events: [{ id: "taken-iron", kind: "supplement_taken", itemId: "iron-1", time: t(11) }],
        },
      ],
    });
    expect((persisted.regimen as CanonicalRegimen).preferences).toMatchObject({
      remindersEnabled: true,
      reminderLeadMinutes: 15,
    });
    expect((persisted.regimen as CanonicalRegimen).supplements).toEqual(input.supplements);
    expect((persisted.regimen as CanonicalRegimen).medications).toEqual(input.medications);
    expect((persisted.regimen as CanonicalRegimen).routine).toEqual(template.routine);

    const secondApp = createNutriClockApplication(repository);
    await secondApp.load();
    expect(secondApp.state.routineTemplates).toEqual([template]);
    expect(secondApp.state.regimen).toEqual(persisted.regimen);
    expect(secondApp.state.dailyLogs).toEqual(persisted.dailyLogs);
    expect(secondApp.state.schedule).toBeNull();
  });
});
