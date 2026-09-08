# NutriClock MVP — Technical Design

**Status:** Implementation baseline

**Source of truth:** `NutriClock_Codex_MVP_Prompt.md`

**Audience:** Engineering agents, reviewers, and maintainers implementing the NutriClock MVP

**Scope:** Local-first responsive web application and local-first mobile application with shared deterministic scheduling semantics

## 1. Design intent and requirement interpretation

This document translates the NutriClock MVP requirements into an implementable architecture. The attached MVP prompt is treated as a product and safety specification, not as an instruction to perform unrelated repository changes. No independent medical research is used here, and no rule is added beyond the semantics explicitly permitted by that prompt.

The implementation should optimize for:

1. deterministic, auditable behavior;
2. evidence traceability;
3. immutable user-entered medication anchors;
4. shared web/mobile domain semantics;
5. local-first privacy;
6. clear uncertainty and explicit conflicts;
7. a small, boring dependency surface.

The repository currently contains only the MVP prompt. There is no existing web framework, mobile stack, package manager configuration, routing, state library, persistence adapter, CI configuration, or test harness to preserve. The recommendations below are therefore greenfield choices, not a proposed replacement of existing working infrastructure.

### 1.1 Explicit safety boundaries

NutriClock organizes a regimen the user has already chosen. It must not recommend which supplements to start, prescribe or judge doses, diagnose deficiencies or symptoms, interpret laboratory data, alter medication or supplement regimens, or claim that timing guarantees a health outcome.

All health behavior must come from checked-in structured rules and evidence records. No LLM, network lookup, generic medication database, or runtime inference may create or resolve a health rule.

The following statements are architectural invariants:

> **No health-related rule may be added without an approved evidence reference and appropriate tests.**

> **A clinical warning must not be converted into a scheduling constraint unless an approved authoritative source independently supports that scheduling rule.**

> **Medication times are fixed user-entered anchors. NutriClock schedules supplements around them; it does not optimize prescription medication timing.**

### 1.2 MVP exclusions enforced by design

The MVP has no accounts, backend, cloud synchronization, remote regimen storage, analytics, telemetry, push notifications, reminders, lab features, OCR, supplement recommendations, dose recommendations, symptom or deficiency features, shopping, brand ranking, clinician portal, wearable integration, health-platform integration, social features, caregiver sharing, generic medication lookup, or AI service.

Mobile is in scope for creating, viewing, editing, explaining, and locally persisting schedules. Notifications are not in scope.

## 2. Recommended system architecture

Use a pnpm TypeScript workspace with three application layers and one platform-agnostic domain package:

```text
NutriClock workspace
├─ apps/web                 React + Vite responsive web client
├─ apps/mobile              Expo + React Native mobile client
├─ packages/domain          pure TypeScript contracts, catalogs, rules, scheduler
├─ packages/application     shared use cases and in-memory app orchestration
├─ packages/persistence     platform-neutral repository types and codecs
├─ packages/ui-tokens       optional shared visual tokens only
├─ docs/                    implementation and audit documentation
└─ tests/                   optional cross-platform fixtures and test vectors
```

There is no application server in the MVP. The dependency direction is one-way:

```text
platform UI
  -> application/use-case layer
    -> shared domain
    -> persistence port
      -> web IndexedDB adapter
      -> mobile SQLite adapter
```

The domain package must not import React, React Native, browser APIs, Expo APIs, filesystem APIs, date libraries whose behavior depends on locale/time zone, network clients, analytics SDKs, or platform storage.

### 2.1 Runtime components

| Component | Responsibility | Must not do |
|---|---|---|
| Web app | Responsive UI, web routing, form state, accessibility, IndexedDB wiring | Evaluate medical rules or duplicate scheduler logic |
| Mobile app | Native navigation, touch UI, screen-reader semantics, SQLite local-storage wiring | Evaluate medical rules or duplicate scheduler logic |
| Application layer | Load/save state, coordinate use cases, invalidate derived data, map domain results to view models | Change rule precedence or invent explanations |
| Shared domain | Input validation, catalogs, rule activation, rule evaluation, scheduler, conflicts, warnings, decision traces, explanations | Read/write platform storage or call network services |
| Rules manifest | Versioned approved machine rules and exact intervals | Contain unreviewed guesses or prose-only intervals |
| Evidence registry | Versioned source metadata referenced by active rules | Add unapproved sources or runtime web-derived content |
| Persistence adapter | Serialize and retrieve the canonical local state | Send health data remotely or silently repair incompatible data |

### 2.2 State flow

The canonical state flow is:

```text
user input
  -> normalize and validate
  -> canonical persisted regimen
  -> deterministic generateSchedule(regimen, manifest)
  -> ScheduleResult
  -> UI timeline / warnings / explanations / contextual sources
```

The generated schedule is derived state and is not persisted in V1. Any change to routine, supplements, medications, preferences, overrides, ruleset version, or evidence registry version triggers a fresh local derivation.

## 3. Shared domain package

The shared package is the safety-critical center of the product. Both clients call the same exported functions and consume the same result types. Web and mobile may have different screen layouts, but they must not have different medical semantics.

### 3.1 Module boundaries

Recommended package structure:

```text
packages/domain/
├─ src/
│  ├─ types/
│  │  ├─ time.ts
│  │  ├─ regimen.ts
│  │  ├─ catalog.ts
│  │  ├─ rules.ts
│  │  ├─ schedule.ts
│  │  └─ persistence.ts
│  ├─ catalog/
│  │  ├─ supplements.ts
│  │  ├─ medications.ts
│  │  └─ forms.ts
│  ├─ rules/
│  │  ├─ manifest.ts
│  │  ├─ evidence.ts
│  │  ├─ validator.ts
│  │  └─ active-rules.ts
│  ├─ scheduler/
│  │  ├─ candidates.ts
│  │  ├─ constraints.ts
│  │  ├─ scoring.ts
│  │  ├─ greedy-repair.ts
│  │  └─ generate-schedule.ts
│  ├─ warnings/
│  ├─ explanations/
│  ├─ validation/
│  ├─ canonicalize.ts
│  └─ index.ts
└─ test/
   ├─ rules/
   ├─ scheduler/
   ├─ golden/
   └─ fixtures/
```

`packages/persistence` contains only ports, codecs, schema versioning, migrations, and safe load/save results. It may import domain types but must not contain rule evaluation.

`packages/application` owns shared use cases and a small state coordinator. It may import domain and persistence ports, but it must not contain platform UI code, storage implementations, medical constants, or rule precedence. Both apps call this package so save, reset, version-update, and regeneration workflows cannot drift.

### 3.2 Pure public API

The domain should expose a small API:

```ts
export function validateRegimen(input: RegimenInput): ValidationResult;

export function generateSchedule(
  input: CanonicalRegimen,
  knowledge: KnowledgeSnapshot,
  options?: SchedulerOptions,
): ScheduleResult;

export function explainScheduleItem(
  itemId: StableId,
  result: ScheduleResult,
  knowledge: KnowledgeSnapshot,
): ScheduleExplanation;

export function canonicalizeRegimen(input: RegimenInput): CanonicalRegimen;

export function validateKnowledgeSnapshot(
  snapshot: KnowledgeSnapshot,
): KnowledgeValidationResult;
```

`generateSchedule` must be referentially transparent for a fixed canonical input, fixed knowledge snapshot, and fixed `SchedulerConfig`. `generatedAt` belongs only to an application-layer `GeneratedScheduleView` and is never passed into placement or scoring.

## 4. Domain data models and contracts

The following interfaces are the recommended TypeScript-level contracts. IDs are stable opaque strings, generated at entry creation and preserved across edits. Rule IDs and evidence IDs are checked-in stable identifiers.

### 4.1 Primitive types

```ts
export type StableId = string & { readonly __brand: "StableId" };

/** Minutes after midnight in the user's selected local civil day: 0..1439. */
export type MinuteOfDay = number & { readonly __brand: "MinuteOfDay" };

export interface LocalTime {
  minuteOfDay: MinuteOfDay;
}

export type DoseUnit =
  | "mg"
  | "mcg"
  | "g"
  | "IU"
  | "mL"
  | "other";

export type OnceDailyFrequency = {
  kind: "once_daily";
};

export type DoseBasis =
  | "elemental"
  | "product_label_amount"
  | "unknown";

export interface NormalizedMassDose {
  dimension: "mass";
  /** Canonical mass representation; no IU-to-mass conversion is performed. */
  amountMcg: number;
  basis: DoseBasis;
}

export interface NormalizedDose {
  dimension: "mass" | "international_unit" | "volume" | "other";
  amount: number;
  canonicalUnit: "mcg" | "IU" | "mL" | "other";
  basis: DoseBasis;
}
```

Runtime validators must enforce integer minute values from 0 through 1439 and finite, non-negative, clearly formed doses. They must not judge clinical appropriateness.

Dose normalization is dimensional and conservative. `g`, `mg`, and `mcg` may be converted to canonical micrograms for comparisons. IU is retained as IU because no universal IU-to-mass conversion is safe; volume and `other` are not converted. A rule that requires a dose basis or unit only applies when the normalized input supplies that compatible dimension and basis. Unknown basis never becomes elemental by inference.

Internally, the scheduler uses a `TimelineMinute` relative to wake time. Conversion is deterministic:

```ts
timelineMinute = (minuteOfDay - wakeMinute + 1440) % 1440;
```

The usable day runs from timeline minute `0` (wake) through the cyclic bedtime minute. This supports a bedtime after midnight without changing the displayed local time. All candidates and events are sorted by timeline minute, then stable ID. The day never relies on a JavaScript `Date` or machine time zone.

This is a nominal local civil-day model. V1 does not attempt to model daylight-saving transition days as 23 or 25 actual elapsed hours; a displayed schedule is a recurring local-time plan, not a dated alarm timeline.

### 4.2 Routine and events

```ts
export type MealName = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEvent {
  id: StableId;
  name: MealName;
  time: LocalTime;
  /** Undefined means the user did not provide this information. */
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
```

The UI should collect at most one optional event for each named meal in the MVP, while the domain remains capable of stable event IDs. Snacks are represented as `MealEvent` values with `name: "snack"`; they are not duplicated in a second collection. Meal names do not imply composition. `containsDietaryFat` is only true when explicitly selected by the user; `undefined` and `false` are distinct.

Recommended validation:

- wake and bedtime must not be equal;
- optional events must be within the cyclic wake-to-bed day or be reported as a clear routine validation error;
- duplicate named meals are rejected by the UI for MVP simplicity;
- no meal composition is inferred from `name`;
- coffee and tea are timing events only, not dosage or nutritional inputs.

### 4.3 Supplement catalog and entries

```ts
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
  | "iron_oral_common"
  | "calcium_carbonate"
  | "calcium_citrate"
  | "unspecified";

export interface SupplementCatalogItem {
  id: SupplementId;
  displayName: string;
  supportedForms: SupplementFormId[];
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
  /** Optional user-entered label; never used as a medical synonym. */
  userLabel?: string;
}
```

The nine supported individual supplements are the complete V1 catalog. A multivitamin is not modeled as a standardized nutrient. If a future UI accepts an opaque product, it must have an explicit `opaque_product` representation and return unavailable detailed optimization; it must not receive a generic “best time.” That capability is not required for the MVP and should be omitted unless the product owner explicitly approves it.

The dose is stored exactly as entered after numeric normalization. No range checking, dose correction, splitting, or therapeutic interpretation is performed. The one exception is a warning rule that may identify calcium amounts above the approved approximate threshold; it does not change the dose or autonomously split the regimen.

Rules that depend on elemental iron must require `doseBasis: "elemental"` and compare normalized mass units. For example, `25 mg`, `0.025 g`, and `25,000 mcg` are equivalent only when they are all explicitly identified as elemental iron. A product-label amount such as ferrous sulfate 325 mg must not be treated as 325 mg elemental iron. If the basis is unknown, the threshold rule is not applicable and no inference is made.

### 4.4 Medication catalog and fixed anchors

```ts
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
  | {
      kind: "supported";
      medicationId: MedicationId;
    }
  | {
      kind: "unsupported";
      userEnteredName: string;
    };

export interface MedicationAnchor {
  id: StableId;
  /** Display identity is preserved even when a reviewed alias maps to a rule ID. */
  displayName: string;
  reference: MedicationReference;
  /** The user-entered administration time. The scheduler cannot modify it. */
  administrationTime: LocalTime;
  userNote?: string;
  /** MVP normally contains one time; repeated times require explicit user input. */
  explicitAdministrationTimes?: LocalTime[];
}
```

Medication display identity and rule identity are separate. A supported catalog entry may expose a reviewed alias such as “Levothyroxine / Synthroid,” but normalization must come from that explicit catalog mapping, never fuzzy matching or runtime inference. An unsupported entry preserves the exact user-entered name and creates no inferred interaction. The UI must say that absence of a supported rule is not evidence that no interaction exists.

For MVP, `explicitAdministrationTimes` should normally be omitted and `administrationTime` is the one fixed anchor. If repeated administration is retained, every time must be explicitly entered and each is an independent immutable anchor. The scheduler must never infer frequency from a medication name.

### 4.5 User preferences and overrides

