<!-- Structure & Data — features/preferences · /documentation Phase 2 (realigned Part 1.2) · sources: ADR-002 §5.17 · ADR-012 §3.10 (E9) · ADR-013 §3.2/§3.4 (N6/N7) · ADR-014 §3.2 (Layer-3) · life-os settings · ADR-001/003 -->

# Structure & Data — Preferences (level: Feature)

## Data model — 3 owned tables (ALL plaintext, no `[E]`) `[FACT: ADR-002 §5.17 L3474-3574; L1097-1101]`

| Table                 | Cardinality | Purpose                                                                       | Notable fields / constraints                                                                                                             |
| --------------------- | ----------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `user_preferences`    | singleton   | appearance · locale · dashboard · tasks · pomodoro · notifications · features | `theme` CHECK{light,dark,system}; `time_format` CHECK{12h,24h}; `dashboard_layout` JSON; per-module push toggles; `feature_gamification` |
| `nav_preferences`     | singleton   | dock + mobile nav                                                             | `dock_position` CHECK{bottom,left,right}; `dock_size` CHECK{small,medium,large}; `mobile_nav_items` JSON array                           |
| `command_bar_history` | many        | Cmd+K palette frecency + pinning                                              | `command_key` UNIQUE; `use_count`, `last_used_at`, `is_pinned`                                                                           |

- All three carry standard sync metadata (`_sync_*`); `user_preferences`/`nav_preferences` carry `created_at`/`updated_at`. `[FACT: ADR-002 §5.17]`
- Config syncs via **LWW** (no CRDT — these aren't editor documents). `[FACT: ADR-003 §structured data LWW]`

### ⚠ INTENDED additions (not yet in ADR-002 / no types) `[INTENT G4, G5; FACT: ADR-002 omits these]`

- `user_preferences` new columns: `font_size`, `compact_mode`, `number_format`, `default_dashboard_view`, `show_archived`, `notification_frequency`.
- **Per-module visibility**: a `module_visibility` JSON map (`moduleKey → bool`) on `user_preferences` — _or_ a dedicated store; storage shape is a **build-phase decision**.
- **No `@vida/types` preferences file exists** — `UserPreferences`/`NavPreferences`/`CommandBarEntry` interfaces must be authored. All of the above = **candidate ADR-002 amendment**.

### As-is → `[INTENT]` substrate receipts (foundation matured after this doc) `[INTENT: ADR-012/013/014]`

**As-is FACT floor:** the 3 tables above are the live config model (ADR-002 §5.17); notification channel config + `quiet_hours_*` (`business-rules.md`) + per-module push toggles already exist. `[FACT: ADR-002 §5.17]`

- **E9 — `user_profile` single-writer split (ADR-012 §3.10).** Preferences becomes the single-writer owner of **`persona` · `motivation_style` · `active_modules` · `onboarding_*`**, migrated **off the overloaded `user_profile`** (As-is: `user_profile` overloaded across 3 owners, ADR-002 L3366-3396). System keeps per-currency total+level (derived); `check_in_streak*` → Check-ins; **PII (`display_name`/`avatar_url`/`birth_date`) STAYS in `user_profile` ⚠**; the sibling `[E]` field `focus_areas` is **NOT** part of this receipt. All four routed families are plaintext (PR-1 holds). Storage shape + the `active_modules`↔`module_visibility` reconciliation = **`[DEFERRED — build phase]`**. `[INTENT: ADR-012 §3.10; GM-12; matches check-ins CK-11]`
- **N6 — channel matrix (ADR-013 §3.4).** The notification channel config enumerates exactly **`in_app`** (full) · **`push`** (wake-only) · **`email`** (generic nudge) — **no `sms`** (dropped: un-encryptable, carrier-visible; v1 `NotificationChannel` had it). Per-module push toggles (As-is) ride the `push` channel. `[INTENT: ADR-013 §3.4; §5 L74 — Preferences owns channel config]`
- **X (Layer 3) — user-managed integration surface (ADR-014 §3.2).** Preferences hosts the self-service integration layer (webhooks + external-API management + Vida cookbooks). Tables/columns (`connection_config` under **mediator** custody, integration-identity anchor) = **`[DEFERRED — build / ADR-002 §5.20]`**; `connection_config` is `[E]` held by the OS mediator, **not a plaintext preferences column** (PR-1 preserved). `[INTENT: ADR-014 §3.2/§3.4]`

## State management map `[INTENT G8; FACT: life-os usePreferences/themeStore; ADR-001 State]`

- **React Query** owns the async read/write: `getMergedPreferences` (long stale time — config rarely changes), optimistic `updatePreferences` with **500ms debounce + batching** (PR-4).
- **Zustand `themeStore`** holds `theme` for instant app-wide repaint (PR-5); synced from the DB value on load and on change.
- **`DEFAULTS`** object is the merge base (PR-2) — the single place every field's fallback lives.

## Page / route map `[INTENT G7; FACT: life-os settings UI]`

- **Settings screen** — tabbed categories (Appearance · Locale · Notifications · Modules · …) + a **search box** over the settings index; not every category must be a top-level tab (sections/nested allowed).
- **Cmd+K command palette** — global overlay, not a route; backed by `command_bar_history` (G6).
- Delegated sections (Account/Security, Data import/export) render inside Settings but route into their owning domains (PR-8).

## Dependencies / graph

- **Foundational (Wave 0)** — consumed by nav, all UI, pomodoro, tasks, notifications, gamification, dashboard; **out-degree ≈ 0** for data ownership. `[FACT: docs/README.md fill order; intake]`
- Settings-screen delegation to Auth/Account + Data/Sync goes through documented integration points — no direct ownership of their tables (coupling budget, §6). `[INTENT G1; FACT: core business-rules §6]`

## Single source of truth (constitution §3)

- The `DEFAULTS` object (every field's default) — defined once, used by the merge (PR-2). `[INTENT G8.1]`
- Preference enums (`theme`, `time_format`, `dock_position`, `dock_size`) — SQL CHECK + canonical Zod in `@vida/core`, string-literal unions in `@vida/types` (once authored). `[FACT: packages/types/src/CLAUDE.md; ADR-002 CHECKs]`
- `theme` lives authoritatively in the DB; the Zustand store is a derived cache, not a second source (PR-5).

## ADRs / structural decisions

- **ADR-002 §5.17** — the 3 tables (authoritative). **ADR-001** — React Query + Zustand state, Tamagui UI. **ADR-003** — LWW for structured config.
- **Subject to (foundation matured after this doc):** **ADR-012 §3.10** (E9 `user_profile` split — receives config) · **ADR-013 §3.2/§3.4** (N6 channel matrix + N7 quiet-hours config) · **ADR-014 §3.2** (Layer-3 user-managed integration surface). Preferences **cites** these substrates' conceptual homes; code/directory homes = `[DEFERRED — Part 2]`.
- ⚠ **Surfaced decision:** schema/type catch-up for the G4/G5 additions + the E9/Layer-3 columns → candidate `/adr-new` (ADR-002 amendment) in the build phase. `[INTENT G4]`

## Completion checklist

- [x] data model (3 tables) · [x] dep graph (foundational) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
