<!-- Slice Map — features/preferences · Entity Delivery Flow Step 2 (Decomposition Gate)
     mod-preferences #37 (LIF-133) · M1.1.1 Backend. Each slice tagged backend|frontend|shared.
     The backend slices are THIS unit; frontend slices are fe-preferences (LIF-134). -->

# Slice Map — Preferences

## Split summary
- **Backend (this unit, ① — 3 slices):** the persist + merge + query surface over the finished schema.
- **Frontend (fe-preferences LIF-134, ② — deferred):** Settings screen, Cmd+K UI, debounce/optimistic hooks,
  Zustand `themeStore`, the searchable settings index.
- **Delegated / not-owned (neither slice builds it):** account/auth/data-export (PR-8), ADR-014 integration
  credential custody (PR-12), `ai_connections` (ADR-015). Cited, never authored here.

## Backend slices (this unit)

### Slice 1 — `user_preferences` (backend · shared-consumed) — the config core
The largest slice; the E9 + G4 + PB-2 columns all live on this one table, so they flow through its patch surface.
- **1a · Type reconcile (N-1).** Extend `@vida/types` `UserPreferences` (entities/user.ts) with the 10 schema
  columns it lacks: G4 (`font_size`, `compact_mode`, `number_format`, `default_dashboard_view`, `show_archived`,
  `notification_frequency`), PB-2 (`module_visibility`), E9 (`persona`, `motivation_style`, `active_modules`,
  `onboarding_completed`). Extend the Zod validator in `validators/user.ts`. `[N-1; SSOT conventions.md:18]`
- **1b · `DEFAULTS` (N-2).** Author the `USER_PREFERENCES_DEFAULTS` object mirroring the schema `.default(...)` values;
  the single merge base (PR-2, single-source-of-truth structure-data.md:44).
- **1c · Service ops:** `getMergedPreferences()` (read-or-create singleton → overlay row on DEFAULTS, never
  `undefined`) · `updatePreferences(patch)` (partial merge → `repo.update`) · `getModuleVisibility()` /
  `setModuleVisibility(key, visible)` (parse/patch the `module_visibility` JSON, `InvalidModuleError` on unknown key,
  PR-7) · E9 fields ride `updatePreferences` (no separate surface). `[contract.md:12-18,24]`

### Slice 2 — `nav_preferences` (backend · shared-consumed) — dock + mobile nav
Same singleton shape as Slice 1, smaller.
- `NAV_PREFERENCES_DEFAULTS` · `getNavPreferences()` (read-or-create merge) · `updateNavPreferences(patch)`.
  `[contract.md:13,17]`

### Slice 3 — `command_bar_history` (backend · shared-consumed) — Cmd+K frecency
Many-row table, not a singleton; upsert semantics.
- `recordCommand(command_key, label, category?)` (upsert by UNIQUE `command_key` → increment `use_count`, set
  `last_used_at`; create if absent, PR-6/N-4) · `pinCommand(command_key, pinned)` · `getCommandHistory()`
  (pinned-first, then frecency by `use_count`/`last_used_at`, sorted in-service, N-5). `[contract.md:20-22]`

## Frontend slices — fe-preferences (LIF-134, deferred, listed for the seam)
| Slice | Tag | Note |
|---|---|---|
| Settings screen (tabbed + searchable) | frontend | consumes the seam; G7 |
| `searchSettings(query)` over the settings index | frontend | local UI index (label/description/keywords), NOT a backend table — structure-data.md:35, conventions.md:16 |
| Cmd+K command palette UI | frontend | renders `getCommandHistory` + calls `recordCommand`/`pinCommand` |
| Debounced+optimistic React Query hooks (PR-4) | frontend | 500ms batch; the backend `updatePreferences` is the persist target |
| Zustand `themeStore` (PR-5) | frontend | derived cache of the DB `theme`; instant repaint |

## Deferred / follow-up (documented, NOT built here)
- **Migrate `sessions/service.ts` off its inline `user_preferences` read onto `getMergedPreferences()` (IR-3 seam).**
  It works today `[FACT: sessions/service.ts:213-228]`; migrating it touches another module's tested service and
  warrants its own verification. Left as a seam consumer — a small hygiene follow-up, not this issue's scope.

## Slice ordering & gate
Independent slices (3 tables, no cross-slice dependency). Build order 1 → 2 → 3 (Slice 1 establishes the
type-reconcile + DEFAULTS + read-or-create pattern the others mirror). Each slice runs its own §XXVI double-gate at
implementation and closes with the **per-slice blocking Verification Gate** (Vitest logic + ≥2 failure paths +
live-store smoke with `initVault()`) before the next begins — no batching.
