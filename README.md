# NutriClock

NutriClock is a local-first supplement-timing MVP with one platform-agnostic TypeScript domain engine used by a React/Vite web client and an Expo/React Native mobile client.

## Run locally

```bash
pnpm install
pnpm dev:web
pnpm --filter @nutriclock/mobile start
```

The web app uses IndexedDB. The mobile app uses SQLite through `expo-sqlite`. Regimen data stays local; generated schedules are derived in memory and are not persisted.

## Validation

```bash
pnpm typecheck
pnpm typecheck:mobile
pnpm test
pnpm test:mobile
pnpm lint
pnpm format:check
pnpm build:web
pnpm --filter @nutriclock/mobile exec expo export --platform android
```

The approved machine-readable knowledge source is `NutriClock_Rules_V1.json`, with the human-readable review companion in `NutriClock_Rules_V1.md`. Active rules are validated for evidence resolution before scheduling. Entries marked `RULE_REVIEW_REQUIRED` are retained for review but are inactive and cannot affect placement, warnings, or explanations.

Medication administration times are immutable user-entered anchors. Unsupported medication names are retained verbatim, displayed as unsupported, and do not trigger inferred rules. Clinical warnings remain warnings unless the approved manifest separately defines a hard timing rule.
