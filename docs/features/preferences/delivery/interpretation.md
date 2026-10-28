<!-- Interpretation Layer — features/preferences · Entity Delivery Flow RECOVERY (entity-rescope) · Step 2
     Unit: preferences-rescope (LIF-247) · M1.2.4 Live Close · CROSS-PLANE (① service + ② Settings/onboarding surfaces).
     rev 2 (2026-10-21) supersedes the ① service-tier interpretation (mod-preferences #37, git 3e82608), which is
     summarized in §1.1. Source = the GATED corpus (delivery/documentation-gate.md rev 2) + the built code.
     Every claim [FACT: path:line] / [INTERP — grounded] / [UNKNOWN]. Paths are repo-relative. -->

# Interpretation — Preferences (entity, both planes)

**What this unit does.** It closes the Preferences entity **live**. The ① service already exists. ② surfaces
(Settings, plus guided-setup onboarding) were built in-session only. This unit wires them to the service so that
every preference write persists, survives reload and reaches its readers, then re-verifies every pinned EC in the
running app (ELC-1…9, `golive-replan/process.md` §2). Scope = 29 census rows (documentation-gate A12/A13) + X5 + X9.

---

## 1. DEPENDENCIES — every upstream, each sourced

### 1.1 ① service (BUILT — consume, don't author)

- `createPreferencesService({ db, deviceId })`: factory-object, single options arg, on the DB-6 Repository
  (`encryptedFields: []`) `[FACT: packages/core/src/services/preferences/service.ts:229-232]`. Exported from the
  `@vida/core` barrel `[FACT: packages/core/src/index.ts:169]`.
- Methods: `getMergedPreferences` · `updatePreferences` · `getModuleVisibility` · `setModuleVisibility` ·
  `getNavPreferences` · `updateNavPreferences` · `recordCommand` · `pinCommand` · `getCommandHistory`
  `[FACT: service.ts:208-227,347-357]`. `USER_PREFERENCES_DEFAULTS` / `NAV_PREFERENCES_DEFAULTS` exported
  `[FACT: :48-94,174-182]`.
- Read = read-or-DEFAULT, **never persists**; the row is created on the first write `[FACT: BR-PREF-2/3, current-business-rules.md]`.
- `updatePreferences` **replaces whole JSON columns** (`dashboard_layout`, `module_visibility`, `active_modules`)
  `[FACT: fe-settings seam-contract.md:60-68 citing service.ts serialize]`.

### 1.2 Runtime substrate (BUILT)

- **Data plane live:** worker driver `exec`/`values`/`batch` `[FACT: apps/web/src/db/client.ts:12-15,157-167]`.
- **Composition root:** a lazy singleton, `build()` = `ensureDbReady` → `initVault` → drizzle proxy → `deviceId` →
  services in dep-order; `Services = { notes; journals }` `[FACT: apps/web/src/db/composition-root.ts:34-37,58-77,84-86]`.
  Preferences depends only on `{ db, deviceId }` (out-degree 0) `[FACT: structure-data.md "Foundational"; service.ts:229]`.
- **React Query:** `lib/query-client.ts` defaults are staleTime 30s, retry 1, no refetch-on-focus `[FACT: apps/web/src/lib/query-client.ts:15-24]`.
  `QueryClientProvider` wraps **only the router branch**; the Onboarding + GuidedSetupTakeover overlays render outside it
  `[FACT: apps/web/src/App.tsx:103-125]`.
- **Live hook precedent:** read = `useQuery({ queryKey, queryFn: async () => (await getServices()).x(), enabled: !sample })`
  `[FACT: apps/web/src/notes/use-notes-rows.ts:54-63]`. Debounced write with dedupe baseline + flush-on-unmount +
  invalidate + honest save state `[FACT: apps/web/src/notes/use-note-content.ts:50-65]`. Tests mock
  `../db/composition-root` `[FACT: apps/web/src/notes/use-note-content.test.ts:12]`.
- **Theme lever:** `<UIProvider selection>` fed by `theme-store` `[FACT: App.tsx:35-40,102]`. `ThemePreset` includes
  `game` `[FACT: packages/ui/src/theme-resolution.ts:6,30]`. `ThemeMode` = light|dark only `[FACT: :8]`.
- **Motion:** `useReducedMotion()` reads the OS media query `[FACT: packages/ui/src/hooks/use-reduced-motion.ts:15]`.
  12 CSS `@media (prefers-reduced-motion)` gates (11 in `packages/ui/src/internal/*-styles.ts` + `apps/web/src/shell/shell-panel-styles.ts:36`); other matches are hook/JS consumers (recounted at Step 4).
- **Copy:** "Saved on this device" passes `lintCopy` `[FACT: apps/web/src/voice/voice-copy.test.ts:25]`.

### 1.3 Readers this unit feeds (other units own the reader code unless listed in §3.1)

| Reader                                                                   | Today                                                                                                                                                                                | Owner of the reader change                                                                                                                |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `useHomeArrangement` (Home)                                              | `preferences-store.arrangement`, in-session `[FACT: home/home-surface.tsx:25-27,74-76]`                                                                                              | **this unit** (arrangement = one leg, coverage :71/:303). journals-rescope keeps the E3 edge                                              |
| ⌘K nav commands + dock filter: visibility + rename                       | `command-bar/nav-commands.ts:14-27` lists every `MODULE_MAP` entry; `visibleDockGroups` filters `isFeatureEnabled` only `[FACT: shell/module-dock.tsx:39-54]`; the dock is unmounted | **this unit** (IA:46-47 "built with Preferences", IA:104 ⌘K owner, EC-4 "+ wired"; gate A13 rev 3). **Mounting** the dock = shell-rescope |
| `isFeatureEnabled('feature_gamification')`                               | always `false` `[FACT: shell/feature-flags.ts:10-12]`                                                                                                                                | **gamification-rescope** (E6)                                                                                                             |
| `usePersona`                                                             | `?persona` dev / `'neutral'` `[FACT: gamification/use-persona.ts:33-36]`                                                                                                             | **gamification-rescope** (coverage :148). The setter is this unit's                                                                       |
| Notifications channel prefs                                              | optional `preferences?` port, fail-open                                                                                                                                              | **notifications-rescope** (E5, soft)                                                                                                      |
| Shell placement (`nav_preferences` dock/float/edge) + the dock **mount** | `stubShellPrefs` `[FACT: shell/shell-prefs.ts:15-16]`; `ModuleDock` 0 mounts                                                                                                         | **shell-rescope** (fe-shell L5; coverage :185/:186)                                                                                       |
| App-wide reduce-motion                                                   | OS media only                                                                                                                                                                        | **this unit** (coverage :111/:115; gate A13)                                                                                              |
| Locale (date/time/week-start)                                            | 0 readers                                                                                                                                                                            | **this unit** ("locale readers", coverage :112/:289). See §3.4                                                                            |

### 1.4 Envision contract (pinned ECs carried — documentation-gate §C)

fe-settings EC-1…12 · fe-onboarding EC-1…10 · inherited fe-home EC-2 (arrangement follows the persisted Settings
preference) + EC-9 (feel) · fe-gamification EC-10 (persona → copy only). _(EC-1/EC-2, the `game` preset, were re-pinned by Victor 2026-10-21 as drift: `game` is a module, not a theme.)_ · CODEC ECs the
surfaces exercise (ELC-9 scope): fe-codec-theme seam **EC-7** (a theme swap honours reduced motion,
`fe-codec-theme/delivery/seam-contract.md:63`). Step 4 sweeps the EmptyState/Select/Switch primitive units for any
further exercised ECs. The Envision
Gate is **SKIP** (§5), so these are this unit's Visual-Gate MUSTs and ELC-9 re-verifies all of them live.

---

## 2. NEEDS — every precondition to function

- **N1 · Register `preferences`** in `Services` + `build()`, after `deviceId` (no service deps). This is the one composition
  change (ELC-3) `[FACT: web-client-runtime current-business-rules.md:60-66 "adding a module appends its construction"]`.
- **N2 · Two read keys**, matching the two singletons: `['preferences']` → `getMergedPreferences()` and `['preferences','nav']`
  → `getNavPreferences()` (`reduce_motion` lives there, `service.ts:218`). Structured keys per BR-RT-2. `[INTERP — grounded: BR-RT-2 `[entity]`/`[entity, id]` shape; nav is a sub-entity of the same owner]`
- **N3 · Live state machine.** loading → skeleton · error → defaults **read-only** + "your data is safe on this device" ·
  success. EC-7 / ELC-6. The hard `'success'` goes (X9) `[FACT: settings/use-preferences.ts:27; settings-surface.tsx:117-133]`.
- **N4 · One write path, optimistic + revert** (EC-7 exception to BR-RT-4, gate A7). In order:
  `cancelQueries` on the key → snapshot → optimistic `setQueryData` → persist debounced 500 ms batched (PR-4) → on
  success `setQueryData` from the returned `MergedPreferences` (`updatePreferences` returns it, `service.ts:212`) +
  "Saved on this device", **invalidating only once the write queue is empty** → on failure restore the snapshot + typed
  toast, never dropping input silently (PR-4, business-rules.md:40). The notes precedent never writes optimistically
  (`use-note-content.ts:56-60`), so it covers the debounce, not this ordering.
- **N5 · One serial write queue per singleton table** (`user_preferences`, `nav_preferences`): **every** patch is
  serialised, not just `dashboard_layout`. Inside it, `dashboard_layout` sub-keys (`theme` preset · `arrangement` ·
  `moduleNames`) merge read-merge-write via `patchDashboardLayout` (§B HARD INVARIANT, fe-settings seam-contract.md:60-68;
  gate §D.2), and `module_visibility` is merged as a whole map and written once via `updatePreferences({ module_visibility })` inside the same queue (`setModuleVisibility` returns `void` and costs N read-merge-writes; reconciliation C9).
  The one queue closes both lost updates and the first-write double-create (IR-10). It **flushes on `visibilitychange: hidden` / `pagehide`**, because `beforeunload` terminates the worker (`db/boot.ts:22-27`; reconciliation F18). Exported for journals over E3
  (gate §D.3).
- **N6 · Theme hydrate-before-paint.** The flash is doc-predicted: "a persisted non-editorial/dense initial would flash
  one frame — noted for the Settings unit" `[FACT: docs/specs/foundation/fe-codec-theme/s3-provider-resolution-density.md:90]`.
  `App` sits **outside** `QueryClientProvider` `[FACT: App.tsx:106]`, so `useQuery` cannot run there. The mechanism is a
  third condition on the boot Loading gate `[FACT: App.tsx:84; BR-RT-BOOT, web-client-runtime current-business-rules.md:65-66]`:
  imperatively `queryClient.fetchQuery` both keys, then hydrate `theme-store`. Costs, stated:
  - It makes `getServices()` **eager at boot**, against the "lazy" wording of BR-RT-COMPROOT (`:60-64`). `initVault`
    (libsodium WASM) + `resolveDeviceId` join the boot critical path. This is a perf cost.
  - A failed read must **not** block boot: fall through to defaults + EC-7's error state, never a stuck "Loading…" (MUST-4,
    `App.tsx:65-66`).
