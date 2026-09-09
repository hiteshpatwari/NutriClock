import { describe, expect, it } from "vitest";
import {
  assessScheduleQuality,
  buildConvenienceInsights,
  buildReminderDecisions,
  buildWeeklyReview,
  compareScheduleSimplification,
  deriveConveniencePreferences,
  generateSchedule,
  generateAdaptiveSchedule,
  loadKnowledgeSnapshot,
  normalizeDose,
  queryWhatCanITakeNow,
  SUPPLEMENT_CATALOG,
  validateKnowledgeSnapshot,
  type SchedulerOptions,
  type CanonicalRegimen,
  type LocalTime,
  type MedicationAnchor,
  type SupplementEntry,
} from "../src/index";

const t = (hour: number, minute = 0): LocalTime => ({ minuteOfDay: hour * 60 + minute });
const id = (value: string): string => value;
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
    meals: [{ id: id("breakfast"), name: "breakfast", time: t(8), containsDietaryFat: true }],
    beverages: [{ id: id("coffee"), kind: "coffee", time: t(8, 30) }],
  },
  supplements,
  medications,
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
});

describe("approved V1 knowledge", () => {
  it("loads 19 active rules and keeps review-required rules inert", () => {
    const knowledge = loadKnowledgeSnapshot();
    expect(knowledge.rules.filter((rule) => rule.status === "active")).toHaveLength(19);
    expect(knowledge.rules.filter((rule) => rule.status === "RULE_REVIEW_REQUIRED")).toHaveLength(
      13,
    );
  });

  it("validates every active rule's evidence and preserves the review gate", () => {
    const knowledge = loadKnowledgeSnapshot();
    const validation = validateKnowledgeSnapshot(knowledge);
    expect(validation.valid).toBe(true);
    expect(validation.activeRuleIds).toHaveLength(19);
  });

  it("refuses to schedule against an invalid knowledge snapshot", () => {
    const knowledge = loadKnowledgeSnapshot();
    const invalid = {
      ...knowledge,
      rules: knowledge.rules.map((rule) =>
        rule.id === "iron_levothyroxine_240" ? { ...rule, evidenceIds: [] } : rule,
      ),
    };
    const result = generateSchedule(
      regimen([supplement({ id: id("iron-1"), supplementId: "iron" })]),
      invalid,
    );
    expect(result.status).toBe("incomplete");
    expect(result.conflicts[0]?.id).toBe("invalid-knowledge-snapshot");
  });

  it("normalizes equivalent mass units without converting IU", () => {
    expect(normalizeDose(25, "mg", "elemental")).toMatchObject({
      dimension: "mass",
      amount: 25000,
      canonicalUnit: "mcg",
    });
    expect(normalizeDose(0.025, "g", "elemental")).toMatchObject({
      dimension: "mass",
      amount: 25000,
      canonicalUnit: "mcg",
    });
    expect(normalizeDose(25000, "mcg", "elemental")).toMatchObject({
      dimension: "mass",
      amount: 25000,
      canonicalUnit: "mcg",
    });
    expect(normalizeDose(2000, "IU", "product_label_amount")).toMatchObject({
      dimension: "international_unit",
      canonicalUnit: "IU",
    });
  });

  it("exposes supplement-specific defaults and only marks threshold-relevant entries", () => {
    expect(SUPPLEMENT_CATALOG.find((item) => item.id === "iron")).toMatchObject({
      defaultUnit: "mg",
      supportedUnits: ["mg", "mcg", "g"],
      doseBasisRelevant: true,
    });
    expect(SUPPLEMENT_CATALOG.find((item) => item.id === "vitamin_d3")).toMatchObject({
      defaultUnit: "IU",
      supportedUnits: ["IU", "mcg"],
      doseBasisRelevant: false,
    });
    expect(SUPPLEMENT_CATALOG.find((item) => item.id === "vitamin_b12")).toMatchObject({
      defaultUnit: "mcg",
      doseBasisRelevant: false,
    });
  });
});

