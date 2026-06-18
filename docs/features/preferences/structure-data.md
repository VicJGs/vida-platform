<!-- Structure & Data — features/preferences · /documentation Phase 2 · sources: ADR-002 §5.17 · life-os settings · ADR-001/003 -->

# Structure & Data — Preferences  (level: Feature)

## Data model — 3 owned tables (ALL plaintext, no `[E]`) `[FACT: ADR-002 §5.17 L3474-3574; L1097-1101]`

| Table | Cardinality | Purpose | Notable fields / constraints |
|---|---|---|---|
| `user_preferences` | singleton | appearance · locale · dashboard · tasks · pomodoro · notifications · features | `theme` CHECK{light,dark,system}; `time_format` CHECK{12h,24h}; `dashboard_layout` JSON; per-module push toggles; `feature_gamification` |
| `nav_preferences` | singleton | dock + mobile nav | `dock_position` CHECK{bottom,left,right}; `dock_size` CHECK{small,medium,large}; `mobile_nav_items` JSON array |
| `command_bar_history` | many | Cmd+K palette frecency + pinning | `command_key` UNIQUE; `use_count`, `last_used_at`, `is_pinned` |

- All three carry standard sync metadata (`_sync_*`); `user_preferences`/`nav_preferences` carry `created_at`/`updated_at`. `[FACT: ADR-002 §5.17]`
- Config syncs via **LWW** (no CRDT — these aren't editor documents). `[FACT: ADR-003 §structured data LWW]`

### ⚠ INTENDED additions (not yet in ADR-002 / no types) `[INTENT G4, G5; FACT: ADR-002 omits these]`
- `user_preferences` new columns: `font_size`, `compact_mode`, `number_format`, `default_dashboard_view`, `show_archived`, `notification_frequency`.
- **Per-module visibility**: a `module_visibility` JSON map (`moduleKey → bool`) on `user_preferences` — *or* a dedicated store; storage shape is a **build-phase decision**.
- **No `@vida/types` preferences file exists** — `UserPreferences`/`NavPreferences`/`CommandBarEntry` interfaces must be authored. All of the above = **candidate ADR-002 amendment**.

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
- ⚠ **Surfaced decision:** schema/type catch-up for the G4/G5 additions → candidate `/adr-new` (ADR-002 amendment) in the build phase. `[INTENT G4]`

## Completion checklist
- [x] data model (3 tables) · [x] dep graph (foundational) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