- **N7 · Overlay writes outside `QueryClientProvider`.** Onboarding commits must reach the service and the cache that
  Settings reads. The first-run `<Onboarding>` is **mutually exclusive** with the QCP branch, and GuidedSetupTakeover is
  a sibling overlay `[FACT: App.tsx:103-125]`. So a hoisted provider must wrap both branches **and** the overlay. The
  alternative is to call `getServices()` directly and update the shared `queryClient` singleton (`lib/query-client.ts`).
  `[INTERP — grounded: the cache is a module singleton, so both work; hoisting keeps one write path (N4/N5)]`
- **N8 · Mapping layer** (store/view ↔ columns, fe-settings seam-contract §B :46-58): preset ↔ `dashboard_layout.theme` ·
  mode ↔ `theme` (control writes light|dark only, gate A14) · density ↔ `compact_mode` · reduce-motion ↔
  `nav_preferences.reduce_motion` · arrangement ↔ `dashboard_layout.arrangement` · show/hide + Atlas/Sync ↔
  `module_visibility` · rename ↔ `dashboard_layout.moduleNames` · locale ↔ `date_format`/`time_format`/`week_starts_on` ·
  channels ↔ `notification_in_app/push/email` · quiet-hours ↔ `quiet_hours_enabled` · persona ↔ `persona` · onboarding
  module picks ↔ **`module_visibility`** (unpicked → `false`; intake G5, gate A8 rev 3) · guided-setup finish ↔
  `onboarding_completed=true` (gate A15).
  The **persona row** also needs:
  - an entry in the EC-6 search index (`settings/settings-model.ts:73+`);
  - the `theme-preset` index keywords gain `game`;
  - a **"Not set"** option, because `persona` is nullable `[FACT: packages/core/src/validators/user.ts:75]`.
