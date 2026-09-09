import { describe, expect, it } from "vitest";
import {
  activeRules,
  buildRegimenDependencyGraph,
  generateAdaptiveSchedule,
  generateSchedule,
  repairSchedule,
  loadKnowledgeSnapshot,
  type CanonicalRegimen,
  type LocalTime,
  type MedicationAnchor,
  type SupplementEntry,
} from "../src";

const t = (hour: number, minute = 0): LocalTime => ({ minuteOfDay: hour * 60 + minute });
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
): MedicationAnchor => ({ ...value });
const regimen = (
  supplements: SupplementEntry[],
  medications: MedicationAnchor[] = [],
  routine: CanonicalRegimen["routine"] = {
    wakeTime: t(7),
    bedtime: t(23),
    meals: [],
    beverages: [],
  },
): CanonicalRegimen => ({
  routine,
  supplements,
  medications,
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
});

const knowledge = loadKnowledgeSnapshot();

describe("V2.5 product promise scenarios", () => {
  it("delivers a sparse D3, B12, and omega-3 schedule without a full routine", () => {
    const result = generateSchedule(
      regimen([
        supplement({ id: "d3", supplementId: "vitamin_d3", unit: "IU" }),
        supplement({ id: "b12", supplementId: "vitamin_b12", unit: "mcg" }),
        supplement({ id: "omega", supplementId: "omega_3" }),
      ]),
      knowledge,
    );

    expect(result.status).toBe("complete");
    expect(result.items).toHaveLength(3);
    expect(result.items.find((item) => item.id === "d3")).toMatchObject({
      timingState: "unresolved",
      semanticWindow: { kind: "with_dietary_fat_meal", resolved: false },
    });
    expect(result.items.find((item) => item.id === "b12")).toMatchObject({
      timingState: "flexible",
      semanticWindow: { kind: "flexible" },
    });
    expect(result.questionCandidates).toHaveLength(1);
    expect(result.questionCandidates[0]?.contextKey).toBe("dietary_fat_meal");
  });

  it("prioritizes an unknown levothyroxine anchor over routine questions", () => {
    const result = generateSchedule(
      regimen(
        [
          supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" }),
          supplement({ id: "c", supplementId: "vitamin_c" }),
        ],
        [
          medication({
            id: "levo",
            displayName: "Levothyroxine",
            reference: { kind: "supported", medicationId: "levothyroxine" },
          }),
        ],
      ),
      knowledge,
    );

    expect(result.items.find((item) => item.id === "levo")).toMatchObject({
      fixed: true,
      timingState: "unresolved",
    });
    expect(result.items.find((item) => item.id === "levo")?.time).toBeUndefined();
    expect(result.questionCandidates[0]).toMatchObject({
      priority: "hard_context_requirement",
      contextKey: "medication_anchor_time",
    });
    expect(
      result.questionCandidates.filter(
        (question) => question.contextKey === "medication_anchor_time",
      ),
    ).toHaveLength(1);
    expect(
      result.questionCandidates.filter(
        (question) => question.contextKey === "coffee_time" || question.contextKey === "tea_time",
      ),
    ).toHaveLength(0);
  });

  it("keeps useful iron guidance while leaving review-gated coffee and tea rules inert", () => {
    const result = generateSchedule(
      regimen([supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" })]),
      knowledge,
    );
    const iron = result.items.find((item) => item.id === "iron");

    expect(iron?.semanticWindow.kind).toBe("before_first_meal");
    expect(result.assumptions.map((assumption) => assumption.id)).toEqual(["missing:meal:iron"]);
    expect(
      result.questionCandidates.some((question) => question.contextKey === "coffee_time"),
    ).toBe(false);
    expect(iron?.explanation.ruleIds).not.toContain("iron_coffee_120_symmetric");
    expect(iron?.explanation.ruleIds).not.toContain("iron_tea_120_symmetric");
  });

  it("keeps a generic multivitamin opaque and does not block D3", () => {
    const result = generateSchedule(
      regimen([
        supplement({
          id: "multi",
          supplementId: "multivitamin",
          formId: "opaque_product",
          unit: "other",
        }),
        supplement({ id: "d3", supplementId: "vitamin_d3", unit: "IU" }),
      ]),
      knowledge,
    );

    expect(result.items.find((item) => item.id === "multi")).toMatchObject({
      timingState: "flexible",
      semanticWindow: { kind: "flexible" },
    });
    expect(
      result.items.find((item) => item.id === "multi")?.explanation.bullets.join(" "),
    ).toContain("opaque product");
    expect(result.items.find((item) => item.id === "d3")).toBeDefined();
  });

  it("keeps supported guidance when an unsupported medication is present", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" })],
        [
          medication({
            id: "unknown-med",
            displayName: "Unknown medication",
            reference: { kind: "unsupported", userEnteredName: "Unknown medication" },
          }),
        ],
      ),
      knowledge,
    );

    expect(result.unsupportedMedications).toHaveLength(1);
    expect(result.items.find((item) => item.id === "iron")).toBeDefined();
    expect(result.warnings).toHaveLength(0);
  });

  it("does not expose form-specific rules when the entered form does not match", () => {
    const result = generateSchedule(
      regimen([
        supplement({ id: "iron", supplementId: "iron", formId: "unspecified" }),
        supplement({ id: "calcium", supplementId: "calcium", formId: "calcium_citrate" }),
      ]),
      knowledge,
    );

    expect(result.items.find((item) => item.id === "iron")?.explanation.ruleIds).not.toContain(
      "iron_common_oral_meal_timing",
    );
    expect(result.items.find((item) => item.id === "calcium")?.explanation.ruleIds).not.toContain(
      "calcium_carbonate_with_food",
    );
  });
});

