# NUTRICLOCK_PRODUCT_REQUIREMENTS.md

# NutriClock Product Requirements

## 1. Product

**NutriClock**

Current baseline: V2

Current target: V2.5

---

## 2. Product vision

NutriClock helps users organize **when and how to take supplements they have already decided to take**.

NutriClock may use validated timing information involving:

* food requirements;
* absorption considerations;
* supplement-supplement relationships;
* supported supplement-medication relationships;
* medication anchors;
* meals;
* coffee;
* tea;
* user timing preferences;
* convenience;
* adherence;
* minimum necessary dosing windows.

NutriClock does not determine what regimen the user should follow.

The user owns the regimen.

NutriClock organizes its execution.

---

# 3. Primary product problem

V2 provides useful scheduling and daily execution functionality but requires too much manual context before the product demonstrates its intelligence.

Users should not feel that they need to construct the schedule themselves by entering every aspect of their day.

The product should move from:

**Configure your routine, then generate a schedule.**

to:

**Tell NutriClock what you take, receive useful guidance immediately, then refine only what matters.**

---

# 4. V2.5 product objective

V2.5 should substantially reduce input friction.

A new user should primarily enter:

* supplements;
* medications;
* supplement form where relevant;
* dose where relevant;
* frequency where relevant.

NutriClock should then determine:

* applicable validated rules;
* compatible grouping;
* required separation;
* preferred separation;
* food requirements;
* food preferences;
* beverage considerations;
* medication interactions;
* flexible items;
* missing context;
* schedule complexity.

It should generate the strongest useful schedule possible before requiring complete routine data.

---

# 5. North-star metric

The primary product-quality concept is:

**Useful scheduling output per unit of user input.**

Supporting metrics:

* time to first useful NutriClock;
* required fields before first schedule;
* blocking questions before first schedule;
* percentage of users generating a schedule without full routine entry;
* percentage of schedule refinements completed through one-question interactions;
* schedule repair success;
* percentage of unsupported relationships communicated transparently.

Raw app opens are not the primary success metric.

---

# 6. Safety boundary

NutriClock must not:

* diagnose nutrient deficiencies;
* interpret laboratory values;
* recommend supplements to start;
* recommend supplements to stop;
* prescribe supplements;
* recommend therapeutic doses;
* change user-entered supplement doses;
* alter prescription doses;
* independently redesign prescription medication regimens;
* infer diagnoses from supplement use;
* infer diagnoses from medication use;
* diagnose symptoms;
* claim to treat fatigue or low energy;
* claim guaranteed absorption;
* claim a schedule is medically optimal;
* use an LLM to infer medical interactions;
* use an LLM to create health rules;
* invent medication intervals;
* silently override prescription instructions;
* present lack of knowledge as absence of interaction.

NutriClock optimizes execution of the regimen.

It does not design the regimen.

---

# 7. Product language

Avoid:

* medically optimal;
* perfect schedule;
* maximum absorption;
* guaranteed absorption;
* best benefit;
* safest regimen;
* no interaction;
* optimized health;
* energy optimization.

Prefer:

* suggested schedule;
* evidence-supported timing;
* preferred timing;
* timing rules we currently support;
* may improve absorption;
* may support absorption;
* no validated NutriClock timing rule;
* flexible timing;
* clinical review recommended.

---

# 8. Primary information architecture

NutriClock should expose four primary concepts.

## Regimen

Contains what the user takes.

## My NutriClock

Contains the generated schedule.

## Today

Contains today's execution and deviations.

## Improve Schedule

Contains optional refinements.

Routine configuration should not dominate onboarding.

---

# 9. Regimen entry

The first major onboarding question should be:

**What do you currently take?**

Support rapid entry of multiple items.

Example:

* Levothyroxine
* Iron 25 mg
* Vitamin C
* Vitamin D3 2000 IU
* Vitamin B12
* Multivitamin
* Omega-3

Allow:

* search;
* autocomplete;
* aliases;
* rapid add;
* form selection where relevant;
* dose input where relevant;
* unit input where relevant;
* frequency.

Do not ask for data merely because the model supports storing it.

---

# 10. Regimen entity normalization

Support deterministic aliases where safe.

Examples:

* D3 → Vitamin D3
* B12 → Vitamin B12
* Synthroid → Levothyroxine
* folic acid → Folate / folic acid

Potentially ambiguous aliases require confirmation.

