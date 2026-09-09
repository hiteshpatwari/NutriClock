import type { CanonicalRegimen, PersistedNutriClockState } from "@nutriclock/domain";

export interface RegimenRepository {
  load(): Promise<PersistedNutriClockState | null>;
  save(state: PersistedNutriClockState): Promise<void>;
  clear(): Promise<void>;
}

export type LoadResult =
  | { kind: "empty" }
  | { kind: "loaded"; state: PersistedNutriClockState }
  | { kind: "corrupt"; reason: string }
  | { kind: "incompatible"; schemaVersion: number };

export const CURRENT_SCHEMA_VERSION = 1;

export function createEmptyState(regimen: CanonicalRegimen): PersistedNutriClockState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rulesetVersionLastEvaluated: null,
    evidenceRegistryVersionLastEvaluated: null,
    regimen,
    dailyLogs: [],
  };
}

export function decodeState(value: unknown): PersistedNutriClockState {
  if (!value || typeof value !== "object") throw new Error("NutriClock data is not an object");
  const state = value as Partial<PersistedNutriClockState>;
  if (state.schemaVersion !== CURRENT_SCHEMA_VERSION)
    throw new Error(`Unsupported schema version: ${String(state.schemaVersion)}`);
  if (!state.regimen || typeof state.regimen !== "object")
    throw new Error("NutriClock regimen is missing");
  if (!state.rulesetVersionLastEvaluated && state.rulesetVersionLastEvaluated !== null)
    throw new Error("Ruleset version metadata is invalid");
  if (
    !state.evidenceRegistryVersionLastEvaluated &&
    state.evidenceRegistryVersionLastEvaluated !== null
  )
    throw new Error("Evidence version metadata is invalid");
  if (state.dailyLogs !== undefined && !Array.isArray(state.dailyLogs))
    throw new Error("Daily execution logs are invalid");
  if (state.routineTemplates !== undefined && !Array.isArray(state.routineTemplates))
    throw new Error("Routine templates are invalid");
  return state as PersistedNutriClockState;
}

export function encodeState(state: PersistedNutriClockState): string {
  return JSON.stringify(state);
}

export function decodeSerializedState(serialized: string): PersistedNutriClockState {
  return decodeState(JSON.parse(serialized) as unknown);
}