describe("V2.5 transitions and safety boundaries", () => {
  it("converts D3 semantic guidance to an exact meal time and reopens it when removed", () => {
    const input = regimen([supplement({ id: "d3", supplementId: "vitamin_d3", unit: "IU" })]);
    const unresolved = generateSchedule(input, knowledge);
    const resolved = generateSchedule(
      {
        ...input,
        routine: {
          ...input.routine,
          meals: [{ id: "breakfast", name: "breakfast", time: t(8), containsDietaryFat: true }],
        },
      },
      knowledge,
    );
    const reopened = generateSchedule(input, knowledge);

    expect(unresolved.items.find((item) => item.id === "d3")?.time).toBeUndefined();
    expect(resolved.items.find((item) => item.id === "d3")).toMatchObject({
      time: t(8),
      semanticWindow: { kind: "with_dietary_fat_meal", resolved: true },
    });
    expect(reopened.items.find((item) => item.id === "d3")?.time).toBeUndefined();
  });

  it("does not let a warning-only relationship create a timing claim", () => {
    const result = generateSchedule(
      regimen(
        [supplement({ id: "b12", supplementId: "vitamin_b12" })],
        [
          medication({
            id: "ppi",
            displayName: "Proton-pump inhibitor",
            reference: { kind: "supported", medicationId: "proton_pump_inhibitor" },
          }),
        ],
      ),
      knowledge,
    );
    const b12 = result.items.find((item) => item.id === "b12");

    expect(result.warnings.map((warning) => warning.ruleId)).toContain("vitamin_b12_ppi_warning");
    expect(b12).toMatchObject({ timingState: "flexible", semanticWindow: { kind: "flexible" } });
    expect(b12?.time).toBeUndefined();
  });

  it("keeps active evidence resolvable and excludes review-required rules", () => {
    expect(
      activeRules(knowledge).every((rule) =>
        rule.evidenceIds.every((id) => knowledge.evidence[id]),
      ),
    ).toBe(true);
    expect(activeRules(knowledge).some((rule) => rule.status === "RULE_REVIEW_REQUIRED")).toBe(
      false,
    );
  });

  it("preserves a fixed medication anchor while repairing the remaining day", () => {
    const input = regimen(
      [supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" })],
      [
        medication({
          id: "levo",
          displayName: "Levothyroxine",
          reference: { kind: "supported", medicationId: "levothyroxine" },
          administrationTime: t(7),
        }),
      ],
    );
    const result = generateAdaptiveSchedule(
      input,
      {
        localDate: "2026-09-09",
        now: t(8),
        events: [{ id: "coffee", kind: "beverage_recorded", beverageKind: "coffee", time: t(8) }],
      },
      knowledge,
    );

    expect(result.items.find((item) => item.item.id === "levo")?.item.time).toEqual(t(7));
    expect(result.items.find((item) => item.item.id === "iron")?.item.fixed).toBe(false);
    expect(result.availability.find((item) => item.itemId === "iron")?.status).not.toBe(
      "completed",
    );
  });

  it("uses the prior derived placement as a repair hint when context does not require movement", () => {
    const input = regimen([supplement({ id: "d3", supplementId: "vitamin_d3", unit: "IU" })], [], {
      wakeTime: t(7),
      bedtime: t(23),
      meals: [{ id: "breakfast", name: "breakfast", time: t(8), containsDietaryFat: true }],
      beverages: [],
    });
    const repaired = repairSchedule(
      input,
      { localDate: "2026-09-09", now: t(9), events: [] },
      knowledge,
    );

    expect(repaired.after.schedule.items.find((item) => item.id === "d3")?.time).toEqual(t(8));
  });

  it("returns an explicit conflict for invalid day context instead of evaluating it", () => {
    const result = generateAdaptiveSchedule(
      regimen([supplement({ id: "b12", supplementId: "vitamin_b12" })]),
      {
        localDate: "2026-09-09",
        now: { minuteOfDay: 1440 },
        events: [],
      },
      knowledge,
    );

    expect(result.schedule).toMatchObject({
      status: "incomplete",
      completeness: "conflicted",
    });
    expect(result.schedule.conflicts).toContainEqual(
      expect.objectContaining({ id: "invalid-day-context", reason: "invalid_context" }),
    );
    expect(result.availability[0]?.message).toContain("availability was not evaluated");
  });

  it("does not mark an unresolved semantic item available through a temporary now override", () => {
    const result = generateAdaptiveSchedule(
      regimen([supplement({ id: "d3", supplementId: "vitamin_d3", unit: "IU" })]),
      {
        localDate: "2026-09-09",
        now: t(8),
        events: [{ id: "meal", kind: "meal_recorded", mealName: "breakfast", time: t(8) }],
      },
      knowledge,
    );

    expect(result.items.find((item) => item.item.id === "d3")).toMatchObject({
      availableNow: false,
      item: { timingState: "unresolved" },
    });
    expect(result.availability.find((item) => item.itemId === "d3")?.status).toBe("not_now");
  });
});

describe("V2 rule regression matrix", () => {
  it("keeps active hard and preference relationships distinct from review-gated relationships", () => {
    const ironAndC = generateSchedule(
      regimen([
        supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" }),
        supplement({ id: "c", supplementId: "vitamin_c" }),
      ]),
      knowledge,
    );
    expect(ironAndC.items.find((item) => item.id === "iron")?.explanation.ruleIds).toContain(
      "iron_vitamin_c_together",
    );

    const ironAndCalcium = generateSchedule(
      regimen([
        supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" }),
        supplement({ id: "calcium", supplementId: "calcium", formId: "calcium_citrate" }),
      ]),
      knowledge,
    );
    expect(ironAndCalcium.items.flatMap((item) => item.explanation.ruleIds)).not.toContain(
      "iron_calcium_120_symmetric",
    );
  });

  it("enforces active calcium/levothyroxine and zinc/penicillamine hard anchors", () => {
    const calcium = generateSchedule(
      regimen(
        [supplement({ id: "calcium", supplementId: "calcium", formId: "calcium_citrate" })],
        [
          medication({
            id: "levo",
            displayName: "Levothyroxine",
            reference: { kind: "supported", medicationId: "levothyroxine" },
            administrationTime: t(7),
          }),
        ],
      ),
      knowledge,
    );
    const zinc = generateSchedule(
      regimen(
        [supplement({ id: "zinc", supplementId: "zinc" })],
        [
          medication({
            id: "pen",
            displayName: "Penicillamine",
            reference: { kind: "supported", medicationId: "penicillamine" },
            administrationTime: t(7),
          }),
        ],
      ),
      knowledge,
    );
    expect(
      Math.abs((calcium.items.find((item) => item.id === "calcium")?.time?.minuteOfDay ?? 0) - 420),
    ).toBeGreaterThanOrEqual(240);
    expect(
      Math.abs((zinc.items.find((item) => item.id === "zinc")?.time?.minuteOfDay ?? 0) - 420),
    ).toBeGreaterThanOrEqual(60);
  });

  it("keeps PPI, methotrexate, and anticoagulant relationships as warnings", () => {
    const result = generateSchedule(
      regimen(
        [
          supplement({ id: "b12", supplementId: "vitamin_b12" }),
          supplement({ id: "folate", supplementId: "folate" }),
          supplement({ id: "omega", supplementId: "omega_3" }),
        ],
        [
          medication({
            id: "ppi",
            displayName: "PPI",
            reference: { kind: "supported", medicationId: "proton_pump_inhibitor" },
          }),
          medication({
            id: "mtx",
            displayName: "Methotrexate",
            reference: { kind: "supported", medicationId: "methotrexate" },
          }),
          medication({
            id: "warfarin",
            displayName: "Warfarin",
            reference: { kind: "supported", medicationId: "warfarin_selected_anticoagulant" },
          }),
        ],
      ),
      knowledge,
    );
    expect(result.warnings.map((warning) => warning.ruleId)).toEqual(
      expect.arrayContaining([
        "vitamin_b12_ppi_warning",
        "folate_methotrexate_warning",
        "omega3_anticoagulant_warning",
      ]),
    );
    expect(result.conflicts).toHaveLength(0);
  });
});

describe("regimen dependency graph", () => {
  it("surfaces active supported relationships with deterministic evidence links", () => {
    const graph = buildRegimenDependencyGraph(
      regimen([
        supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" }),
        supplement({ id: "c", supplementId: "vitamin_c" }),
      ]),
      knowledge,
    );

    expect(graph.nodes.map((node) => node.id)).toEqual(["c", "iron"]);
    expect(graph.dependencies).toHaveLength(1);
    expect(graph.dependencies[0]).toMatchObject({
      id: "iron_vitamin_c_together:c:iron",
      relation: "take_together",
      ruleIds: ["iron_vitamin_c_together"],
    });
    expect(graph.dependencies[0]?.evidenceIds).toEqual(
      expect.arrayContaining(["ev_nih_vitamin_c_hp"]),
    );
    for (const dependency of graph.dependencies) {
      expect(dependency.evidenceIds.every((id) => knowledge.evidence[id])).toBe(true);
    }
  });

  it("keeps review-required rules and unsupported medications out of inferred relationships", () => {
    const graph = buildRegimenDependencyGraph(
      regimen(
        [
          supplement({ id: "iron", supplementId: "iron", formId: "iron_oral_common" }),
          supplement({ id: "calcium", supplementId: "calcium", formId: "calcium_citrate" }),
        ],
        [
          medication({
            id: "unknown",
            displayName: "Unknown medication",
            reference: { kind: "unsupported", userEnteredName: "Unknown medication" },
          }),
        ],
      ),
      knowledge,
    );

    expect(graph.unsupportedMedicationIds).toEqual(["unknown"]);
    expect(graph.nodes.map((node) => node.id)).toContain("unknown");
    expect(graph.dependencies).toHaveLength(0);
    expect(graph.scopeNotice).toContain("not evidence that no interaction exists");
  });

  it("represents warning relationships without turning them into separation constraints", () => {
    const graph = buildRegimenDependencyGraph(
      regimen(
        [supplement({ id: "b12", supplementId: "vitamin_b12" })],
        [
          medication({
            id: "ppi",
            displayName: "PPI",
            reference: { kind: "supported", medicationId: "proton_pump_inhibitor" },
          }),
        ],
      ),
      knowledge,
    );

    expect(graph.dependencies).toHaveLength(1);
    expect(graph.dependencies[0]).toMatchObject({
      relation: "clinical_warning",
      ruleIds: ["vitamin_b12_ppi_warning"],
    });
    expect(graph.dependencies[0]).not.toHaveProperty("minimumSeparationMinutes");
    expect(graph.dependencies[0]).not.toHaveProperty("sourceBeforeTargetMinutes");
    expect(graph.dependencies[0]).not.toHaveProperty("targetBeforeSourceMinutes");
  });
});
