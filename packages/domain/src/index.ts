import rawRules from "../../../NutriClock_Rules_V1.json";

export type StableId = string;
export type MinuteOfDay = number;
export interface LocalTime {
  minuteOfDay: MinuteOfDay;
}

export type DoseUnit = "mg" | "mcg" | "g" | "IU" | "mL" | "other";
export type DoseBasis = "elemental" | "product_label_amount" | "unknown";
export type OnceDailyFrequency = { kind: "once_daily" };

export interface NormalizedMassDose {
  dimension: "mass";
  amountMcg: number;
  basis: DoseBasis;
}

export interface NormalizedDose {
  dimension: "mass" | "international_unit" | "volume" | "other";
  amount: number;
  canonicalUnit: "mcg" | "IU" | "mL" | "other";
  basis: DoseBasis;
}

export type MealName = "breakfast" | "lunch" | "dinner" | "snack";
export interface MealEvent {
  id: StableId;
  name: MealName;
  time: LocalTime;
  containsDietaryFat?: boolean;
}

export interface BeverageEvent {
  id: StableId;
  kind: "coffee" | "tea";
  time: LocalTime;
}

export interface DailyRoutine {
  wakeTime: LocalTime;
  bedtime: LocalTime;
  meals: MealEvent[];
  beverages: BeverageEvent[];
}

export interface RoutineTemplate {
  id: StableId;
  name: string;
  routine: DailyRoutine;
}

export type SupplementId =
  | "iron"
  | "vitamin_c"
  | "vitamin_d3"
  | "vitamin_b12"
  | "calcium"
  | "magnesium"
  | "zinc"
  | "folate"
  | "omega_3";

export type SupplementFormId =
  "iron_oral_common" | "calcium_carbonate" | "calcium_citrate" | "unspecified";

export interface SupplementCatalogItem {
  id: SupplementId;
  displayName: string;
  supportedForms: SupplementFormId[];
  defaultUnit: DoseUnit;
  supportedUnits: DoseUnit[];
  doseBasisRelevant: boolean;
}

export interface SupplementEntry {
  id: StableId;
  supplementId: SupplementId;
  formId: SupplementFormId;
  dose: number;
  unit: DoseUnit;
  doseBasis: DoseBasis;
  frequency: OnceDailyFrequency;
  preferredTime?: LocalTime;
  userLabel?: string;
}

export type MedicationId =
  | "levothyroxine"
  | "tetracycline_antibiotic"
  | "quinolone_antibiotic"
  | "oral_bisphosphonate"
  | "dolutegravir"
  | "penicillamine"
  | "proton_pump_inhibitor"
  | "metformin"
  | "warfarin_selected_anticoagulant"
  | "methotrexate"
  | "selected_antiepileptic"
  | "levodopa";

export type MedicationReference =
  | { kind: "supported"; medicationId: MedicationId }
  | { kind: "unsupported"; userEnteredName: string };

export interface MedicationAnchor {
  id: StableId;
  displayName: string;
  reference: MedicationReference;
  administrationTime: LocalTime;
  userNote?: string;
  explicitAdministrationTimes?: LocalTime[];
}

export interface UserPreferences {
  flexibleItemGrouping: "prefer_grouping" | "prefer_separate";
  remindersEnabled?: boolean;
  reminderLeadMinutes?: 0 | 15 | 30;
}

export interface UserOverride {
  id: StableId;
  itemId: StableId;
  selectedTime: LocalTime;
  kind: "preference_override";
  acknowledgedRuleIds: string[];
  createdFromRulesetVersion: string;
}

export interface CanonicalRegimen {
  routine: DailyRoutine;
  supplements: SupplementEntry[];
  medications: MedicationAnchor[];
  preferences: UserPreferences;
  overrides: UserOverride[];
}

export interface PersistedNutriClockState {
  schemaVersion: number;
  rulesetVersionLastEvaluated: string | null;
  evidenceRegistryVersionLastEvaluated: string | null;
  regimen: CanonicalRegimen;
  dailyLogs?: DailyExecutionLog[];
  routineTemplates?: RoutineTemplate[];
}

export type DayEvent =
  | { id: StableId; kind: "wake_time_changed"; time: LocalTime }
  | { id: StableId; kind: "bedtime_changed"; time: LocalTime }
  | {
      id: StableId;
      kind: "meal_recorded";
      mealName: MealName;
      time: LocalTime;
      containsDietaryFat?: boolean;
    }
  | { id: StableId; kind: "meal_skipped"; mealName: MealName; time: LocalTime }
  | { id: StableId; kind: "beverage_recorded"; beverageKind: "coffee" | "tea"; time: LocalTime }
  | { id: StableId; kind: "beverage_skipped"; beverageKind: "coffee" | "tea"; time: LocalTime }
  | { id: StableId; kind: "medication_taken"; anchorId: StableId; time: LocalTime }
  | { id: StableId; kind: "supplement_taken"; itemId: StableId; time: LocalTime }
  | { id: StableId; kind: "supplement_skipped"; itemId: StableId; time: LocalTime }
  | {
      id: StableId;
      kind: "supplement_snoozed";
      itemId: StableId;
      time: LocalTime;
      until: LocalTime;
    };

export interface DayContext {
  localDate: string;
  now: LocalTime;
  events: DayEvent[];
}

export interface DailyExecutionLog {
  localDate: string;
  events: DayEvent[];
}

export type ExecutionStatus = "planned" | "taken" | "snoozed" | "skipped";

export interface TodayScheduleItem {
  item: ScheduleItem;
  executionStatus: ExecutionStatus;
  availableNow: boolean;
}

export interface AvailabilityDecision {
  itemId: StableId;
  status: "available_now" | "wait" | "completed" | "skipped" | "unavailable_today";
  nextValidTime?: LocalTime;
  ruleIds: string[];
  evidenceIds: string[];
  message: string;
}

export interface AdaptiveScheduleResult {
  context: DayContext;
  schedule: ScheduleResult;
  items: TodayScheduleItem[];
  availability: AvailabilityDecision[];
}

export type ScheduleComplexity = "simple" | "moderate" | "complex" | "needs_attention";

export interface ScheduleQualitySummary {
  complexity: ScheduleComplexity;
  supplementWindowCount: number;
  blockingConflictCount: number;
  preferenceConflictCount: number;
  flexibleSupplementCount: number;
  message: string;
}

export interface WeeklyReviewSummary {
  weekStart: string;
  weekEnd: string;
  daysWithActivity: number;
  supplementTakenCount: number;
  supplementSkippedCount: number;
  supplementSnoozedCount: number;
  adjustmentCount: number;
  medicationEventCount: number;
  executionRate: number | null;
  mostSkippedItem?: { itemId: StableId; displayName: string; count: number };
  mostSnoozedItem?: { itemId: StableId; displayName: string; count: number };
}

export interface ReminderDecision {
  itemId: StableId;
  status: "due" | "upcoming" | "waiting" | "completed" | "skipped";
  scheduledTime?: LocalTime;
  message: string;
  ruleIds: string[];
  evidenceIds: string[];
}

export interface ConvenienceInsight {
  kind: "frequently_skipped" | "frequently_snoozed" | "frequent_adjustments";
  itemId?: StableId;
  message: string;
  count: number;
}

export interface EvidenceReference {
  id: string;
  organization: string;
  title: string;
  url: string;
  reviewedAt: string;
  sourceRevision?: string;
}

export type RuleClassification =
  | "hard_schedule_constraint"
  | "strong_preference"
  | "weak_preference"
  | "clinical_warning"
  | "informational";

export type RuleDirection =
  "symmetric" | "source_before_target" | "target_before_source" | "asymmetric";

export type RuleEffect =
  | "require_separation"
  | "prefer_separation"
  | "prefer_together"
  | "prefer_with_food"
  | "prefer_empty_stomach"
  | "prefer_meal_characteristic"
  | "warning"
  | "informational";

export type EvidenceStrength = "authoritative_guidance" | "supported" | "limited" | "uncertain";

export type RuleCondition =
  | { type: "supplement_form_is"; supplementId: SupplementId; formId: SupplementFormId }
  | {
      type: "dose_at_least";
      supplementId: SupplementId;
      amount: number;
      unit: DoseUnit;
      basis: DoseBasis;
    }
  | { type: "meal_contains_dietary_fat"; value: true }
  | { type: "medication_is"; medicationId: MedicationId }
  | { type: "event_kind_is"; eventKind: "coffee" | "tea" };

export interface InteractionRule {
  id: string;
  sourceId: string;
  targetId: string;
  classification: RuleClassification;
  effect: RuleEffect;
  direction: RuleDirection;
  minimumSeparationMinutes?: number;
  sourceBeforeTargetMinutes?: number;
  targetBeforeSourceMinutes?: number;
  conditions?: RuleCondition[];
  rationale: string;
  userMessage: string;
  evidenceIds: string[];
  evidenceStrength: EvidenceStrength;
  overridable: boolean;
  rulesetVersion: string;
  status: "active" | "RULE_REVIEW_REQUIRED" | "retired";
}

export interface KnowledgeSnapshot {
  rulesetVersion: string;
  evidenceRegistryVersion: string;
  evidence: Record<string, EvidenceReference>;
  rules: InteractionRule[];
}