describe("deterministic scheduler", () => {
  it("keeps a levothyroxine anchor fixed and separates iron by the active 240-minute rule", () => {
    const result = generateSchedule(
      regimen(
        [
          supplement({
            id: id("iron-1"),
            supplementId: "iron",
            formId: "iron_oral_common",
            dose: 65,
          }),
        ],
        [
          medication({
            id: id("med-1"),
            displayName: "Levothyroxine / Synthroid",
            reference: { kind: "supported", medicationId: "levothyroxine" },
          }),
        ],
      ),
      loadKnowledgeSnapshot(),
    );
    const anchor = result.items.find((item) => item.id === "med-1");
    const iron = result.items.find((item) => item.id === "iron-1");
    expect(anchor?.time).toEqual(t(7));
    expect(anchor?.fixed).toBe(true);
    expect(iron?.time).toBeDefined();
    expect(Math.abs((iron?.time?.minuteOfDay ?? 0) - 420)).toBeGreaterThanOrEqual(240);
    expect(iron?.explanation.ruleIds).toContain("iron_levothyroxine_240");
  });

  it("treats an exact hard boundary as valid and one minute inside it as invalid", () => {
    const input = regimen(
      [supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: id("med-1"),
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
        }),
      ],
    );
    const exact = generateSchedule(
      {
        ...input,
        overrides: [
          {
            id: "override:iron-1",
            itemId: "iron-1",
            selectedTime: t(11),
            kind: "preference_override",
            acknowledgedRuleIds: [],
            createdFromRulesetVersion: "1.0.0-draft",
          },
        ],
      },
      loadKnowledgeSnapshot(),
    );
    expect(exact.status).not.toBe("incomplete");
    expect(exact.items.find((item) => item.id === "iron-1")?.time).toEqual(t(11));
    const inside = generateSchedule(
      {
        ...input,
        overrides: [
          {
            id: "override:iron-1",
            itemId: "iron-1",
            selectedTime: t(10, 59),
            kind: "preference_override",
            acknowledgedRuleIds: [],
            createdFromRulesetVersion: "1.0.0-draft",
          },
        ],
      },
      loadKnowledgeSnapshot(),
    );
    expect(inside.status).toBe("incomplete");
    expect(inside.conflicts[0]?.reason).toBe("user_override_rejected");
    expect(inside.items.find((item) => item.id === "med-1")?.time).toEqual(t(7));
  });

  it("returns flexible timing without inventing a time-of-day claim", () => {
    const result = generateSchedule(
      regimen([supplement({ id: id("b12-1"), supplementId: "vitamin_b12" })]),
      loadKnowledgeSnapshot(),
    );
    const item = result.items.find((entry) => entry.id === "b12-1");
    expect(item?.timingState).toBe("flexible");
    expect(item?.explanation.bullets.join(" ")).toContain(
      "No strong evidence-backed timing requirement",
    );
    expect(item?.explanation.administrationGuidance).toBeUndefined();
  });

  it("derives evidence-backed administration guidance from the influencing rules", () => {
    const result = generateSchedule(
      regimen([
        supplement({
          id: id("iron-1"),
          supplementId: "iron",
          formId: "iron_oral_common",
          dose: 65,
          doseBasis: "elemental",
        }),
        supplement({ id: id("c-1"), supplementId: "vitamin_c" }),
      ]),
      loadKnowledgeSnapshot(),
    );
    const iron = result.items.find((item) => item.id === "iron-1");
    expect(
      iron?.explanation.administrationGuidance?.avoidAroundDose?.map((item) => item.id),
    ).toContain("guidance:iron_common_oral_meal_timing");
    expect(iron?.explanation.administrationGuidance?.takeWith?.map((item) => item.id)).toContain(
      "guidance:iron_vitamin_c_together",
    );
    expect(iron?.explanation.administrationGuidance?.takeWith?.[0]?.evidenceIds).toEqual([
      "ev_nhs_ferrous_sulfate",
      "ev_nih_vitamin_c_hp",
    ]);
  });

  it("shows meal guidance only when the approved meal characteristic is present", () => {
    const result = generateSchedule(
      regimen([supplement({ id: id("d-1"), supplementId: "vitamin_d3", unit: "IU" })]),
      loadKnowledgeSnapshot(),
    );
    const d3 = result.items.find((item) => item.id === "d-1");
    expect(d3?.explanation.administrationGuidance?.foodInstruction).toMatchObject({
      id: "guidance:vitamin_d3_fat_meal",
      evidenceIds: ["ev_nih_vitamin_d_hp"],
    });
  });

  it("emits clinical warnings without converting them into conflicts", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: id("b12-1"), supplementId: "vitamin_b12" })],
        [
          medication({
            id: id("ppi-1"),
            displayName: "Proton-pump inhibitor",
            reference: { kind: "supported", medicationId: "proton_pump_inhibitor" },
          }),
        ],
      ),
      loadKnowledgeSnapshot(),
    );
    expect(result.warnings.some((warning) => warning.ruleId === "vitamin_b12_ppi_warning")).toBe(
      true,
    );
    expect(result.conflicts).toHaveLength(0);
  });

  it("preserves unsupported medication names and applies no inferred rule", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: id("d-1"), supplementId: "vitamin_d3" })],
        [
          medication({
            id: id("med-1"),
            displayName: "Losartan",
            reference: { kind: "unsupported", userEnteredName: "Losartan" },
            administrationTime: t(7),
          }),
        ],
      ),
      loadKnowledgeSnapshot(),
    );
    expect(result.unsupportedMedications[0]?.displayName).toBe("Losartan");
    expect(result.warnings).toHaveLength(0);
  });

  it("honors directional dolutegravir/calcium semantics", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: id("calcium-1"), supplementId: "calcium", formId: "calcium_citrate" })],
        [
          medication({
            id: id("dtg-1"),
            displayName: "Dolutegravir",
            reference: { kind: "supported", medicationId: "dolutegravir" },
            administrationTime: t(12),
          }),
        ],
      ),
      loadKnowledgeSnapshot(),
    );
    const calcium = result.items.find((item) => item.id === "calcium-1");
    expect(calcium?.time).toBeDefined();
    const difference = (calcium?.time?.minuteOfDay ?? 0) - 720;
    expect(difference >= 120 || difference <= -360).toBe(true);
  });

  it("returns an explicit conflict instead of moving a medication anchor", () => {
    const result = generateSchedule(
      {
        ...regimen(
          [supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" })],
          [
            medication({
              id: id("med-1"),
              displayName: "Levothyroxine / Synthroid",
              reference: { kind: "supported", medicationId: "levothyroxine" },
              administrationTime: t(7),
            }),
          ],
        ),
        routine: {
          ...regimen([], []).routine,
          wakeTime: t(7),
          bedtime: t(9),
          meals: [],
          beverages: [],
        },
      },
      loadKnowledgeSnapshot(),
    );
    expect(result.status).toBe("incomplete");
    expect(result.conflicts[0]?.kind).toBe("hard_schedule_conflict");
    expect(result.items.find((item) => item.id === "med-1")?.time).toEqual(t(7));
  });

  it("is structurally deterministic for the same input and knowledge", () => {
    const input = regimen([
      supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" }),
      supplement({ id: id("c-1"), supplementId: "vitamin_c" }),
      supplement({ id: id("d-1"), supplementId: "vitamin_d3" }),
    ]);
    const knowledge = loadKnowledgeSnapshot();
    expect(generateSchedule(input, knowledge)).toEqual(generateSchedule(input, knowledge));
  });

  it("keeps full candidate traces out of the normal result while supporting an explicit debug mode", () => {
    const input = regimen([supplement({ id: id("d-1"), supplementId: "vitamin_d3" })]);
    const normal = generateSchedule(input, loadKnowledgeSnapshot());
    expect(normal.decisionTraces[0]?.traceMode).toBe("summary");
    expect(normal.decisionTraces[0]?.consideredCandidates).toBeUndefined();
    const debugOptions: SchedulerOptions = { traceMode: "full" };
    const debug = generateSchedule(input, loadKnowledgeSnapshot(), debugOptions);
    expect(debug.decisionTraces[0]?.traceMode).toBe("full");
    expect(debug.decisionTraces[0]?.consideredCandidates?.length).toBeGreaterThan(0);
  });

  it("only activates the calcium dose information rule for explicitly elemental mass", () => {
    const unknownBasis = generateSchedule(
      regimen([
        supplement({
          id: id("calcium-1"),
          supplementId: "calcium",
          dose: 600,
          unit: "mg",
          doseBasis: "unknown",
        }),
      ]),
      loadKnowledgeSnapshot(),
    );
    expect(unknownBasis.warnings).toHaveLength(0);
    const elementalBasis = generateSchedule(
      regimen([
        supplement({
          id: id("calcium-1"),
          supplementId: "calcium",
          dose: 600,
          unit: "mg",
          doseBasis: "elemental",
        }),
      ]),
      loadKnowledgeSnapshot(),
    );
    expect(
      elementalBasis.warnings.some(
        (warning) => warning.ruleId === "calcium_over_500mg_information",
      ),
    ).toBe(true);
  });

  it("derives a daily execution view without changing the canonical regimen", () => {
    const input = regimen([
      supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" }),
      supplement({ id: id("b12-1"), supplementId: "vitamin_b12" }),
    ]);
    const result = generateAdaptiveSchedule(
      input,
      {
        localDate: "2026-09-08",
        now: t(12),
        events: [
          { id: "taken-iron", kind: "supplement_taken", itemId: "iron-1", time: t(9) },
          {
            id: "snooze-b12",
            kind: "supplement_snoozed",
            itemId: "b12-1",
            time: t(10),
            until: t(13),
          },
        ],
      },
      loadKnowledgeSnapshot(),
    );
    expect(input.supplements).toHaveLength(2);
    expect(result.items.find((entry) => entry.item.id === "iron-1")).toMatchObject({
      executionStatus: "taken",
      item: { time: t(9), userSelected: true },
    });
    expect(result.items.find((entry) => entry.item.id === "b12-1")?.executionStatus).toBe(
      "snoozed",
    );
    expect(result.schedule.items.some((entry) => entry.id === "iron-1")).toBe(false);
    expect(result.remainingItems.every((entry) => entry.item.id !== "iron-1")).toBe(true);
  });

  it("keeps fixed medication anchors visible and does not turn execution events into regimen edits", () => {
    const input = regimen(
      [supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: id("med-1"),
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
        }),
      ],
    );
    const result = generateAdaptiveSchedule(
      input,
      {
        localDate: "2026-09-08",
        now: t(12),
        events: [{ id: "late-med", kind: "medication_taken", anchorId: "med-1", time: t(8) }],
      },
      loadKnowledgeSnapshot(),
    );
    expect(result.items.find((entry) => entry.item.id === "med-1")?.item.time).toEqual(t(7));
    expect(result.schedule.items.find((entry) => entry.id === "iron-1")?.time).toEqual(t(12));
    expect(result.medications[0]).toMatchObject({
      status: "taken",
      scheduledTime: t(7),
      recordedTime: t(8),
    });
    expect(input.medications[0]?.administrationTime).toEqual(t(7));
  });

  it("does not report an item as available now when the current time violates a hard anchor", () => {
    const input = regimen(
      [supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: id("med-1"),
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
        }),
      ],
    );
    const tooSoon = generateAdaptiveSchedule(
      input,
      { localDate: "2026-09-08", now: t(8), events: [] },
      loadKnowledgeSnapshot(),
    );
    expect(tooSoon.availability.find((entry) => entry.itemId === "iron-1")).toMatchObject({
      status: "wait",
      nextValidTime: t(11),
    });
    const validNow = generateAdaptiveSchedule(
      input,
      { localDate: "2026-09-08", now: t(11), events: [] },
      loadKnowledgeSnapshot(),
    );
    expect(validNow.availability.find((entry) => entry.itemId === "iron-1")?.status).toBe(
      "available_now",
    );
  });

  it("adapts the remaining schedule forward without changing the canonical regimen", () => {
    const input = regimen([
      supplement({ id: id("b12-1"), supplementId: "vitamin_b12", preferredTime: t(8) }),
      supplement({ id: id("c-1"), supplementId: "vitamin_c", preferredTime: t(9) }),
    ]);
    const result = generateAdaptiveSchedule(
      input,
      { localDate: "2026-09-08", now: t(12), events: [] },
      loadKnowledgeSnapshot(),
    );

    expect(result.items.filter((entry) => entry.item.kind === "supplement")).toHaveLength(2);
    expect(
      result.remainingItems
        .filter((entry) => entry.item.kind === "supplement")
        .every((entry) => (entry.item.time?.minuteOfDay ?? 0) >= 12),
    ).toBe(true);
    expect(input.supplements.map((entry) => entry.preferredTime)).toEqual([t(8), t(9)]);
  });

  it("answers what-can-I-take-now with deterministic supplement decisions and medication status", () => {
    const input = regimen(
      [supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: id("med-1"),
          displayName: "Levothyroxine / Synthroid",
          reference: { kind: "supported", medicationId: "levothyroxine" },
        }),
      ],
    );
    const result = queryWhatCanITakeNow(
      input,
      {
        localDate: "2026-09-08",
        now: t(12),
        events: [
          { id: "skip-breakfast", kind: "meal_skipped", mealName: "breakfast", time: t(8) },
          { id: "later-bedtime", kind: "bedtime_changed", time: t(22) },
          { id: "taken-med", kind: "medication_taken", anchorId: "med-1", time: t(7, 30) },
        ],
      },
      loadKnowledgeSnapshot(),
    );

    expect(result.available.map((entry) => entry.item.sourceId)).toEqual(["iron-1"]);
    expect(result.waiting).toHaveLength(0);
    expect(result.medicationStatus).toEqual([
      {
        anchorId: "med-1",
        displayName: "Levothyroxine / Synthroid",
        status: "taken",
        scheduledTime: t(7),
        recordedTime: t(7, 30),
      },
    ]);
    expect(input.medications[0]?.administrationTime).toEqual(t(7));
  });

  it("summarizes schedule complexity without implying medical quality", () => {
    const result = generateSchedule(
      regimen([
        supplement({ id: id("b12-1"), supplementId: "vitamin_b12", preferredTime: t(8) }),
        supplement({ id: id("c-1"), supplementId: "vitamin_c", preferredTime: t(10) }),
        supplement({ id: id("d-1"), supplementId: "vitamin_d3", preferredTime: t(12) }),
        supplement({ id: id("mg-1"), supplementId: "magnesium", preferredTime: t(14) }),
      ]),
      loadKnowledgeSnapshot(),
    );
    const quality = assessScheduleQuality(result);
    expect(quality.complexity).toBe("complex");
    expect(quality.supplementWindowCount).toBeGreaterThanOrEqual(3);
    expect(quality.message).toContain("daily windows");
  });

  it("builds an execution-only weekly review from the latest daily states", () => {
    const input = regimen([supplement({ id: id("iron-1"), supplementId: "iron" })]);
    const review = buildWeeklyReview(
      input,
      [
        {
          localDate: "2026-09-08",
          events: [
            { id: "skip", kind: "supplement_skipped", itemId: "iron-1", time: t(10) },
            {
              id: "snooze",
              kind: "supplement_snoozed",
              itemId: "iron-1",
              time: t(10),
              until: t(11),
            },
            { id: "taken", kind: "supplement_taken", itemId: "iron-1", time: t(11) },
            { id: "meal", kind: "meal_recorded", mealName: "breakfast", time: t(8) },
          ],
        },
        {
          localDate: "2026-09-09",
          events: [{ id: "skip-2", kind: "supplement_skipped", itemId: "iron-1", time: t(10) }],
        },
      ],
      "2026-09-07",
    );
    expect(review.weekEnd).toBe("2026-09-13");
    expect(review.daysWithActivity).toBe(2);
    expect(review.supplementTakenCount).toBe(1);
    expect(review.supplementSkippedCount).toBe(1);
    expect(review.supplementSnoozedCount).toBe(0);
    expect(review.adjustmentCount).toBe(1);
    expect(review.executionRate).toBe(0.5);
    expect(review.mostSkippedItem).toMatchObject({ itemId: "iron-1", count: 1 });
  });

  it("compares a simpler grouping variant without changing the canonical regimen", () => {
    const input = regimen([
      supplement({ id: id("b12-1"), supplementId: "vitamin_b12", preferredTime: t(8) }),
      supplement({ id: id("c-1"), supplementId: "vitamin_c", preferredTime: t(10) }),
      supplement({ id: id("d-1"), supplementId: "vitamin_d3", preferredTime: t(12) }),
    ]);
    const comparison = compareScheduleSimplification(input, loadKnowledgeSnapshot());
    expect(comparison.current.status).not.toBe("incomplete");
    expect(comparison.simpler.status).not.toBe("incomplete");
    expect(comparison.simplerWindowCount).toBeLessThanOrEqual(comparison.currentWindowCount);
    expect(input.supplements.every((item) => item.preferredTime)).toBe(true);
  });

  it("derives local reminders from availability rather than medical urgency", () => {
    const input = regimen([
      supplement({ id: id("b12-1"), supplementId: "vitamin_b12", preferredTime: t(10) }),
    ]);
    const today = generateAdaptiveSchedule(
      input,
      { localDate: "2026-09-08", now: t(10), events: [] },
      loadKnowledgeSnapshot(),
    );
    const reminders = buildReminderDecisions(today, {
      flexibleItemGrouping: "prefer_grouping",
      remindersEnabled: true,
      reminderLeadMinutes: 0,
    });
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ itemId: "b12-1", status: "due" });
    expect(reminders[0]?.message).toContain("available now");
  });

  it("derives convenience insights only from repeated execution behavior", () => {
    const input = regimen([supplement({ id: id("iron-1"), supplementId: "iron" })]);
    const insights = buildConvenienceInsights(input, [
      {
        localDate: "2026-09-08",
        events: [{ id: "skip-1", kind: "supplement_skipped", itemId: "iron-1", time: t(10) }],
      },
      {
        localDate: "2026-09-09",
        events: [{ id: "skip-2", kind: "supplement_skipped", itemId: "iron-1", time: t(10) }],
      },
    ]);
    expect(insights[0]).toMatchObject({ kind: "frequently_skipped", itemId: "iron-1", count: 2 });
    expect(insights[0]?.message).not.toContain("absorb");
  });

  it("derives convenience preferences from repeated local execution logs without mutating regimen state", () => {
    const input = regimen([supplement({ id: id("iron-1"), supplementId: "iron" })]);
    const preferences = deriveConveniencePreferences(input, [
      {
        localDate: "2026-09-08",
        events: [{ id: "taken-1", kind: "supplement_taken", itemId: "iron-1", time: t(10) }],
      },
      {
        localDate: "2026-09-09",
        events: [{ id: "taken-2", kind: "supplement_taken", itemId: "iron-1", time: t(12) }],
      },
    ]);

    expect(preferences).toEqual([
      {
        itemId: "iron-1",
        preferredTime: t(11),
        observedDays: 2,
        message: expect.stringContaining("convenience preference only"),
      },
    ]);
    expect(input.supplements[0]?.preferredTime).toBeUndefined();
  });

  it("uses a repeated execution window only as a soft preference", () => {
    const input = regimen([
      supplement({ id: id("iron-1"), supplementId: "iron", formId: "iron_oral_common" }),
    ]);
    const result = generateSchedule(input, loadKnowledgeSnapshot(), {
      conveniencePreferences: [
        {
          itemId: "iron-1",
          preferredTime: t(12),
          observedDays: 2,
          message: "local-only",
        },
      ],
    });
    expect(result.items.find((entry) => entry.id === "iron-1")?.time).toEqual(t(12));
    expect(input.supplements[0]?.preferredTime).toBeUndefined();
  });
});
