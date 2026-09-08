# NutriClock — Production-Quality MVP Implementation Prompt for Codex

You are operating as a Codex multi-agent software engineering team.

Your task is to transform the existing repository into a production-quality MVP of **NutriClock**, a local-first supplement-timing application available as both a **web application and a mobile application**, while preserving strict safety boundaries, evidence requirements, deterministic behavior, accessibility, privacy, auditability, and explicit scope limits.

Treat this as a real repository modification task, not a speculative design exercise.

Before making architectural decisions:
- inspect the repository;
- identify the existing stack, conventions, build tooling, test tooling, state management, routing/navigation, persistence approach, styling/design system, and deployment assumptions;
- reuse existing infrastructure wherever reasonable;
- do not replace working infrastructure simply because another stack would be preferable.

The objective is to leave the repository in a runnable, tested, documented, production-quality state implementing the MVP and nothing materially beyond it.

Do not expand scope merely because additional functionality is technically possible.

---

# 1. Product Identity

## Product name

**NutriClock**

## Product concept

NutriClock helps users organize **when and how to take supplements they have already decided to take**.

It does not tell users which supplements to start, diagnose deficiencies, prescribe treatment, or recommend doses.

NutriClock creates a practical supplement schedule using only explicitly supported, structured, evidence-backed timing rules involving:

- meals;
- whether a meal commonly contains dietary fat;
- coffee and tea;
- supported supplement-supplement interactions;
- supported supplement-medication timing interactions;
- wake time and bedtime;
- user timing preferences;
- practical adherence;
- minimizing unnecessary dosing windows.

The user owns the regimen.

NutriClock organizes the execution of that regimen.

---

# 2. Platform Requirement: Web + Mobile

The MVP must include both:

1. a responsive web application;
2. a mobile application.

Both clients must use the same core domain semantics and deterministic scheduling behavior.

## Shared logic requirement

Health rules, evidence metadata, scheduling, conflict detection, decision traces, and schedule-generation logic must live in a shared platform-agnostic domain layer wherever the repository architecture permits.

Do not duplicate medical/timing logic separately in web and mobile clients.

Conceptually prefer:

```text
shared domain
  ├─ supplement catalog
  ├─ medication catalog
  ├─ evidence registry
  ├─ rules manifest
  ├─ scheduler
  ├─ conflict engine
  ├─ explanation engine
  └─ persistence contracts

web client
  ├─ web UI
  ├─ web navigation
  └─ web persistence adapter

mobile client
  ├─ mobile UI
  ├─ mobile navigation
  └─ mobile persistence adapter
```

Follow repository conventions instead of forcing this exact folder structure.

## Mobile implementation choice

Do not choose a mobile technology until repository reconnaissance is complete.

If the repository already contains a mobile stack, use it.

If the repository is web-only and a mobile client must be introduced, choose a mature cross-platform mobile approach that can share domain code with the existing stack where practical.

Do not introduce a second full business-logic implementation merely to support mobile.

Do not add cloud infrastructure just to share data between platforms.

## Feature parity

The following must behave equivalently on web and mobile:

- onboarding;
- daily-routine entry;
- supplement entry;
- optional medication entry;
- schedule generation;
- conflicts;
- warnings;
- flexible timing;
- “Why this time?” explanations;
- evidence/source inspection;
- schedule adjustment;
- local persistence;
- deleting all local NutriClock data.

Visual presentation may differ appropriately by platform.

---

# 3. Non-Negotiable Safety Boundary

The MVP MUST NOT:

- diagnose nutrient deficiencies;
- interpret laboratory results;
- tell users which supplements they should start;
- prescribe supplements;
- recommend therapeutic supplement doses;
- change user-entered supplement doses;
- alter prescribed medication doses;
- choose medication administration times;
- move medication administration times;
- change clinician-provided regimens;
- infer diagnoses from supplements or medications;
- claim to treat fatigue, low energy, or symptoms;
- claim that a generated schedule guarantees “optimal absorption”;
- imply that timing alone improves health outcomes;
- use an LLM to infer medical interactions;
- use an LLM to create health rules;
- use an LLM to generate the schedule;
- use an LLM to resolve medical ambiguity;
- invent medication timing intervals;
- convert contextual clinical warnings into arbitrary timing rules;
- silently override prescription instructions;
- silently violate a hard medication constraint;
- present absence of a supported rule as proof that no interaction exists.

Any implementation violating these boundaries is incorrect even if technically functional.

---

# 4. Medication Timing Is a Fixed Anchor

This is a critical architectural and safety rule.

**NutriClock never optimizes medication timing.**

Medication administration times are supplied by the user and treated as immutable schedule anchors.

Example:

```text
Levothyroxine
User-entered time: 7:00 AM
```

NutriClock may schedule supplements around 7:00 AM.

NutriClock must never decide that levothyroxine would be “better” at 6:30 AM, 8:00 AM, or any other time.

## Medication input

For each entered medication capture at minimum:

- medication identity;
- user-entered administration time;
- optional user note;
- optional frequency only where the user explicitly supplies all intended administration times.

For the MVP, prefer one explicit administration time per medication entry.

## Scheduler behavior

Medication anchors are immutable.

If a supplement cannot be placed without violating a hard validated rule relative to a medication anchor:

- do not move the medication;
- do not silently weaken the rule;
- return an explicit schedule conflict.

---

# 5. MVP Frequency Scope

To keep V1 medically and algorithmically bounded:

## Supplements

The MVP supports **once-daily supplement scheduling**.

A user may enter:

- supplement;
- form where relevant;
- dose;
- unit;
- once-daily frequency;
- optional preferred time.

Do not autonomously determine spacing between multiple daily doses.

If the repository already supports explicit repeated schedule entries and there is a compelling implementation reason to retain them, repeated doses are permitted only when the user explicitly supplies each intended dose time. The optimizer must not invent repeated-dose spacing.

## Medications

Medication times are always user-supplied fixed anchors.

Do not infer medication frequency from medication names.

---

# 6. Core User Outcome

A first-time user should be able to complete the primary flow in approximately 3–5 minutes:

1. enter their normal daily routine;
2. add approximately 3–6 supported supplements;
3. optionally add supported medications and their existing administration times;
4. generate a practical schedule;
5. understand why each item was placed where it was;
6. inspect evidence behind supported rules;
7. change a supplement timing preference;
8. immediately see evidence-backed conflicts or warnings.

No account is required.

---

# 7. Onboarding and Product Language

Clearly communicate:

> **NutriClock helps organize supplements you already take. It does not diagnose conditions or determine which supplements or doses you need.**

Suggested landing copy:

## Headline

**A smarter schedule for the supplements you already take.**

## Subheadline

**Organize supplements around meals, coffee, and supported interactions — with the evidence behind every timing suggestion.**

## CTA

**Build my NutriClock**

Avoid:

- “medically optimal”;
- “perfect absorption”;
- “best for your health”;
- “maximize energy”;
- guaranteed benefit language.

Use language such as:

- “suggested schedule”;
- “may improve absorption”;
- “commonly recommended to separate”;
- “we currently support”;
- “flexible timing”;
- “clinical review recommended.”

---

# 8. Daily Routine Input

Capture:

- wake-up time;
- breakfast time, optional;
- lunch time, optional;
- dinner time, optional;
- bedtime;
- coffee timing, optional;
- tea timing, optional;
- snack windows, optional.

## Minimal meal metadata

Because some supported rules depend on meal characteristics, meals may also capture:

```ts
interface MealEvent {
  id: string;
  name: "breakfast" | "lunch" | "dinner" | "snack";
  time: LocalTime;
  containsDietaryFat?: boolean;
}
```

Use simple UX such as:

> Usually includes some dietary fat

Do not attempt detailed nutritional analysis in MVP.

Do not infer meal composition from meal names.

Detailed food composition is future scope.

---

# 9. Supported Supplements

Initial supported individual supplements:

1. Iron
2. Vitamin C
3. Vitamin D3
4. Vitamin B12
5. Calcium
6. Magnesium
7. Zinc
8. Folate / folic acid
9. Omega-3

Each entry supports:

- supplement identity;
- form where relevant;
- dose;
- unit;
- once-daily frequency;
- optional preferred time.

Store the entered dose.

Do not judge whether the dose is medically appropriate.

Reject clearly malformed values only.

Do not automatically alter dosage.

---

# 10. Multivitamins

Do not model “multivitamin” as one standardized nutrient.

If multivitamin support exists, either:

- require relevant ingredient information; or
- treat the product as opaque and state that detailed timing optimization is unavailable.

Do not invent a generic best time for multivitamins.

Supplement Facts label scanning is not part of MVP.

---

# 11. Supported Medication Knowledge

Medication input is optional.

Explain:

> Medication information is used only to apply timing rules NutriClock explicitly supports. NutriClock does not replace your prescription label, pharmacist, or clinician.

The rules architecture must be capable of representing validated interactions involving:

- levothyroxine;
- tetracycline antibiotics;
- quinolone antibiotics;
- oral bisphosphonates;
- dolutegravir;
- penicillamine;
- proton-pump inhibitors;
- metformin;
- warfarin / selected anticoagulants;
- methotrexate;
- selected antiepileptic drugs;
- levodopa.

Implement only interaction rules present in the approved V1 rules manifest.

For unsupported medications show:

> **We don't currently have validated timing rules for this medication. Continue following your pharmacist or clinician's instructions.**

Do not infer interactions from drug names or broad categories unless the approved structured rule explicitly defines that behavior.

---

# 12. Frozen V1 Medical Knowledge

Codex is not responsible for researching, expanding, or interpreting the medical knowledge base.

The V1 medical knowledge supplied with this specification is the upper bound of permitted medical behavior.

Codex MUST NOT:

- independently add new timing rules from web search;
- infer medical rules from general knowledge;
- reinterpret ambiguous guidance;
- convert warnings into timing intervals;
- broaden drug categories without explicit rule data.

## Rule review fallback

If an approved rule is:

- ambiguous;
- internally inconsistent;
- missing a required interval;
- missing an evidence reference;
- impossible to implement without interpretation;

then:

1. mark it internally as `RULE_REVIEW_REQUIRED`;
2. omit it from active scheduling;
3. surface the omission in implementation documentation;
4. do not guess.

Trustworthiness is more important than apparent completeness.

---

# 13. Evidence Manifest

All health knowledge must be traceable to a versioned evidence registry.