export interface KnowledgeValidationResult {
  valid: boolean;
  errors: string[];
  activeRuleIds: string[];
}

export interface SchedulerConfig {
  candidateResolutionMinutes: 15 | 30;
  maxRepairDepth: number;
  algorithmVersion: string;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  candidateResolutionMinutes: 15,
  maxRepairDepth: 3,
  algorithmVersion: "greedy-repair-v1",
};

export interface SchedulerOptions {
  traceMode?: "summary" | "full";
  config?: SchedulerConfig;
  temporaryMedicationAnchors?: MedicationAnchor[];
}

export interface CandidateRuleEvaluation {
  ruleId: string;
  classification: RuleClassification;
  result: "satisfied" | "violated" | "not_applicable" | "warning";
  scoreImpact?: number;
}

export interface CandidateSummary {
  time: LocalTime;
  hardValid: boolean;
  scoreVector: number[];
  evaluations: CandidateRuleEvaluation[];
}

export interface ScheduleDecisionTrace {
  itemId: StableId;
  selectedTime?: LocalTime;
  traceMode: "summary" | "full";
  consideredCandidateCount: number;
  rejectedHardCandidateCount: number;
  objective: {
    strongPenalty: number;
    weakPenalty: number;
    userPreferenceDistance: number;
    newWindowCount: number;
  };
  consideredCandidates?: CandidateSummary[];
  selectedCandidateReason: string;
  influencingRuleIds: string[];
}

export interface ScheduleExplanation {
  title: string;
  bullets: string[];
  ruleIds: string[];
  evidenceIds: string[];
  flexible: boolean;
  administrationGuidance?: AdministrationGuidance;
}

export interface GuidanceItem {
  id: string;
  text: string;
  evidenceIds: string[];
}

export interface AdministrationGuidance {
  takeWith?: GuidanceItem[];
  avoidAroundDose?: GuidanceItem[];
  foodInstruction?: GuidanceItem;
  fallbackInstruction?: GuidanceItem;
}

export interface ScheduleItem {
  id: StableId;
  kind: "supplement" | "medication_anchor";
  sourceId: StableId;
  displayName: string;
  time?: LocalTime;
  timingState: "scheduled" | "flexible" | "user_selected" | "conflicted";
  fixed: boolean;
  userSelected: boolean;
  influencingRuleIds: string[];
  evidenceIds: string[];
  explanation: ScheduleExplanation;
}

export interface ScheduleConflict {
  id: string;
  kind: "hard_schedule_conflict" | "preference_conflict";
  reason: "no_hard_valid_candidate" | "bounded_repair_exhausted" | "user_override_rejected";
  severity: "blocking" | "review";
  itemIds: StableId[];
  ruleIds: string[];
  message: string;
  overridable: boolean;
}

export interface ClinicalWarning {
  id: string;
  kind: "clinical_warning" | "informational";
  ruleId: string;
  itemIds: StableId[];
  message: string;
  evidenceIds: string[];
  requiresClinicalReview: boolean;
}

export interface UnsupportedMedicationNotice {
  anchorId: StableId;
  displayName: string;
  message: string;
}

export interface ScheduleMetadata {
  rulesetVersion: string;
  evidenceRegistryVersion: string;
  schedulerAlgorithmVersion: string;
}

export interface ScheduleResult {
  status: "complete" | "complete_with_conflicts" | "incomplete";
  items: ScheduleItem[];
  warnings: ClinicalWarning[];
  unsupportedMedications: UnsupportedMedicationNotice[];
  conflicts: ScheduleConflict[];
  decisionTraces: ScheduleDecisionTrace[];
  metadata: ScheduleMetadata;
}

export interface ScheduleSimplificationComparison {
  current: ScheduleResult;
  simpler: ScheduleResult;
  currentWindowCount: number;
  simplerWindowCount: number;
  canSimplify: boolean;
  message: string;
}

export interface GeneratedScheduleView {
  schedule: ScheduleResult;
  generatedAt: string;
}

