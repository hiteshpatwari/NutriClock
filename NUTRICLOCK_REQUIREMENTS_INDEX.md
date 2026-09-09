**1000× Improved Prompt — Canonical NutriClock Requirement Documents**

Below are the three canonical documents I recommend placing at the repository root.

Because this chat does not currently expose a writable filesystem/artifact tool, I cannot attach actual `.md` files from this turn. The contents below are ready to save verbatim under the filenames shown.

---

# NUTRICLOCK_REQUIREMENTS_INDEX.md

## NutriClock Requirements Index

### Status

Current product baseline: **V2 implemented**

Current implementation target: **V2.5 — Regimen-First Intelligence**

Future product direction:

* V3 — Regimen Intelligence
* V4 — Low-Input Intelligence

This file defines how NutriClock requirements are interpreted by developers, Codex, and other engineering agents.

---

## 1. Canonical documents

The NutriClock repository should contain:

1. `NUTRICLOCK_PRODUCT_REQUIREMENTS.md`
2. `NUTRICLOCK_CODEX_EXECUTION_SPEC.md`
3. `NUTRICLOCK_REQUIREMENTS_INDEX.md`

Their responsibilities are different.

### NUTRICLOCK_PRODUCT_REQUIREMENTS.md

Defines:

**What the product must do.**

It contains:

* product vision;
* user experience;
* feature behavior;
* safety boundaries;
* scheduling behavior;
* evidence requirements;
* privacy;
* accessibility;
* acceptance criteria;
* exclusions;
* roadmap boundaries.

### NUTRICLOCK_CODEX_EXECUTION_SPEC.md

Defines:

**How Codex should inspect, design, implement, test, verify, and document the product.**

It contains:

* multi-agent organization;
* repository reconnaissance;
* architecture workflow;
* implementation sequencing;
* testing requirements;
* screenshot/UX verification;
* safety audits;
* build verification;
* final reporting.

### Repository

Defines:

**What currently exists.**

Agents must inspect the repository rather than assuming the implementation matches historical discussions.

---

## 2. Requirement precedence

When requirements appear to conflict, apply this precedence:

1. Safety boundaries
2. Explicit medical/evidence constraints
3. Explicit current-release requirements
4. Explicit exclusions
5. Product acceptance criteria
6. Existing architecture where reasonable
7. UX preferences
8. Implementation convenience

Lower-priority requirements must never weaken higher-priority requirements.

---

## 3. Current release objective

The immediate product objective is:

**Reduce the amount of information a new user must manually configure before NutriClock becomes useful.**

The V2 interaction model relies too heavily on users entering:

* wake time;
* meal times;
* coffee/tea timing;
* bedtime;
* routine templates;
* daily contextual events;

before NutriClock feels intelligent.

The next architecture should instead support:

**Regimen → Initial NutriClock → Targeted refinement → Today**

The product should first understand what the user takes.

It should then generate as much useful evidence-supported timing guidance as possible.

Additional questions should be asked only when the answers materially improve or safely resolve scheduling.

---

## 4. North-star experience

The intended user experience is:

**“I tell NutriClock what I take. NutriClock understands the timing relationships it has validated evidence for, builds the strongest schedule it can, explains it, and asks me only when it genuinely needs another fact.”**

---

## 5. Core product concepts

### Regimen

What the user already takes.

NutriClock does not decide the regimen.

### NutriClock

The deterministic evidence-backed schedule generated for the regimen.

### Today

What actually happened during the current day.

### Improve Schedule

Optional contextual information that makes an already-useful NutriClock more precise or convenient.

---

## 6. Non-negotiable product principles

1. Evidence over folklore.
2. Admit uncertainty.
3. No recommendation is better than an invented recommendation.
4. Medication constraints outrank convenience.
5. Every health-related rule has evidence.
6. Clinical warnings are not automatically scheduling rules.
7. Scheduling is deterministic.
8. The user owns the regimen.
9. Personal regimen data remains local-first.
10. Missing knowledge must not be represented as “no interaction.”
11. NutriClock should not request information it can safely work without.
12. Health outcomes must not be inferred from schedule adherence.

---

## 7. Current scope

Current implementation work should focus on V2.5.

Do not automatically implement V3/V4 features merely because they are documented as future architecture directions.

V3/V4 may influence extensible interfaces but must not justify speculative infrastructure.

---

## 8. Change-management rule

Future product changes should modify the canonical requirements files rather than living only in chat history.

Any health-related rule change must include:

* rule definition;
* evidence;
* classification;
* conditions;
* tests;
* documentation;
* migration consideration where appropriate.

---

## 9. Contributor safety rules

**No health-related rule may be added without an evidence reference and appropriate tests.**

**A clinical warning must not be converted into a scheduling constraint unless authoritative evidence independently supports that timing rule.**

**Absence of a NutriClock interaction rule must never be presented as proof that no interaction exists.**

**An AI system may assist with transcription or entity identification but must not generate NutriClock medical rules.**