Conceptually:

```ts
interface EvidenceReference {
  id: string;
  organization: string;
  title: string;
  url: string;
  reviewedAt: string;
  evidenceVersion: string;
}
```

Preferred authoritative sources in the approved V1 evidence manifest include:

- NIH Office of Dietary Supplements — Iron
- NIH Office of Dietary Supplements — Vitamin C
- NIH Office of Dietary Supplements — Vitamin D
- NIH Office of Dietary Supplements — Vitamin B12
- NIH Office of Dietary Supplements — Calcium
- NIH Office of Dietary Supplements — Magnesium
- NIH Office of Dietary Supplements — Zinc
- NIH Office of Dietary Supplements — Folate
- NIH Office of Dietary Supplements — Omega-3 Fatty Acids
- NIH Office of Dietary Supplements — Multivitamin/Mineral Supplements
- MedlinePlus — levothyroxine
- NHS — ferrous sulfate administration guidance
- FDA/FDA-approved labeling where explicitly included for medication timing rules

Do not add wellness blogs, affiliate pages, influencer content, SEO summaries, or AI-generated medical claims.

Every active health rule must reference at least one evidence record.

---

# 14. Versioned Rules Manifest

All health rules must exist in centralized structured data.

Every generated schedule must identify the ruleset used.

Conceptually:

```ts
const RULESET_VERSION = "1.0.0";
const EVIDENCE_VERSION = "2026-09";
```

A schedule result should include:

```ts
interface ScheduleMetadata {
  rulesetVersion: string;
  evidenceVersion: string;
  generatedAt?: string; // informational only; never affects deterministic output
}
```

The current wall-clock time must not influence schedule placement.

If persisted input was last evaluated against an older ruleset, the application may show:

> **NutriClock's timing guidance has been updated. Rebuild your schedule?**

Do not silently present an old generated schedule as though it used the new rules.

---

# 15. Rule Classification

Every health-related rule must have exactly one semantic classification:

```ts
type RuleClassification =
  | "hard_schedule_constraint"
  | "strong_preference"
  | "weak_preference"
  | "clinical_warning"
  | "informational";
```

These meanings must remain distinct.

A `clinical_warning` must never automatically become a scheduling constraint.

Example:

PPI use may affect iron absorption.

That does not justify inventing:

> Separate iron from omeprazole by 2 hours.

unless an approved rule explicitly states such an interval.

---

# 16. Exact Machine Semantics

Human-facing copy may use phrases such as:

- “about 2 hours”;
- “around 4 hours”;
- “commonly recommended.”

Machine rules must use exact values.

Example:

```ts
minimumSeparationMinutes: 240
```

not:

```ts
minimumSeparationMinutes: "approximately four hours"
```

This is required for deterministic boundary testing.

The machine value and evidence reference must live together in the structured rule manifest.

---

# 17. Interaction Direction

The engine must support:

- symmetric separation;
- source-before-target constraints;
- target-before-source constraints;
- asymmetric constraints.

Conceptually:

```ts
interface InteractionRule {
  id: string;
  sourceId: string;
  targetId: string;

  classification: RuleClassification;

  direction:
    | "symmetric"
    | "source_before_target"
    | "target_before_source"
    | "asymmetric";

  minimumSeparationMinutes?: number;

  sourceBeforeTargetMinutes?: number;
  targetBeforeSourceMinutes?: number;

  conditions?: RuleCondition[];

  rationale: string;
  userMessage: string;

  evidenceIds: string[];

  evidenceStrength:
    | "authoritative_guidance"
    | "supported"
    | "limited"
    | "uncertain";

  rulesetVersion: string;
}
```

Do not collapse asymmetric medication-label instructions into one generic symmetric interval.

---

# 18. Scheduler Priority

Apply strict priority ordering.

## Tier 1

Medication-anchor constraints and explicit hard timing constraints.

## Tier 2

Strong evidence-backed absorption conflicts.

## Tier 3

Positive absorption/timing preferences.

## Tier 4

User timing preference and adherence convenience.

## Tier 5

Minimizing the number of supplement-taking windows.

A lower tier must never override a higher tier.

Encode priority centrally.

Do not distribute precedence decisions through UI code.

---

# 19. Seed V1 Supplement Rules

Implement only these approved semantics and only when the corresponding evidence records exist.

## Iron

For common oral iron such as ferrous sulfate:

- prefer away from food when tolerated;
- allow with/after food when needed for GI tolerance;
- vitamin C can improve nonheme iron absorption;
- prefer co-scheduling iron with vitamin C when both are entered and no stronger rule prevents it;
- prefer at least **120 minutes** separation from coffee;
- prefer at least **120 minutes** separation from tea;
- prefer at least **120 minutes** separation from calcium;
- represent dairy-heavy meal considerations only if the meal model explicitly captures relevant meal information;
- iron and levothyroxine: enforce **240 minutes** separation when the approved rule applies;
- PPI effects on iron: warning/informational behavior only;
- levodopa interaction: implement only if the approved rule manifest contains sufficiently explicit guidance.

## Vitamin C

- prefer co-scheduling with iron when compatible with stronger rules;
- cancer-treatment/high-dose-antioxidant concerns are clinician-review warnings only when explicitly present in the approved manifest;
- no autonomous treatment advice.