export const SUPPLEMENT_CATALOG: SupplementCatalogItem[] = [
  {
    id: "iron",
    displayName: "Iron",
    supportedForms: ["iron_oral_common", "unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: true,
  },
  {
    id: "vitamin_c",
    displayName: "Vitamin C",
    supportedForms: ["unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: false,
  },
  {
    id: "vitamin_d3",
    displayName: "Vitamin D3",
    supportedForms: ["unspecified"],
    defaultUnit: "IU",
    supportedUnits: ["IU", "mcg"],
    doseBasisRelevant: false,
  },
  {
    id: "vitamin_b12",
    displayName: "Vitamin B12",
    supportedForms: ["unspecified"],
    defaultUnit: "mcg",
    supportedUnits: ["mcg", "mg"],
    doseBasisRelevant: false,
  },
  {
    id: "calcium",
    displayName: "Calcium",
    supportedForms: ["calcium_carbonate", "calcium_citrate", "unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: true,
  },
  {
    id: "magnesium",
    displayName: "Magnesium",
    supportedForms: ["unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: false,
  },
  {
    id: "zinc",
    displayName: "Zinc",
    supportedForms: ["unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: false,
  },
  {
    id: "folate",
    displayName: "Folate / folic acid",
    supportedForms: ["unspecified"],
    defaultUnit: "mcg",
    supportedUnits: ["mcg", "mg", "g"],
    doseBasisRelevant: false,
  },
  {
    id: "omega_3",
    displayName: "Omega-3",
    supportedForms: ["unspecified"],
    defaultUnit: "mg",
    supportedUnits: ["mg", "mcg", "g"],
    doseBasisRelevant: false,
  },
];

export const MEDICATION_CATALOG: Array<{ id: MedicationId; displayName: string }> = [
  { id: "levothyroxine", displayName: "Levothyroxine / Synthroid" },
  { id: "tetracycline_antibiotic", displayName: "Tetracycline antibiotic" },
  { id: "quinolone_antibiotic", displayName: "Quinolone antibiotic" },
  { id: "oral_bisphosphonate", displayName: "Oral bisphosphonate" },
  { id: "dolutegravir", displayName: "Dolutegravir" },
  { id: "penicillamine", displayName: "Penicillamine" },
  { id: "proton_pump_inhibitor", displayName: "Proton-pump inhibitor" },
  { id: "metformin", displayName: "Metformin" },
  { id: "warfarin_selected_anticoagulant", displayName: "Warfarin / selected anticoagulant" },
  { id: "methotrexate", displayName: "Methotrexate" },
  { id: "selected_antiepileptic", displayName: "Selected antiepileptic" },
  { id: "levodopa", displayName: "Levodopa" },
];

type RawKnowledge = {
  rulesetVersion: string;
  evidenceRegistryVersion: string;
  evidence: EvidenceReference[];
  rules: InteractionRule[];
};

export function loadKnowledgeSnapshot(): KnowledgeSnapshot {
  const source = rawRules as RawKnowledge;
  return {
    rulesetVersion: source.rulesetVersion,
    evidenceRegistryVersion: source.evidenceRegistryVersion,
    evidence: Object.fromEntries(source.evidence.map((entry) => [entry.id, entry])),
    rules: source.rules,
  };
}

export function validateKnowledgeSnapshot(snapshot: KnowledgeSnapshot): KnowledgeValidationResult {
  const errors: string[] = [];
  const activeRuleIds: string[] = [];
  const supplementIds = new Set(SUPPLEMENT_CATALOG.map((entry) => entry.id));
  const medicationIds = new Set(MEDICATION_CATALOG.map((entry) => entry.id));
  const formIds = new Set<SupplementFormId>([
    "unspecified",
    "iron_oral_common",
    "calcium_carbonate",
    "calcium_citrate",
  ]);
  const doseUnits = new Set<DoseUnit>(["mg", "mcg", "g", "IU", "mL", "other"]);
  const doseBases = new Set<DoseBasis>(["elemental", "product_label_amount", "unknown"]);
  for (const rule of snapshot.rules) {
    if (rule.status !== "active") continue;
    activeRuleIds.push(rule.id);
    if (!rule.evidenceIds.length) errors.push(`${rule.id}: active rule has no evidence`);
    for (const evidenceId of rule.evidenceIds) {
      if (!snapshot.evidence[evidenceId]) errors.push(`${rule.id}: unknown evidence ${evidenceId}`);
    }
    if (rule.rulesetVersion !== snapshot.rulesetVersion) {
      errors.push(`${rule.id}: ruleset version mismatch`);
    }
    if (
      rule.effect === "require_separation" &&
      rule.classification !== "hard_schedule_constraint"
    ) {
      errors.push(`${rule.id}: require_separation must be hard_schedule_constraint`);
    }
    if (
      rule.direction === "symmetric" &&
      rule.minimumSeparationMinutes !== undefined &&
      rule.minimumSeparationMinutes < 0
    ) {
      errors.push(`${rule.id}: negative separation`);
    }
    if (
      (rule.direction === "asymmetric" || rule.direction === "source_before_target") &&
      rule.sourceBeforeTargetMinutes === undefined
    ) {
      errors.push(`${rule.id}: missing source-before-target interval`);
    }
    if (
      (rule.direction === "asymmetric" || rule.direction === "target_before_source") &&
      rule.targetBeforeSourceMinutes === undefined
    ) {
      errors.push(`${rule.id}: missing target-before-source interval`);
    }
    if (rule.classification === "clinical_warning" && rule.effect !== "warning") {
      errors.push(`${rule.id}: clinical warning must have warning effect`);
    }
    for (const condition of rule.conditions ?? []) {
      if (condition.type === "supplement_form_is") {
        if (!supplementIds.has(condition.supplementId)) {
          errors.push(`${rule.id}: unknown supplement condition ${condition.supplementId}`);
        }
        if (!formIds.has(condition.formId))
          errors.push(`${rule.id}: unknown supplement form condition ${condition.formId}`);
      } else if (condition.type === "dose_at_least") {
        if (!supplementIds.has(condition.supplementId)) {
          errors.push(`${rule.id}: unknown dose condition supplement ${condition.supplementId}`);
        }
        if (!Number.isFinite(condition.amount) || condition.amount < 0) {
          errors.push(`${rule.id}: invalid dose condition amount`);
        }
        if (!doseUnits.has(condition.unit)) errors.push(`${rule.id}: invalid dose condition unit`);
        if (!doseBases.has(condition.basis))
          errors.push(`${rule.id}: invalid dose condition basis`);
      } else if (condition.type === "meal_contains_dietary_fat" && condition.value !== true) {
        errors.push(`${rule.id}: dietary-fat condition must require true`);
      } else if (condition.type === "medication_is" && !medicationIds.has(condition.medicationId)) {
        errors.push(`${rule.id}: unknown medication condition ${condition.medicationId}`);
      } else if (
        condition.type === "event_kind_is" &&
        condition.eventKind !== "coffee" &&
        condition.eventKind !== "tea"
      ) {
        errors.push(`${rule.id}: invalid routine event condition`);
      }
    }
  }
  return { valid: errors.length === 0, errors, activeRuleIds };
}

export function activeRules(snapshot: KnowledgeSnapshot): InteractionRule[] {
  return snapshot.rules.filter((rule) => rule.status === "active");
}

export function normalizeDose(dose: number, unit: DoseUnit, basis: DoseBasis): NormalizedDose {
  if (unit === "g")
    return { dimension: "mass", amount: dose * 1_000_000, canonicalUnit: "mcg", basis };
  if (unit === "mg")
    return { dimension: "mass", amount: dose * 1_000, canonicalUnit: "mcg", basis };
  if (unit === "mcg") return { dimension: "mass", amount: dose, canonicalUnit: "mcg", basis };
  if (unit === "IU")
    return { dimension: "international_unit", amount: dose, canonicalUnit: "IU", basis };
  if (unit === "mL") return { dimension: "volume", amount: dose, canonicalUnit: "mL", basis };
  return { dimension: "other", amount: dose, canonicalUnit: "other", basis };
}

export function canonicalizeRegimen(input: CanonicalRegimen): CanonicalRegimen {
  return {
    routine: {
      wakeTime: { ...input.routine.wakeTime },
      bedtime: { ...input.routine.bedtime },
      meals: [...input.routine.meals]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((meal) => ({ ...meal, time: { ...meal.time } })),
      beverages: [...input.routine.beverages]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((event) => ({ ...event, time: { ...event.time } })),
    },
    supplements: [...input.supplements]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => ({ ...item })),
    medications: [...input.medications]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => ({ ...item })),
    preferences: { ...input.preferences },
    overrides: [...input.overrides]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((item) => ({ ...item })),
  };
}

export function validateRegimen(regimen: CanonicalRegimen): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validateTime = (label: string, time: LocalTime) => {
    if (!Number.isInteger(time.minuteOfDay) || time.minuteOfDay < 0 || time.minuteOfDay > 1439) {
      errors.push(`${label}: invalid time`);
    }
  };
  validateTime("wakeTime", regimen.routine.wakeTime);
  validateTime("bedtime", regimen.routine.bedtime);
  if (regimen.routine.wakeTime.minuteOfDay === regimen.routine.bedtime.minuteOfDay) {
    errors.push("wakeTime and bedtime cannot be equal");
  }
  for (const item of regimen.supplements) {
    if (!Number.isFinite(item.dose) || item.dose < 0) errors.push(`${item.id}: invalid dose`);
    if (item.preferredTime) validateTime(`${item.id}.preferredTime`, item.preferredTime);
  }
  return { valid: errors.length === 0, errors };
}

type TimelineMinute = number;
interface InternalPlacement {
  itemId: StableId;
  timelineMinute: TimelineMinute;
  localTime: LocalTime;
}
interface Score {
  strongPenalty: number;
  weakPenalty: number;
  userPreferenceDistance: number;
  newWindowCount: number;
  evaluations: CandidateRuleEvaluation[];
}

function toTimeline(time: LocalTime, wake: LocalTime): TimelineMinute {
  return (time.minuteOfDay - wake.minuteOfDay + 1440) % 1440;
}

function fromTimeline(timelineMinute: number, wake: LocalTime): LocalTime {
  return { minuteOfDay: (timelineMinute + wake.minuteOfDay) % 1440 };
}

function usableDayMinutes(regimen: CanonicalRegimen): number {
  return toTimeline(regimen.routine.bedtime, regimen.routine.wakeTime);
}

function matchesSupplement(id: string, item: SupplementEntry): boolean {
  return id === item.supplementId;
}

function supportedMedicationId(anchor: MedicationAnchor): MedicationId | undefined {
  return anchor.reference.kind === "supported" ? anchor.reference.medicationId : undefined;
}

function matchesMedication(id: string, anchor: MedicationAnchor): boolean {
  return supportedMedicationId(anchor) === id;
}

function conditionsMatchForSupplement(rule: InteractionRule, item: SupplementEntry): boolean {
  for (const condition of rule.conditions ?? []) {
    if (
      condition.type === "supplement_form_is" &&
      (condition.supplementId !== item.supplementId || condition.formId !== item.formId)
    )
      return false;
    if (condition.type === "dose_at_least" && condition.supplementId === item.supplementId) {
      const normalized = normalizeDose(item.dose, item.unit, item.doseBasis);
      const required = normalizeDose(condition.amount, condition.unit, condition.basis);
      if (
        normalized.dimension !== required.dimension ||
        normalized.canonicalUnit !== required.canonicalUnit ||
        normalized.basis !== required.basis ||
        normalized.amount < required.amount
      )
        return false;
    }
  }
  return true;
}

function ruleMatchesSupplementPair(
  rule: InteractionRule,
  a: SupplementEntry,
  b: SupplementEntry,
): boolean {
  const direct = matchesSupplement(rule.sourceId, a) && matchesSupplement(rule.targetId, b);
  const reverse = matchesSupplement(rule.sourceId, b) && matchesSupplement(rule.targetId, a);
  return (
    (direct || reverse) &&
    conditionsMatchForSupplement(rule, direct ? a : b) &&
    conditionsMatchForSupplement(rule, direct ? b : a)
  );
}

function ruleMatchesSupplementMedication(
  rule: InteractionRule,
  item: SupplementEntry,
  anchor: MedicationAnchor,
): boolean {
  const direct = matchesSupplement(rule.sourceId, item) && matchesMedication(rule.targetId, anchor);
  const reverse =
    matchesMedication(rule.sourceId, anchor) && matchesSupplement(rule.targetId, item);
  return (direct || reverse) && conditionsMatchForSupplement(rule, item);
}

function satisfiesRelation(rule: InteractionRule, source: number, target: number): boolean {
  if (rule.direction === "symmetric") {
    return (
      rule.minimumSeparationMinutes === undefined ||
      Math.abs(source - target) >= rule.minimumSeparationMinutes
    );
  }
  const sourceBefore =
    rule.sourceBeforeTargetMinutes === undefined ||
    target - source >= rule.sourceBeforeTargetMinutes;
  const targetBefore =
    rule.targetBeforeSourceMinutes === undefined ||
    source - target >= rule.targetBeforeSourceMinutes;
  if (rule.direction === "source_before_target") return sourceBefore;
  if (rule.direction === "target_before_source") return targetBefore;
  return sourceBefore || targetBefore;
}

function scoreEffect(
  rule: InteractionRule,
  source: number,
  target: number,
): { satisfied: boolean; penalty: number } {
  if (rule.effect === "prefer_together")
    return {
      satisfied: source === target,
      penalty: source === target ? 0 : Math.abs(source - target) + 1,
    };
  if (rule.effect === "prefer_with_food" || rule.effect === "prefer_meal_characteristic")
    return { satisfied: source === target, penalty: source === target ? 0 : 1 };
  if (
    rule.effect === "prefer_separation" ||
    rule.effect === "prefer_empty_stomach" ||
    rule.effect === "require_separation"
  ) {
    const satisfied = satisfiesRelation(rule, source, target);
    return { satisfied, penalty: satisfied ? 0 : 1 };
  }
  return { satisfied: true, penalty: 0 };
}

function rulePriorityPenalty(
  rule: InteractionRule,
  penalty: number,
): { strong: number; weak: number } {
  if (rule.classification === "strong_preference") return { strong: penalty, weak: 0 };
  if (rule.classification === "weak_preference") return { strong: 0, weak: penalty };
  return { strong: 0, weak: 0 };
}

function eventTimeline(time: LocalTime, regimen: CanonicalRegimen): number {
  return toTimeline(time, regimen.routine.wakeTime);
}

function isCandidateInUsableDay(time: LocalTime, regimen: CanonicalRegimen): boolean {
  return eventTimeline(time, regimen) <= usableDayMinutes(regimen);
}

function candidateTimes(
  item: SupplementEntry,
  regimen: CanonicalRegimen,
  config: SchedulerConfig,
): LocalTime[] {
  const end = usableDayMinutes(regimen);
  const times = new Set<number>();
  for (let minute = 0; minute <= end; minute += config.candidateResolutionMinutes)
    times.add(minute);
  const add = (time: LocalTime | undefined) => {
    if (time && isCandidateInUsableDay(time, regimen)) times.add(eventTimeline(time, regimen));
  };
  add(item.preferredTime);
  for (const meal of regimen.routine.meals) add(meal.time);
  for (const beverage of regimen.routine.beverages) add(beverage.time);
  const override = regimen.overrides.find((entry) => entry.itemId === item.id);
  add(override?.selectedTime);
  return [...times]
    .sort((a, b) => a - b)
    .map((minute) => fromTimeline(minute, regimen.routine.wakeTime));
}

function relationForRoutineRule(
  rule: InteractionRule,
  itemTime: number,
  regimen: CanonicalRegimen,
): { satisfied: boolean; penalty: number; applicable: boolean } {
  if (rule.targetId === "routine:meal") {
    const meals = regimen.routine.meals.filter((meal) => {
      if (rule.conditions?.some((condition) => condition.type === "meal_contains_dietary_fat"))
        return meal.containsDietaryFat === true;
      return true;
    });
    if (!meals.length) return { satisfied: false, penalty: 0, applicable: false };
    const results = meals.map((meal) =>
      scoreEffect(rule, itemTime, eventTimeline(meal.time, regimen)),
    );
    const best = results.reduce((currentBest, current) =>
      current.penalty < currentBest.penalty ? current : currentBest,
    );
    return { ...best, applicable: true };
  }
  const eventKind =
    rule.targetId === "routine:coffee"
      ? "coffee"
      : rule.targetId === "routine:tea"
        ? "tea"
        : undefined;
  const events = regimen.routine.beverages.filter((event) => event.kind === eventKind);
  if (!events.length) return { satisfied: false, penalty: 0, applicable: false };
  const results = events.map((event) =>
    scoreEffect(rule, itemTime, eventTimeline(event.time, regimen)),
  );
  const best = results.reduce((currentBest, current) =>
    current.penalty < currentBest.penalty ? current : currentBest,
  );
  return { ...best, applicable: true };
}

function evaluateCandidate(
  item: SupplementEntry,
  localTime: LocalTime,
  regimen: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
  anchors: InternalPlacement[],
  placed: InternalPlacement[],
): { hardValid: boolean; score: Score; influencingRuleIds: string[] } {
  const itemTime = eventTimeline(localTime, regimen);
  let hardValid = true;
  let strongPenalty = 0;
  let weakPenalty = 0;
  const evaluations: CandidateRuleEvaluation[] = [];
  const influencingRuleIds: string[] = [];
  const addEvaluation = (
    rule: InteractionRule,
    result: CandidateRuleEvaluation["result"],
    penalty = 0,
  ) => {
    evaluations.push(
      penalty
        ? { ruleId: rule.id, classification: rule.classification, result, scoreImpact: penalty }
        : { ruleId: rule.id, classification: rule.classification, result },
    );
    if (result !== "not_applicable") influencingRuleIds.push(rule.id);
    const weighted = rulePriorityPenalty(rule, penalty);
    strongPenalty += weighted.strong;
    weakPenalty += weighted.weak;
  };

  for (const rule of activeRules(knowledge)) {
    if (!conditionsMatchForSupplement(rule, item)) continue;
    if (rule.targetId.startsWith("routine:") && matchesSupplement(rule.sourceId, item)) {
      const routineResult = relationForRoutineRule(rule, itemTime, regimen);
      if (!routineResult.applicable) {
        addEvaluation(rule, "not_applicable");
      } else if (rule.classification === "hard_schedule_constraint" && !routineResult.satisfied) {
        hardValid = false;
        addEvaluation(rule, "violated", 1);
      } else if (
        rule.classification === "clinical_warning" ||
        rule.classification === "informational"
      ) {
        addEvaluation(
          rule,
          rule.classification === "clinical_warning" ? "warning" : "not_applicable",
        );
      } else {
        addEvaluation(
          rule,
          routineResult.satisfied ? "satisfied" : "violated",
          routineResult.penalty,
        );
      }
    }
    for (const anchor of anchors) {
      const medication = regimen.medications.find(
        (entry) => anchor.itemId === entry.id || anchor.itemId.startsWith(`${entry.id}:`),
      );
      if (!medication || !ruleMatchesSupplementMedication(rule, item, medication)) continue;
      const anchorTime = anchor.timelineMinute;
      const sourceIsItem = matchesSupplement(rule.sourceId, item);
      const result = scoreEffect(
        rule,
        sourceIsItem ? itemTime : anchorTime,
        sourceIsItem ? anchorTime : itemTime,
      );
      if (rule.classification === "hard_schedule_constraint" && !result.satisfied)
        hardValid = false;
      if (rule.classification === "clinical_warning") addEvaluation(rule, "warning");
      else addEvaluation(rule, result.satisfied ? "satisfied" : "violated", result.penalty);
    }
    for (const other of placed) {
      const otherItem = regimen.supplements.find((entry) => entry.id === other.itemId);
      if (!otherItem || !ruleMatchesSupplementPair(rule, item, otherItem)) continue;
      const sourceIsItem = matchesSupplement(rule.sourceId, item);
      const result = scoreEffect(
        rule,
        sourceIsItem ? itemTime : other.timelineMinute,
        sourceIsItem ? other.timelineMinute : itemTime,
      );
      if (rule.classification === "hard_schedule_constraint" && !result.satisfied)
        hardValid = false;
      if (rule.classification === "clinical_warning") addEvaluation(rule, "warning");
      else addEvaluation(rule, result.satisfied ? "satisfied" : "violated", result.penalty);
    }
  }

  const preferred = item.preferredTime ? eventTimeline(item.preferredTime, regimen) : undefined;
  const userPreferenceDistance = preferred === undefined ? 0 : Math.abs(preferred - itemTime);
  const newWindowCount = placed.some((entry) => entry.timelineMinute === itemTime) ? 0 : 1;
  return {
    hardValid,
    score: { strongPenalty, weakPenalty, userPreferenceDistance, newWindowCount, evaluations },
    influencingRuleIds: [...new Set(influencingRuleIds)].sort(),
  };
}

function compareScore(a: Score, b: Score, aTime: number, bTime: number): number {
  const valuesA = [
    a.strongPenalty,
    a.weakPenalty,
    a.userPreferenceDistance,
    a.newWindowCount,
    aTime,
  ];
  const valuesB = [
    b.strongPenalty,
    b.weakPenalty,
    b.userPreferenceDistance,
    b.newWindowCount,
    bTime,
  ];
  for (let index = 0; index < valuesA.length; index += 1) {
    const left = valuesA[index] ?? 0;
    const right = valuesB[index] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}

function matchingOverride(
  item: SupplementEntry,
  regimen: CanonicalRegimen,
): UserOverride | undefined {
  return regimen.overrides.find((override) => override.itemId === item.id);
}

function anchorPlacements(regimen: CanonicalRegimen): InternalPlacement[] {
  return regimen.medications.flatMap((anchor) => {
    const times = anchor.explicitAdministrationTimes ?? [anchor.administrationTime];
    return times.map((time, index) => ({
      itemId: `${anchor.id}:${index}`,
      timelineMinute: eventTimeline(time, regimen),
      localTime: time,
    }));
  });
}

function finalRelationSummary(
  item: SupplementEntry,
  placement: InternalPlacement,
  regimen: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
  allPlacements: InternalPlacement[],
): {
  ruleIds: string[];
  evidenceIds: string[];
  bullets: string[];
  flexible: boolean;
  strongPenalty: number;
  weakPenalty: number;
  administrationGuidance?: AdministrationGuidance;
} {
  const evaluated = evaluateCandidate(
    item,
    placement.localTime,
    regimen,
    knowledge,
    anchorPlacements(regimen),
    allPlacements.filter((entry) => entry.itemId !== item.id),
  );
  const rules = activeRules(knowledge).filter((rule) =>
    evaluated.influencingRuleIds.includes(rule.id),
  );
  const bullets = rules
    .filter(
      (rule) =>
        rule.classification !== "clinical_warning" && rule.classification !== "informational",
    )
    .map((rule) => rule.userMessage);
  const evidenceIds = [...new Set(rules.flatMap((rule) => rule.evidenceIds))].sort();
  const flexible = rules.length === 0;
  if (flexible)
    bullets.push(
      "No strong evidence-backed timing requirement was identified. Choose a time you're likely to remember.",
    );
  const administrationGuidance = deriveAdministrationGuidance(rules);
  return {
    ruleIds: rules.map((rule) => rule.id),
    evidenceIds,
    bullets,
    flexible,
    strongPenalty: evaluated.score.strongPenalty,
    weakPenalty: evaluated.score.weakPenalty,
    ...(administrationGuidance ? { administrationGuidance } : {}),
  };
}

function deriveAdministrationGuidance(
  rules: InteractionRule[],
): AdministrationGuidance | undefined {
  const takeWith: GuidanceItem[] = [];
  const avoidAroundDose: GuidanceItem[] = [];
  let foodInstruction: GuidanceItem | undefined;
  for (const rule of [...rules].sort((a, b) => a.id.localeCompare(b.id))) {
    if (rule.classification === "clinical_warning" || rule.classification === "informational")
      continue;
    const item: GuidanceItem = {
      id: `guidance:${rule.id}`,
      text: rule.userMessage,
      evidenceIds: [...rule.evidenceIds].sort(),
    };
    if (rule.effect === "prefer_together") takeWith.push(item);
    if (
      rule.effect === "prefer_empty_stomach" ||
      rule.effect === "prefer_separation" ||
      rule.effect === "require_separation"
    ) {
      avoidAroundDose.push(item);
    }
    if (rule.effect === "prefer_with_food" || rule.effect === "prefer_meal_characteristic") {
      foodInstruction ??= item;
    }
  }
  if (!takeWith.length && !avoidAroundDose.length && !foodInstruction) return undefined;
  return {
    ...(takeWith.length ? { takeWith } : {}),
    ...(avoidAroundDose.length ? { avoidAroundDose } : {}),
    ...(foodInstruction ? { foodInstruction } : {}),
  };
}

function collectWarnings(
  regimen: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
): ClinicalWarning[] {
  const warnings: ClinicalWarning[] = [];
  for (const rule of activeRules(knowledge)) {
    if (rule.classification !== "clinical_warning" && rule.classification !== "informational")
      continue;
    for (const item of regimen.supplements) {
      if (!conditionsMatchForSupplement(rule, item)) continue;
      if (
        rule.classification === "informational" &&
        rule.sourceId === item.supplementId &&
        rule.targetId === item.supplementId
      ) {
        warnings.push({
          id: `${rule.id}:${item.id}`,
          kind: "informational",
          ruleId: rule.id,
          itemIds: [item.id],
          message: rule.userMessage,
          evidenceIds: rule.evidenceIds,
          requiresClinicalReview: false,
        });
        continue;
      }
      const anchor = regimen.medications.find((entry) =>
        ruleMatchesSupplementMedication(rule, item, entry),
      );
      const other = regimen.supplements.find(
        (entry) => entry.id !== item.id && ruleMatchesSupplementPair(rule, item, entry),
      );
      const matches = anchor ? [item.id, anchor.id] : other ? [item.id, other.id] : undefined;
      if (!matches) continue;
      warnings.push({
        id: `${rule.id}:${matches.join(":")}`,
        kind: rule.classification === "clinical_warning" ? "clinical_warning" : "informational",
        ruleId: rule.id,
        itemIds: matches,
        message: rule.userMessage,
        evidenceIds: rule.evidenceIds,
        requiresClinicalReview: rule.classification === "clinical_warning",
      });
    }
  }
  return [...new Map(warnings.map((warning) => [warning.id, warning])).values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

function unsupportedNotices(regimen: CanonicalRegimen): UnsupportedMedicationNotice[] {
  return regimen.medications
    .filter((anchor) => anchor.reference.kind === "unsupported")
    .map((anchor) => ({
      anchorId: anchor.id,
      displayName: anchor.displayName,
      message:
        "We don't currently have validated timing rules for this medication. Continue following your pharmacist or clinician's instructions.",
    }));
}

export function generateSchedule(
  input: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
  options: SchedulerOptions = {},
): ScheduleResult {
  const temporaryMedicationAnchors = options.temporaryMedicationAnchors ?? [];
  const temporaryById = new Map(temporaryMedicationAnchors.map((anchor) => [anchor.id, anchor]));
  const regimen = canonicalizeRegimen({
    ...input,
    medications: [
      ...input.medications.map((anchor) => temporaryById.get(anchor.id) ?? anchor),
      ...temporaryMedicationAnchors.filter(
        (temporary) => !input.medications.some((anchor) => anchor.id === temporary.id),
      ),
    ],
  });
  const config = options.config ?? DEFAULT_SCHEDULER_CONFIG;
  const traceMode = options.traceMode ?? "summary";
  const validation = validateRegimen(regimen);
  const metadata: ScheduleMetadata = {
    rulesetVersion: knowledge.rulesetVersion,
    evidenceRegistryVersion: knowledge.evidenceRegistryVersion,
    schedulerAlgorithmVersion: config.algorithmVersion,
  };
  const knowledgeValidation = validateKnowledgeSnapshot(knowledge);
  if (!knowledgeValidation.valid) {
    return {
      status: "incomplete",
      items: [],
      warnings: [],
      unsupportedMedications: [],
      conflicts: [
        {
          id: "invalid-knowledge-snapshot",
          kind: "hard_schedule_conflict",
          reason: "no_hard_valid_candidate",
          severity: "blocking",
          itemIds: [],
          ruleIds: knowledgeValidation.activeRuleIds,
          message: `NutriClock could not use the bundled timing guidance: ${knowledgeValidation.errors.join(" ")}`,
          overridable: false,
        },
      ],
      decisionTraces: [],
      metadata,
    };
  }
  if (!validation.valid) {
    return {
      status: "incomplete",
      items: [],
      warnings: [],
      unsupportedMedications: unsupportedNotices(regimen),
      conflicts: [
        {
          id: "invalid-regimen",
          kind: "hard_schedule_conflict",
          reason: "no_hard_valid_candidate",
          severity: "blocking",
          itemIds: [],
          ruleIds: [],
          message: validation.errors.join(" "),
          overridable: false,
        },
      ],
      decisionTraces: [],
      metadata,
    };
  }

  const anchors = anchorPlacements(regimen);
  const warnings = collectWarnings(regimen, knowledge);
  const allItems = [...regimen.supplements];
  const candidateCache = new Map<string, LocalTime[]>();
  for (const item of allItems) {
    const override = matchingOverride(item, regimen);
    candidateCache.set(
      item.id,
      override ? [override.selectedTime] : candidateTimes(item, regimen, config),
    );
  }
  const bestPartial: InternalPlacement[] = [];
  const placementById = (placements: InternalPlacement[], itemId: string) =>
    placements.find((entry) => entry.itemId === itemId);

  const hardCandidates = (item: SupplementEntry, placed: InternalPlacement[]): LocalTime[] =>
    (candidateCache.get(item.id) ?? []).filter(
      (time) => evaluateCandidate(item, time, regimen, knowledge, anchors, placed).hardValid,
    );

  const chooseNext = (
    remaining: SupplementEntry[],
    placed: InternalPlacement[],
  ): SupplementEntry => {
    return [...remaining].sort((a, b) => {
      const aCount = hardCandidates(a, placed).length;
      const bCount = hardCandidates(b, placed).length;
      if (aCount !== bCount) return aCount - bCount;
      const aDegree = activeRules(knowledge).filter(
        (rule) => rule.sourceId === a.supplementId || rule.targetId === a.supplementId,
      ).length;
      const bDegree = activeRules(knowledge).filter(
        (rule) => rule.sourceId === b.supplementId || rule.targetId === b.supplementId,
      ).length;
      if (aDegree !== bDegree) return bDegree - aDegree;
      return a.id.localeCompare(b.id);
    })[0] as SupplementEntry;
  };

  const recurse = (
    remaining: SupplementEntry[],
    placed: InternalPlacement[],
    repairUsed: number,
  ): boolean => {
    if (placed.length > bestPartial.length) {
      bestPartial.splice(0, bestPartial.length, ...placed);
    }
    if (!remaining.length) return true;
    const item = chooseNext(remaining, placed);
    const candidates = hardCandidates(item, placed)
      .map((time) => ({
        time,
        evaluation: evaluateCandidate(item, time, regimen, knowledge, anchors, placed),
      }))
      .sort((a, b) =>
        compareScore(
          a.evaluation.score,
          b.evaluation.score,
          eventTimeline(a.time, regimen),
          eventTimeline(b.time, regimen),
        ),
      );
    for (let index = 0; index < candidates.length; index += 1) {
      if (index > 0 && repairUsed >= config.maxRepairDepth) break;
      const candidate = candidates[index]!;
      const placement: InternalPlacement = {
        itemId: item.id,
        timelineMinute: eventTimeline(candidate.time, regimen),
        localTime: candidate.time,
      };
      const nextPlaced = [...placed, placement];
      const nextRemaining = remaining.filter((entry) => entry.id !== item.id);
      const feasible = nextRemaining.every(
        (nextItem) => hardCandidates(nextItem, nextPlaced).length > 0,
      );
      if (feasible && recurse(nextRemaining, nextPlaced, repairUsed + (index > 0 ? 1 : 0)))
        return true;
    }
    return false;
  };

  const complete = recurse(allItems, [], 0);
  const chosenPlacements = complete ? bestPartial : bestPartial;
  const conflicts: ScheduleConflict[] = [];
  for (const item of allItems) {
    if (placementById(chosenPlacements, item.id)) continue;
    const hasAnchorCandidate = hardCandidates(item, []).length > 0;
    const override = matchingOverride(item, regimen);
    conflicts.push({
      id: `conflict:${item.id}`,
      kind: "hard_schedule_conflict",
      reason:
        override && !hasAnchorCandidate
          ? "user_override_rejected"
          : hasAnchorCandidate
            ? "bounded_repair_exhausted"
            : "no_hard_valid_candidate",
      severity: "blocking",
      itemIds: [item.id],
      ruleIds: activeRules(knowledge)
        .filter(
          (rule) =>
            rule.classification === "hard_schedule_constraint" &&
            (rule.sourceId === item.supplementId || rule.targetId === item.supplementId),
        )
        .map((rule) => rule.id),
      message:
        override && !hasAnchorCandidate
          ? "This selected supplement time would violate a hard medication timing rule. Medication times remain fixed."
          : hasAnchorCandidate
            ? "NutriClock could not complete this schedule within its deterministic repair limit. No hard-invalid schedule was created."
            : "No valid time was found that satisfies the supported hard timing rules around your fixed medication anchors.",
      overridable: false,
    });
  }

  for (const placement of chosenPlacements) {
    const item = regimen.supplements.find((entry) => entry.id === placement.itemId);
    if (!item) continue;
    const summary = finalRelationSummary(item, placement, regimen, knowledge, chosenPlacements);
    if (summary.strongPenalty > 0 || summary.weakPenalty > 0) {
      const override = matchingOverride(item, regimen);
      const ruleIds = activeRules(knowledge)
        .filter(
          (rule) =>
            summary.ruleIds.includes(rule.id) &&
            (rule.classification === "strong_preference" ||
              rule.classification === "weak_preference"),
        )
        .map((rule) => rule.id);
      conflicts.push({
        id: `preference:${item.id}`,
        kind: "preference_conflict",
        reason: override ? "user_override_rejected" : "bounded_repair_exhausted",
        severity: "review",
        itemIds: [item.id],
        ruleIds,
        message: override
          ? "User-selected timing may reduce the benefit of a supported timing preference."
          : "This placement keeps the schedule valid but does not satisfy every supported timing preference.",
        overridable: true,
      });
    }
  }

  const items: ScheduleItem[] = [];
  const traces: ScheduleDecisionTrace[] = [];
  for (const anchor of regimen.medications) {
    const time = anchor.administrationTime;
    items.push({
      id: anchor.id,
      kind: "medication_anchor",
      sourceId: anchor.id,
      displayName: anchor.displayName,
      time,
      timingState: "scheduled",
      fixed: true,
      userSelected: true,
      influencingRuleIds: [],
      evidenceIds: [],
      explanation: {
        title: "Your existing medication time",
        bullets: [
          "This medication time was entered by you. Follow your prescription label, pharmacist, or clinician.",
        ],
        ruleIds: [],
        evidenceIds: [],
        flexible: false,
      },
    });
    traces.push({
      itemId: anchor.id,
      selectedTime: time,
      traceMode,
      consideredCandidateCount: 1,
      rejectedHardCandidateCount: 0,
      objective: { strongPenalty: 0, weakPenalty: 0, userPreferenceDistance: 0, newWindowCount: 0 },
      ...(traceMode === "full"
        ? { consideredCandidates: [{ time, hardValid: true, scoreVector: [], evaluations: [] }] }
        : {}),
      selectedCandidateReason: "Fixed user-entered medication anchor.",
      influencingRuleIds: [],
    });
  }
  for (const item of allItems.sort((a, b) => a.id.localeCompare(b.id))) {
    const placement = placementById(chosenPlacements, item.id);
    if (!placement) {
      items.push({
        id: item.id,
        kind: "supplement",
        sourceId: item.id,
        displayName:
          item.userLabel ??
          SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.displayName ??
          item.supplementId,
        timingState: "conflicted",
        fixed: false,
        userSelected: Boolean(matchingOverride(item, regimen)),
        influencingRuleIds: [],
        evidenceIds: [],
        explanation: {
          title: "Schedule conflict",
          bullets: [
            "NutriClock could not place this supplement without violating a supported hard timing rule.",
          ],
          ruleIds: [],
          evidenceIds: [],
          flexible: false,
        },
      });
      continue;
    }
    const summary = finalRelationSummary(item, placement, regimen, knowledge, chosenPlacements);
    const override = matchingOverride(item, regimen);
    const itemDisplayName =
      item.userLabel ??
      SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.displayName ??
      item.supplementId;
    items.push({
      id: item.id,
      kind: "supplement",
      sourceId: item.id,
      displayName: itemDisplayName,
      time: placement.localTime,
      timingState: override ? "user_selected" : summary.flexible ? "flexible" : "scheduled",
      fixed: false,
      userSelected: Boolean(override),
      influencingRuleIds: summary.ruleIds,
      evidenceIds: summary.evidenceIds,
      explanation: {
        title: override
          ? "User-selected timing"
          : summary.flexible
            ? "Flexible timing"
            : "Why this time?",
        bullets: summary.bullets,
        ruleIds: summary.ruleIds,
        evidenceIds: summary.evidenceIds,
        flexible: summary.flexible,
        ...(summary.administrationGuidance
          ? { administrationGuidance: summary.administrationGuidance }
          : {}),
      },
    });
    const allCandidates = candidateCache.get(item.id) ?? [];
    const candidateSummaries = allCandidates.map((time) => {
      const evaluation = evaluateCandidate(
        item,
        time,
        regimen,
        knowledge,
        anchors,
        chosenPlacements.filter((entry) => entry.itemId !== item.id),
      );
      return {
        time,
        hardValid: evaluation.hardValid,
        scoreVector: [
          evaluation.score.strongPenalty,
          evaluation.score.weakPenalty,
          evaluation.score.userPreferenceDistance,
          evaluation.score.newWindowCount,
        ],
        evaluations: evaluation.score.evaluations,
      };
    });
    const selectedEvaluation = evaluateCandidate(
      item,
      placement.localTime,
      regimen,
      knowledge,
      anchors,
      chosenPlacements.filter((entry) => entry.itemId !== item.id),
    );
    traces.push({
      itemId: item.id,
      selectedTime: placement.localTime,
      traceMode,
      consideredCandidateCount: allCandidates.length,
      rejectedHardCandidateCount: candidateSummaries.filter((candidate) => !candidate.hardValid)
        .length,
      objective: {
        strongPenalty: selectedEvaluation.score.strongPenalty,
        weakPenalty: selectedEvaluation.score.weakPenalty,
        userPreferenceDistance: selectedEvaluation.score.userPreferenceDistance,
        newWindowCount: selectedEvaluation.score.newWindowCount,
      },
      ...(traceMode === "full" ? { consideredCandidates: candidateSummaries } : {}),
      selectedCandidateReason: summary.bullets[0] ?? "Placed at a practical time within your day.",
      influencingRuleIds: summary.ruleIds,
    });
  }

  const uniqueConflicts = [
    ...new Map(conflicts.map((conflict) => [conflict.id, conflict])).values(),
  ].sort((a, b) => a.id.localeCompare(b.id));
  return {
    status: uniqueConflicts.some((conflict) => conflict.severity === "blocking")
      ? "incomplete"
      : uniqueConflicts.length
        ? "complete_with_conflicts"
        : "complete",
    items,
    warnings,
    unsupportedMedications: unsupportedNotices(regimen),
    conflicts: uniqueConflicts,
    decisionTraces: traces.sort((a, b) => a.itemId.localeCompare(b.itemId)),
    metadata,
  };
}

function latestExecutionEvents(context: DayContext): Map<StableId, DayEvent> {
  const latest = new Map<StableId, DayEvent>();
  for (const event of context.events) {
    if (
      event.kind === "supplement_taken" ||
      event.kind === "supplement_skipped" ||
      event.kind === "supplement_snoozed"
    ) {
      latest.set(event.itemId, event);
    }
  }
  return latest;
}

function applyDayContext(
  regimen: CanonicalRegimen,
  context: DayContext,
  knowledge: KnowledgeSnapshot,
): CanonicalRegimen {
  const routine = {
    ...regimen.routine,
    meals: [...regimen.routine.meals],
    beverages: [...regimen.routine.beverages],
  };
  const execution = latestExecutionEvents(context);
  const snoozeOverrides: UserOverride[] = [];

  for (const event of context.events) {
    if (event.kind === "wake_time_changed") routine.wakeTime = event.time;
    if (event.kind === "bedtime_changed") routine.bedtime = event.time;
    if (event.kind === "meal_recorded") {
      routine.meals = routine.meals.filter((meal) => meal.name !== event.mealName);
      routine.meals.push({
        id: "day:" + event.id,
        name: event.mealName,
        time: event.time,
        ...(event.containsDietaryFat === undefined
          ? {}
          : { containsDietaryFat: event.containsDietaryFat }),
      });
    }
    if (event.kind === "meal_skipped") {
      routine.meals = routine.meals.filter((meal) => meal.name !== event.mealName);
    }
    if (event.kind === "beverage_recorded") {
      routine.beverages = routine.beverages.filter(
        (beverage) => beverage.kind !== event.beverageKind,
      );
      routine.beverages.push({
        id: "day:" + event.id,
        kind: event.beverageKind,
        time: event.time,
      });
    }
    if (event.kind === "beverage_skipped") {
      routine.beverages = routine.beverages.filter(
        (beverage) => beverage.kind !== event.beverageKind,
      );
    }
    if (event.kind === "supplement_snoozed") {
      snoozeOverrides.push({
        id: "day-snooze:" + event.id,
        itemId: event.itemId,
        selectedTime: event.until,
        kind: "preference_override",
        acknowledgedRuleIds: [],
        createdFromRulesetVersion: knowledge.rulesetVersion,
      });
    }
  }

  const remainingSupplements = regimen.supplements.filter((item) => {
    const event = execution.get(item.id);
    return event?.kind !== "supplement_taken" && event?.kind !== "supplement_skipped";
  });
  const snoozedIds = new Set(
    [...execution.values()]
      .filter(
        (event): event is Extract<DayEvent, { kind: "supplement_snoozed" }> =>
          event.kind === "supplement_snoozed",
      )
      .map((event) => event.itemId),
  );
  const overrides = [
    ...regimen.overrides.filter((override) => !snoozedIds.has(override.itemId)),
    ...snoozeOverrides,
  ];
  return { ...regimen, routine, supplements: remainingSupplements, overrides };
}

function dayItemMessage(item: TodayScheduleItem): string {
  if (item.executionStatus === "taken") return "Recorded as taken.";
  if (item.executionStatus === "skipped")
    return "Recorded as skipped. No make-up dose is suggested.";
  if (item.executionStatus === "snoozed") return "Snoozed until its next user-selected time.";
  if (item.availableNow) return "This item is available based on your recorded day context.";
  if (item.item.time) return "Next scheduled window: " + formatLocalTime(item.item.time) + ".";
  return "No supported window is currently available today.";
}

export function generateAdaptiveSchedule(
  regimen: CanonicalRegimen,
  context: DayContext,
  knowledge: KnowledgeSnapshot,
  options: SchedulerOptions = {},
): AdaptiveScheduleResult {
  const execution = latestExecutionEvents(context);
  const adaptedRegimen = applyDayContext(regimen, context, knowledge);
  const temporaryMedicationAnchors = context.events
    .filter(
      (event): event is Extract<DayEvent, { kind: "medication_taken" }> =>
        event.kind === "medication_taken",
    )
    .map((event) => {
      const anchor = regimen.medications.find((candidate) => candidate.id === event.anchorId);
      if (!anchor || anchor.reference.kind !== "supported") return undefined;
      return { ...anchor, administrationTime: event.time };
    })
    .filter((anchor): anchor is MedicationAnchor => Boolean(anchor));
  const adaptiveOptions = { ...options, temporaryMedicationAnchors };
  const derivedSchedule = generateSchedule(adaptedRegimen, knowledge, adaptiveOptions);
  const baseline = generateSchedule(regimen, knowledge, options);
  const generatedById = new Map(derivedSchedule.items.map((item) => [item.id, item]));
  const baselineById = new Map(baseline.items.map((item) => [item.id, item]));
  const currentTimeRegimen = {
    ...adaptedRegimen,
    overrides: [
      ...adaptedRegimen.overrides.filter((override) => !override.id.startsWith("day-now:")),
    ],
  };
  const items: TodayScheduleItem[] = [];

  for (const medication of regimen.medications) {
    const item = baselineById.get(medication.id) ?? generatedById.get(medication.id);
    if (item) items.push({ item, executionStatus: "planned", availableNow: false });
  }
  for (const supplement of regimen.supplements) {
    const event = execution.get(supplement.id);
    const item = generatedById.get(supplement.id) ?? baselineById.get(supplement.id);
    if (!item) continue;
    if (event?.kind === "supplement_taken") {
      items.push({
        item: { ...item, time: event.time, timingState: "user_selected", userSelected: true },
        executionStatus: "taken",
        availableNow: false,
      });
      continue;
    }
    if (event?.kind === "supplement_skipped") {
      items.push({ item, executionStatus: "skipped", availableNow: false });
      continue;
    }
    let availableNow = false;
    if (item.kind === "supplement") {
      const nowResult = generateSchedule(
        {
          ...currentTimeRegimen,
          overrides: [
            ...currentTimeRegimen.overrides.filter((override) => override.itemId !== supplement.id),
            {
              id: "day-now:" + supplement.id,
              itemId: supplement.id,
              selectedTime: context.now,
              kind: "preference_override",
              acknowledgedRuleIds: [],
              createdFromRulesetVersion: knowledge.rulesetVersion,
            },
          ],
        },
        knowledge,
        adaptiveOptions,
      );
      const nowItem = nowResult.items.find((entry) => entry.id === supplement.id);
      const blockingConflict = nowResult.conflicts.some(
        (conflict) => conflict.severity === "blocking" && conflict.itemIds.includes(supplement.id),
      );
      availableNow = nowItem?.time?.minuteOfDay === context.now.minuteOfDay && !blockingConflict;
    }
    items.push({
      item,
      executionStatus: event?.kind === "supplement_snoozed" ? "snoozed" : "planned",
      availableNow,
    });
  }
  items.sort((a, b) => {
    const aTime = a.item.time?.minuteOfDay ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.item.time?.minuteOfDay ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime || a.item.id.localeCompare(b.item.id);
  });

  const availability = items
    .filter(({ item }) => item.kind === "supplement")
    .map((todayItem): AvailabilityDecision => {
      const event = execution.get(todayItem.item.sourceId);
      if (event?.kind === "supplement_taken")
        return {
          itemId: todayItem.item.sourceId,
          status: "completed",
          ruleIds: todayItem.item.influencingRuleIds,
          evidenceIds: todayItem.item.evidenceIds,
          message: dayItemMessage(todayItem),
        };
      if (event?.kind === "supplement_skipped")
        return {
          itemId: todayItem.item.sourceId,
          status: "skipped",
          ruleIds: todayItem.item.influencingRuleIds,
          evidenceIds: todayItem.item.evidenceIds,
          message: dayItemMessage(todayItem),
        };
      if (todayItem.availableNow)
        return {
          itemId: todayItem.item.sourceId,
          status: "available_now",
          ...(todayItem.item.time ? { nextValidTime: todayItem.item.time } : {}),
          ruleIds: todayItem.item.influencingRuleIds,
          evidenceIds: todayItem.item.evidenceIds,
          message: dayItemMessage(todayItem),
        };
      if (todayItem.item.time)
        return {
          itemId: todayItem.item.sourceId,
          status: "wait",
          nextValidTime: todayItem.item.time,
          ruleIds: todayItem.item.influencingRuleIds,
          evidenceIds: todayItem.item.evidenceIds,
          message: dayItemMessage(todayItem),
        };
      return {
        itemId: todayItem.item.sourceId,
        status: "unavailable_today",
        ruleIds: todayItem.item.influencingRuleIds,
        evidenceIds: todayItem.item.evidenceIds,
        message: dayItemMessage(todayItem),
      };
    });
  const schedule = {
    ...derivedSchedule,
    items: derivedSchedule.items.map((item) =>
      item.kind === "medication_anchor" ? (baselineById.get(item.id) ?? item) : item,
    ),
  };
  return { context, schedule, items, availability };
}

function addIsoDays(localDate: string, days: number): string {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function supplementDisplayName(item: SupplementEntry): string {
  return (
    item.userLabel ??
    SUPPLEMENT_CATALOG.find((entry) => entry.id === item.supplementId)?.displayName ??
    item.supplementId
  );
}

export function assessScheduleQuality(result: ScheduleResult): ScheduleQualitySummary {
  const supplementItems = result.items.filter((item) => item.kind === "supplement");
  const supplementWindowCount = new Set(
    supplementItems
      .map((item) => item.time?.minuteOfDay)
      .filter((time): time is number => time !== undefined),
  ).size;
  const blockingConflictCount = result.conflicts.filter(
    (conflict) => conflict.severity === "blocking",
  ).length;
  const preferenceConflictCount = result.conflicts.filter(
    (conflict) => conflict.kind === "preference_conflict",
  ).length;
  const flexibleSupplementCount = supplementItems.filter(
    (item) => item.timingState === "flexible",
  ).length;
  const complexity: ScheduleComplexity = blockingConflictCount
    ? "needs_attention"
    : supplementWindowCount >= 3 || preferenceConflictCount >= 3
      ? "complex"
      : supplementWindowCount >= 2 || preferenceConflictCount > 0
        ? "moderate"
        : "simple";
  const message =
    complexity === "needs_attention"
      ? "Some supported timing constraints need attention before this schedule is complete."
      : complexity === "complex"
        ? "This schedule has several daily windows. A future simplification review may help."
        : complexity === "moderate"
          ? "This schedule has a few daily windows and some supported preferences to balance."
          : "This schedule is compact and has no unresolved hard timing conflicts.";
  return {
    complexity,
    supplementWindowCount,
    blockingConflictCount,
    preferenceConflictCount,
    flexibleSupplementCount,
    message,
  };
}

function scheduleWindowCount(result: ScheduleResult): number {
  return new Set(
    result.items
      .filter((item) => item.kind === "supplement")
      .map((item) => item.time?.minuteOfDay)
      .filter((time): time is number => time !== undefined),
  ).size;
}

export function compareScheduleSimplification(
  regimen: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
  options: SchedulerOptions = {},
): ScheduleSimplificationComparison {
  const current = generateSchedule(regimen, knowledge, options);
  const simplerRegimen: CanonicalRegimen = {
    ...regimen,
    supplements: regimen.supplements.map((item) => {
      const withoutPreferredTime = { ...item };
      delete withoutPreferredTime.preferredTime;
      return withoutPreferredTime;
    }),
  };
  const simpler = generateSchedule(simplerRegimen, knowledge, options);
  const currentWindowCount = scheduleWindowCount(current);
  const simplerWindowCount = scheduleWindowCount(simpler);
  const canSimplify =
    current.status !== "incomplete" &&
    simpler.status !== "incomplete" &&
    simplerWindowCount < currentWindowCount;
  return {
    current,
    simpler,
    currentWindowCount,
    simplerWindowCount,
    canSimplify,
    message: canSimplify
      ? `A grouping-oriented schedule reduces supplement windows from ${currentWindowCount} to ${simplerWindowCount} without violating supported hard timing rules.`
      : "No simpler valid schedule was found without changing the supported timing outcome.",
  };
}

export function buildWeeklyReview(
  regimen: CanonicalRegimen,
  logs: DailyExecutionLog[],
  weekStart: string,
): WeeklyReviewSummary {
  const weekEnd = addIsoDays(weekStart, 6);
  const inWeek = logs
    .filter((log) => log.localDate >= weekStart && log.localDate <= weekEnd)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
  const skippedByItem = new Map<StableId, number>();
  const snoozedByItem = new Map<StableId, number>();
  let supplementTakenCount = 0;
  let supplementSkippedCount = 0;
  let supplementSnoozedCount = 0;
  let adjustmentCount = 0;
  let medicationEventCount = 0;

  for (const log of inWeek) {
    const latest = latestExecutionEvents({
      localDate: log.localDate,
      now: { minuteOfDay: 0 },
      events: log.events,
    });
    for (const event of latest.values()) {
      if (event.kind === "supplement_taken") supplementTakenCount += 1;
      if (event.kind === "supplement_skipped") {
        supplementSkippedCount += 1;
        skippedByItem.set(event.itemId, (skippedByItem.get(event.itemId) ?? 0) + 1);
      }
      if (event.kind === "supplement_snoozed") {
        supplementSnoozedCount += 1;
        snoozedByItem.set(event.itemId, (snoozedByItem.get(event.itemId) ?? 0) + 1);
      }
    }
    for (const event of log.events) {
      if (event.kind === "medication_taken") medicationEventCount += 1;
      if (
        event.kind === "wake_time_changed" ||
        event.kind === "bedtime_changed" ||
        event.kind === "meal_recorded" ||
        event.kind === "meal_skipped" ||
        event.kind === "beverage_recorded" ||
        event.kind === "beverage_skipped"
      ) {
        adjustmentCount += 1;
      }
    }
  }

  const topItem = (counts: Map<StableId, number>) => {
    const entry = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!entry) return undefined;
    const item = regimen.supplements.find((candidate) => candidate.id === entry[0]);
    if (!item) return undefined;
    return { itemId: item.id, displayName: supplementDisplayName(item), count: entry[1] };
  };
  const executionDenominator = supplementTakenCount + supplementSkippedCount;
  const mostSkippedItem = topItem(skippedByItem);
  const mostSnoozedItem = topItem(snoozedByItem);
  return {
    weekStart,
    weekEnd,
    daysWithActivity: inWeek.filter((log) => log.events.length > 0).length,
    supplementTakenCount,
    supplementSkippedCount,
    supplementSnoozedCount,
    adjustmentCount,
    medicationEventCount,
    executionRate: executionDenominator > 0 ? supplementTakenCount / executionDenominator : null,
    ...(mostSkippedItem ? { mostSkippedItem } : {}),
    ...(mostSnoozedItem ? { mostSnoozedItem } : {}),
  };
}

export function buildConvenienceInsights(
  regimen: CanonicalRegimen,
  logs: DailyExecutionLog[],
): ConvenienceInsight[] {
  const skipped = new Map<StableId, number>();
  const snoozed = new Map<StableId, number>();
  let adjustmentCount = 0;
  for (const log of logs) {
    const latest = latestExecutionEvents({
      localDate: log.localDate,
      now: { minuteOfDay: 0 },
      events: log.events,
    });
    for (const event of latest.values()) {
      if (event.kind === "supplement_skipped")
        skipped.set(event.itemId, (skipped.get(event.itemId) ?? 0) + 1);
      if (event.kind === "supplement_snoozed")
        snoozed.set(event.itemId, (snoozed.get(event.itemId) ?? 0) + 1);
    }
    adjustmentCount += log.events.filter(
      (event) =>
        event.kind === "wake_time_changed" ||
        event.kind === "bedtime_changed" ||
        event.kind === "meal_recorded" ||
        event.kind === "meal_skipped" ||
        event.kind === "beverage_recorded" ||
        event.kind === "beverage_skipped",
    ).length;
  }
  const insights: ConvenienceInsight[] = [];
  for (const [itemId, count] of skipped) {
    if (count < 2) continue;
    const item = regimen.supplements.find((candidate) => candidate.id === itemId);
    if (!item) continue;
    insights.push({
      kind: "frequently_skipped",
      itemId,
      count,
      message: `${supplementDisplayName(item)} was skipped on ${count} recorded days. Review its timing or routine context if this window is difficult to follow.`,
    });
  }
  for (const [itemId, count] of snoozed) {
    if (count < 2) continue;
    const item = regimen.supplements.find((candidate) => candidate.id === itemId);
    if (!item) continue;
    insights.push({
      kind: "frequently_snoozed",
      itemId,
      count,
      message: `${supplementDisplayName(item)} was snoozed ${count} times. A different valid window may be easier to follow.`,
    });
  }
  if (adjustmentCount >= 3) {
    insights.push({
      kind: "frequent_adjustments",
      count: adjustmentCount,
      message: `You recorded ${adjustmentCount} routine changes. A saved routine template may make these days easier to set up.`,
    });
  }
  return insights.sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind));
}

export function buildReminderDecisions(
  today: AdaptiveScheduleResult,
  preferences: UserPreferences,
): ReminderDecision[] {
  if (!preferences.remindersEnabled) return [];
  const leadMinutes = preferences.reminderLeadMinutes ?? 0;
  const availability = new Map(today.availability.map((entry) => [entry.itemId, entry]));
  return today.items
    .filter((entry) => entry.item.kind === "supplement")
    .map((entry): ReminderDecision => {
      const decision = availability.get(entry.item.sourceId);
      const scheduledTime = entry.item.time;
      if (entry.executionStatus === "taken" || decision?.status === "completed")
        return {
          itemId: entry.item.sourceId,
          status: "completed",
          ...(scheduledTime ? { scheduledTime } : {}),
          message: `${entry.item.displayName} is marked taken.`,
          ruleIds: entry.item.influencingRuleIds,
          evidenceIds: entry.item.evidenceIds,
        };
      if (entry.executionStatus === "skipped" || decision?.status === "skipped")
        return {
          itemId: entry.item.sourceId,
          status: "skipped",
          ...(scheduledTime ? { scheduledTime } : {}),
          message: `${entry.item.displayName} is marked skipped for today. No make-up dose is suggested.`,
          ruleIds: entry.item.influencingRuleIds,
          evidenceIds: entry.item.evidenceIds,
        };
      if (decision?.status === "available_now") {
        const dueAt = Math.max(
          0,
          (scheduledTime?.minuteOfDay ?? today.context.now.minuteOfDay) - leadMinutes,
        );
        const due = today.context.now.minuteOfDay >= dueAt;
        return {
          itemId: entry.item.sourceId,
          status: due ? "due" : "upcoming",
          ...(scheduledTime ? { scheduledTime } : {}),
          message: due
            ? `${entry.item.displayName} is available now based on your recorded context.`
            : `${entry.item.displayName} reminder window opens at ${formatLocalTime({ minuteOfDay: dueAt })}.`,
          ruleIds: decision.ruleIds,
          evidenceIds: decision.evidenceIds,
        };
      }
      return {
        itemId: entry.item.sourceId,
        status: "waiting",
        ...(decision?.nextValidTime ? { scheduledTime: decision.nextValidTime } : {}),
        message:
          decision?.message ?? `${entry.item.displayName} is waiting for a valid supported window.`,
        ruleIds: decision?.ruleIds ?? entry.item.influencingRuleIds,
        evidenceIds: decision?.evidenceIds ?? entry.item.evidenceIds,
      };
    });
}

export function explainScheduleItem(
  itemId: StableId,
  result: ScheduleResult,
): ScheduleExplanation | undefined {
  return result.items.find((item) => item.id === itemId)?.explanation;
}

export function formatLocalTime(time: LocalTime): string {
  const hour = Math.floor(time.minuteOfDay / 60);
  const minute = time.minuteOfDay % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}