Natural-language parsing may identify candidate entities.

Natural-language parsing must not generate health relationships.

All health semantics must come from validated structured rules.

---

# 11. Initial supported supplements

The supported set includes at least:

1. Iron
2. Vitamin C
3. Vitamin D3
4. Vitamin B12
5. Calcium
6. Magnesium
7. Zinc
8. Folate / folic acid
9. Omega-3

Existing V2 coverage should be preserved.

---

# 12. Medication coverage

Medication entry is optional.

Users may record unsupported medications.

The structured knowledge system may include validated coverage involving:

* levothyroxine;
* tetracycline antibiotics;
* quinolone antibiotics;
* oral bisphosphonates;
* dolutegravir;
* penicillamine;
* proton-pump inhibitors;
* metformin;
* warfarin / selected anticoagulants;
* methotrexate;
* selected antiepileptic drugs;
* levodopa.

Only explicitly validated rules may affect scheduling.

---

# 13. Unsupported medications

If NutriClock lacks validated timing rules for an entered medication, show:

**We don't currently have validated NutriClock timing rules for this medication. Continue following your prescription label, pharmacist, or clinician's instructions.**

The medication may remain in the regimen.

Unsupported medication presence must not prevent useful scheduling of supported supplements.

Never say:

**No interaction found.**

---

# 14. Multivitamins

Do not treat a generic multivitamin as a standardized nutrient composition.

If the user enters a multivitamin:

Offer:

* Keep as generic multivitamin
* Add ingredients

If ingredients are unknown, represent the product as opaque.

NutriClock should explain that detailed nutrient-level timing cannot be determined without composition information.

Do not invent a universal best time for multivitamins.

Do not block other regimen items.

---

# 15. Partial-context scheduling

The scheduler must support:

**regimen + partial context → useful schedule**

A complete daily routine must not be required.

Missing contextual information must be represented explicitly.

The scheduler may return:

* exact clock time;
* semantic window;
* meal-relative window;
* medication-relative window;
* flexible timing;
* unresolved hard-context requirement.

---

# 16. Semantic schedule windows

Support concepts such as:

* after waking;
* before first meal;
* with a meal;
* between meals;
* with a meal containing dietary fat;
* away from coffee;
* away from tea;
* away from calcium;
* relative to medication anchor;
* later in the day;
* flexible.

Exact clock times should replace semantic windows when sufficient context becomes available.

---

# 17. Schedule completeness

Every schedule should have a context completeness state conceptually equivalent to:

* resolved;
* resolved with assumptions;
* refinable;
* requires context;
* conflicted.

This is not medical confidence.

User-facing examples:

**Your NutriClock is ready.**

**Your NutriClock is ready — 2 optional refinements are available.**

**One detail is needed to resolve this timing constraint.**

**This schedule has a conflict NutriClock will not override.**

---

# 18. Missing context

Unknown information must not automatically block scheduling.

Example:

If coffee timing is unknown for an Iron user, NutriClock may show:

**Prefer away from coffee and tea.**

**Add your usual coffee time if you'd like NutriClock to calculate the exact window.**

The application must distinguish:

* unknown but harmless;
* unknown but useful;
* unknown and materially important;
* unknown and required to resolve a hard constraint.

---

# 19. Minimum Necessary Questions

Create a deterministic mechanism for selecting the next contextual question.

Questions must be prioritized by scheduling impact.

Highest priority:

* required to resolve hard constraint;
* necessary to preserve medication anchor;
* resolves schedule conflict.

Next:

* materially changes valid windows;
* materially reduces dosing complexity;
* resolves a strong preference.

Lower:

* turns semantic window into exact time;
* convenience personalization.

Lowest:

* cosmetic or currently irrelevant information.

Do not show a long routine questionnaire where one question is sufficient.

---

# 20. Example question behavior

Regimen:

* Levothyroxine
* Iron
* Vitamin C
* Vitamin D3

Unknown:

* levothyroxine time;
* coffee;
* breakfast;
* dinner;
* bedtime.

NutriClock should prioritize:

**When do you normally take your levothyroxine?**

It should not prioritize bedtime merely because bedtime is available as a profile field.

---

# 21. Medication anchors

Medication timing must be handled conservatively.

If a user's existing medication timing is needed, request it.

Example:

**When do you normally take your levothyroxine?**

Explain:

**We'll keep your medication time fixed and arrange compatible supplement windows around it.**