```ts
export interface UserPreferences {
  flexibleItemGrouping: "prefer_grouping" | "prefer_separate";
}

export interface UserOverride {
  id: StableId;
  itemId: StableId;
  selectedTime: LocalTime;
  kind: "preference_override";
  acknowledgedRuleIds: string[];
  createdFromRulesetVersion: string;
}
```

The bundled scheduler configuration should default to a 15-minute resolution. It is algorithm configuration, not user state. A preference override is valid only for a supplement and only against an overridable preference. The domain rejects attempts to create an override that would violate a hard medication rule.

### 4.6 Canonical regimen and persistence state

```ts
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
}
```

`canonicalizeRegimen` sorts collections by stable IDs, normalizes supported identifiers, removes no user data, and produces a stable representation for deterministic tests. It does not persist generated schedules.

## 5. Rules and evidence architecture

### 5.1 Knowledge snapshot

```ts
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
  | "symmetric"
  | "source_before_target"
  | "target_before_source"
  | "asymmetric";

export type RuleEffect =
  | "require_separation"
  | "prefer_separation"
  | "prefer_together"
  | "prefer_with_food"
  | "prefer_empty_stomach"
  | "prefer_meal_characteristic"
  | "warning"
  | "informational";

export type EvidenceStrength =
  | "authoritative_guidance"
  | "supported"
  | "limited"
  | "uncertain";

export type RuleCondition =
  | {
      type: "supplement_form_is";
      supplementId: SupplementId;
      formId: SupplementFormId;
    }
  | {
      type: "dose_at_least";
      supplementId: SupplementId;
      amount: number;
      unit: DoseUnit;
      basis: DoseBasis;
    }
  | {
      type: "meal_contains_dietary_fat";
      value: true;
    }
  | {
      type: "medication_is";
      medicationId: MedicationId;
    }
  | {
      type: "event_kind_is";
      eventKind: "coffee" | "tea";
    };

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
  /** True only for a reviewed preference that the user may explicitly keep. */
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
```

The checked-in manifest is the only place where exact medical intervals and rule classifications may be defined. UI code must contain no timing constants. The manifest validator must reject an active rule when:

- it has no evidence IDs;
- any evidence ID is unresolved;
- its evidence is not active/current in the snapshot;
- an interval is missing or non-integer where its direction requires one;
- a separation is negative;
- the source/target direction fields are internally inconsistent;
- the effect is incompatible with its direction or interval fields;
- the rule is ambiguous or marked `RULE_REVIEW_REQUIRED`.

Inactive review-required and retired rules may remain in the registry for auditability, but they are excluded from scheduling and user-facing active-rule explanations.

### 5.2 Manifest content permitted for V1

The first manifest may encode only the prompt-approved behaviors:

| Area | Permitted behavior |
|---|---|
| Iron | Away from food preference when tolerated; food-tolerance alternative; vitamin C co-scheduling preference; 120-minute coffee, tea, and calcium preference where applicable; explicit meal metadata only for dairy-heavy considerations; 240-minute levothyroxine hard rule when approved; PPI warning/information only; levodopa only if explicit manifest guidance exists |
| Vitamin C | Co-scheduling preference with iron; explicitly approved clinician-review warning contexts only |
| Vitamin D3 | Preference for explicitly fat-marked meal; no universal morning/evening rule; explicit approved medication warnings only |
| Vitamin B12 | Flexible by default; metformin and gastric-acid-inhibitor warnings/information only; no invented interval |
| Calcium | Form-aware calcium carbonate with-food preference; calcium citrate flexible with respect to food; approved high-amount educational warning; approved drug-specific timing rules only; 120-minute iron preference; 240-minute levothyroxine rule for calcium carbonate when applicable |
| Magnesium | Flexible by default; user evening preference only; approved asymmetric tetracycline/quinolone and bisphosphonate rules only; PPI warning/information only |
| Zinc | Avoid same window with simultaneous supplemental elemental iron at or above the approved threshold where practical; no invented interval; approved antibiotic/penicillamine rules only |
| Folate | Flexible by default; approved methotrexate, selected antiepileptic, or sulfasalazine clinical warnings only; never move a regimen to solve a warning |
| Omega-3 | Flexible by default; approved anticoagulant warning/monitoring only; no invented separation |

The manifest must not contain generic category expansion, broad drug inference, or values not explicitly supplied by the approved V1 rules. In this repository the prompt names several medication areas but does not provide the complete machine-readable medication intervals or evidence IDs. Those entries are therefore a pre-implementation input: they must be supplied and reviewed before being marked `active`. Until then they remain `RULE_REVIEW_REQUIRED` and are not silently approximated.

### 5.3 Rule review workflow

1. Add or edit a manifest entry in a code-reviewed change.
2. Include exact machine semantics, classification, rationale, user message, and evidence IDs in the same change.
3. Run manifest validation and evidence-resolution tests.
4. Add boundary and golden tests for every active constraint.
5. Mark ambiguous entries `RULE_REVIEW_REQUIRED`; do not activate them.
6. Bump the ruleset version for semantic changes and the evidence registry version for registry changes according to release policy. Individual evidence records retain their own `reviewedAt` and optional source revision metadata; they do not need to carry the registry version as an equality constraint.

## 6. Deterministic scheduler

### 6.1 Inputs and outputs

```ts
export interface SchedulerOptions {
  /** Summary is the production default; full is for tests and diagnostics. */
  traceMode?: "summary" | "full";
  config?: SchedulerConfig;
}

export interface SchedulerConfig {
  candidateResolutionMinutes: 15 | 30;
  maxRepairDepth: number;
  algorithmVersion: string;
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
  ruleId: string;
  itemIds: StableId[];
  message: string;
  evidenceIds: string[];
  requiresClinicalReview: boolean;
}

export interface ScheduleExplanation {
  title: string;
  bullets: string[];
  ruleIds: string[];
  evidenceIds: string[];
  flexible: boolean;
}

export interface CandidateSummary {
  time: LocalTime;
  hardValid: boolean;
  scoreVector: number[];
  evaluations: CandidateRuleEvaluation[];
}

export interface CandidateRuleEvaluation {
  ruleId: string;
  classification: RuleClassification;
  result: "satisfied" | "violated" | "not_applicable" | "warning";
  scoreImpact?: number;
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
  /** Populated only in full trace mode; never required by normal UI rendering. */
  consideredCandidates?: CandidateSummary[];
  selectedCandidateReason: string;
  influencingRuleIds: string[];
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
  conflicts: ScheduleConflict[];
  decisionTraces: ScheduleDecisionTrace[];
  metadata: ScheduleMetadata;
}

export interface GeneratedScheduleView {
  schedule: ScheduleResult;
  /** Application metadata only; not part of deterministic domain output. */
  generatedAt: string;
}
```

