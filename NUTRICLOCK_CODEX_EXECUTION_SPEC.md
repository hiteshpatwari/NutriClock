
# NUTRICLOCK_CODEX_EXECUTION_SPEC.md

# NutriClock Codex Multi-Agent Execution Specification

## 1. Mission

Codex must inspect, plan, architect, implement, test, visually verify, document, and leave NutriClock in a production-quality runnable state.

V2 already exists.

Do not recreate V2.

The immediate implementation target is the current scope defined by `NUTRICLOCK_PRODUCT_REQUIREMENTS.md`.

---

# 2. Source-of-truth hierarchy

Read, in order:

1. `NUTRICLOCK_REQUIREMENTS_INDEX.md`
2. `NUTRICLOCK_PRODUCT_REQUIREMENTS.md`
3. this execution specification
4. existing repository documentation
5. implementation itself

The requirements define desired behavior.

The repository defines current reality.

This document defines execution procedure.

---

# 3. Multi-agent organization

Use specialized agents when available.

Recommended workstreams:

### Lead / Architecture Agent

Responsible for:

* repository reconnaissance;
* work decomposition;
* architecture;
* shared contracts;
* integration;
* scope control;
* final verification.

### Scheduler / Domain Agent

Responsible for:

* partial-context scheduling;
* semantic windows;
* question engine;
* regimen graph;
* interactions;
* schedule repair;
* decision provenance.

### Product / Frontend Agent

Responsible for:

* regimen-first onboarding;
* schedule UX;
* targeted questions;
* Today;
* What Can I Take Now?;
* constraint visualization;
* responsive behavior.

### Persistence / Migration Agent

Responsible for:

* local persistence;
* schema evolution;
* V2 migration;
* inferred routine state.

### Testing / Safety Agent

Responsible for:

* deterministic tests;
* priority tests;
* hard-constraint tests;
* migration tests;
* unsupported-medication behavior;
* safety audit.

### UX Verification Agent

Responsible for:

* running application;
* screenshots;
* emulator/device review where available;
* responsive checks;
* accessibility review;
* usability defects.

### Documentation / Audit Agent

Responsible for:

* architecture docs;
* supported rules;
* limitations;
* migrations;
* evidence;
* contributor guidance.

Adapt role count as needed.

Avoid parallel edits to shared contracts before architecture is established.

---

# 4. Phase A — Repository reconnaissance

Before implementation:

* inspect repository tree;
* inspect package manifests;
* determine language and framework;
* inspect runtime;
* inspect routing;
* inspect state management;
* inspect persistence;
* inspect design system;
* inspect scheduler;
* inspect rules engine;
* inspect evidence registry;
* inspect Today feature;
* inspect reminders;
* inspect routine templates;
* inspect travel/shift functionality;
* inspect What Can I Take Now?;
* inspect schedule adjustment;
* inspect adherence/weekly review;
* inspect rule versioning;
* inspect tests;
* inspect build configuration;
* inspect CI;
* inspect documentation.

Do not make major framework decisions before completing reconnaissance.

---

# 5. Phase B — V2 friction audit

Map the current first-run journey.

Identify:

* number of screens;
* number of fields;
* required fields;
* optional fields;
* schedule blockers;
* routine assumptions;
* manually entered context.

Classify each input:

* required for hard safety constraint;
* materially schedule-changing;
* optional precision;
* convenience preference;
* unnecessary upfront;
* inferable;
* safely deferrable.

Identify where missing context currently causes scheduler failure.

---

# 6. Phase C — Architecture plan

Before implementation, produce an engineering plan containing:

* current architecture;
* preserved V2 modules;
* friction findings;
* target architecture;
* shared type changes;
* persistence changes;
* scheduler changes;
* semantic-window model;
* question-engine model;
* medication-anchor behavior;
* UI flow;
* migration strategy;
* tests;
* UX verification;
* risky assumptions;
* non-goals.

Do not stop for user approval unless tooling or environment explicitly requires it.

Proceed after planning.

---

# 7. Phase D — Shared contracts

Define stable contracts before parallel implementation.

