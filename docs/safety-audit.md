# NutriClock safety and evidence audit

## Static invariants

- `NutriClock_Rules_V1.json` is the machine-readable rule source.
- Every active rule must resolve all `evidenceIds` in the loaded snapshot.
- Rule status `RULE_REVIEW_REQUIRED` is inert.
- Exact medical intervals are read from rule metadata; UI code does not define interaction intervals.
- Medication administration times are user-entered and immutable to the scheduler.
- Missing knowledge is never rendered as “no interaction found.”
- Clinical warnings remain warnings and do not affect candidate scoring.
- Behavioral insights are derived only from local execution behavior and do not infer health state.

## V2.5 audit coverage

The domain tests cover supplement-only scheduling, explicit semantic windows, missing meal context, targeted question ranking, unresolved medication anchors, opaque multivitamins, unsupported medications, warning-only relationships, hard constraints, flexible timing, deterministic ordering, adaptive day execution, schedule repair, and persistence orchestration.

The checked-in manifest currently contains review-required coffee/tea, asymmetric antibiotic, and same-window zinc rules. They are intentionally excluded from active scheduling until their exact machine semantics are approved. This means the app may show less timing guidance than a future reviewed ruleset; that is a safety-preserving limitation, not evidence of no interaction.

The manifest is currently labelled `draft_for_product_and_rules_review`. The active subset is
validated at runtime and its evidence IDs resolve, but release governance still needs to approve
the ruleset for a production evidence release. No review-required rule was enabled to improve the
V2.5 verification result.

## Verification searches

Before release, search for numeric timing constants outside the manifest, duplicated interaction language in UI files, prohibited “no interaction” claims, medication-time defaults, remote health-data dependencies, and scope-expansion terms. Review any match against the canonical requirements before changing a rule or copy.