NutriClock must not arbitrarily assign a prescription medication time simply because a common administration time exists.

Medication anchors outrank convenience.

---

# 22. Rule classifications

Every health rule must belong to a classification equivalent to:

* hard schedule constraint;
* strong preference;
* weak preference;
* clinical warning;
* informational.

A clinical warning is not automatically a timing constraint.

---

# 23. Priority model

Scheduler priorities remain:

### Tier 1

Prescription medication constraints and explicit safety rules.

### Tier 2

Strong evidence-backed absorption conflicts.

### Tier 3

Positive absorption/timing preferences.

### Tier 4

User preference and adherence convenience.

### Tier 5

Minimize dosing windows.

Lower tiers must never override higher tiers.

---

# 24. Rule architecture

Health knowledge must remain centralized structured data.

Do not embed medical timing facts inside:

* UI components;
* button handlers;
* styling code;
* arbitrary display helpers;
* reminder strings.

All medical explanation should resolve from rule metadata.

---

# 25. Asymmetric interactions

The architecture must support:

* symmetric separation;
* source before target;
* target before source;
* asymmetric intervals.

Do not collapse asymmetric medication guidance into one symmetric separation field.

---

# 26. Evidence

Every health-related rule requires at least one evidence reference.

Evidence metadata should include:

* stable ID;
* organization;
* title;
* URL;
* reviewed/accessed date;
* rule version where applicable.

Preferred evidence hierarchy:

1. NIH Office of Dietary Supplements
2. FDA / FDA-approved medication labeling
3. MedlinePlus
4. NHS
5. recognized health-system references
6. systematic reviews or guidelines where authoritative primary guidance is unavailable

Do not use:

* wellness blogs;
* affiliate supplement websites;
* influencer content;
* unsourced AI claims.

---

# 27. Existing evidence set

Preserve existing validated V2 evidence including authoritative references for:

* Iron
* Vitamin C
* Vitamin D
* Vitamin B12
* Calcium
* Magnesium
* Zinc
* Folate
* Omega-3
* Multivitamin/mineral supplements
* Levothyroxine
* Ferrous sulfate administration

Do not expand the ruleset simply for coverage.

---

# 28. Iron

Preserve validated semantics including:

* prefer away from food when tolerated;
* may be taken with or after food where GI tolerance requires;
* Vitamin C may improve nonheme iron absorption;
* prefer pairing Iron and Vitamin C where appropriate;
* prefer separation from coffee and tea according to configured guidance;
* prefer separation from calcium;
* recognize dairy-heavy intake as relevant where supported;
* enforce validated levothyroxine separation;
* treat PPI-related effects as warning/information unless specific timing guidance exists;
* represent levodopa relationships only to the extent supported by evidence.

Do not automatically claim lunch is the best Iron time.

NutriClock should select lunch only when known context and rules support that placement.

---

# 29. Vitamin C

Preserve:

* preference for co-scheduling with Iron where compatible;
* clinical-review messaging for relevant high-dose antioxidant contexts where validated.

Do not create treatment advice.

---

# 30. Vitamin D3

Preserve:

* preference for a meal containing dietary fat where practical;
* dietary fat is not mandatory;
* no universal morning preference;
* no universal evening preference;
* relevant medication situations remain warnings unless evidence supplies a timing rule.

---

# 31. Vitamin B12

Preserve:

* flexible timing by default;
* no arbitrary morning/evening rule;
* no arbitrary food rule;
* metformin/PPI relationships as informational or clinical-context messaging rather than invented separation.

---

# 32. Calcium

Preserve:

### Calcium carbonate

Prefer with food.

### Calcium citrate

May be taken with or without food.

Larger entered doses should not be automatically changed or split.

Provide educational verification guidance where appropriate.

Preserve validated medication constraints and Iron separation preferences.

---

# 33. Magnesium

Preserve:

* no automatic bedtime rule;
* evening may be a user preference;
* validated asymmetric antibiotic interactions;
* validated bisphosphonate separation;
* PPI-related magnesium context as warning/information where appropriate.

---

# 34. Zinc

Preserve:

* relevant simultaneous Iron consideration;
* validated antibiotic interactions;
* validated penicillamine relationship;
* no invented exact separation interval where evidence does not provide one.

---

# 35. Folate

Preserve:

* no arbitrary morning/evening rule;
* methotrexate as clinical-context warning;
* relevant antiepileptic and sulfasalazine contexts where validated;
* do not solve contextual clinical issues simply by moving doses.