At minimum define concepts for:

* regimen item;
* supplement;
* medication;
* medication anchor;
* routine context;
* Today context;
* semantic time window;
* exact time window;
* flexible window;
* unresolved context;
* schedule completeness;
* schedule conflict;
* clinical warning;
* user override;
* question candidate;
* question priority;
* assumption;
* evidence;
* rule decision;
* schedule decision trace.

Use existing project typing conventions.

---

# 8. Phase E — Partial-context scheduler

Modify scheduler to operate without full routine data.

Do not treat every missing value as error.

Support:

* exact times;
* semantic windows;
* relative medication windows;
* meal windows;
* flexible timing;
* unresolved required context.

The scheduler must remain deterministic.

Same canonical input must produce the same output.

---

# 9. Determinism requirements

Avoid schedule behavior depending on:

* randomness;
* wall-clock time except where explicitly part of Today query;
* unstable object iteration;
* network response order;
* nondeterministic sorting.

Define deterministic candidate ordering and tie-breaking.

Add explicit tests.

---

# 10. Question engine

Implement deterministic candidate-question generation.

Each question should have impact semantics equivalent to:

* hard-context requirement;
* high-value refinement;
* medium-value refinement;
* convenience;
* irrelevant.

Question ranking must depend on actual active regimen rules.

Do not maintain a static onboarding questionnaire disguised as dynamic questions.

---

# 11. Medication anchors

Medication anchors are high-priority constraints.

Do not create prescription timing arbitrarily.

If exact supplement scheduling needs medication timing:

* request existing medication time;
* preserve it;
* optimize around it.

Do not move medication for convenience.

---

# 12. Rule separation

Health knowledge must remain separate from presentation.

UI code may reference:

* rule ID;
* message metadata;
* explanation output.

UI code must not define medical intervals or interaction facts.

---

# 13. Regimen graph

Implement or formalize a domain representation capable of explaining:

* together;
* separate;
* hard separation;
* asymmetric relationship;
* food dependency;
* beverage dependency;
* warning;
* flexibility.

Use it to support scheduling and explanation.

Avoid building an unnecessarily general graph framework if simpler domain structures satisfy requirements.

---

# 14. UI implementation

Redesign first-run flow so regimen entry delivers first value.

The user should not need complete routine configuration.

Recommended high-level flow:

1. Enter regimen
2. Generate first NutriClock
3. Show schedule
4. Show missing high-value refinement
5. Ask one question
6. Regenerate
7. Offer optional Improve Schedule

Preserve existing useful V2 functionality.

---

# 15. Routine templates

Demote routine templates from prerequisite status.

Preserve existing data and capabilities.

Do not delete routine functionality merely because onboarding changes.

---

# 16. What Can I Take Now?

Upgrade current implementation.

Support:

* Take now;
* Better to wait;
* Not now;
* Flexible.

Every result should be traceable to actual rule evaluation.

Do not generate explanatory medical reasoning through an LLM.

---

# 17. Schedule Repair

Refactor or extend existing day adjustment.

Repair must preserve:

* completed events;
* medication anchors;
* hard constraints;
* regimen.

Optimize only remaining schedule.

Prefer minimum disruption.

---

# 18. Persistence and migration

Inspect existing V2 persisted schema.

Design migration carefully.

Requirements:

* no silent regimen loss;
* no silent routine loss;
* preserve user overrides where possible;
* safely regenerate derived schedule when format changes;
* tolerate corrupted local state;
* support versioned persistence if necessary.

Add migration tests.

---

# 19. Behavioral inference

If current implementation phase includes convenience learning:

* keep it deterministic;
* keep it local;
* restrict it to behavioral context;
* do not infer medical state;
* require confirmation for persistent high-impact assumptions where appropriate.

Do not build a machine-learning service merely to detect simple time patterns.

---

# 20. Accessibility

Verify:

* keyboard interaction;
* visible focus;
* labels;
* touch targets;
* semantic landmarks;
* warnings;
* errors;
* color contrast;
* responsive typography;
* heading hierarchy.

