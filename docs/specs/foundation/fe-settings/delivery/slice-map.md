# fe-settings — Slice Map (Decomposition Gate · Step 2)

> Entity Delivery Flow ② · the per-slice UI/UX track iterates once per frontend slice. All slices `frontend` except
> S1 (`shared` — a @vida/ui DS primitive). **Zero backend/schema change** (pure ②; the 4 JSON-only controls ride the
> existing open `dashboard_layout` / `module_visibility` fields — interpretation §4.1 / R-2). Each slice closes with a
> **blocking** gate before the next begins (§XXVI step 7 + the ② per-slice Visual Gate). Decide-mode (net-new surface).

## Slices

| # | Slice | Plane | Delivers (ECs) | Gate |
|---|---|---|---|---|
| **S1** | **`Switch` primitive** (`@vida/ui`) | shared | Net-new pill-toggle UI-1 primitive (contract · 8 states · APG `role="switch"` + a11y · reduced-motion). The boolean control for all of Settings. **EC-3.** | Visual Gate |
| **S2** | **App theme store + `App.tsx` rewire** (`apps/web`) | frontend | A Zustand `{preset,mode,density}` store, hydrated from `getMergedPreferences`, feeding `UIProvider selection` (replaces the `THEME_DEFAULT` constant, `App.tsx:72`); setters persist via `updatePreferences`. Renders the SAME as today (defaults) → no visible change yet. **EC-5 (mechanism).** | Verification Gate (renders-nothing-new) |
| **S3** | **Settings shell + route + Appearance pane** (`apps/web`) | frontend | Two-pane System layout (category rail + search-topped pane + option-row pattern) · `/settings` lazy route · the **Appearance** controls: theme-preset/mode/density (drive the S2 store = **live apply**) · reduce-motion (S1 Switch) · home-arrangement (`dashboard_layout`). The honest-state scaffold (loading/read-error→defaults-read-only/optimistic+revert). **EC-1, EC-2, EC-5 (live), EC-7, EC-8 (route+reach), EC-10.** | Visual Gate |
| **S4** | **Searchable index** (`apps/web`) | frontend | One index (label·description·keywords) driving BOTH the search box (filter across all categories) AND the section grouping; no-match → calm `role="status"` + hint. **EC-6.** | Visual Gate |
| **S5** | **Modules pane** (`apps/web`) | frontend | Per-module show/hide (S1 Switch + `setModuleVisibility`) · inline **rename** (pencil → inline edit w/ save/cancel; `dashboard_layout.moduleNames`) · **Surfaces** subsection: Feature Atlas + Sync-log visibility toggles. Escape-hatch: visibility can never hide Settings. **EC-4 (rem), EC-8 (escape hatch), EC-12.** | Visual Gate |
| **S6** | **Locale · Notifications · delegated panes** (`apps/web`) | frontend | Locale (date/time-format/week-start) + Notifications (channels/quiet-hours) over EXISTING prefs; Account/Security + Data import-export as calm "a later release" placeholders (owners M3/M4). **EC-4 (locale/notif), EC-9.** | Visual Gate |

## EC → slice coverage (every structural EC maps to ≥1 slice; plane-aware)

| EC | Type | Slice(s) | Visual-Gate MUST |
|---|---|---|---|
| EC-1 two-pane layout | structural | S3 | ✓ |
| EC-2 option-row pattern | structural | S3 (then every pane) | ✓ |
| EC-3 Switch primitive | structural | **S1** | ✓ |
| EC-4 all 7 controls wired | structural | S3 (Appearance 5) · S5 (Modules 2 + rename) · S6 (locale/notif) | ✓ |
| EC-5 theme keystone live apply | structural (feel: instant) | S2 (store) · **S3 (live)** | ✓ (S3) |
| EC-6 searchable index | structural | **S4** | ✓ |
| EC-7 honest states | structural | S3 (scaffold) · reused S4–S6 | ✓ |
| EC-8 reachability + escape hatch | structural | S3 (route+shell/⌘K reach) · S5 (escape hatch) | ✓ |
| EC-9 delegated placeholders | structural | **S6** | ✓ |
| EC-10 responsive 375 | structural | S3 (then every pane) | ✓ |
| EC-11 editorial voice | feel | every slice | live Visual Gate |
| EC-12 inline rename feel | feel | S5 | live Visual Gate |

**No structural EC unhomed. No slice without an EC.** S1 is `shared` (DS primitive → its own Visual Gate); S2 is logic-only (Verification Gate, EC-5 proven visible at S3); S3–S6 are `frontend` surface slices each with a blocking Visual Gate.

## Dependencies / order

S1 (Switch) → S2 (theme store) → S3 (shell+Appearance, consumes S1+S2) → S4 (search over S3's index) → S5 (Modules, consumes S1) → S6 (remaining panes). S1 and S2 are independent and could run in either order; S3 needs both.

## Gate-1 critique — SHIP (0 blockers); 3 refinements folded (2026-10-12)

Independent adversarial critic verified the seam-contract line-by-line vs the shipped service (exact match), the
no-schema-change claim, the theme-store keystone, and the Switch contract — all PASS. Folded:
- **#1 (S3)** — S3 ALSO activates the home-arrangement READ seam (`useHomeArrangement()` is a hardcoded return today);
  the write is inert otherwise. ~2-line touch in `home/home-surface.tsx` (the S2 App.tsx-rewire precedent). seam §C.
- **#2 (S3+S5)** — `dashboard_layout` is a whole-column replace → a shared `patchDashboardLayout()` read-merge-write
  helper is the single write path for `theme`/`arrangement` (S3) + `moduleNames` (S5). **New Visual-Gate MUST (S5):**
  change preset → rename a module → reload → preset survives. seam §B HARD INVARIANT.
- **#3 (S5)** — escape-hatch is UI-enforced not service-enforced; S5 excludes `preferences`/`home` from the hideable
  list (source: `nav/module-map.ts`). seam §E.

## Out of scope (homed)

- **Backend/schema change** — none (pure ②). A dedicated `home_arrangement`/`feature_atlas`/`sync_visibility` column would be a `mod-preferences` ① amendment; not needed (open JSON fields absorb them, R-2).
- **⌘K command registration for Settings entries** — the ⌘K spine is UI-4/fe-cmdk; S3 ensures Settings is reachable, it does not rebuild the command bar.
- **Live multi-device sync visibility** — M3+ (the `/sync` surface itself is `fe-sync-log`; S5 only toggles its visibility pref).
- **Account/Security + Data import-export functionality** — owned by Auth/Account (M3) + Data/Sync (M3/M4); S6 renders placeholders only (EC-9).
