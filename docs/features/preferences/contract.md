<!-- Contract — features/preferences · /documentation Phase 2 (realigned Part 1.2) · sources: ADR-002 §5.17 · ADR-012 §3.10 · ADR-013 §3.2/§3.4 · ADR-014 §3.2 · life-os settings · intake -->

# Contract — Preferences  (level: Feature)

> **Status:** modules are not implemented in code yet, and **no `@vida/types` preferences file exists**. This
> contract is the **designed interface** harvested from ADR-002 §5.17 + the v1 settings API. Treat signatures as
> ⚠ INTENDED until `@vida/core` services + types exist. `[FACT: ADR-002 §5.17; packages/types/src has no pref file]`

## Exposed surface
Preferences is a **foundational config provider** — consumed widely, depends on little. Exposed via `@vida/core`:

- **Read** (`UserPreferences`, `NavPreferences` — types TBD):
  - `getMergedPreferences()` → complete object overlaid on `DEFAULTS`, never `undefined` (PR-2)
  - `getNavPreferences()` → dock + mobile-nav config
  - `getModuleVisibility()` → `{ [moduleKey]: boolean }` (⚠ INTENDED, G5)
- **Write** (debounced, optimistic — PR-4):
  - `updatePreferences(patch)` — batched 500ms; partial patch merged
  - `updateNavPreferences(patch)` · `setModuleVisibility(moduleKey, visible)`
- **Theme**: `subscribeTheme()` / store binding — theme pushed to the Zustand store on load + change (PR-5)
- **Command palette** (`CommandBarEntry`):
  - `recordCommand(command_key, label, category)` — upsert by unique `command_key`, increments `use_count`, sets `last_used_at`
  - `pinCommand(command_key, pinned)` · `getCommandHistory()` → pinned-then-frecency ordered (PR-6)
- **Settings search**: `searchSettings(query)` → matches over the local settings index (G7)
- **E9 config split** (received off `user_profile`, ADR-012 §3.10 — plaintext): reads/writes for `persona`, `motivation_style`, `active_modules`, `onboarding_*` (single-writer owner, PR-10). Does **not** expose PII or `focus_areas[E]` (stay in `user_profile`). ⚠ INTENDED — types + storage shape build-phase.
- **User-managed integrations** (ADR-014 Layer 3, PR-12): a management surface listing/adding the user's webhooks + external-API connectors + cookbooks. Preferences owns the surface; the actual fetch/egress + `connection_config` custody **delegate** to the ADR-014 device-mediated guard (never stored in a preferences table). ⚠ INTENDED.

## What it consumes (outside dependencies)
Structurally foundational — consumes almost nothing of its own data, but the **Settings screen delegates** to other domains via documented integration points (never owns their data, PR-8 / §6):
- **Auth/Account domain** — renders display name, password change, biometric, delete-account, log-out sections; data owned there (SRP + encryption, ADR-001). `[INTENT G1]`
- **Data/Sync surface** — renders import/export controls; owned there. `[INTENT G1]`
- **ADR-014 device-mediated guard** — the user-managed integration surface (PR-12) renders the connector list, but the fetch/parse/encrypt/egress + `connection_config` mediator custody are owned by the ADR-014 ingestion layer; Preferences delegates, never owns the mechanism. `[INTENT: ADR-014 §3.2/§3.4]`

## Consumed by (it is the provider)
Read-only consumers across the platform `[FACT: ADR-002 field semantics; intake]`:
- **All UI** → `theme`, `accent_color`, `font_size`, `compact_mode`, locale (`date_format`/`time_format`/`week_starts_on`/`currency`/`number_format`)
- **Nav shells** → `nav_preferences` + module visibility
- **Pomodoro** → `pomodoro_*` defaults · **Tasks** → `show_completed_tasks`, `default_task_priority`, `show_archived`
- **Notifications** → the `in_app`·`push`·`email` channel matrix (no `sms`, N6/PR-11), quiet hours (pre-applied at registration + reschedule-on-change, N7), per-module push (`push_habits`/`tasks`/`routines`/`contacts`/`study`) riding the `push` channel
- **Gamification** → `feature_gamification` (functional enable, PR-7) · **Dashboard** → `dashboard_layout`, `default_dashboard_view`

## Contract error cases
- `updatePreferences` persistence failure → typed error; optimistic value reverted (PR-4). `[INTENT G8.2]`
- `setModuleVisibility` with an unknown module key → typed `InvalidModuleError`, ignored. `[INTERP PR-7]`
- `recordCommand` is idempotent on `command_key` (UNIQUE) — re-recording increments, never duplicates (PR-6). `[FACT: ADR-002 L3560]`

## Completion checklist
- [x] exposed + consumed + consumed-by surface · [x] types/errors cited · [x] delegation via documented points (no direct ownership) · [x] [FACT/INTENT] each claim · [x] not-yet-coded status flagged