Medication anchors are always emitted as `fixed: true` items at their exact entered times. They are never candidates and never appear in the optimizer's movable-item list.

### 6.2 Candidate generation

For each once-daily supplement:

1. Convert wake, bedtime, meals, beverages, and anchors into wake-relative timeline minutes.
2. Enumerate candidates at the bundled `SchedulerConfig.candidateResolutionMinutes` (15 minutes by default) between wake and bedtime inclusive. This is algorithm configuration, not user state.
3. Add exact user-preferred time and exact relevant event times if they fall in the usable day; this prevents silently snapping explicit preferences or anchors to the grid.
4. De-duplicate and sort numerically by timeline minute, then by displayed minute-of-day.
5. Preserve a candidate's original exact local time in the result.

If there is no approved timing rule affecting an item, the item is still scheduled and marked `flexible`. The candidate score may use user preference and window convenience, but no morning/evening, food, or absorption claim is invented.

### 6.3 Rule evaluation and priority

Rule evaluation is centralized and produces typed results. The scheduler uses this strict priority order:

| Priority | Source | Behavior |
|---:|---|---|
| 1 | Fixed medication anchors and hard schedule constraints | Invalid candidates are removed; violations become blocking conflicts |
| 2 | Strong evidence-backed conflicts | Minimize violations; a user may override only where the rule is explicitly overridable |
| 3 | Weak or positive timing preferences | Apply smaller penalties/rewards; never promote them to hard rules |
| 4 | User preferred time and adherence convenience | Prefer closeness to the entered preference |
| 5 | Number of supplement-taking windows | Prefer grouping only after higher priorities tie |

Clinical warnings and informational rules produce warnings or explanations and do not enter the placement score unless the manifest explicitly classifies the rule as a scheduling preference/constraint. The code should map rule classification to priority centrally, for example:

```ts
const RULE_PRIORITY: Record<RuleClassification, number | null> = {
  hard_schedule_constraint: 1,
  strong_preference: 2,
  weak_preference: 3,
  clinical_warning: null,
  informational: null,
};
```

`classification` answers how strongly a rule participates in scheduling; `effect` answers what the rule is asking for. For example, two rules may both be `strong_preference` while one has `effect: "prefer_separation"` and another has `effect: "prefer_together"`. Explanations use the effect, while scoring and candidate validity use the classification plus exact direction/interval fields. This prevents “prefer X” and “avoid X” from being conflated in either code or copy.

The objective is lexicographic, not one blended score that could let convenience outweigh safety:

```text
(hardViolationCount,
 strongPenalty,
 weakPenalty,
 userPreferenceDistance,
 newWindowCount,
 stableTieBreakSignature)
```

Lower is better. Positive co-scheduling preferences reduce the appropriate preference penalty, but they cannot reduce a hard-violation count. The final stable tie-break signature is the sorted sequence of `(itemId, timelineMinute)` pairs, so equal candidates always resolve identically.

### 6.4 Search strategy

Use a deterministic greedy placement algorithm with bounded repair. A general global solver is not required for the V1 problem and should not be introduced unless the golden scenarios demonstrate a concrete failure that this algorithm cannot handle.

1. Pre-place all medication anchors.
2. Evaluate all warnings independent of placement.
3. Build each supplement's candidate list and eliminate candidates invalid against fixed anchors. Count remaining candidates and constraint degree.
4. Select the unplaced supplement with the fewest hard-valid candidates, then highest hard/strong constraint degree, then stable item ID.
5. Score its remaining candidates lexicographically against fixed anchors and already placed supplements. Select the lowest score, with timeline minute and stable ID as deterministic tie-breakers.
6. Forward-check every unplaced supplement. If any has no hard-valid candidate after the proposed placement, perform bounded repair by revisiting the most recent placements, up to `SchedulerConfig.maxRepairDepth` (recommended: 3).
7. Recompute candidate scores after every placement or repair. Repair is entered only after greedy placement produces a hard dead end; it is not a general global optimization pass.
8. If a user override exists, evaluate its exact selected time first. If it violates only an overridable preference, retain it with a visible override marker. If it violates a hard medication rule, reject it and emit a blocking conflict.
9. If no candidate can be found within the configured repair depth, return an explicit unresolved/incomplete result without emitting a hard-invalid schedule. The UI must distinguish “no feasible candidate found” from “bounded repair could not complete the schedule.”
10. Mark items with no meaningful active timing influence as `flexible`; they may still receive a practical grouped time.

The repair depth and candidate resolution are deterministic non-medical configuration. If future profiling or golden scenarios prove that broader search is needed, add it as a separately reviewed scheduler algorithm version; do not silently change the objective or return semantics.

### 6.5 Exact separation semantics

The constraint evaluator must define boundary behavior once and test it:

```ts
function satisfiesSymmetricSeparation(
  a: number,
  b: number,
  minimumMinutes: number,
): boolean {
  return Math.abs(a - b) >= minimumMinutes;
}
```

For directional rules, the evaluator uses the unrolled timeline and exact inclusive boundary:

```ts
sourceBeforeTarget: target - source >= requiredMinutes
targetBeforeSource: source - target >= requiredMinutes
```

The rule manifest, not the UI, owns the exact interval. “About two hours” is display copy only; the machine value is exactly 120 minutes where the approved rule says so. Directional medication rules must preserve source-before-target versus target-before-source semantics and must not be converted into generic symmetric separation.

### 6.6 Fixed medication-anchor handling

This is a hard invariant enforced in multiple layers:

- `MedicationAnchor.administrationTime` is immutable after save except by an explicit user edit to the source regimen.
- No scheduler function accepts a medication time as an output variable.
- Candidate generation creates supplement candidates only.
- Constraint evaluation checks supplement candidates against anchors.
- UI drag/edit controls for medication items are disabled or rendered as “entered by you”; medication edits route back to the source form.
- Re-optimization may move supplements but must preserve every anchor's exact minute.
- A hard conflict is blocking and non-overridable.
- Explanations for medication anchors say the time was entered by the user and must follow prescription instructions.

When an anchor makes every valid supplement candidate impossible, `ScheduleResult.status` becomes `incomplete` or `complete_with_conflicts` according to whether any items remain valid, and `ScheduleConflict.kind` is `hard_schedule_conflict`. There is no “best effort” path that violates the interval.

### 6.7 Warnings and conflicts

Warnings are not conflicts. A clinical warning represents context the scheduler cannot solve, for example approved PPI + B12, methotrexate + folate, or anticoagulant + omega-3 context. It has no spacing penalty and must not change placement.

Conflicts have two classes:

- `hard_schedule_conflict`: an approved hard rule has no feasible placement. Blocking, non-overridable, medication anchor remains fixed.
- `preference_conflict`: a strong/weak preference is violated by a user-selected time or unavoidable practical placement. Reviewable and potentially overridable only if the manifest marks it as such.

Unsupported medication handling is a separate informational state: retain the medication anchor, apply no inferred rules, and show the approved unsupported-medication text. Never label it “no interaction.”

### 6.8 Decision traces and explanations

Every supplement receives a summary decision trace, including flexible items. The summary records the selected candidate, number of candidates considered, number rejected by hard constraints, objective components, selected reason, and actual influencing rule IDs. Full candidate times and per-rule evaluations are available only when the domain is called with `traceMode: "full"`, for tests and diagnostics. Medication anchors receive a compact fixed-anchor trace indicating that the time came from user input, not optimization.

The normal UI shows only a concise explanation generated from structured templates. The trace remains available to tests, diagnostics, and an unobtrusive details view. `explainScheduleItem` must derive bullets only from `influencingRuleIds` and resolved evidence records; it must not display a rule merely because it exists in the catalog.

Expected explanation categories include:

- fixed medication anchor entered by the user;
- separated from a medication anchor by an active hard rule;
- separated from coffee, tea, iron, or another item by an active preference;
- paired with iron and vitamin C by an active preference;
- placed at an explicitly fat-marked meal for a vitamin D preference;
- user-selected timing with an acknowledged preference conflict;
- flexible timing because no active strong timing requirement applied.

## 7. Application and persistence architecture

### 7.1 Application use cases

Both clients should use one shared application package for orchestration. It owns use cases, in-memory app state, persistence loading/saving, knowledge-version comparison, and schedule regeneration. It must not contain medical rule semantics. Platform clients provide only navigation, presentation, and a `RegimenRepository` implementation.

Recommended `packages/application` use cases include:

```ts
loadNutriClock(): Promise<AppState>;
saveRoutine(routine: DailyRoutine): Promise<SaveResult>;
saveSupplement(entry: SupplementEntry): Promise<SaveResult>;
saveMedication(anchor: MedicationAnchor): Promise<SaveResult>;
setSupplementPreference(itemId: StableId, time: LocalTime | undefined): Promise<SaveResult>;
generateCurrentSchedule(): Promise<ScheduleResult>;
acknowledgePreferenceOverride(...): Promise<SaveResult>;
deleteAllNutriClockData(): Promise<void>;
```

Use cases load canonical state, validate it, save only canonical input, and derive the schedule from the current knowledge snapshot. UI state such as open dialogs, current step, and selected item is not persisted as regimen data.

### 7.2 Shared persistence contract

```ts
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
```

The adapter must use atomic replacement semantics where the platform supports them. The web adapter may store one serialized state document; the mobile adapter stores the same logical document in a versioned SQLite row/table. In both cases, validate the decoded object before use and never log its contents.

### 7.3 Web persistence

Use IndexedDB through a small adapter, with one object store and one namespaced record such as `nutriclock-state`. IndexedDB is preferred over localStorage because the data model is structured and the adapter can evolve without string-size or synchronous-write concerns.

The web adapter must:

- never call a remote API;
- avoid logging decoded health data;
- validate before save and after load;
- treat malformed JSON/schema data as corrupt and offer a reset path;
- use the current origin's storage only;
- clear the state record and any NutriClock-owned local records on reset.

Do not claim encryption for web storage. The privacy UI should state only what the implementation can technically guarantee.

### 7.4 Mobile persistence

Use an Expo SQLite/local database adapter for structured canonical state. This avoids treating Keychain/Keystore secret storage as an evolving application database and makes schema migrations, corruption handling, and future local fields straightforward. The MVP makes the conservative claim that data is stored locally on this device; it does not claim encryption at rest unless an encrypted SQLite build is explicitly selected and verified.

The mobile adapter must:

- store only the validated canonical state;
- never log rows or their contents;
- handle unavailable, locked, or failed database operations as actionable errors;
- clear NutriClock-owned tables on reset;
- avoid backup/sync behavior that would contradict the local-only promise where the chosen platform configuration permits controlling it.

Do not introduce a backend to solve local persistence. If encrypted-at-rest storage becomes a launch requirement, adopt a documented encrypted SQLite option with a key protected by the platform keychain/keystore as a deliberate security milestone, not as an implicit property of the MVP adapter.

### 7.5 Versioning and migrations

Start with `schemaVersion: 1`, `rulesetVersionLastEvaluated: null`, and `evidenceRegistryVersionLastEvaluated: null`. On load:

1. decode;
2. validate the schema envelope;
3. run only known migrations in ascending order;
4. reject incompatible or unknown future versions with a recoverable “reset local data” path;
5. re-canonicalize migrated state;
6. compare stored knowledge versions with the bundled snapshot;
7. show the approved guidance-update message when the recorded versions differ, then regenerate from the current bundled snapshot after the user continues.

Never silently reinterpret an obsolete canonical state. Because generated schedules are not persisted, there is no stale schedule artifact to present as current. The stored last-evaluated versions support an informational update message and audit context; the current schedule is always freshly derived from the current snapshot.

### 7.6 Derived schedule strategy

Do not persist generated schedules in V1. Schedule generation is local and expected to complete in milliseconds for the intended regimen size. On app load, route entry, and any canonical-state change, load the regimen and call `generateSchedule` with the current bundled knowledge snapshot. Keep `rulesetVersion`, `evidenceRegistryVersion`, and `schedulerAlgorithmVersion` in the in-memory/application result for auditability, but do not add a schedule cache key, cache schema, or cache migration.

If profiling later demonstrates meaningful latency, introduce caching as a separately reviewed optimization with explicit invalidation tests. The canonical regimen must remain the only persisted source of truth.

## 8. Web application architecture

### 8.1 Recommended stack

- React with TypeScript;
- Vite for a small static/client-rendered build;
- React Router for route-level navigation;
- local component state plus a small application store (Context + reducer is sufficient for MVP);
- IndexedDB adapter from the persistence package;
- Vitest and Testing Library for unit/component tests;
- Playwright for browser flow tests;
- semantic HTML and CSS with design tokens.

This keeps the web app static and avoids server-side storage. A framework may be substituted only if repository constraints arise; the domain contracts and no-backend boundary remain unchanged.

### 8.2 Web routes

```text
/                         Welcome
/day                      Your Day
/supplements              Your Supplements
/medications              Optional medication anchors
/schedule                 Your NutriClock
/schedule/adjust          Adjust Schedule
/settings                 Settings / Data
```

Use a route guard based on completion of canonical source fields, not on prior schedule existence. If a user returns to edit a prior step, the schedule route regenerates from the updated source state before presenting the result. Sources are contextual disclosures from “Why this time?” rather than a separate MVP route.