## Vitamin D3

- prefer a meal the user marks as containing dietary fat;
- dietary fat is not mandatory;
- no universal morning timing;
- no universal evening timing;
- orlistat-related issues only as explicitly validated;
- thiazide-related issues are warnings, not generic timing fixes.

If no meal is marked as containing dietary fat, do not invent meal composition. Fall back to flexible/practical scheduling and explain the limitation.

## Vitamin B12

- flexible timing by default;
- no invented morning/evening preference;
- no invented food requirement;
- metformin-related B12 effects are informational/clinical-warning behavior;
- gastric-acid-inhibitor effects are informational/clinical-warning behavior;
- do not invent separation intervals.

## Calcium

Capture form.

### Calcium carbonate

- prefer with food.

### Calcium citrate

- may be taken with or without food.

### Supplemental calcium

- if the entered amount in one event is above roughly 500 mg, do not automatically split the regimen;
- show educational guidance suggesting the user verify dose splitting with a clinician/pharmacist if the approved evidence supports that message.

### Interactions

- calcium carbonate and levothyroxine: enforce **240 minutes** separation when applicable;
- calcium and quinolone antibiotics: use only drug-specific approved timing rules;
- calcium and dolutegravir: preserve approved asymmetric timing;
- calcium and iron: prefer at least **120 minutes** separation.

## Magnesium

- do not hardcode bedtime dosing;
- evening is allowed only as a user preference;
- tetracycline/quinolone timing: use only approved asymmetric rules;
- oral bisphosphonate timing: use only approved separation rules;
- long-term PPI-related magnesium concerns remain warnings/information.

## Zinc

- when simultaneous supplemental elemental iron is at least 25 mg, avoid same-window placement where practical;
- do not invent an hour-based interval unless the approved manifest contains one;
- tetracycline/quinolone interactions: use only approved asymmetric timing;
- penicillamine separation: use only the approved exact interval.

## Folate / folic acid

- no arbitrary morning/evening rule;
- methotrexate interaction is a clinical-context warning;
- selected antiepileptic interactions are clinical-context warnings where approved;
- sulfasalazine issues only where approved;
- never “solve” methotrexate/folate concerns by moving a dose.

## Omega-3

- no arbitrary morning/evening rule;
- anticoagulant concerns are monitoring/clinical-warning behavior where approved;
- do not invent a time separation to imply the clinical issue has been eliminated.

---

# 20. Flexible Timing Is a First-Class Result

When no strong evidence-backed timing requirement exists, return a flexible result.

Suggested user-facing text:

## Flexible timing

> We haven't identified a strong evidence-based reason to take this supplement at a particular time. Choose a time you're likely to remember.

Do not manufacture recommendations merely to make the optimizer appear intelligent.

A valid schedule may contain flexible items.

---

# 21. Deterministic Scheduler

The scheduler must be deterministic.

Do not use an LLM, random process, current wall-clock time, network state, or unstable ordering.

Represent the user's usable day as discrete candidate windows.

Prefer 15- or 30-minute intervals unless repository constraints strongly favor another deterministic resolution.

Evaluate candidate supplement placements against:

- wake time;
- bedtime;
- meals;
- meal metadata;
- food requirements;
- dietary-fat preference;
- coffee;
- tea;
- other supplements;
- fixed medication anchors;
- user preferred times;
- current supplement dosing windows;
- rule priorities;
- convenience.

Hard constraints invalidate candidates.

Strong preferences receive high penalties.

Weak preferences receive smaller penalties.

Creating another supplement-taking event may receive a small convenience penalty.

Use deterministic:

- candidate enumeration;
- rule evaluation order;
- sorting;
- tie-breaking.

Identical canonical input + same ruleset must produce structurally identical schedule output.

---

# 22. Decision Trace Is Mandatory

Every generated placement must carry an auditable decision trace.

Conceptually:

```ts
interface CandidateRuleEvaluation {
  ruleId: string;
  classification: RuleClassification;
  result:
    | "satisfied"
    | "violated"
    | "not_applicable"
    | "warning";
  scoreImpact?: number;
}

interface ScheduleDecisionTrace {
  itemId: string;
  selectedTime?: LocalTime;
  consideredCandidates: CandidateSummary[];
  selectedCandidateReason: string;
  influencingRuleIds: string[];
}
```

Do not expose the entire internal trace to normal users by default.

The trace is required for:

- tests;
- debugging;
- deterministic explanations;
- safety audits;
- future rule review.

“Why this time?” must correspond to the actual rule IDs that affected the selected placement.

Do not display a reason for a rule that did not affect the decision.

---

# 23. Derived Schedule State

The canonical source of truth is:

```text
routine
+ supplements
+ medications and fixed times
+ user preferences
+ user overrides
+ ruleset version
```

The generated schedule is derived output.

It may be cached for performance, but it must never become the authoritative regimen state.

Changing source inputs must invalidate/recompute the derived schedule.

Do not allow stale generated schedules to survive incompatible source-state changes without clear invalidation.

---

# 24. Scheduler Output

The result must be capable of representing:

- successful schedule;
- flexible items;
- explanation metadata;
- evidence IDs;
- warnings;
- user-overridable preference conflicts;
- non-overridable hard timing conflicts;
- unresolved `ScheduleConflict[]` or equivalent;
- decision traces;
- ruleset/evidence versions.