---

# 36. Omega-3

Preserve:

* no arbitrary morning/evening rule;
* anticoagulant considerations as appropriate clinical context;
* no invented timing separation to imply underlying interaction concern disappears.

---

# 37. Flexible timing

Flexible timing is a valid result.

Suggested wording:

**Flexible timing**

**We haven't identified a strong evidence-based reason to require a particular time. Choose a time you're likely to remember.**

Do not manufacture recommendations.

---

# 38. Regimen dependency graph

V2.5/V3 architecture should support a dependency graph representing:

### Nodes

* supplements;
* medications;
* medication anchors;
* meals;
* coffee/tea;
* relevant contextual events.

### Edges

* hard separation;
* asymmetric hard separation;
* preferred separation;
* preferred pairing;
* food requirement;
* food preference;
* dietary-fat preference;
* beverage interaction;
* clinical warning;
* informational relationship;
* flexible timing.

The graph should support explanation, scheduling, and future regimen intelligence.

---

# 39. Schedule explanation

Every placement should support:

**Why this time?**

Explanations must correspond to actual scheduler decisions.

Also provide schedule-level summaries such as:

**Your NutriClock uses 3 windows because:**

* Iron must remain separated from your medication anchor;
* Iron is preferably kept away from calcium;
* Vitamin D3 fits a meal-associated window;
* flexible items were grouped for convenience.

Do not generate medical reasoning with an LLM.

---

# 40. Constraint visualization

Support visual or structured explanation of:

* satisfied hard constraints;
* satisfied preferences;
* assumptions;
* user overrides;
* unresolved context;
* clinical warnings.

Example:

**Iron**

* ✓ separated from levothyroxine
* ✓ paired with Vitamin C
* ✓ away from coffee
* ≈ dairy timing unknown

Do not display pseudo-medical percentages.

---

# 41. What Can I Take Now?

The existing V2 feature should be upgraded.

It should use:

* current time;
* generated schedule;
* medication anchors;
* known routine;
* Today events;
* remaining regimen;
* structured rules.

Return categories:

### Take now

Current timing is compatible with supported rules.

### Better to wait

A materially preferable supported window is approaching.

### Not now

A hard constraint prevents recommendation at this time.

### Flexible

No meaningful timing reason requires waiting.

Show:

* why;
* assumption;
* next window;
* evidence.

Do not require complete manual daily logging.

---

# 42. Today

Today is an execution layer.

It may record:

* taken;
* skipped;
* snoozed;
* meal;
* coffee;
* tea;
* medication taken;
* schedule deviation.

The user should not need to record everything.

Logging should improve schedule precision rather than unlock basic usefulness.

---

# 43. Schedule Repair

When today's reality changes, NutriClock should recalculate the remaining schedule.

Possible events:

* late wake;
* coffee now;
* tea now;
* meal now;
* skipped meal;
* late meal;
* took medication now;
* supplement taken early;
* supplement missed;
* bedtime changed.

Schedule Repair must:

1. preserve completed events;
2. preserve fixed medication anchors;
3. preserve hard constraints;
4. preserve regimen;
5. recalculate remaining windows;
6. minimize disruption;
7. minimize unnecessary dosing events;
8. explain what changed.

---

# 44. Behavior learning

NutriClock may use local activity history to identify convenience patterns such as:

* common coffee time;
* common meal time;
* weekday/weekend differences;
* frequently snoozed window;
* repeated manual schedule move.

These patterns may reduce future input.

They must not infer:

* diagnosis;
* nutrient deficiency;
* medication need;
* health state.

Meaningful persistent assumptions should remain user-controllable.

---

# 45. Routine templates

Routine templates remain available for advanced use cases such as:

* weekday;
* weekend;
* office;
* work from home;
* travel;
* shift work.

They must no longer appear to be required before generating NutriClock.

---

# 46. Can I Take These Together?

V3 should support a deterministic interaction explorer.

Possible responses:

* compatible under supported timing rules;
* prefer together;
* prefer separate;
* must separate according to supported timing rule;
* clinical warning;
* no validated NutriClock rule.

Every applicable health statement must be sourced.

Do not say globally safe or unsafe unless the specific validated rule permits that exact interpretation.

---

# 47. Schedule complexity

NutriClock should be able to explain why a regimen requires multiple windows.

It may state structural effects.

