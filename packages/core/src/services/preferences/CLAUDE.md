# services/preferences — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
User settings surface (theme, locale, module toggles); receives persona/modules/onboarding + channel/quiet-hours

## Owning ADR / context
ADR-002 (+ ADR-012/013/014 routed fields)

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
mod-preferences #37 (LIF-133) — **① backend COMPLETE (all 3 slices)**. `createPreferencesService` (`service.ts`),
over the DB-6 Repository (`encryptedFields: []`, plaintext config PR-1):
- Slice 1 user_preferences — getMergedPreferences / updatePreferences / get+setModuleVisibility.
- Slice 2 nav_preferences — getNavPreferences / updateNavPreferences.
- Slice 3 command_bar_history — recordCommand (upsert) / pinCommand / getCommandHistory (pinned-then-frecency).
  **preferences-rescope D-R5-3 (2026-10-27):** `pinCommand(key, pinned, label?, category?)` — an unrecorded key with
  `pinned` + a non-empty label is CREATED pinned + unused (`use_count 0`, `last_used_at null`), revising D-S3's no-op so
  the ⌘K palette can pin a never-run command; without a label (or when unpinning) it stays a no-op. Callers that read
  then write this table must serialize (the app's `command-history.ts` chain).
Errors in `types.ts`. Interfaces + `MergedPreferences`/`MergedNavPreferences` in `@vida/types/entities/user.ts`; Zod in
`@vida/core/src/validators/user.ts`. Durable docs: `docs/modules/preferences/current-*`. Remaining: ② fe-preferences
(LIF-134) · DB-11 CommandBarHistory interface reconcile · sessions inline-read→seam migration (deferred hygiene).
