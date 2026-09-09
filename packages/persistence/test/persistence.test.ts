import { describe, expect, it } from "vitest";
import { decodeSerializedState, decodeState } from "../src";

const legacyV2State = {
  schemaVersion: 1,
  rulesetVersionLastEvaluated: "rules-v1",
  evidenceRegistryVersionLastEvaluated: "evidence-v1",
  regimen: {
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
  },
};

describe("persistence compatibility", () => {
  it("loads a V2 canonical state without derived V2.5 schedule fields", () => {
    const decoded = decodeState(legacyV2State);

    expect(decoded.schemaVersion).toBe(1);
    expect(decoded.regimen.supplements).toEqual([]);
    expect(decoded.dailyLogs).toBeUndefined();
    expect((decoded as unknown as Record<string, unknown>).schedule).toBeUndefined();
  });

  it("decodes the same compatible state from serialized storage", () => {
    expect(decodeSerializedState(JSON.stringify(legacyV2State)).regimen).toEqual(
      legacyV2State.regimen,
    );
  });

  it("preserves populated routines, overrides, logs, templates, and unknown fields", () => {
    const state = {
      ...legacyV2State,
      regimen: {
        ...legacyV2State.regimen,
        routine: {
          ...legacyV2State.regimen.routine,
          meals: [{ id: "breakfast", name: "breakfast", time: { minuteOfDay: 480 } }],
        },
        supplements: [
          {
            id: "iron-1",
            supplementId: "iron",
            formId: "iron_oral_common",
            dose: 65,
            unit: "mg",
            doseBasis: "elemental",
            frequency: { kind: "once_daily" },
          },
        ],
        overrides: [
          {
            id: "override:iron-1",
            itemId: "iron-1",
            selectedTime: { minuteOfDay: 600 },
            kind: "preference_override",
            acknowledgedRuleIds: [],
            createdFromRulesetVersion: "rules-v1",
          },
        ],
      },
      dailyLogs: [
        {
          localDate: "2026-09-09",
          events: [
            { id: "taken", kind: "supplement_taken", itemId: "iron-1", time: { minuteOfDay: 600 } },
          ],
        },
      ],
      routineTemplates: [
        {
          id: "office",
          name: "Office day",
          routine: legacyV2State.regimen.routine,
        },
      ],
      futureField: { preserved: true },
    };

    const decoded = decodeState(state) as typeof state & Record<string, unknown>;

    expect(decoded.regimen.routine.meals).toHaveLength(1);
    expect(decoded.regimen.overrides).toHaveLength(1);
    expect(decoded.dailyLogs).toHaveLength(1);
    expect(decoded.routineTemplates).toHaveLength(1);
    expect(decoded.futureField).toEqual({ preserved: true });
  });

  it("rejects an unsupported schema instead of guessing", () => {
    expect(() => decodeState({ ...legacyV2State, schemaVersion: 99 })).toThrow(
      "Unsupported schema version: 99",
    );
  });

  it("rejects malformed nested routine and event times", () => {
    expect(() =>
      decodeState({
        ...legacyV2State,
        regimen: {
          ...legacyV2State.regimen,
          routine: {
            ...legacyV2State.regimen.routine,
            meals: [{ id: "breakfast", name: "breakfast", time: { minuteOfDay: 1440 } }],
          },
        },
      }),
    ).toThrow("breakfast.mealTime: invalid time");
    expect(() =>
      decodeState({
        ...legacyV2State,
        dailyLogs: [
          {
            localDate: "2026-09-09",
            events: [
              { id: "bad", kind: "supplement_taken", itemId: "x", time: { minuteOfDay: -1 } },
            ],
          },
        ],
      }),
    ).toThrow("dailyLogs[0].events[0].time: invalid time");
  });
});
