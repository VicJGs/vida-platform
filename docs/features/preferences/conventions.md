<!-- Conventions — features/preferences · /documentation Phase 2 (realigned Part 1.2) · sources: CLAUDE.md Conventions · ADR-002 · ADR-012 §3.10 · ADR-013 §3.2/§3.4 · ADR-014 §3.2 · life-os settings · intake -->

# Conventions — Preferences  (level: Feature)

## How to build here
- **Read through `getMergedPreferences`, never the raw row.** Always overlay the DB row on `DEFAULTS` so consumers get a complete object (PR-2). Add a new field's default to `DEFAULTS` in the same change that adds the column. `[INTENT G8.1]`
- **Save is debounced + optimistic; no Save button.** Apply the change to the UI immediately, persist automatically batched 500ms after the last edit; on failure, revert the optimistic value + surface a typed error (PR-4). `[INTENT G8.2]`
- **Theme goes through the store.** Write `theme` to the DB *and* the Zustand `themeStore`; UI reads theme from the store for instant repaint (PR-5). Never read theme straight from the DB in render paths. `[INTENT G8.3]`
- **All preference data is plaintext config.** Do not mark any preference field `[E]` — it is configuration, not content (PR-1). If something feels sensitive enough to encrypt, it belongs in another domain, not here. `[FACT: ADR-002 L1097-1101]`
- **Delegate account/data; don't own it.** Render Account/Security and import/export as Settings sections that call into Auth/Account and Data/Sync — never store their data in preferences tables (PR-8, §6). `[INTENT G1]`
- **Visibility vs feature flag are separate.** Use module visibility for nav show/hide; use `feature_gamification` for functional enable. Don't conflate them (PR-7). `[INTENT G5]`
- **Command palette upserts by `command_key`.** `recordCommand` increments an existing key, never inserts a duplicate (PR-6). `[FACT: ADR-002 L3560]`

## Naming & layout
- Singletons (`user_preferences`, `nav_preferences`) are one-row-per-vault; treat them as config objects, not lists.
- Settings are described in a single **searchable index** (label · description · keywords) that drives both the search box and tab grouping (G7). `[FACT: life-os settingsSearchIndex]`
- Platform-wide conventions apply: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans as `0/1`, JSON as TEXT, `HH:MM` for quiet hours, `_sync_*` on every table. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`
- Enums: string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core` (never TS `enum`). `[FACT: packages/types/src/CLAUDE.md]`

## Local landmines / "never do"
- **Never** add a Save button or block the UI on persistence — saving is debounced/optimistic (PR-4). `[INTENT G8.2]`
- **Never** return `undefined` from a preference read — merge defaults (PR-2). `[INTENT G8.1]`
- **Never** store account credentials, profile, or export state in preferences tables — delegate (PR-8). `[INTENT G1]`
- **Never** add a server-AI preference flag — ZK forbids server inference (G3). `[FACT: ZK-1]`
- **Never** let module-visibility hide the path back to Settings — keep an escape hatch. `[INTERP: terminal state]`
- **Never** encrypt a preference field — config is plaintext (PR-1). `[FACT: ADR-002 L1097-1101]`
- **Never migrate PII into Preferences.** The E9 receipt is **exactly** `persona`/`motivation_style`/`active_modules`/`onboarding_*` (all plaintext); `display_name`/`avatar_url`/`birth_date` (PII) **and** the sibling `[E]` fields `focus_areas`/`life_stage`/`timezone`/`skipped_modules` **stay in `user_profile`** — sweeping `focus_areas[E]` in would break PR-1 (PR-10). `[FACT: ADR-012 §3.10]`
- **Never** store connector credentials in a preferences table — `connection_config` is `[E]` under the OS mediator (ADR-014 §3.4); Preferences owns the integration *surface*, not the credential (PR-12). `[FACT: ADR-014 §3.4]`
- **Never** add `sms` as a notification channel — the matrix is `in_app`·`push`·`email` only (N6/PR-11). `[FACT: ADR-013 §3.4]`
- **Never** conflate the Layer-3 integration surface with the AI-config surface — AI model config is `ai_connections` (ADR-015), a separate page; ADR-014's Preferences surface is data ingestion (X11 splits LLM out). `[FACT: ADR-014 §3.2 L62]`
- **Keep `active_modules` (E9, persona/onboarding-driven), `module_visibility` (nav show/hide, PR-7), and `feature_gamification` (logic enable, PR-7) conceptually distinct** — whether they merge into one store is a build-phase call, not a conflation to make now. `[INTENT: ADR-012 E9; PR-7]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
