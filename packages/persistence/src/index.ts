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

function validateCanonicalRegimen(regimen: CanonicalRegimen): string[] {
  const errors: string[] = [];
  const validateTime = (label: string, value: unknown) => {
    const minuteOfDay = (value as { minuteOfDay?: unknown } | null)?.minuteOfDay;
    if (
      !Number.isInteger(minuteOfDay) ||
      (minuteOfDay as number) < 0 ||
      (minuteOfDay as number) > 1439
    )
      errors.push(`${label}: invalid time`);
  };
  validateTime("wakeTime", regimen.routine.wakeTime);
  validateTime("bedtime", regimen.routine.bedtime);
  for (const meal of regimen.routine.meals) validateTime(`${meal.id}.mealTime`, meal.time);
  for (const beverage of regimen.routine.beverages)
    validateTime(`${beverage.id}.beverageTime`, beverage.time);
  for (const item of regimen.supplements) {
    if (!Number.isFinite(item.dose) || item.dose < 0) errors.push(`${item.id}: invalid dose`);
    if (item.preferredTime) validateTime(`${item.id}.preferredTime`, item.preferredTime);
  }
  for (const anchor of regimen.medications) {
    if (anchor.administrationTime)
      validateTime(`${anchor.id}.administrationTime`, anchor.administrationTime);
    for (const [index, value] of (anchor.explicitAdministrationTimes ?? []).entries())
      validateTime(`${anchor.id}.explicitAdministrationTimes[${index}]`, value);
  }
  for (const override of regimen.overrides)
    validateTime(`${override.id}.selectedTime`, override.selectedTime);
  return errors;
}

function validateDailyLogs(value: unknown): string[] {
  if (!Array.isArray(value)) return ["Daily execution logs are invalid"];
  const errors: string[] = [];
  const validateTime = (label: string, candidate: unknown) => {
    const minuteOfDay = (candidate as { minuteOfDay?: unknown } | null)?.minuteOfDay;
    if (
      !Number.isInteger(minuteOfDay) ||
      (minuteOfDay as number) < 0 ||
      (minuteOfDay as number) > 1439
    )
      errors.push(`${label}: invalid time`);
  };
  value.forEach((entry, entryIndex) => {
    const record = entry as { localDate?: unknown; events?: unknown } | null;
    if (!record || typeof record !== "object" || typeof record.localDate !== "string") {
      errors.push(`dailyLogs[${entryIndex}]: invalid log`);
      return;
    }
    if (!Array.isArray(record.events)) {
      errors.push(`dailyLogs[${entryIndex}].events: invalid events`);
      return;
    }
    record.events.forEach((event, eventIndex) => {
      const candidate = event as { time?: unknown; until?: unknown } | null;
      if (!candidate || typeof candidate !== "object") {
        errors.push(`dailyLogs[${entryIndex}].events[${eventIndex}]: invalid event`);
        return;
      }
      if ("time" in candidate)
        validateTime(`dailyLogs[${entryIndex}].events[${eventIndex}].time`, candidate.time);
      if ("until" in candidate)
        validateTime(`dailyLogs[${entryIndex}].events[${eventIndex}].until`, candidate.until);
    });
  });
  return errors;
}

function validateRoutineTemplates(value: unknown): string[] {
  if (!Array.isArray(value)) return ["Routine templates are invalid"];
  const errors: string[] = [];
  for (const [index, entry] of value.entries()) {
    const template = entry as { name?: unknown; routine?: unknown } | null;
    if (!template || typeof template !== "object" || typeof template.name !== "string") {
      errors.push(`routineTemplates[${index}]: invalid template`);
      continue;
    }
    const routine = template.routine as Partial<CanonicalRegimen["routine"]> | undefined;
    if (
      !routine ||
      typeof routine !== "object" ||
      !Array.isArray(routine.meals) ||
      !Array.isArray(routine.beverages)
    ) {
      errors.push(`routineTemplates[${index}].routine: invalid routine`);
      continue;
    }
    const validateTime = (label: string, candidate: unknown) => {
      const minuteOfDay = (candidate as { minuteOfDay?: unknown } | null)?.minuteOfDay;
      if (
        !Number.isInteger(minuteOfDay) ||
        (minuteOfDay as number) < 0 ||
        (minuteOfDay as number) > 1439
      )
        errors.push(`${label}: invalid time`);
    };
    validateTime(`routineTemplates[${index}].wakeTime`, routine.wakeTime);
    validateTime(`routineTemplates[${index}].bedtime`, routine.bedtime);
    routine.meals.forEach((meal) => validateTime(`routineTemplates[${index}].meal`, meal.time));
    routine.beverages.forEach((beverage) =>
      validateTime(`routineTemplates[${index}].beverage`, beverage.time),
    );
  }
  return errors;
}

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
  const regimen = state.regimen as Partial<CanonicalRegimen>;
  if (
    !regimen.routine ||
    typeof regimen.routine !== "object" ||
    !Array.isArray(regimen.routine.meals) ||
    !Array.isArray(regimen.routine.beverages) ||
    !Array.isArray(regimen.supplements) ||
    !Array.isArray(regimen.medications) ||
    !Array.isArray(regimen.overrides)
  )
    throw new Error("NutriClock regimen structure is invalid");
  const regimenErrors = validateCanonicalRegimen(state.regimen as CanonicalRegimen);
  if (regimenErrors.length)
    throw new Error(`NutriClock regimen is invalid: ${regimenErrors.join(" ")}`);
  if (!state.rulesetVersionLastEvaluated && state.rulesetVersionLastEvaluated !== null)
    throw new Error("Ruleset version metadata is invalid");
  if (
    !state.evidenceRegistryVersionLastEvaluated &&
    state.evidenceRegistryVersionLastEvaluated !== null
  )
    throw new Error("Evidence version metadata is invalid");
  const dailyLogErrors = state.dailyLogs === undefined ? [] : validateDailyLogs(state.dailyLogs);
  if (dailyLogErrors.length) throw new Error(dailyLogErrors.join(" "));
  const templateErrors =
    state.routineTemplates === undefined ? [] : validateRoutineTemplates(state.routineTemplates);
  if (templateErrors.length) throw new Error(templateErrors.join(" "));
  return state as PersistedNutriClockState;
}

export function encodeState(state: PersistedNutriClockState): string {
  return JSON.stringify(state);
}

export function decodeSerializedState(serialized: string): PersistedNutriClockState {
  return decodeState(JSON.parse(serialized) as unknown);
}