### 8.3 Web UI boundaries

```text
apps/web/src/
├─ app/
│  ├─ router.tsx
│  ├─ app-store.tsx
│  └─ platform-adapters.ts
├─ screens/
│  ├─ Welcome/
│  ├─ YourDay/
│  ├─ Supplements/
│  ├─ Medications/
│  ├─ Schedule/
│  ├─ AdjustSchedule/
│  └─ Settings/
├─ components/
├─ persistence/indexeddb-repository.ts
├─ styles/
└─ main.tsx
```

Form components own input interaction and field validation display. They call application use cases; they never inspect rule IDs or calculate timing intervals. The schedule screen renders domain `ScheduleResult` and uses shared explanation text; it does not reconstruct reasons from labels.

## 9. Mobile application architecture

### 9.1 Recommended stack

Use Expo + React Native + TypeScript with Expo Router. This is a mature cross-platform approach for a greenfield mobile client and can import the same TypeScript domain package without a second business-logic implementation.

Recommended mobile dependencies should be limited to navigation, local SQLite storage, and test tooling. Do not add notification, health-data, analytics, AI, or sync libraries.

### 9.2 Mobile routes/screens

```text
app/
├─ index.tsx                  Welcome
├─ day.tsx                    Your Day
├─ supplements.tsx            Your Supplements
├─ medications.tsx            Optional medication anchors
├─ schedule.tsx               Your NutriClock
├─ schedule-adjust.tsx        Adjust Schedule
└─ settings.tsx               Settings / Data
```

Use a stack flow for onboarding and native back navigation for edits. The schedule timeline may use grouped cards instead of the web's horizontal layout, but all cards are rendered from the same `ScheduleResult` and explanation contracts. Evidence is shown contextually from an item's explanation rather than through a standalone Sources screen.

### 9.3 Mobile-specific decisions

- Use native time pickers, switches, accessible labels, and alert dialogs.
- Render medication anchors as fixed/read-only in schedule editing.
- Do not schedule local notifications in MVP.
- Keep screen state in memory; persist only the canonical regimen.
- Handle app restart by loading and validating local state before routing.
- If local storage fails, show an actionable persistence error rather than claiming the regimen was saved.

## 10. Navigation and major user flows

### 10.1 First-run flow

```text
Welcome
  -> scope/privacy acknowledgement
  -> Your Day
  -> Your Supplements
  -> Optional Medications
  -> Generate
  -> Your NutriClock
```

The user can skip optional meals, beverages, and medications. Wake and bedtime are required routine boundaries. A supplement must have identity, supported form, valid dose/unit, and once-daily frequency before it is saved.

### 10.2 Schedule viewing flow

The result screen shows:

- daily timeline ordered in local display time;
- medication anchors clearly marked “entered by you”;
- supplement items with scheduled, flexible, user-selected, or conflicted state;
- warnings and conflicts in separate sections;
- “Why this time?” disclosure for each item;
- source inspection linked from rule-backed bullets;
- unobtrusive ruleset/evidence version details.

### 10.3 Adjustment flow

Users may change a supplement preferred time or select a schedule time. The application saves the override, regenerates immediately, and renders any preference conflict. If only an absorption preference is violated, offer “Move [item]” or “Keep my timing,” and persist the acknowledgement. If a hard medication rule would be violated, reject the selection and show the non-overridable instruction to follow the prescription label, pharmacist, or clinician.

### 10.4 Reset flow

Settings → Delete my NutriClock data → confirmation dialog → adapter `clear()` → in-memory store reset → navigate to Welcome. Clear routine, supplements, medications, preferences, overrides, version metadata, and NutriClock-owned local records. Do not clear unrelated origin/app data.

## 11. Error, warning, conflict, and unsupported behavior

### 11.1 Validation errors

Validation errors are user-correctable input errors: missing required time, malformed dose, unsupported form for a supplement, invalid time, or duplicate item. They must be attached to fields and announced accessibly. They must never be phrased as medical judgments.

### 11.2 Persistence errors

Persistence errors are operational: corrupt state, incompatible schema, storage unavailable, or write failure. Show a plain-language recovery action. Never swallow the error and present an unsaved regimen as saved.

### 11.3 Health warnings

Clinical warnings are distinct from timing conflicts and use approved copy only. They say that context may require clinician/pharmacist review and that NutriClock will not change either regimen. They do not move items or add spacing.

### 11.4 Hard conflicts

Hard conflicts identify the exact rule IDs and affected items, state that medication times remain fixed, and provide no override action. A conflict is a valid output, not a scheduler failure.

### 11.5 Unsupported medication

Show:

> **We don't currently have validated timing rules for this medication. Continue following your pharmacist or clinician's instructions.**

Retain the fixed anchor, show the unsupported status, and apply no broad category or name-based inference. Do not say “no interaction found.”

## 12. Accessibility and plain language

### 12.1 Web

- Use semantic `header`, `main`, `nav`, `form`, `fieldset`, `legend`, headings, lists, buttons, and native controls.
- Associate every label, unit, and validation message with its input.
- Provide keyboard navigation, visible focus, skip navigation, logical heading order, and focus management after route changes/dialogs.
- Use text and icons, not color alone, for warnings, conflicts, fixed anchors, flexible items, and overrides.
- Meet WCAG AA contrast and provide scalable typography and sufficiently large targets.
- Use ARIA only where native semantics are insufficient.

### 12.2 Mobile

- Provide accessibility labels, roles/traits, state announcements, readable focus order, and dynamic type support.
- Ensure touch targets are comfortably large and dialogs are screen-reader discoverable.
- Announce schedule conflicts and successful reset actions.
- Do not encode meaning solely through color or position.

All copy should prefer “suggested schedule,” “flexible timing,” “may improve absorption,” “we currently support,” and “clinical review recommended.” Avoid “optimal,” “perfect absorption,” “best for your health,” “maximize energy,” and guaranteed-benefit claims.

## 13. Testing architecture

Safety-critical logic is tested in the shared domain package first. UI tests verify wiring, accessibility, and parity; they do not replace domain tests.

### 13.1 Unit tests

Cover:

- minute parsing, validation, wake-relative conversion, cyclic bedtime handling;
- canonicalization and stable ordering;
- manifest validation and evidence resolution;
- condition matching, form matching, dose threshold conditions;
- dimensional dose normalization (`g`/`mg`/`mcg`), dose-basis handling, and refusal to convert IU to mass;
- symmetric and directional exact separation boundaries;
- hard versus preference versus warning classification;
- candidate generation and deterministic de-duplication;
- lexicographic priority scoring;
- fixed medication anchor immutability;
- unsupported medication behavior;
- flexible timing output;
- explanation rule-ID correspondence;
- persistence codecs, corruption handling, and migrations.