- **N9 · `system` on read resolves to `light`** (gate U2, now doc-answered). fe-codec-theme fixes "honest cold-start defaults
  (Editorial + calm + **light**)" `[FACT: docs/specs/foundation/fe-codec-theme/delivery/interpretation.md:52-54]` = `THEME_DEFAULT`
  `[FACT: packages/ui/src/theme-resolution.ts:27]`. `USER_PREFERENCES_DEFAULTS.theme = 'system'` `[FACT: service.ts:50]` is
  what every fresh vault returns, so mapping it to the OS scheme would boot a fresh vault dark and break IR-7.
- **N10 · Malformed JSON** in `dashboard_layout` sub-keys degrades to defaults per sub-key (PR-2, BR-PREF-7). The service
  parses the column, and Zod types `dashboard_layout` as a loose `record<unknown>`, so **per-sub-key validation in ② is the
  only guard**:
  - an unknown `arrangement` → `journalFirst`;
  - an unknown preset → `THEME_DEFAULT.preset`;
  - a non-string `moduleNames` value → drop the key.

  Every other value the panes offer passes the shipped Zod (`TIME_FORMAT` 12h|24h · free `date_format` · int `week_starts_on`).

- **N11 · Test blast radius** (runtime, not compile: the `vi.mock` factories are untyped). These 9 files break once
  `usePreferences`/`useHomeArrangement` use `useQuery` or `Services` gains `preferences`:
  - `App.integration.test.tsx:14-16` (mocks `{notes}` only) and `App.test.tsx` (no composition-root mock);
  - `settings/{appearance-pane,locale-pane,modules-pane,notifications-pane,settings-surface}.test.tsx`;
  - `home/home-surface.test.tsx`;
  - `onboarding/guided-setup{,-s4}.test.tsx`.

  Fix with a shared test wrapper (`QueryClientProvider` + a `getServices` mock carrying `preferences`).