Do not rely on color alone for rule states.

---

# 21. Mandatory unit tests

Preserve all V2 tests.

Add tests for:

### Partial context

* supplement-only regimen can schedule;
* missing meals do not unnecessarily block;
* unknown coffee time produces conditional guidance;
* flexible items remain flexible;
* semantic window becomes exact after context is added.

### Question engine

* B12 alone asks no unnecessary question;
* Vitamin D3 does not require a complete routine;
* Levothyroxine + Iron prioritizes medication anchor;
* irrelevant context is not requested;
* ranking is deterministic.

### Medication anchor

* NutriClock does not invent medication time;
* user medication time stays fixed;
* supplement schedule adapts around it;
* convenience cannot move medication.

### Multivitamin

* generic multivitamin remains opaque;
* no generic nutrient composition;
* remaining regimen continues to schedule.

### Unsupported medication

* medication remains stored;
* no interaction fabricated;
* correct limited-coverage messaging;
* supported supplements remain functional.

### Rule classification

* clinical warning is not converted to separation;
* informational rule does not invalidate candidate;
* hard rule does invalidate candidate where applicable.

### Flexible timing

* no unsupported timing recommendation is manufactured.

### Determinism

* identical schedule input gives identical output;
* identical questions give identical ranking;
* explanation order stable;
* conflict order stable.

### Priority

* medication constraint beats convenience;
* hard rule beats user preferred time;
* strong preference beats weak preference;
* fewer windows never override hard constraint.

### Migration

* V2 state migrates;
* regimen preserved;
* routines preserved;
* relevant overrides preserved;
* derived schedules safely regenerate.

---

# 22. Preserve existing safety tests

Existing tests should continue covering validated cases such as:

* Iron + calcium;
* Iron + coffee;
* Iron + tea;
* Iron + Vitamin C;
* Vitamin D;
* Levothyroxine + Iron;
* Levothyroxine + Calcium;
* Zinc + Iron;
* asymmetric antibiotic interactions;
* Calcium + dolutegravir;
* flexible supplement;
* PPI + B12;
* Methotrexate + Folate;
* impossible schedule;
* deterministic ordering;
* rule priority.

Do not weaken these tests to make new architecture pass.

---

# 23. Integration tests

Where supported, cover:

* first launch;
* regimen entry;
* schedule generation without routine;
* targeted refinement;
* schedule regeneration;
* evidence view;
* Today;
* What Can I Take Now?;
* schedule repair;
* unsupported medication;
* multivitamin;
* persisted V2 upgrade.

---

# 24. UX verification

Do not rely solely on tests.

Run the app and inspect actual screens.

Where tooling permits:

* capture screenshots;
* inspect mobile state;
* inspect tablet state;
* inspect desktop state;
* inspect Android emulator if relevant;
* inspect iOS simulator if relevant.

Review:

* hierarchy;
* input burden;
* schedule readability;
* warnings;
* explanations;
* evidence;
* touch targets;
* empty states;
* unsupported states.

---

# 25. Representative UX scenarios

### Scenario 1

Vitamin D3 + B12 + Omega-3

Expected:

* useful schedule quickly;
* minimal questions;
* flexible behavior remains visible.

### Scenario 2

Levothyroxine + Iron + Vitamin C

Expected:

* medication-anchor question prioritized;
* complete routine not required.

### Scenario 3

Iron, coffee unknown

Expected:

* schedule still useful;
* conditional coffee guidance;
* optional coffee-time refinement.

### Scenario 4

Generic multivitamin + Vitamin D3

Expected:

* multivitamin opaque;
* D3 receives supported timing.

### Scenario 5

Unsupported medication + Iron

Expected:

* transparent unsupported coverage;
* no invented interaction;
* supported Iron guidance remains available.

---

# 26. Performance and UX quality

Avoid architecture that causes excessive recomputation or UI instability.

Scheduler should remain reasonably fast for normal MVP regimen sizes.

Provide clear loading/error states if computations or persistence operations are asynchronous.

Core scheduling should not require a network call.

---

# 27. Dependencies