Never fabricate a complete schedule by violating a hard rule.

An impossible schedule is a valid result.

---

# 25. Primary Result Screen: “Your NutriClock”

The final product experience should be branded as:

# Your NutriClock

Show a daily timeline.

Example:

## Morning

**7:00 AM — Levothyroxine**

Medication time entered by you. Follow your prescription instructions.

**11:00 AM — Iron + Vitamin C**

Why this time?

- separated from your 7:00 AM levothyroxine anchor;
- separated from your morning coffee;
- vitamin C is paired with iron.

## Dinner

**7:00 PM — Vitamin D3**

Why this time?

- this meal is marked as containing dietary fat;
- dietary fat can enhance vitamin D absorption.

## Flexible

**Vitamin B12**

No strong evidence-backed timing requirement was identified. Choose a time you're likely to remember.

Use wording such as:

> **Suggested schedule based on the timing rules NutriClock currently supports.**

---

# 26. Schedule Editing

Users may adjust supplement preferences/times.

Re-run validation immediately.

For user-overridable absorption preferences:

> **Iron and calcium are currently scheduled together. Taking them at different times may improve iron absorption.**

Possible actions:

- Move Iron
- Move Calcium
- Keep my timing

If retained:

> **User-selected timing — this may reduce absorption.**

For hard medication timing rules:

> **NutriClock cannot recommend overriding this medication timing rule. Follow your prescription label, pharmacist, or clinician's instructions.**

Do not move the medication anchor.

---

# 27. Clinical Warning State

Some issues cannot be solved by schedule optimization.

Example:

## Clinical review recommended

> You entered folic acid and methotrexate. Appropriate folate use with methotrexate depends on why methotrexate was prescribed. NutriClock won't change either regimen. Follow your clinician or pharmacist's instructions.

Use the same pattern where approved structured rules support issues such as:

- anticoagulants + omega-3;
- cancer treatment + high-dose antioxidants;
- relevant contextual medication/supplement issues.

Warnings remain warnings unless a separate evidence-backed timing rule exists.

---

# 28. Local-First Privacy

The MVP requires no account and no cloud synchronization.

User-entered regimen data should remain on the user's device.

## Web

Use repository-appropriate browser persistence such as:

- IndexedDB;
- local storage only if the data model is simple and the repository conventions support it.

Do not claim encryption unless the implementation actually provides encryption.

## Mobile

Use repository-appropriate local persistence.

Prefer platform-appropriate protected/encrypted local storage for sensitive data where reasonable and supported by the chosen mobile stack.

Do not add a backend merely to persist mobile data.

## Shared persistence contract

Where practical, define a platform-neutral repository interface such as:

```ts
interface RegimenRepository {
  load(): Promise<PersistedNutriClockState | null>;
  save(state: PersistedNutriClockState): Promise<void>;
  clear(): Promise<void>;
}
```

Provide web and mobile adapters.

## No sensitive telemetry

Do not transmit or log:

- medication names;
- supplement names;
- doses;
- regimen;
- schedule;
- health-related notes;

to analytics or remote telemetry.

Do not add analytics in MVP.

---

# 29. Privacy UX

Make local-first behavior visible.

Suggested UI:

## Stored on this device

> Your supplement and medication information stays on this device. NutriClock does not require an account or upload your regimen.

Only use this exact claim if it is technically true for the implemented clients.

---

# 30. Delete All Data

Both web and mobile clients must provide a clearly discoverable:

**Delete my NutriClock data**

or:

**Reset NutriClock**

This must clear:

- routine;
- supplements;
- medications;
- preferences;
- overrides;
- cached derived schedule;
- local schema metadata that is safe to recreate.

Require user confirmation before destructive deletion.

After deletion, return the application to a clean onboarding state.

---

# 31. Persistence Versioning

Persisted data must include a schema version.

Conceptually:

```ts
interface PersistedNutriClockState {
  schemaVersion: number;
  rulesetVersionLastEvaluated: string;
  routine: DailyRoutine;
  supplements: SupplementEntry[];
  medications: MedicationAnchor[];
  preferences: UserPreferences;
  overrides: UserOverride[];
}
```

Handle corrupted or obsolete local state defensively.

Do not silently reinterpret incompatible old data.

Add migrations only where needed.

---

# 32. Accessibility

Accessibility is an MVP requirement for both web and mobile.

## Web

Implement:

- semantic HTML;
- keyboard navigation;
- visible focus states;
- associated form labels;
- accessible validation/errors;
- sufficiently large targets;
- no color-only status communication;
- WCAG AA contrast;
- scalable typography;
- sensible headings;
- ARIA only where native semantics are insufficient.

## Mobile

Implement platform-appropriate:

- accessibility labels;
- roles/traits;
- readable focus order;
- screen-reader support;
- large touch targets;
- dynamic/scalable text where supported;
- no color-only status communication;
- accessible warnings and dialogs.

Plain language is required on both platforms.

---

# 33. Required Screens / Views

Implement equivalent flows on web and mobile using platform-native navigation patterns.

## 1. Landing / Welcome

- NutriClock identity
- scope statement
- privacy statement
- CTA

## 2. Your Day

Capture:

- wake;
- optional meals;
- optional dietary-fat meal flag;
- coffee;
- tea;
- bedtime.

## 3. Your Supplements

Add supported supplements.

Capture:

- supplement;
- form;
- dose;
- unit;
- once-daily frequency;
- optional preferred time.

## 4. Medications That Affect Timing — Optional

Capture:

- supported medication identity;
- fixed user-entered administration time;
- optional note.

Explain limited interaction coverage.

## 5. Your NutriClock

Show:

- timeline;
- fixed medication anchors;
- supplement schedule;
- flexible items;
- warnings;
- conflicts;
- “Why this time?”;
- Sources;
- ruleset/evidence version information in an unobtrusive details area.

## 6. Adjust Schedule

Allow supplement timing preference changes.

Never allow the optimizer to move medication anchors.

## 7. Settings / Data

Include:

- privacy explanation;
- local data statement;
- ruleset/evidence version;
- delete/reset all local data.

---

# 34. No AI Dependency

The MVP must not require an AI service.

Facts originate from structured deterministic rules.

Examples:

```text
iron + calcium -> strong preference to separate
levothyroxine anchor + iron -> hard separation rule
PPI + B12 -> warning, not invented interval
```

Static structured explanation templates are sufficient.

Do not add an AI SDK.

---

# 35. MVP Exclusions

Do not implement:

- lab upload;
- lab interpretation;
- deficiency diagnosis;
- supplement recommendations;
- dosage recommendations;
- symptom diagnosis;
- energy optimization;
- AI health chatbot;
- supplement shopping;
- affiliate links;
- brand rankings;
- user accounts;
- cloud synchronization;
- clinician portal;
- wearable integration;
- Apple Health;
- Health Connect;
- automatic medication import;
- push reminders;
- scheduled notifications;
- payments;
- Supplement Facts scanning;
- OCR;
- automatic web-derived medical-rule expansion;
- generic medication-interaction lookup;
- social features;
- caregiver sharing;
- cross-device sync.

Important:

**Mobile application support IS part of MVP.**

**Push reminders/notifications are NOT part of MVP.**

The mobile application is initially for schedule creation, viewing, editing, evidence, and local persistence.

---

# 36. Future Roadmap Compatibility

Keep domain models reasonably extensible toward:

- adherence reminders;
- local notifications;
- lab-aware information;
- clinician-confirmed regimens;
- richer meal composition;
- expanded reviewed medication/supplement knowledge;
- Supplement Facts extraction;
- encrypted opt-in sync.

Do not build these now.

Do not add speculative services, APIs, queues, databases, or cloud resources solely for future compatibility.

---

# 37. Engineering Quality

Expect:

- clear module boundaries;
- minimal duplication;
- strong typing where supported;
- pure or isolated domain functions;
- deterministic schedule logic;
- defensive input validation;
- defensive local-state loading;
- stable IDs;
- versioned persisted state;
- versioned rules;
- no global mutable rule state;
- no hidden medical constants in UI code;
- no medical semantics duplicated between web and mobile;
- no unnecessary dependencies;
- no unrelated large refactors;
- no secrets;
- no swallowed errors that can hide invalid schedules.

Favor auditable, boring, deterministic code over clever optimization.

---

# 38. Multi-Agent Operating Model

Use multiple agents where supported.

Recommended responsibilities:

## Lead / Architect

- repository reconnaissance;
- shared architecture;
- work decomposition;
- shared domain contracts;
- integration;
- safety review;
- final verification.

## Domain / Rules Engine

- health-rule manifest;
- evidence registry;
- rule evaluation;
- deterministic scheduler;
- conflicts;
- warnings;
- decision trace;
- ruleset versioning.

## Web Application

- responsive web UX;
- navigation;
- accessibility;
- web persistence adapter;
- integration with shared domain APIs.

## Mobile Application

- mobile UX;
- mobile navigation;
- accessibility;
- mobile persistence adapter;
- integration with shared domain APIs.

## Testing / Quality

- domain unit tests;
- deterministic tests;
- boundary tests;
- web integration tests;
- mobile integration tests where supported;
- safety regression tests.

## Documentation / Audit

- architecture;
- supported rules;
- evidence manifest;
- safety boundaries;
- local-first behavior;
- platform parity;
- rule-contributor guidelines.

Adapt agent count to the environment while preserving these responsibilities.

Define file/module ownership before parallel edits.

Avoid multiple agents independently changing shared domain contracts.

---

# 39. Required Execution Sequence

## Phase A — Repository reconnaissance

Before implementation:

- inspect tree;
- inspect manifests;
- inspect framework/runtime versions;
- inspect web architecture;
- inspect whether mobile already exists;
- inspect routing/navigation;
- inspect state management;
- inspect styling/design system;
- inspect persistence;
- inspect tests;
- inspect CI;
- inspect lint/typecheck/build commands;
- inspect docs;
- identify existing public behavior.

Do not choose mobile technology or new dependencies before reconnaissance.

## Phase B — Plan

Produce an implementation plan covering:

- existing architecture;
- shared domain architecture;
- web architecture;
- mobile architecture;
- persistence adapters;
- rules manifest;
- evidence manifest;
- scheduler;
- decision trace;
- UI flows;
- test strategy;
- documentation;
- risky assumptions;
- explicit non-goals.