- **N12 · No `?sample` gate.** Settings and onboarding have no `?sample` path, so the live prefs hook takes no
  `enabled: !sample` (don't copy the notes precedent verbatim). Home's Visual Gate under `?sample` reads the **live**
  arrangement, which is correct: arrangement is a real preference, not sample data.

---

## 3. ORGANIZATION — owns · consumes · delegates

### 3.1 This unit OWNS (writes code)

- `apps/web/src/db/composition-root.ts` (N1).
- `apps/web/src/settings/use-preferences.ts`, which becomes the live read/write seam (N2–N5, N8), + `settings-surface.tsx`
  (loading/error/saved, EC-7) + `appearance-pane.tsx` (`game` preset, EC-4/A11; **persona** control, A10) + panes rebound
  from the stores to the seam.
- `apps/web/src/stores/{theme-store,preferences-store}.ts`: theme-store becomes a derived cache (N6). For preferences-store,
  Step 4 buckets dissolve-vs-cache (gate A6 — reverses decisions.md:10).
- `apps/web/src/home/home-surface.tsx` `useHomeArrangement`: read the persisted arrangement (fe-home EC-2).
- **App-wide reduce-motion gate:** the in-app preference ORs into the OS query. `useReducedMotion` is context-free
  (`useState` + `matchMedia` only, `packages/ui/src/hooks/use-reduced-motion.ts`), and the 12 CSS gates are injected style strings
  (`packages/ui/src/internal/*-styles.ts`), so pure JS cannot reach them. The doc-sanctioned mechanism is the
  **provider-applied root data-attribute**, the `data-vida-density` precedent (fe-codec-theme seam-contract.md ~:56). The
  hook and the CSS both key on it. _(Refined at PLAN-R4 §XXVIII D-R4-1, Victor 2026-10-26: one prop, two carriers — the
  attribute for CSS, a provider context for the hook, so the first render is right; observing the attribute races first paint. The gate count is 13 at R4 — fe-calendar S7 added `calendar-motion.ts`.)_ **⚠ This edits `packages/ui`**, which is CODEC-owned (RATIFY) and outside this unit's code
  homes (debt-plan.md:23). Per process.md §5, "a CODEC defect found at a consumer's ELC is fixed in the CODEC unit", but it
  ships here as a scoped CODEC edit with fe-codec-theme as the edge. Step 5 records it.
- `apps/web/src/onboarding/{use-module-selection,use-theme-selection,guided-setup-mount}.ts(x)`: live commits (N7, N8).
- `EmptyState.guidedSetup` **first consumers** (fe-onboarding EC-1 path b; debt-plan.md:23). Candidate live empty states:
  `notes/note-renderers.tsx`, `notes/note-entity.tsx`, `home/journal-page-region.tsx`, `notifications/notifications-surface.tsx`,
  `session-runtime/session-runtime-surface.tsx`, `gamification/activity-mode.tsx` (grep `<EmptyState`). Step 4 picks
  them by EC-1's purpose (the empty states a **fresh vault** shows). **File edges, recorded now:** every candidate sits
  in another unit's code home (notes → notes-rescope · home → journals-rescope · notifications → notifications-rescope ·
  session-runtime → sessions-rescope · activity-mode → gamification-rescope), as do `home-surface.tsx` (journals) and
  `live-mappers.ts` (notes). No in-flight worktree touches them today (fe-notes-and-pages closed; fe-onboarding is
  docs-only), but each edit is a one-line, slot-only touch and must be recorded on the owning unit's edge.
