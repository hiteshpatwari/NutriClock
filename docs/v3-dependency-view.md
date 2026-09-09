# V3 slice: regimen dependency view

NutriClock now exposes a read-only **Can I take these together?** view for the user's current regimen.

The view is deliberately narrow:

- It projects only active rules from the local knowledge snapshot.
- Every relationship carries its rule ID, classification, and evidence IDs.
- Clinical warnings remain warnings; they are never converted into arbitrary separation intervals.
- Unsupported medications remain visible, but do not create name-based interaction claims.
- An empty result is explicitly scoped to the current active knowledge set and is not evidence that no interaction exists.

The view is derived from the persisted regimen and current knowledge snapshot. It does not persist a
dependency graph or schedule and does not change medication anchors.