### 13.2 Required rule and boundary tests

Include exact 119/120/121-minute cases for approved 120-minute rules and exact 239/240/241-minute cases for approved 240-minute rules. Cover iron + calcium, coffee, tea, iron + vitamin C, vitamin D fat-marked meals, levothyroxine + iron, levothyroxine + calcium carbonate, zinc with elemental iron at the approved threshold, magnesium/tetracycline, magnesium/quinolone, calcium/dolutegravir, and penicillamine only when the approved manifest supplies the exact rule.

Verify that:

- no unmarked meal is treated as fat-containing;
- no universal B12, magnesium, folate, or omega-3 morning/evening rule appears;
- a warning does not create a score penalty or interval;
- a strong preference never masquerades as a hard constraint;
- user overrides persist and remain visibly marked;
- hard medication rules remain non-overridable.

### 13.3 Golden scenarios

Store canonical JSON fixtures and assert structural properties rather than incidental clock times unless a hard constraint forces a time.

Required fixtures:

1. **Iron-focused routine:** levothyroxine at 7:00 AM; coffee at 8:00 AM; meals; iron; vitamin C; calcium carbonate; vitamin D3. Assert fixed anchor, hard separation, coffee preference, iron/vitamin C pairing, calcium separation, calcium-with-food, fat-marked vitamin D preference, evidence resolution, and deterministic output.
2. **Flexible routine:** supplements with no active meaningful timing rule. Assert `flexible`, no invented morning/evening claim, and no fabricated evidence.
3. **Impossible hard constraint:** no feasible supplement candidate around immutable anchors. Assert explicit blocking conflict and unchanged medication time.
4. **Clinical warning:** approved methotrexate + folate context. Assert warning only, no timing penalty, no regimen change.

Run each fixture twice with identical canonical input, knowledge snapshot, and scheduler configuration and deep-compare schedule items, ordering, warnings, conflicts, explanations, and traces. `generatedAt` is outside the pure domain result and requires no exclusion.

### 13.4 Integration and platform tests

Web and mobile must each test onboarding, routine entry, dietary-fat flag, supplement entry, medication anchor entry, schedule generation, “Why this time?” with contextual sources, flexible timing, preference adjustment, preference override, hard conflict, clinical warning, unsupported medication, restart/reload persistence, delete-all-data, and knowledge-version update messaging.

Use Playwright for browser flows and the Expo/React Native test stack appropriate to the final mobile setup. Do not rely on snapshots alone for safety-critical behavior. Add a parity test that runs the same domain fixture through the shared package used by both clients and compares the serialized `ScheduleResult`.

### 13.5 Safety audit checks

Automate or document checks that:

- every active rule has resolving evidence;
- every exact interval is declared in the manifest;
- every hard rule has a boundary test;
- every asymmetric rule has independent directional tests;
- no medication anchor is changed by generation;
- no clinical warning is converted into a constraint;
- no dosage or regimen mutation exists;
- no sensitive telemetry or AI dependency is present;
- web and mobile import the same domain package;
- excluded features are absent.

Search for numeric timing constants outside the rules manifest as part of review. The only allowed non-medical timing constants outside the manifest are scheduler resolution, display formatting, and generic UI behavior.

## 14. Recommended repository structure

```text
NutriClock/
├─ apps/
│  ├─ web/
│  │  ├─ src/app/
│  │  ├─ src/screens/
│  │  ├─ src/components/
│  │  ├─ src/persistence/
│  │  └─ tests/e2e/
│  └─ mobile/
│     ├─ app/
│     ├─ src/components/
│     ├─ src/persistence/
│     └─ tests/
├─ packages/
│  ├─ domain/
│  │  ├─ src/types/
│  │  ├─ src/catalog/
│  │  ├─ src/rules/
│  │  ├─ src/scheduler/
│  │  ├─ src/warnings/
│  │  ├─ src/explanations/
│  │  └─ test/
│  ├─ application/
│  │  ├─ src/use-cases/
│  │  ├─ src/state/
│  │  └─ src/index.ts
│  ├─ persistence/
│  │  ├─ src/contracts/
│  │  ├─ src/codec/
│  │  └─ src/migrations/
│  └─ ui-tokens/
├─ docs/
│  ├─ rules-and-evidence.md
│  ├─ safety-boundaries.md
│  └─ testing-and-audit.md
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ NutriClock_Codex_MVP_Prompt.md
```

Ownership should be explicit: domain/rules files are owned by the domain maintainer; platform screens and adapters are owned by the corresponding client maintainer; cross-package contracts are changed by agreement and accompanied by parity tests. No parallel contributor should independently redefine a shared type or medical rule.

## 15. Implementation sequencing and milestones

The approved V1 rules/evidence manifest is a prerequisite to activating health behavior. The team may build contracts, adapters, and UI shells before it is complete, but must not implement or expose guessed active rules. Mobile UI begins only after the domain golden scenarios and a complete web vertical slice pass product and safety review.

### Milestone 0 — Repository bootstrap and decisions

- Initialize pnpm workspace and TypeScript project references.
- Add React/Vite web app and Expo mobile app.
- Add shared lint, formatting, typecheck, and test commands.
- Record package versions and supported platforms.
- Add no backend, analytics, AI, notification, or health-data dependencies.

### Milestone 1 — Shared contracts and persistence shell

- Implement branded time types, regimen models, catalogs, schedule result types, persistence port, codecs, and schema envelope.
- Add canonicalization and defensive validation.
- Implement web IndexedDB and mobile SQLite adapters behind the same interface.
- Add reset behavior and storage tests.

### Milestone 2 — Evidence and rules manifest

- Check in the approved V1 evidence registry and rules manifest supplied by product/rules review.
- Implement manifest validation and active-rule filtering.
- Mark missing, ambiguous, or evidence-less entries `RULE_REVIEW_REQUIRED`.
- Add evidence-resolution and manifest-audit tests.

### Milestone 3 — Domain scheduler

- Implement event normalization and candidate generation.
- Implement hard constraints, directional semantics, priority scoring, deterministic greedy placement, bounded repair, warnings, conflicts, and flexible timing.
- Implement immutable medication anchors and override validation.
- Implement decision traces and structured explanations.
- Add all boundary and golden scenario tests before UI integration.

### Milestone 4 — Web vertical slice and review gate

- Implement Welcome, Your Day, Supplements, optional Medications, Schedule, Adjust, contextual Sources, and Settings screens.
- Wire all changes through application use cases.
- Add accessibility semantics, keyboard flows, responsive timeline, and Playwright scenarios.
- Complete one end-to-end web vertical slice and product/safety review before beginning mobile UI.