- **Nav readers:** `command-bar/nav-commands.ts` + `shell/module-dock.tsx` `visibleDockGroups` honor `module_visibility` (hidden → omitted) + `moduleNames` (display label), never hiding Settings/Home (EC-8 read side). `onboarding/modules.ts` mirrors the dock filter, so it stays in lockstep (its CLAUDE.md rule).
- Stale-comment cleanup in this unit's files (X5).
- **Locale readers** (§3.4).

### 3.2 CONSUMES (no change)

The ① service · the data plane · `UIProvider` · `THEME_PRESETS` · `EmptyState` · `lintCopy` · the notes hook precedent.

### 3.3 DELEGATES (edges; this unit exposes the value, another unit reads it)

shell-rescope (mounting the dock + placement) · gamification-rescope (flag
source, persona read) · notifications-rescope (channels, quiet-hours inputs) · journals-rescope (widget selection inside
`dashboard_layout` via N5) · note-open-behavior-preference (E11, a later Settings control) · M3/M4 (Account/Data panes).

### 3.4 Locale readers (gate U3 — enumerated from code)

| Pref             | Live reader site                                                                                                                                                                                                                                                                                                | Note                                                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `week_starts_on` | `CalendarView` `weekStartsOn` prop `[FACT: packages/ui/src/components/calendar-view.tsx:38,96]`. Live consumer on main: `notes/note-renderers.tsx:69` (passes none)                                                                                                                                             | **fe-calendar** (in flight) modifies `calendar-view.tsx` and adds week/year/agenda views with `weekStartsOn` + `stores/calendar-ui-store.ts`, so it is the **real** reader and these cites drift on its merge. Step 4 re-sweeps after it lands, and an edge is recorded |
| `time_format`    | `gamification/activity-mode.tsx:24-25` (`hour:'2-digit'`, locale `'en'` → renders 12h)                                                                                                                                                                                                                          | file owned by gamification; a one-option change (`hourCycle`). **Visible default shift:** the DB default is `'24h'`, so wiring the reader changes as-built 12h → 24h for a fresh vault. That is correct per PR-2, but the Visual Gate must expect it. Edge noted        |
| `date_format`    | **none (verified at Step 4).** `notes/live-mappers.ts:25-26,45` `ymd()` is a **data key** (`CalendarView getDate`, `note-renderers.tsx:69`), not a displayed string; formatting it would break day grouping. No live surface renders a pattern date (notes use relative time `:15-23`; Home's eyebrow is prose) | nothing to wire. The value persists, and pattern-date surfaces read it when they arrive (first-consumer pull). Corrected from rev 2, which named live-mappers as a reader                                                                                               |
| —                | `home/home-surface.tsx:38` editorial eyebrow (`weekday long, day, month long`)                                                                                                                                                                                                                                  | not a `date_format` pattern site (prose date). Out of `date_format`'s reach `[INTERP]`                                                                                                                                                                                  |

---

## 4. IMPLICIT RULES — what a mock would hide (the live leg must catch these)

- **IR-1 · Reopen with no spurious write.** Hydrate must not write. A first-run read creates **no row** (A3). Settings
  controls must not echo their hydrated value back as a save (the TipTap mount-echo class, memory
  `tiptap-onchange-fires-on-mount`). ELC-7 checks it live: open Settings → reload → `user_preferences` row count unchanged.
- **IR-2 · Sibling sub-keys survive.** change preset → rename a module → reload → the preset survives (fe-settings §B
  Visual-Gate MUST, seam-contract.md:60-68). It must hold across _concurrent_ debounced patches too (N5).
- **IR-3 · The escape hatch holds on both sides.** Write side: `HIDEABLE_MODULES` excludes `preferences`/`journals`
  `[FACT: settings/settings-model.ts:37-46]`, though the service would persist `module_visibility.preferences=false`
  (fe-settings §E). Read side: the nav readers ignore a `false` on Settings/Home even if one arrives by sync (EC-8).
- **IR-4 · Theme flash.** A reload must paint the persisted theme first (N6; doc-predicted at fe-codec-theme
  s3-provider-resolution-density.md:90). A visible default→persisted flip is a feel-EC failure (fe-settings EC-5
  instant-ness; fe-home EC-9).
- **IR-10 · One row per singleton, even under a race.** `updatePreferences` does `findAll()[0]` then `create` if none
  `[FACT: service.ts:263-266]`, and singleton-ness is app-enforced only (BR-PREF-3, no DDL uniqueness). Because reads
  never create (IR-1), a fresh vault's first two concurrent writes would **both create**, and `getMergedPreferences` then
  reads an arbitrary `rows[0]`. N5's per-table serial queue prevents it. ELC-7 asserts **`user_preferences` and
  `nav_preferences` row count == 1** after rapid multi-control edits on a fresh vault.
- **IR-11 · A refetch never clobbers a pending edit.** An invalidation refetch that resolves while a second edit is still
  inside the debounce returns the older DB value. It overwrites the optimistic cache, and `theme-store` re-hydrates and
  flips the theme back. N4's ordering (`cancelQueries` · `setQueryData` from the write result · invalidate only on an
  empty queue) prevents it. Live check: change preset twice within 500 ms → the final preset holds, with no flicker.
