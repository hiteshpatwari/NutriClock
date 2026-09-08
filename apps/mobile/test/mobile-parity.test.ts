import { describe, expect, it } from "vitest";
import { generateSchedule, loadKnowledgeSnapshot, type CanonicalRegimen } from "@nutriclock/domain";

const regimen: CanonicalRegimen = {
  routine: {
    wakeTime: { minuteOfDay: 420 },
    bedtime: { minuteOfDay: 1380 },
    meals: [],
    beverages: [],
  },
  supplements: [
    {
      id: "mobile-iron",
      supplementId: "iron",
      formId: "iron_oral_common",
      dose: 65,
      unit: "mg",
      doseBasis: "elemental",
      frequency: { kind: "once_daily" },
    },
  ],
  medications: [
    {
      id: "mobile-levothyroxine",
      displayName: "Levothyroxine / Synthroid",
      reference: { kind: "supported", medicationId: "levothyroxine" },
      administrationTime: { minuteOfDay: 420 },
    },
  ],
  preferences: { flexibleItemGrouping: "prefer_grouping" },
  overrides: [],
};

describe("mobile shared-domain parity fixture", () => {
  it("uses the same fixed-anchor and hard-separation semantics as web", () => {
    const result = generateSchedule(regimen, loadKnowledgeSnapshot());
    expect(result.items.find((item) => item.id === "mobile-levothyroxine")?.fixed).toBe(true);
    expect(result.items.find((item) => item.id === "mobile-levothyroxine")?.time).toEqual({
      minuteOfDay: 420,
    });
    expect(result.items.find((item) => item.id === "mobile-iron")?.explanation.ruleIds).toContain(
      "iron_levothyroxine_240",
    );
  });
});