### Milestone 5 — Mobile experience after review gate

- Implement equivalent Expo Router screens and native controls.
- Wire the same application/domain packages and mobile persistence adapter.
- Add screen-reader, dynamic-type, dialog, restart, reset, and platform integration tests.

### Milestone 6 — Integration and safety audit

- Run web/mobile parity fixtures.
- Verify knowledge-version update messaging, fresh regeneration, fixed anchors, unsupported medication messaging, warning separation, and deletion.
- Search for duplicated rules/constants and prohibited dependencies/features.
- Complete documentation and review open assumptions.

### Milestone 7 — Release validation

Run the actual repository commands for:

```text
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e:web
pnpm build:web
pnpm test:mobile
pnpm typecheck:mobile
```

Add mobile build validation appropriate to the local CI/toolchain. Report commands that cannot run and distinguish environmental or pre-existing failures from introduced failures. Do not claim a check passed unless it was executed.

## 16. Technical risks, tradeoffs, and mitigations

| Risk / decision | Tradeoff | Recommendation / mitigation |
|---|---|---|
| Greenfield web stack | React/Vite requires initial setup | Appropriate for a static local-first app; keep domain independent so a later framework change is contained |
| Expo mobile choice | Adds a second UI runtime | Mature cross-platform path with shared TypeScript domain; avoids duplicate medical logic |
| Mobile local storage | SQLite is structured and easier to migrate, but encryption is not implied | Use local SQLite and claim only local-on-device storage; treat encrypted-at-rest storage as a separate explicit security decision |
| Local privacy claims | Browser and SQLite storage are not automatically encrypted | State only what is true; never claim encryption or protected storage without verifying the implementation |
| Scheduling search complexity | A greedy choice can create a later dead end | Forward-check hard feasibility and use deterministic bounded repair; add broader search only if golden scenarios demonstrate the need |
| Overnight routines | Naive minute comparisons break after midnight | Use wake-relative cyclic timeline and test wraparound boundaries |
| Incomplete medication manifest | Apparent feature completeness conflicts with safety | Keep entries review-required and inactive until exact approved semantics/evidence are checked in |
| Preference versus constraint ambiguity | User experience may expect every rule to be enforced | Encode classification centrally; only hard rules invalidate candidates; warnings never alter placement |
| Fresh schedule generation | Every load regenerates derived state | Keep the regimen small and computation local; add a cache only after measured performance evidence |
| Cross-platform drift | Separate UI teams may accidentally add logic | Shared domain import is required; parity fixtures compare serialized results |
| Accidental telemetry | Health data can leak through logging/analytics | No analytics dependency; redact persistence errors; review logs and network calls |
| Future extensibility | Premature abstractions add complexity | Keep stable IDs/versioned manifests/contracts, but do not build sync, notifications, labs, or speculative services |

## 17. Open questions requiring product/rules approval

1. The repository does not include a complete machine-readable approved V1 evidence registry. Which exact evidence IDs, URLs, reviewed dates, source revisions, and registry version should be checked in?
2. The prompt names medication interaction areas but does not provide every exact interval, direction, condition, and evidence mapping. Which entries are approved for activation, and which must remain `RULE_REVIEW_REQUIRED`?
3. What exact classification should each “prefer” statement receive when the approved manifest does not state strong versus weak preference? The implementation should not silently decide this for a medical rule; `RuleEffect` should carry the user-facing semantic separately from severity.
4. Should an explicit user-selected supplement time be allowed outside wake-to-bed, or should the UI constrain it to the usable day? The recommended MVP behavior is to validate it against the cyclic usable day and explain the error.
5. Is SQLite without encryption acceptable for the mobile launch? The current recommendation is local SQLite with no encryption claim; encrypted-at-rest storage should be an explicit security requirement if needed.
6. Which mobile platforms and minimum OS versions must be supported, and what local backup behavior is acceptable under the local-only privacy statement?
7. Is an opaque multivitamin entry needed in V1? Recommended: omit it; if retained, make it explicitly flexible/unoptimized rather than treating it as a nutrient.
8. What is the approved copy for each warning and conflict? Copy should live with rule data and be reviewed alongside evidence.
9. Does the intended V1 workload fit the recommended 15-minute candidate resolution and repair depth of 3? Product review should inspect the web vertical slice and golden scenarios before any broader scheduler is considered.

## 18. Implementation checklist

### Architecture and scope

- [ ] Web and mobile apps import the same domain and application packages.
- [ ] No backend, account, cloud sync, analytics, AI, notifications, or excluded feature is present.
- [ ] UI, persistence, and domain boundaries are enforced by package dependencies.

### Rules and safety

- [ ] Active rules are centralized, versioned, evidence-backed, and validated.
- [ ] Missing/ambiguous rules are `RULE_REVIEW_REQUIRED` and inactive.
- [ ] Medication anchors are immutable to the optimizer.
- [ ] Clinical warnings never become timing constraints without a separate approved rule.
- [ ] Unsupported medications do not trigger name/category inference.
- [ ] No dose or regimen is altered.

### Scheduling

- [ ] Candidate enumeration, rule evaluation, priority, tie-breaking, and exact boundary semantics are deterministic.
- [ ] Flexible timing is a first-class result.
- [ ] Hard conflicts are explicit and never silently violated.
- [ ] User overrides are persisted, visible, and limited to overridable preferences.
- [ ] Every placement has a decision trace and explanation based on actual influencing rules.

### Privacy and resilience

- [ ] Canonical state is local-only and versioned.
- [ ] Web persistence uses IndexedDB without encryption claims.
- [ ] Mobile persistence uses local SQLite with an accurately worded privacy claim.
- [ ] Corrupt/incompatible state is handled defensively.
- [ ] Delete/reset clears canonical state and safe-to-recreate metadata.
- [ ] No sensitive data is sent to telemetry or logged.

### Quality

- [ ] Domain boundary, golden, determinism, directional, override, and impossible-schedule tests pass.
- [ ] Web and mobile integration flows pass.
- [ ] Accessibility checks cover keyboard, screen readers, focus, labels, contrast, and scalable text.
- [ ] Evidence/safety audit is complete.
- [ ] Documentation and actual validation results are recorded.

## 19. Final design position

NutriClock should be implemented as a local-first pair of thin platform clients over one pure TypeScript domain engine. The source regimen is small and explicit; rules and evidence are checked-in and versioned; schedules are deterministic derived state; warnings remain warnings; and medication times are immutable anchors. When the approved knowledge is incomplete, the product should visibly support less rather than guess. That is the central tradeoff that keeps the MVP trustworthy and implementable.