- **IR-5 · Two signals stay independent.** Guided-setup finish writes the synced `onboarding_completed`. The boot gate keeps
  keying **only** on device-local `first_run:completed` (`onboarding/CLAUDE.md` two-signal rule). Writing the synced flag
  must not change boot routing (gate A15).
- **IR-6 · `active_modules` ≠ `module_visibility` ≠ `feature_gamification`** (PR-7, BR-PREF-5, conventions.md:31, PRE-19).
  The user-facing module on/off, from Settings **and** onboarding, is `module_visibility` (intake G5). `active_modules`
  stays unwritten, and `feature_gamification` is gamification-rescope's. One store per concept, so there is no conflation.
- **IR-7 · Defaults parity.** The view defaults must equal `USER_PREFERENCES_DEFAULTS`/`NAV_PREFERENCES_DEFAULTS` + the §B
  sub-key defaults (arrangement `journalFirst`, preset = `THEME_DEFAULT.preset`). Otherwise an error state ("defaults
  read-only") shows values the DB would never return. `[FACT: preferences-store.ts:68-80 "mirror USER_PREFERENCES_DEFAULTS"]`
- **IR-8 · No cloud language** in save/error copy (EC-7 "no cloud language (M1)").
- **IR-9 · `initVault` is global now.** The first preferences write computes `_sync_hash`. `build()` already awaits it
  `[FACT: composition-root.ts:59-63]`, so no new work, but a test that constructs the service directly must init it.

---

## 5. Envision Gate (Step 3.5): **SKIP**, with the ECs carried

Trigger test (entity-delivery-flow.md §3.75): _"Is there a user affordance whose UI answer isn't already obvious from an
existing shipped surface?"_

- Every surface exists and passed its Envision (fe-settings 2026-10-12, fe-onboarding 2026-10-11).
- The net-new affordances are:
  - a `game` option in an existing Select;
  - a `persona` row (an `OptionRow` + `Select`, EC-2/EC-4 shape);
  - "Saved on this device" (pinned by EC-7);
  - the guided-setup slot button (pinned by EC-1, shipped S4).

Each one's UI answer is already given by a shipped surface or a pinned EC → **NO → SKIP.** Per process.md §2.5 rule 1,
SKIP skips the greybox, **never the checkpoints**: §1.4's 27 ECs are this unit's named Visual-Gate MUSTs, and ELC-9
re-verifies all of them live.
**Soft spot:** fe-settings EC-4 pins exactly 7 controls, and persona is **not** one of them. Its pane, label, copy and
"Not set" option are unpinned. That doesn't need a greybox (an `OptionRow` + `Select`), but Step 5 must pin it as a
**named Visual-Gate MUST**: pane = Appearance, under the theme rows; label + copy through `lintCopy`.

**rev 5 (Re-scope Gate): back to SKIP.** The one firing affordance (persona → suggest the `game` theme) is void: Victor 2026-10-21, "`game` was not supposed to be a theme … it is supposed to be a module". EC-P1 withdrawn. Persona drives reward copy only (fe-gamification EC-10).

---

## 6. Interpretation Gate — resolved with Victor (2026-10-21)

1. **Onboarding module picks → `module_visibility` (doc-FACT, not a decision).** Intake **G5** (Victor, 2026-06-18) makes the
   per-module on/off system per-module visibility, driving nav (`docs/intake/preferences.md:37,61-63`). rev 2 framed
   this as an open U1 with three options because it never read the intake's resolved G-items. Victor: "I solved this
   gap already in the documentation." Corrected in gate A8 + N8 + IR-6.
2. **A6 = drift corrected, not a decision.** Victor: "a clear drift". The Zustand stores as the in-session source
   (decisions.md:9-10) only stood in for the blocked `values` seam. With the seam live, React Query over SQLite is the
   source (BR-RT-1/7, data-flow.md:465, structure-data.md:46), and the stores are at most derived caches. decisions.md:9-10
   get a "superseded by preferences-rescope" note at Step 5.
3. **A13 = the architecture decides, not the planning artifact** (Victor: "follow the documentation that explains the
   architecture and the design that everything was created"). IA:46-47 (nav reads the preference store, "built with
   Preferences") + IA:104 (⌘K is Preferences') + fe-settings EC-4 ("+ wired") → the hide/rename/reduce-motion **readers
   close here**. shell-rescope keeps the dock **mount** + placement. debt-plan.md:27's reader clause is fixed at Step 5.

**Step-5 doc fixes owed** (not decisions): merge coverage-report's two `preferences-rescope` total rows + apply A13's counts
(gate A12) · record the file edges in §3.1/§3.4 on the owning units · record the `packages/ui` reduce-motion edit as a
fe-codec-theme edge.

---

## 7. Gate record

- **rev 1 → independent critique: REVISE** (5 blocking · 9 nits). Folded:
  - B1 per-table serial write queue (N5) + IR-10 (double-create) + ELC-7 row-count assertion.
  - B2 N4 ordering + IR-11 (refetch vs pending edit).
  - B3 N6 mechanism (boot-gate `fetchQuery`), eager-boot perf cost, non-blocking failure, and the doc-predicted flash cite;
    N11 test blast radius (9 files).
  - B4 N9 resolved from fe-codec-theme cold start (`system` → light); `time_format` default shift noted (§3.4).
  - B5 U1 reframed under PRE-19 with 3 options; the recommendation needs a PRE-19 exception.
  - M1/M2 mis-cites fixed.
  - Nits: reduce-motion mechanism + the `packages/ui` CODEC edge · file edges recorded · fe-calendar is the real week-start
    reader · codec EC-7 carried · persona NEEDS (index · keywords · "Not set") + persona pinned at Step 5 · N12 `?sample` ·
    N10 `moduleNames` · rename edge (no max length / no reset: Step 4 buckets) · N7 mutual exclusivity · Step-5 doc fixes.
- **rev 2:** SHIP-ready pending Victor on §6.
- **rev 3 (Victor):** U1 closed by intake G5 (grounding miss corrected) · A6 confirmed as drift · A13 corrected by the architecture/design docs (readers stay here).