Example:

**Your schedule requires an additional window because Iron and your medication anchor must remain separated.**

Do not recommend removing an item to simplify the regimen.

---

# 48. What Changed?

When regimen or important context changes, compare old and new schedule.

Explain:

* added constraints;
* removed constraints;
* changed windows;
* new warnings;
* new pairing opportunities;
* changed assumptions.

Generate from deterministic schedule/rule differences.

---

# 49. Food intelligence

Food context should remain lightweight.

Only model categories relevant to supported rules.

Examples:

* meal present;
* dietary fat present;
* dairy-heavy;
* coffee;
* tea;
* empty stomach.

Do not turn NutriClock into a general diet tracker.

---

# 50. Label-assisted entry — future V4

Potential future capability:

User photographs or uploads Supplement Facts label.

Extract candidate:

* product name;
* ingredients;
* quantities;
* units;
* serving size.

Require confirmation before updating regimen.

AI/OCR may assist transcription.

Medical scheduling remains deterministic.

This is not part of V2.5 unless separately approved.

---

# 51. Medication-label capture — future V4

Potential future capability:

Capture confirmed administration instructions from medication labels.

Require explicit user confirmation.

Confirmed instructions may become high-priority medication anchors.

AI extraction must never override user-confirmed or authoritative medication instructions.

Not part of V2.5 unless separately approved.

---

# 52. Local-first privacy

Prefer local device/browser persistence.

Store where appropriate:

* regimen;
* medication anchors;
* preferences;
* routine context;
* generated schedule;
* Today events;
* user overrides;
* inferred convenience patterns.

Do not introduce remote health-profile infrastructure merely for convenience.

Do not send medication, supplement, dose, or schedule information to analytics services unless explicitly approved with appropriate privacy safeguards.

---

# 53. Accessibility

Accessibility is required.

Include:

* keyboard support;
* semantic structure;
* visible focus;
* properly labeled controls;
* large touch targets;
* no color-only state;
* accessible warnings;
* accessible errors;
* WCAG AA contrast;
* scalable typography;
* plain language;
* logical headings.

---

# 54. V2.5 required scope

V2.5 should prioritize:

1. Regimen-first onboarding
2. Partial-context scheduling
3. Semantic schedule windows
4. Minimum Necessary Questions
5. Medication-anchor preservation
6. Improved What Can I Take Now?
7. Routine forms demoted from prerequisite status
8. Safe migration of existing V2 user data

A coherent implementation is more important than maximizing feature count.

---

# 55. V3 direction

V3 may focus on:

* mature regimen dependency graph;
* Can I Take These Together?;
* richer constraint visualization;
* schedule-complexity explanation;
* What Changed?;
* Schedule Repair improvements;
* behavior-derived routine inference.

V3 should make NutriClock understand and explain the structure of the regimen.

---

# 56. V4 direction

V4 may evaluate:

* Supplement Facts scanning;
* multivitamin decomposition;
* medication-instruction capture;
* low-friction contextual inference;
* evidence governance tooling;
* broader reviewed knowledge coverage;
* optional privacy-preserving integrations.

V4 should reduce manual configuration without weakening medical boundaries.

---

# 57. Explicit exclusions

Do not implement unless a future canonical requirement explicitly changes scope:

* lab upload;
* lab interpretation;
* deficiency diagnosis;
* supplement recommendations;
* dosage recommendations;
* symptom diagnosis;
* treatment planning;
* energy optimization;
* AI medical chatbot;
* supplement shopping;
* affiliate links;
* brand rankings;
* unrestricted medication interaction search;
* social features;
* cloud synchronization;
* authentication merely for engagement;
* clinician portal;
* wearables;
* Apple Health;
* Health Connect;
* payment systems.

---

# 58. V2.5 acceptance criteria

A new user can:

1. open NutriClock;
2. enter their regimen;
3. receive useful scheduling guidance without configuring their entire routine;
4. see which items have flexible timing;
5. see food/beverage considerations;
6. see applicable medication constraints;
7. see assumptions;
8. answer only targeted high-value questions;
9. progressively turn relative guidance into exact timing;
10. inspect evidence.

Existing V2 users must retain their persisted data.

---

# 59. Target user experience

The desired final experience is:

**“I entered what I take. NutriClock understood the timing relationships it has evidence for, gave me a useful schedule immediately, explained why the schedule looks that way, and only asked me for information that materially improved it.”**
