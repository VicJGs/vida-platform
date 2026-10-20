# fe-settings — Interpretation Layer

> Entity Delivery Flow ② · Step 1 (make the implicit explicit before decomposing).
> Unit: **fe-settings** (G6 #24 · LIF-193 · M1.2.1) — the net-new **Settings** surface in `apps/web`.
> Governed by the No-Guessing Principle: every claim tagged `[FACT: path:line]` / `[INTERPRETATION]` / `[UNKNOWN]`.
> Worktree baselined off `origin/main` @ `5ef0ce7`.

---

## 0. One-line charter

The **Settings** surface (`/settings`) — a **System-archetype** surface: a searchable index + the net-new
preference controls, consuming the finished `mod-preferences` ① service. Pure ② frontend: **no backend/schema
change** (adding a pref column is a `mod-preferences` ① change, out of this unit's scope).
`[FACT: docs/specs/foundation/frontend-replan/decomposition.md:71]`

---

## 1. DEPENDENCIES (what must already exist at boot/runtime)

| Dep | Status | Evidence |
|---|---|---|
| `mod-preferences` ① service | ✅ built | `createPreferencesService({db,deviceId})` with `getMergedPreferences`/`updatePreferences`/`getModuleVisibility`/`setModuleVisibility`/`getNavPreferences`/`updateNavPreferences` `[FACT: packages/core/src/services/preferences/service.ts:208]` |
| `fe-codec-theme` engine | ✅ built | `UIProvider` takes `selection: ThemeSelection {preset,mode,density}`; `resolveTheme`, `THEME_PRESETS=['reader','editorial','quietDesk']`, `THEME_DEFAULT` `[FACT: packages/ui/src/theme-resolution.ts:25]` |
| `fe-codec-system` (System shell) | ⚠ **not a live blocker** | Planned "System shell · **reuse UI-4**" `[FACT: docs/specs/foundation/frontend-replan/g6-reshape-runbook.md:42]`; never built as a tracked unit (no task file, absent from the live M1.2.1 plan); live tracker marks fe-settings **READY**. See §5 R-1. |
| UI-4 app-shell chrome + ⌘K | ✅ shipped | shell regions + command-bar overlay (the "System archetype" substrate) `[FACT: decomposition.md:34]` |
| `@vida/ui` control primitives | ✅ shipped | Button · Input · Checkbox · Select · Tabs · Card · Dialog · Popover · Menu · Toast `[FACT: packages/ui/src/index.ts]` |
| `@vida/ui` pattern-kit | ✅ shipped | `EmptyState` · `SyncStatus`/`HonestProgress` · `useReducedMotion` · `ProviderRead` convention `[FACT: decomposition.md:38]` |
| TanStack Router + lazy-split route convention | ✅ established | `apps/web/src/routes.tsx` (BR-RT-8 `lazyRouteComponent`) `[FACT: apps/web/src/routes.tsx]` |
| React-Query `useQuery({queryFn: provider})` read path | ✅ established | `ProviderRead<T> = () => Promise<T>` cross-module read seam (fe-notes/fe-home) `[FACT: apps/web/src/providers/provider-read.ts]` |

**Implicit runtime dependency (the keystone):** today `App.tsx` passes a **constant** `selection={THEME_DEFAULT}`
to `UIProvider` — there is **no live theme state** `[FACT: apps/web/src/App.tsx:72]`. The theme/preset/density/mode
switcher state (Zustand) + the dispatcher that writes it back to `user_preferences` was **deferred to fe-settings**
`[FACT: packages/ui/src/theme-resolution.ts (codec contract: "app owns state + persistence + switcher UI")]`.
→ fe-settings must **introduce the live theme store** and rewire `App.tsx` to read it. `[INTERPRETATION]`

---

## 2. NEEDS (the controls this surface must render — decomposition.md:71)

Authoritative scope `[FACT: decomposition.md:71]`: *"searchable index + the net-new preference controls
(theme-preset · motion · density · Home arrangement · sync visibility · Atlas toggle · module-rename)."*

| # | Control | Backing today | Write path | Backed? |
|---|---|---|---|---|
| C1 | **theme-preset** (reader/editorial/quietDesk × light/dark) | `user_preferences.theme` enum + live Zustand store `[FACT: preferences.ts:45]` | `updatePreferences({theme})` + store dispatch | ✅ (store is new-in-this-unit) |
| C2 | **density** (calm/dense) | `user_preferences.compact_mode` bool `[FACT: preferences.ts:47]` (+ `font_size` `[FACT: :48]`) | `updatePreferences({compact_mode})` + store | ✅ |
| C3 | **motion** (reduce) | `nav_preferences.reduce_motion` bool `[FACT: preferences.ts:100]` | `updateNavPreferences({reduce_motion})` | ✅ |
| C4 | **Home arrangement** (Journal-first / Dashboard-first) | `dashboard_layout` open JSON `[FACT: validators/user.ts:46]`; `contract.md:39` homes **Dashboard/Home → `dashboard_layout``; fe-home READs default `[FACT: home-surface.tsx:18]` | `updatePreferences({dashboard_layout})` | ✅ build-phase storage (§5 R-2) |
| C5 | **sync-visibility** (show/hide `/sync`) | surface show/hide → `module_visibility` + `setModuleVisibility(key,bool)` already shipped `[FACT: service.ts:208; validators/user.ts:48]` | `setModuleVisibility('sync',…)` | ✅ build-phase storage (§5 R-2) |
| C6 | **Atlas toggle** (enable/disable `/features`) | surface enable/disable → `module_visibility` (same seam as C5) `[FACT: validators/user.ts:48]` | `setModuleVisibility('features',…)` | ✅ build-phase storage (§5 R-2) |
| C7 | **module-rename** | open sub-key under `dashboard_layout` (e.g. `moduleNames:{key:name}`) — `module_visibility` is bool-only `[FACT: validators/user.ts:48]`; storage shape is a build-phase call `[FACT: structure-data.md:18]` | `updatePreferences({dashboard_layout})` | ✅ build-phase storage (§5 R-2) |
| C8 | **searchable index** | UX-only (no backing service) — a filter box over the rendered sections | client-side filter (8-state) | ✅ (pure UI) |

**Threaded cross-cut (every surface inherits):** the 8-state machine, EmptyState, SyncStatus/HonestProgress on
writes, ReducedMotion, ProviderRead, VoiceCopy honesty. `[FACT: decomposition.md:38]`

---

## 3. ORGANIZATION (where it lives, how it's wired)

- **Route:** net-new `/settings`, lazy-split per BR-RT-8, added to `apps/web/src/routes.tsx`. `[INTERPRETATION]`
- **Folder:** `apps/web/src/app/settings/` (currently empty — only `.gitkeep`) `[FACT: apps/web/src/app/settings/ empty]`.
  Follows the fe-home/fe-notes module shape: a `*-surface.tsx` composition + JSX-free model/logic files + a `CLAUDE.md`.
- **Archetype:** **System** = searchable list of grouped sections over shipped primitives (Card sections + Select/
  Checkbox/Tabs controls + an Input search field + the 8-state), **not** a net-new `@vida/ui` shell. `[INTERPRETATION, grounds §5 R-1]`
- **Theme-store seam:** a new app-level Zustand store (`{preset,mode,density}`) that (a) hydrates from
  `getMergedPreferences`, (b) feeds `UIProvider selection`, (c) persists via `updatePreferences`. Rewires `App.tsx:72`
  off the `THEME_DEFAULT` constant. `[INTERPRETATION]`
- **Read/write:** all reads via `useQuery({queryFn: preferencesService.get*})`; all writes via `updatePreferences`/
  `updateNavPreferences` with optimistic update + revert-on-error (BR-P5). `[FACT: docs/features/preferences/business-rules.md BR-P5]`

---

## 4. IMPLICIT RULES (caught here, not in the browser)

1. **No backend/schema change.** fe-settings is ②; a new pref column = a `mod-preferences` ① change. UI-only prefs
   (C4/C5/C6) ride the existing `dashboard_layout` JSON blob; no new SQL. `[INTERPRETATION, grounds §5 R-2]`
2. **Live theme store is new-in-this-unit** and load-bearing — `App.tsx` currently can't change theme at all. The very
   first slice must stand up the store + rewire the provider, or every theme control is inert. `[FACT: App.tsx:72]`
3. **Honest M1 copy.** "sync-visibility" governs a LOCAL change-log surface; no cloud/"saving to server" language —
   SyncStatus says "Saved on this device" `[FACT: decomposition.md — Sync row "multi-device compare = M3+"]`.
4. **Optimistic + revert.** Writes apply to the store immediately; a persistence error reverts + Toasts (BR-P5).
5. **module_visibility is validated by the consumer** — `setModuleVisibility` throws `InvalidModuleError`; the Settings
   UI owns the valid-module membership list (D3) `[FACT: service.ts:208 region]`.
6. **Reduced-motion** gates any control transition/indicator animation (`useReducedMotion`). `[FACT: decomposition.md:38]`
7. **Reachability (≥2 paths)** — Settings must be reachable from the shell (Bar 1 system panel) AND ⌘K. `[FACT: decomposition.md:38 ReachabilityRegistry]`

---

## 5. OPEN POINTS → carried into Envision (1.5) / Decomposition (2)

- **R-1 — fe-codec-system is NOT a build-blocking prerequisite.** Resolution: it was a "reuse UI-4" codec (not "new")
  `[FACT: g6-reshape-runbook.md:42]`, never built/tracked, and the live plan marks fe-settings **READY**. Settings
  composes the shipped UI-4 shell + @vida/ui primitives directly; a reusable `SystemView` shell is extracted later at
  rule-of-three (fe-notifications/fe-cmdk would be consumers 2–3), not preemptively. **Victor to veto if he wants the
  System shell extracted first.**
- **R-2 — storage for the four JSON-only controls (C4–C7) is RESOLVED as a build-phase decision (no deferral, no
  schema change).** The preferences docs explicitly make storage shape a build-phase call, not an open question
  `[FACT: structure-data.md:18]` / `[FACT: structure-data.md:25 "[DEFERRED — build phase]"]` / `[FACT: conventions.md:31]`.
  Grounded resolution: **C4 Home-arrangement + C7 module-rename → the open `dashboard_layout` record**
  `[FACT: validators/user.ts:46 z.record(z.string(),z.unknown())]` (`contract.md:39` homes Dashboard/Home there);
  **C5 sync-vis + C6 atlas → `module_visibility` via the shipped `setModuleVisibility`** (surface show/hide)
  `[FACT: validators/user.ts:48; service.ts:208]`. All via `updatePreferences`/`setModuleVisibility`; malformed JSON
  falls back to default `[FACT: business-rules.md:26]`. The exact key names are pinned in the Decomposition seam-contract.
- **R-3 — all 7 controls are IN scope** per three authoritative sources `[FACT: decomposition.md:71; surface-map.md:27;
  reconstructed-structure.md:49]`; nothing in the corpus defers any. (Was wrongly posed as a scope-cut choice — corrected.)
- **R-4 — delegated sections (Account/Security, Data import/export) are rendered-but-not-owned** `[FACT: identity.md:24;
  conventions.md:10 PR-8]`. Their owning domains (Auth/Account = M3, Data/Sync = M3/M4) don't exist at M1 → these render
  as **placeholder/deferred sections**, not functional controls (outside the 7 net-new controls). Pin at Decomposition.
- **R-5 — the searchable index drives BOTH the search box AND the tab/section grouping** (one index: label·description·
  keywords) `[FACT: conventions.md:16 G7]`; hiding all modules must still leave Settings reachable (escape hatch)
  `[FACT: business-rules.md:27]`. Settings screen states are doc-specified `[FACT: business-rules.md:32-35]`.
- **R-6 — Envision Gate (1.5) will FIRE.** Settings is a novel surface (searchable settings index + theme-preset
  switcher) whose UI answer isn't obvious from a shipped surface (§3.75 trigger = YES). Greybox + EC checkpoints next.