## Phase C — Shared contracts

Before parallel work, establish stable contracts for:

- supplements;
- supplement forms;
- medication anchors;
- meals;
- routine;
- rules;
- evidence;
- warnings;
- conflicts;
- schedule;
- decision trace;
- persistence;
- ruleset versioning.

## Phase D — Implementation

Parallelize where module ownership is clear.

Add tests alongside safety-critical behavior.

## Phase E — Integration

Lead agent verifies:

- no duplicated health logic;
- web/mobile parity;
- fixed medication-anchor semantics;
- deterministic behavior;
- local-first behavior;
- evidence mappings;
- accessibility;
- no excluded functionality.

## Phase F — Verification

Run all repository-standard applicable checks:

- dependency install;
- formatter;
- lint;
- typecheck;
- unit tests;
- integration tests;
- web UI/E2E tests;
- mobile tests where supported;
- production web build;
- mobile build/type validation appropriate to the selected stack.

Fix introduced failures.

Clearly distinguish unrelated pre-existing failures.

---

# 40. Mandatory Domain Tests

At minimum test:

## Iron + calcium

- avoid same window when reasonable;
- exact 120-minute machine threshold where encoded;
- one minute below;
- exact threshold;
- one minute above where meaningful.

## Iron + coffee

- enforce seeded 120-minute preference behavior.

## Iron + tea

- same relevant behavior.

## Iron + vitamin C

- prefer co-scheduling;
- stronger medication rule may prevent co-scheduling.

## Vitamin D

- prefer a meal explicitly marked as containing dietary fat;
- do not assume unmarked meals contain fat;
- dietary fat is not treated as mandatory;
- no invented morning/evening preference.

## Levothyroxine anchor + iron

- medication remains fixed;
- iron respects 240-minute separation;
- convenience cannot override;
- optimizer never moves levothyroxine.

## Levothyroxine anchor + calcium carbonate

- medication remains fixed;
- calcium respects 240-minute separation.

## Zinc + iron >=25 mg

- avoid same window where reasonable;
- no invented hour interval.

## Asymmetric rules

At least:

- magnesium + tetracycline;
- magnesium + quinolone;
- calcium + dolutegravir.

Verify source-before-target and target-before-source values independently.

## Flexible timing

- no meaningful timing rule -> flexible;
- scheduler does not invent morning/evening guidance.

## Clinical warnings

- PPI + B12 remains warning/information;
- methotrexate + folate remains clinical-context warning;
- warning does not create fake timing separation.

## Unsupported medication

- show unsupported guidance;
- no inferred interaction;
- absence of a supported rule is not labeled “no interaction.”

## Impossible schedule

- return explicit conflict;
- do not move medication anchor;
- do not violate hard rule.

## Determinism

Repeated canonical input + same ruleset must produce structurally identical:

- schedule;
- ordering;
- warnings;
- conflicts;
- explanations;
- decision trace.

## Priority

- Tier 4/5 never override Tier 1;
- weak preference never overrides strong preference;
- strong preference never masquerades as hard constraint.

## User override

- allowed absorption override persists;
- override remains visibly marked;
- re-optimization does not silently discard it;
- hard medication rules remain non-overridable.

---

# 41. Golden Scenario Tests

In addition to isolated rule tests, implement end-to-end domain “golden scenarios.”

Do not assert exact clock times unless constraints force them.

Assert the important properties of the schedule.

## Golden Scenario A — Iron-focused routine

Input:

```text
Wake: 7:00 AM
Levothyroxine fixed anchor: 7:00 AM
Coffee: 8:00 AM
Breakfast: 8:30 AM
Lunch: 12:30 PM
Dinner: 7:00 PM

Iron: 65 mg once daily
Vitamin C: 500 mg once daily
Calcium carbonate: 500 mg once daily
Vitamin D3: 2000 IU once daily
```

Expected properties:

- levothyroxine stays at 7:00 AM;
- iron satisfies the levothyroxine hard interval;
- iron does not violate coffee preference if a reasonable alternative exists;
- vitamin C prefers iron;
- calcium prefers separation from iron;
- calcium carbonate prefers food;
- Vitamin D prefers a meal explicitly marked as containing dietary fat;
- every explanation maps to actual influencing rules;
- evidence IDs resolve;
- output is deterministic.

## Golden Scenario B — Flexible routine

Input supplements with no meaningful time-of-day rule and no interactions.

Expected:

- flexible timing is returned;
- no fabricated morning/evening benefit claims;
- app may group items for convenience only if this does not create a misleading health claim.

## Golden Scenario C — Impossible hard constraint

Construct a limited user day where a supplement cannot satisfy an approved hard rule around immutable medication anchors.

Expected:

- explicit `ScheduleConflict`;
- medication anchors unchanged;
- no fabricated fallback.

## Golden Scenario D — Clinical warning

Input a validated contextual combination such as methotrexate + folate.

Expected:

- warning state;
- no automatic timing “solution”;
- schedule engine does not treat the warning as a separation penalty.

---

# 42. UI / Integration Tests

Where supported by the selected stacks, cover on both platforms:

1. onboarding;
2. routine entry;
3. meal dietary-fat flag;
4. supplement entry;
5. medication anchor entry;
6. schedule generation;
7. viewing “Why this time?”;
8. viewing Sources;
9. flexible timing;
10. modifying a supplement preference;
11. absorption-conflict override;
12. hard medication conflict;
13. clinical warning;
14. unsupported medication;
15. persistence after restart/reload;
16. delete all local data;
17. stale ruleset prompt/recompute behavior.

Do not rely on snapshots alone for safety-critical behavior.

---

# 43. Evidence and Safety Audit

Before completion, perform a structured audit.

Verify:

- every active health rule has evidence IDs;
- every evidence ID resolves;
- every hard rule has tests;
- every exact timing interval comes from the approved manifest;
- every asymmetric rule has directional tests;
- no medication anchor is moved by the optimizer;
- no clinical warning becomes an arbitrary timing rule;
- no unsupported medical rule was added;
- no dosage recommendation was introduced;
- no supplement regimen was changed;
- no medication regimen was changed;
- flexible timing exists;
- impossible schedules remain possible;
- explanations correspond to actual influencing rules;
- local data stays local;
- no sensitive telemetry exists;
- web/mobile clients use the same domain semantics;
- no AI dependency exists;
- accessibility requirements are met;
- excluded features were not introduced.

Search the repository for duplicated medical timing constants outside the approved rule manifest.

---

# 44. Documentation Requirements

Document:

- NutriClock product scope;
- safety boundaries;
- web architecture;
- mobile architecture;
- shared domain architecture;
- fixed medication-anchor model;
- rules engine;
- scheduler priority;
- exact machine timing semantics;
- decision trace;
- supported supplements;
- supported supplement forms;
- supported medication rules;
- every implemented interaction;
- evidence registry;
- ruleset version;
- evidence version;
- how schedules are derived;
- persistence schema;
- local-first privacy model;
- web persistence;
- mobile persistence;
- data deletion;
- testing strategy;
- golden scenarios;
- limitations;
- unsupported behavior;
- extension points.

Include prominently:

> **No health-related rule may be added without an approved evidence reference and appropriate tests.**

Also include:

> **A clinical warning must not be converted into a scheduling constraint unless an approved authoritative source independently supports that scheduling rule.**

And:

> **Medication times are fixed user-entered anchors. NutriClock schedules supplements around them; it does not optimize prescription medication timing.**

---

# 45. Product Principles

Every implementation choice must respect:

1. **Evidence over folklore.**
2. **Admit uncertainty.**
3. **No recommendation is better than an invented recommendation.**
4. **Medication times are fixed anchors.**
5. **Convenience never overrides medication constraints.**
6. **Explain every recommendation.**
7. **Every health rule has a source.**
8. **Deterministic medical logic, not LLM reasoning.**
9. **The user owns the regimen; NutriClock organizes it.**
10. **Local-first privacy.**
11. **Web and mobile share the same health-rule semantics.**
12. **Schedules are derived state, not medical truth.**
13. **Rules and evidence are versioned.**
14. **Do not imply that supplement timing alone improves health, symptoms, or energy.**

---

# 46. Definition of Done

The MVP is complete only if:

- the web app is functional;
- the mobile app is functional;
- both use shared deterministic domain semantics;
- a user can enter their routine;
- a user can enter supported once-daily supplements;
- a user can optionally enter medications with fixed administration times;
- medication times remain immutable to the optimizer;
- a deterministic supplement schedule can be generated;
- hard constraints are enforced;
- strong preferences are respected;
- flexible timing is supported;
- impossible schedules produce explicit conflicts;
- explanations identify actual influencing rules;
- evidence is inspectable;
- schedule adjustments trigger immediate validation;
- clinical warnings remain distinct from timing constraints;
- unsupported medications do not trigger invented rules;
- data is local-first;
- users can delete all local data;
- no AI service is required;
- rules/evidence are versioned;
- decision traces exist;
- safety-critical behavior is tested;
- golden scenarios pass;
- accessibility is addressed on web and mobile;
- documentation is complete;
- lint/typecheck/tests/builds pass, or unrelated pre-existing failures are clearly identified;
- the repository is left runnable.

The product succeeds when a user can move from:

> **“I take several supplements and I'm not sure how to organize them around my day.”**

to:

> **“I have a practical schedule, I understand why each supplement is there, and I can see the evidence behind the timing rules.”**

in approximately five minutes.

Optimize for trustworthiness, auditability, determinism, cross-platform consistency, and usefulness — not for the number of recommendations produced.

---

# 47. Final Completion Report

At completion, provide a concise report containing:

- repository architecture discovered;
- web stack used;
- mobile stack used;
- shared domain architecture;
- major files/modules added or changed;
- implemented supplements/forms;
- implemented medication rules;
- ruleset/evidence versions;
- scheduler design;
- fixed medication-anchor behavior;
- decision-trace design;
- persistence design on web;
- persistence design on mobile;
- privacy/data-deletion behavior;
- accessibility work;
- tests added;
- golden scenarios added;
- documentation added;
- validation commands run and outcomes;
- unrelated pre-existing failures;
- known limitations;
- assumptions;
- rules intentionally omitted because evidence was insufficient or ambiguous.

Do not claim completion for checks that were not actually executed.

Use one governing principle whenever requirements compete:

> **Trustworthy, evidence-backed, deterministic behavior takes precedence over appearing comprehensive or clever.**