Before adding dependency:

* confirm existing stack lacks equivalent capability;
* verify dependency is maintained;
* verify MVP necessity;
* verify it does not introduce remote medical inference;
* verify it does not unnecessarily increase infrastructure.

Prefer no new dependency when existing tools are sufficient.

---

# 28. Documentation

Update:

* README;
* architecture docs;
* scheduler docs;
* evidence docs;
* persistence docs;
* migration docs;
* testing docs;
* supported regimen coverage;
* unsupported behavior;
* safety boundaries.

Include:

**No health-related rule may be added without an evidence reference and appropriate tests.**

Include:

**A clinical warning must not be converted into a scheduling constraint unless authoritative evidence independently supports that timing rule.**

Include:

**Absence of a NutriClock interaction rule must never be presented as proof that no interaction exists.**

---

# 29. Final verification commands

Run every applicable repository-standard command.

At minimum where present:

* formatting check;
* lint;
* type checking;
* unit tests;
* integration tests;
* end-to-end tests;
* production build;
* native build where applicable.

Fix regressions.

Document unrelated pre-existing failures separately.

Never report a successful command that was not executed.

---

# 30. Safety audit

Before completion search the repository for:

* health-related timing constants outside rule data;
* hardcoded interaction intervals in UI;
* duplicated evidence-free medical text;
* “no interaction” claims;
* invented medication times;
* hidden medical assumptions;
* unsourced health recommendations.

Verify:

* every health rule resolves to evidence;
* hard rules have tests;
* asymmetric rules remain asymmetric;
* warnings remain warnings;
* flexible timing exists;
* unsupported medication remains transparent;
* behavioral learning remains non-medical;
* personal data remains local-first.

---

# 31. Scope audit

Verify the implementation did not accidentally add:

* supplement recommendation;
* dose recommendation;
* diagnosis;
* lab interpretation;
* treatment advice;
* AI medical reasoning;
* unrestricted drug checker;
* affiliate shopping;
* cloud health profile;
* speculative infrastructure.

Remove accidental scope expansion.

---

# 32. Definition of Done

Implementation is complete only when:

* V2 data remains usable;
* regimen-first onboarding works;
* complete routine setup is no longer required for first value;
* partial-context scheduling works;
* semantic windows work;
* exact schedules appear when enough context exists;
* missing context is explicit;
* high-value questions are selective;
* medication timing is never invented;
* medication anchors remain protected;
* flexible timing remains supported;
* What Can I Take Now? works with partial context;
* schedule repair preserves hard constraints;
* unsupported medications are transparent;
* generic multivitamins remain conservative;
* evidence remains inspectable;
* deterministic tests pass;
* migration tests pass;
* accessibility is reviewed;
* UX is visually inspected where tooling allows;
* production build succeeds;
* documentation is updated;
* repository is runnable.

---

# 33. Final implementation report

After completion provide:

### Architecture

* stack discovered;
* relevant V2 architecture;
* architecture changed.

### Product changes

* user journey changed;
* input friction reduced;
* preserved functionality.

### Domain changes

* scheduler;
* semantic windows;
* questions;
* graph;
* medication anchors.

### Persistence

* schema changes;
* migration behavior.

### Testing

* tests added;
* regressions found;
* safety cases verified.

### UX verification

* environments inspected;
* screenshots reviewed;
* defects corrected.

### Validation

Report exact results for:

* lint;
* typecheck;
* tests;
* build;
* E2E where applicable.

### Remaining limitations

List:

* unsupported medications;
* unsupported supplement combinations;
* assumptions;
* intentionally deferred V3/V4 functionality.

Do not claim unsupported functionality exists.

---

# 34. Final operating principle

When product convenience, apparent intelligence, and safety compete:

**Choose evidence-backed deterministic behavior and transparent uncertainty.**

When user input and product intelligence compete:

**NutriClock should do the work whenever it can safely do so.**

The final desired experience is:

**“I enter what I take. NutriClock builds the strongest schedule it safely can, explains it, and asks me only for the facts it genuinely needs.”**
