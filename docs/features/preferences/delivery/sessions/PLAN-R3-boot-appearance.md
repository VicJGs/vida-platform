<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R3 · Boot + Appearance + honest states
     Scope: delivery/slice-map.md R3 (APPROVED 2026-10-21) · ledger rows C3(theme) B2 B6 F13 D1 C5(UI) D4 D6 D7 D10
     (+ X5 C8/B4 in the files touched). Inherits R2's writer API (PLAN-R2 R2-BR-1…11) + R1's lock.
     No-Guessing: [FACT: path:line] · [INTERP — grounded] · [UNKNOWN]. Worktree @ f796c34 (main merged). -->

# PLAN-R3 — Boot + Appearance + honest states

> **Status:** rev 2.2, 2026-10-26 — Victor-approved correction to the governing `state-conventions.md` §3 (see §7). rev 2.1, 2026-10-22 (Approval 1: Victor; rev 2.1 = two gate-2 refinements, presented at Approval 2). rev 1 went to an independent critique (REVISE: 6 blocking, 14 nits); all are folded in
> (§7). Approval 1 + Approval 2 given (Victor 2026-10-22); rev 2.2 approved 2026-10-26.
> **Plane:** frontend + shared. Both gates run: the **Verification Gate** (Vitest + typed failure paths + a live smoke on
> real OPFS) and the **Visual Gate** (real browser · every new state × light/dark × 375/768/1440 · §XIV a11y · stage-2
> AA critique · stage-4 Victor `visual-approved`, F15).
> **Context baseline (§XXVI.1a):** `docs/modules/preferences/current-*` (refreshed by R2) + web-client-runtime `current-*`
> (refreshed by R1/R2 and by the fe-calendar merge `f796c34`). Both describe the code as read for this plan.

## 1. Problem (as-built, after R2)
- **The theme is in-session only.** `theme-store` boots at `THEME_DEFAULT` and the Appearance controls call its setters
  directly `[FACT: stores/theme-store.ts:26-33; settings/appearance-pane.tsx:35-38,62,74,86]`. Nothing persists a preset,
  mode or density, and nothing hydrates them (D7). R2's mirror deliberately excluded the theme `[FACT: preferences/preferences-bridge.tsx:21-33]`.
- **No hydrate before paint (B2, IR-4).** `UIProvider` mounts only after `dbReady` + first-run resolve
  `[FACT: App.tsx:85-91,107]`, so a persisted non-default theme would paint the default first. fe-codec-theme predicted it:
  "a persisted non-editorial/dense initial would flash one frame — noted for the Settings unit"
  `[FACT: docs/specs/foundation/fe-codec-theme/s3-provider-resolution-density.md:90]`.
- **The boot frame is unthemed (B6).** "Loading…" renders before any provider, and `index.html` sets no background or
  `color-scheme` `[FACT: App.tsx:85-91; index.html:1-24]`. Once dark persists, every reload would paint white → dark.
- **Home arrangement reads the mirror** (`preferences-store.arrangement`), and the Settings control writes the mirror, so it
  never persists (D10) `[FACT: home/home-surface.tsx:25-27; appearance-pane.tsx:41-42,106]`.
- **Settings has no loading branch, and its error branch replaces the pane** instead of showing defaults read-only (D1)
  `[FACT: settings/settings-surface.tsx:117-133]`. R2 made `state` honest; R3 builds what it renders.
- **No save feedback and no revert toast (C5 UI).** R2's `useUpdatePreferences` returns `saveState` + `lastError` with no
  caller `[FACT: preferences/use-preferences.ts:64-104]`.
- **No persona control (D4).** `persona` is a nullable `user_preferences` column; the view already maps it with the
  `PERSONA_UNSET` sentinel `[FACT: preferences/preferences-view.ts:22-24,91,117]`.

## 2. Business rules (after R3)
- **R3-BR-1 · One query definition, two callers.** The two read definitions (key + `queryFn` + the writer's
  `epoch`/`noteConfirmed` reconcile) move from `use-preferences.ts` into `preferences-queries.ts`. The hook and the boot
  seed both use them, so there is exactly one read path and one cache entry per table.
- **R3-BR-2 · Boot seeds the cache before the first themed paint (B2, N6).** `App`'s boot gate gains a third condition,
  after `dbReady` and alongside the first-run read: `seedPreferences(queryClient)` = `fetchQuery` for both keys,
  `retry: 0`. The provider tree does not render until the seed **settles**, either way.
  - **A failed seed never blocks boot** (MUST-4, `App.tsx:65-66`). The gate resolves; the two queries sit in their error
    state; the app renders the defaults (PR-2). **They stay in error until the user presses Retry** (rev 2.2): both
    definitions set `retryOnMount: false`, so a newly mounted reader does NOT refetch an errored query; recovery is the
    error state's Retry, which calls `refetch()` and re-enters `loading` (`state-conventions.md` §3 [FACT:
    docs/core/architecture/state-conventions.md:92]). Settings shows EC-7's first-read state at once (R3-BR-6). No stuck
    "Loading…", no flicker.
  - **Why `retryOnMount: false` is required, not a preference** [FACT: `@tanstack/query-core` 5.101.4
    `queryObserver.js:444-446` `shouldLoadOnMount` · `query.js:411-417` `fetchState`]: every new observer of an errored,
    data-less query refetches it, and that refetch resets `status` to `pending` (data is `undefined`). The surface
    derives `loading` (`isPending` first, state-conventions §2), unmounts the panes, the read fails, the panes remount and
    refetch again — an unbounded loop (reads 2→4→8→16, found at build step 16). rev 2.1's "refetches once on mount" was
    false about the library.
  - **Known limits of the failed-seed path, recorded:** (1) with a hint for a dark theme, the frames run hint-dark → default
    light → persisted dark if a refetch later succeeds; (2) `getServices()` memoizes its build promise (`buildPromise ??=`,
    `composition-root.ts:145-147`), so a failure *inside* `build()` (e.g. `initVault`) never recovers by refetch. A plain
    read failure does. (2) is the data plane's (LIF-250's area), recorded as an edge, not fixed here.
  - **Stated cost (N6), framed exactly:** R2's bridge already calls `getServices()` as soon as the provider mounts
    (`preferences-bridge.tsx:41` → `use-preferences.ts:36`). R3 moves that **before first paint**, so `initVault` +
    `resolveDeviceId` + the two reads now sit inside the Loading window instead of after it. The gate **measures** both the
    Loading duration and time-to-shell on `main` vs R3 (§XIII: measured, not estimated). BR-RT-COMPROOT is amended to
    "built during boot (R3)".
- **R3-BR-3 · `theme-store` is a derived cache (C3 theme half; PR-5 exemption, `structure-data.md:46`).** Its persisted
  selection is `toView(userRow).selection`, kept in sync by ONE subscription to the `['preferences','user']` cache entry,
  installed once at module load of `theme-store.ts` over the `lib/query-client.ts` singleton. Nothing else writes it.
  - `setPreset` / `setMode` / `setDensity` / `hydrate` are **removed**. Appearance writes go through
    `useUpdatePreferences` → the writer → the cache → the subscription → `UIProvider`. Because the writer sets the cache
    optimistically on enqueue (R2-BR-4), the re-theme is still instant (EC-5); a failed write restores the cache, and the
    theme follows it back.
  - **The onboarding preview is a layer, cleared on every exit.** `previewPreset: ThemePreset | null` sits over the persisted
    selection (`selection = preview ? { ...persisted, preset: preview } : persisted`). The subscription never touches it, so
    a re-hydration can't clobber an active preview (E8's clobber half). **`App` clears the layer whenever `guidedPhase`
    returns to `'none'`, on every path** (finish, skip, close). That is E8's documented revert ("an uncommitted preview
    reverts to the persisted theme", decisions.md:1141 rationale; fe-onboarding EC-10), so Settings and the app can never
    show different themes afterwards.
  - **Stated interim change, until R7:** the theme commit is still a no-op (`onboarding/use-theme-selection.ts:39`), so
    finishing guided setup now **reverts** to the saved theme instead of leaving the pick applied in-session. R7 (E3) makes
    finish persist the pick. Chosen over making the preview write through (the critique's option b), because that would
    persist a pick the user skipped, the exact E7 violation R7 exists to prevent.
- **R3-BR-4 · The theme hint (B6 option (a), doc-forced).** A device-local mirror that only the inline boot script reads.
  - **Shape:** `localStorage['vida.theme-hint.v1'] = { scheme: 'light'|'dark', bg, fg }`, where `bg`/`fg` are the
    resolved `colorSurfacePrimary` / `colorTextPrimary` of `resolveTheme(selection).themeName`. There is no aggregated
    themes map (the barrel re-exports each constant, `packages/ui/src/index.ts:10`), so `theme-hint.ts` keeps an explicit
    `Record<ThemeName, …>` over the exported constants (`light`, `dark`, `light_reader`, … — editorial resolves to the
    bare `light`/`dark`) `[FACT: packages/ui/src/themes/themes.ts:5-19; theme-resolution.ts:24,37]`. A missing entry is a
    type error, not a runtime gap. Storing resolved colours keeps the inline script token-free (no palette in `index.html`).
  - **Written only from DB truth:** the writer gains an `onConfirmed(table, row)` option. It fires when `confirmed`
    changes from an **accepted read** (`noteConfirmed`) or a **successful batch** — never on enqueue (optimistic), never on
    a failed batch. So a C5 revert can never leave a stale hint. *(The slice-map says "written only from a settled
    persist"; an accepted read is DB truth of the same kind, and without it a device whose hint is missing or stale would
    stay wrong until the next write `[INTERP — grounded: B6 "a convenience mirror, never a source"]`.)*
  - **Read only by the inline `index.html` script**, in `<head>` right after the process shim: parse in `try/catch`, set
    `documentElement` `background-color`, `color` and `color-scheme`. Blocked or corrupt storage → nothing painted → the
    browser default, as today. Nothing in the app reads the hint, so it is never a source (BR-RT-7 / PR-5 intact).
  - **The `<html>` paint is never cleared; it follows the selection.** Nothing themes `<html>`/`<body>` today
    (`index.css:1-9` sets margin + height only); the only full-viewport paint is AppShell's own frame
    (`shell/app-shell.tsx:226`), and the router's first match suspends before it (`lazyRouteComponent`,
    `routes.tsx:59`). Clearing the inline styles at the provider's first commit would expose a white canvas in exactly
    that window. So a layout effect in `App` **rewrites the three styles from `toThemeHint(selection)` on every
    selection change** (the boot paint, then the live theme). The canvas therefore always matches the app's theme: under
    the boot frame, the router-suspend window, overscroll, and an in-session change. This needs no knowledge of
    Tamagui's runtime variable names (unverified, not relied on).
  - **Known limit, recorded:** with storage cleared, or after a change from another device (M4), the first boot frame is
    the browser default; the provider still mounts with the persisted theme (no default→persisted flip inside the app).
- **R3-BR-5 · Readers render from the seeded cache (F13).** `useHomeArrangement` reads `usePreferences().view.arrangement`.
  The router mounts only after the seed, so the first Home frame already has the persisted arrangement; on a failed seed
  it is the default `journalFirst` (PR-2), never blank chrome. `arrangement` leaves `preferences-store` and the bridge's
  `MIRRORED` list (10 fields remain; R6 deletes the store).
- **R3-BR-6 · Settings' honest states (D1, EC-7), on `usePreferences().state`:**
  - **loading** → the rail renders as normal; the pane is a skeleton per `state-conventions.md` §3.1 (a `Card`-shaped
    `$colorSurfaceSecondary` block of option-row-height bars, `$md` radius, static, `aria-busy` on the region).
  - **error** → every pane renders **read-only** over `view`: every `Select`/`Switch` gets `disabled`, rename is hidden,
    plus a calm `role="status"` line whose copy matches what is shown (`usePreferences` reports `error` even when it keeps
    data, `use-preferences.ts:48-54`):
    - **first-read error** (no data) → "Couldn’t load your saved settings — showing defaults, read-only. Your data is safe on
      this device." (EC-7's wording);
    - **later error** (the last good view is kept) → "Couldn’t refresh your settings — showing what was last loaded,
      read-only. Your data is safe on this device."

    `usePreferences` gains `hasData` so the surface can tell the two apart. This applies to all four editable panes,
    including the three still on the mirror (they only gain `disabled`). Disabled controls leave the tab order (native
    `disabled`), which is correct for a read-only state; the status line is the one focus-independent explanation.

    **Retry (rev 2.2)** — `state-conventions.md` §3: an error state is "an inline error + retry affordance … Retry calls
    React Query `refetch()` and re-enters `loading`". Below the status line: UI-1 `Button intent="secondary" size="lg"`
    (≥44, `standards/design.md:218` · `decisions.md:138`; the notifications/gamification error-view precedent), copy
    `SETTINGS_COPY.retry`. It calls `usePreferences().retry`, which refetches **only the errored key(s)**. First-read
    error → the pane goes to the skeleton, then success or the same error; later error → the kept view stays (data is
    defined, so no `pending`) until the refetch settles. Retry is never `disabled` — it is the one live control in the
    read-only state. A Retry **ends when its re-reads settle** (`retry()` resolves `true` only if every re-read succeeded):
    a later error that fails again never changes `state`, so the settle — not a `state` change — ends it, and a later
    unrelated refetch (the writer's invalidate) never moves focus. Each failed Retry re-keys the status line, so a repeat
    failure is re-announced (a later error's text would otherwise not change).
    - **Copy:** `SETTINGS_COPY.retry = 'Retry'` — the shipped wording (`App.tsx:102`, notifications/gamification error
      views); its accessible name is the label. It renders in the status block, **before the pane in DOM order**.
    - **Announcement:** the line stays `role="status"` (polite), not §3's `aria-live="assertive"` — the ratified
      error-text rule `decisions.md:162` ("muted `$colorTextMuted` + `role="status"`, the `Message` precedent") and the
      notifications/gamification error views; the one assertive failure announcement is the write toast (R3-BR-7).
    - **Focus:** pressing Retry on a first-read error unmounts the button with the status block (the pane becomes the
      skeleton), so focus is placed deliberately: on press → the skeleton region (`tabIndex=-1`, already labelled +
      `aria-busy`); on resolve → success: the pane region (`tabIndex=-1`, top of content, §3 success row); error again: the
      Retry button. Without a Retry press, no focus moves (§3: a same-surface refetch never steals focus).
    - **No unhandled rejection:** `retry()` fires `refetch()` without awaiting; `refetch` defaults to
      `throwOnError: false`, so it resolves with the error result, and the call adds `.catch(() => {})` as a guard.
  - **DEV gate hook** (off in prod; the `?force=` precedent, `gamification/use-currencies.ts:16,88`):
    `?force=prefs-read-error` makes the reads reject **from boot** (the seed included) → the first-read state;
    `?force=prefs-refetch-error` (rev 2.1) lets the first read per key succeed and rejects later ones → the "last loaded"
    state, reached live by one write's idle-invalidate; `?force=prefs-write-error` makes the writes reject. Parsed once at boot by `preferences/force-flag.ts` (a pure `parseForceFlag`, IMPL-PLAN rev 3 B2) and read by `writer-instance.ts` / `preferences-queries.ts`; it is a boot-time
    flag, not a render-time read, so the router-subscription rule doesn't apply.
  - **success** → the panes, editable.
  - Read-only reaches the panes through one `SettingsContext` (`{ readOnly, update }`) provided by the surface, so no pane
    threads props and R5/R6 plug into the same context.
- **R3-BR-7 · Save feedback (C5 UI half, EC-7).** The surface owns the one `useUpdatePreferences()` and shares `update`
  through `SettingsContext`, so one status reflects every pane.
  - **The shipped CODEC primitive, not a new line:** `<SyncStatus state="saved">` under the search box after a save,
    nothing before the first save. **On a failure the status clears** (rev 2.1, from the gate-2 critique): the assertive
    revert toast reports the failure once, so a polite `SyncStatus` error would announce it twice, and a stale "Saved"
    would be false. **No "Saving…" state:** writes are instant on-device,
    and the P4 copy-honesty contract says the indicator only ever says "Saved on this device" `[FACT:
    packages/ui/src/components/sync-status.tsx:7-10,20]`; fe-settings EC-7 pins the same (`envision.md:38`). While a save
    is pending the previous status simply stays.
  - **One revert toast per failed batch, fired by the writer, not the hook.** `writer-instance.ts` passes an
    `onFailed(table, error)` option that the writer calls from `onSettled` when `!outcome.ok`, which is exactly once per
    failed batch. It calls `toast({ intent: 'danger', title: 'Couldn’t save that change', description: 'It’s back to how it
    was. Your data is safe on this device.' })`. This is independent of which component is mounted (a save that fails after
    leaving Settings still reports, PR-4 "never silently dropped", `business-rules.md:39`) and of React batching the hook's
    `saveState`. It also covers every other writer (onboarding R7, R5, R6) with no further code. The revert itself is the
    writer's (R2-BR-4). `intent: 'danger'` routes to the assertive live region `[FACT:
    packages/ui/src/internal/toast-store.ts:21]`; `ToastProvider` is mounted `[FACT: App.tsx:141]`. First `toast()`
    caller in `apps/web`.
- **R3-BR-8 · Appearance persists (D6, D7, D10, D4).** preset → `dashboard_layout.theme` · mode → `theme` (light|dark only,
  D5) · density → `compact_mode` · arrangement → `dashboard_layout.arrangement` · persona → `persona`, each through
  `update(viewPatch)` (the R2 mapper + per-sub-key merge, so sibling sub-keys survive, IR-2). **Reduce motion stays on the
  mirror** until R4 (D8/D9 are R4's).
- **R3-BR-9 · The persona row (D4 MUST).** An Appearance `OptionRow` **directly under the three theme rows** (preset · mode ·
  density), per `interpretation.md:239`: label "Persona", description "Shapes the wording of rewards" (fe-gamification
  EC-10: persona drives reward copy only, never theming; plain wording because gamification is off by default, GM-1, and
  the live read lands with gamification-rescope, G3-E6). A `Select` over `Not set` + the 6 `PERSONA` values in title case
  `[FACT: packages/types/src/entities/user.ts:13-20]`. Plus a search-index entry (`id: 'persona'`, keywords: persona + the 6
  values). **No `game` anywhere:** N8's "the theme-preset keywords gain `game`" (`interpretation.md:112`) is superseded by
  D3/E9 (Victor 2026-10-21: `game` is a module, not a theme).
- **R3-BR-10 · One copy module (F17).** Every new user-facing string lives in `settings/settings-copy.ts`; a test runs
  `lintCopy` over every entry (no cloud/ZK claim, no dead end).

## 3. Design
| File | Change |
|---|---|
| `preferences/preferences-queries.ts` (new) | `userPreferencesQuery` / `navPreferencesQuery` (key + `queryFn` with the epoch/noteConfirmed reconcile) · `seedPreferences(qc)` (both `fetchQuery`, `retry: 0`, resolves on failure) · `retryOnMount: false` (rev 2.2) · reads the DEV force flag from `force-flag.ts` |
| `preferences/use-preferences.ts` | `usePreferences` uses the two definitions + returns `hasData` |
| `preferences/preferences-view.ts` | owns `HomeArrangement` (moved from the store as the field leaves; `preferences-store` re-exports nothing new) |
| `preferences/preferences-writer.ts` | `onConfirmed?(t, row)` (from `noteConfirmed`'s accept branch, `:168`, and `onSettled` when `outcome.ok`, `:125`) · `onFailed?(t, error)` (from `onSettled` when `!outcome.ok`) |
| `preferences/theme-hint.ts` (new) | `toThemeHint(selection)` (pure, the explicit `ThemeName` map) · `writeThemeHint(row)` (try/catch storage) · `paintRoot(hint)` (the three `<html>` styles) · the storage key |
| `preferences/writer-instance.ts` | wires `onConfirmed` → `writeThemeHint` (user table) · `onFailed` → the revert toast · the DEV `?force=prefs-write-error` hook |
| `index.html` | the inline hint script in `<head>`, right after the process shim |
| `stores/theme-store.ts` | derived: `{ persisted, previewPreset, selection }` + `setPreview(preset \| null)`; the one cache subscription (reads the current entry at install · `'removed'` → `THEME_DEFAULT`; no HMR dispose — IMPL-PLAN rev 3 B2 uses the house `process.env.NODE_ENV` + `typeof window` pattern) · `resetThemeStoreForTests()` |
| `App.tsx` | boot gate: `seedPreferences` as the third condition · `previewPreset` → `setPreview` · clear the preview when `guidedPhase` is `'none'` · a layout effect `paintRoot(toThemeHint(selection))` · stale comments (X5) |
| `settings/settings-context.tsx` (new) | `SettingsContext` `{ readOnly, update }` + `useSettings()`, **with a default** (editable + the writer-backed update) so a pane rendered alone (its own tests) still works |
| `settings/settings-surface.tsx` | the 3 states (two error strings), `SyncStatus`, the provider |
| `settings/settings-skeleton.tsx` (new) | the §3.1 pane skeleton |
| `settings/appearance-pane.tsx` | reads `usePreferences().view`, writes `update`; the persona row; reduce motion still on the mirror; `disabled` when read-only |
| `settings/{modules,locale,notifications}-pane.tsx` | `disabled` (and rename hidden) when read-only — no other change |
| `settings/settings-model.ts` | the `persona` index entry |
| `settings/settings-copy.ts` (new) | the copy module |
| `home/home-surface.tsx` | `useHomeArrangement` → the view |
| `stores/preferences-store.ts` · `preferences/preferences-bridge.tsx` | `arrangement` removed |

## 4. Acceptance
**Verification Gate (Vitest)**
1. **Seed:** success puts both keys in the cache before `App` renders the provider tree. A rejecting read resolves the seed;
   `App` leaves Loading (no stuck gate), the defaults render, and Settings shows `error` with no extra read (rev 2.2).
1b. **No refetch loop (rev 2.2):** after a failed first read, mounting readers (the surface + its panes, and a second
   `usePreferences` reader) leaves the fake's read count **flat** over time (sampled across ≥ 2 s). Retry → exactly one
   more read per errored key → `loading` → `success` when the fake recovers, or the same error copy. The second reader is
   `renderHook(() => usePreferences())` inside the same `QueryClientProvider`; Retry is found by
   `getByRole('button', { name: 'Retry' })`, enabled while every pane control is `disabled`; focus lands per R3-BR-6.
2. **Derived theme:** a seeded dark/dense/quietDesk row → `theme-store.selection` matches before the first provider render.
   `update({ selection: { preset } })` → `selection` changes synchronously (optimistic). A rejected write → `selection`
   returns to the confirmed value. A cache update while a preview is active leaves the preview in place.
3. **Hint:** written from an accepted read and from a successful batch; **not** written on enqueue; **not** written on a failed
   batch (optimistic dark → fail → the hint stays light). Blocked storage throws nowhere. The inline script, extracted from
   `index.html` and run in jsdom: a valid hint sets the three styles; a corrupt one sets nothing and does not throw.
   `App`'s layout effect repaints `<html>` on a selection change. Every `ThemeName` has a map entry (type-checked).
3b. **Preview:** preview → close (each of finish / skip / close) → `selection.preset` is the persisted one; then a Settings
   preset change → `selection.preset` changes. A cache update during an active preview leaves the preview in place.
4. **Settings states:** loading → skeleton + `aria-busy`; first-read error → every control `disabled` + the "showing
   defaults" line; later error (data kept) → `disabled` + the "last loaded" line; success → editable. A save →
   `SyncStatus` "Saved on this device" (no "Saving…" ever rendered). A rejected save → the control shows the reverted value.
4b. **Toast (writer):** one failed batch carrying two edits → exactly one toast; two failures in sequence → two toasts; a
   failure after the Settings surface unmounted → still one toast.
5. **Persona:** the row lists `Not set` + 6; choosing one writes `persona`; `Not set` writes `null`; search "persona" finds it.
6. **Home:** a seeded `dashboardFirst` → the **first** render is Dashboard-first, asserted with a render log (not `waitFor`,
   which would let a default-then-persisted flip pass).
7. **Copy:** `lintCopy` returns `[]` for every `settings-copy` entry.
8. **Regression:** apps/web suite green (reds triaged as in R1/R2, F008); `tsc` 0; eslint 0. Stub-asserting tests are updated
   to the live contract, never deleted (F1). Mutation check (≥3, each restored from a copy): drop the `outcome.ok` guard on
   the hint → test 3 fails; render the router before the seed settles → test 6 fails; skip the preview clear on close →
   test 3b fails.

**Visual Gate (real browser, the running app on real OPFS)**
9. **No flash (IR-4, EC-5 feel, fe-home EC-9), with a method proven able to fail.** An init script (Playwright
   `addInitScript`, runs before any page script) samples `getComputedStyle` background of `<html>` and `<body>` plus the
   first app frame's on **every `requestAnimationFrame`** from navigation until route content is visible, plus a
   performance trace with screenshots on reload. **Negative control first:** dark persisted, hint storage cleared → the
   method must record the light/white frame; if it can't, it proves nothing and the check is redesigned. Then with the
   hint: every sample through the boot frame **and the router-suspend window** is the persisted dark surface, with no
   default→persisted flip.
10. **Arrangement (fe-home EC-2):** persist `dashboardFirst` → reload → no Journal-first frame.
11. **States** (DEV `?force=` hooks): `?force=prefs-read-error` → boot completes, Settings shows the **first-read** read-only
    state + its line; a later-error case (read OK, then forced) → the "last loaded" line; a write → "Saved on this device";
    `?force=prefs-write-error` → the control reverts + one toast.
12. **Matrix:** Settings default / skeleton / read-only / saved / toast / persona open, × 3 presets × light/dark ×
    375/768/1440: AA text ≥ 4.5 (incl. warm-dark), graphics ≥ 3:1, axe 0, 0 overflow. EC-1, 2, 3, 4 (Appearance), 5, 7,
    10, 11 + the persona-row MUST. **Disabled controls are exempt from the contrast minimum** (WCAG 1.4.3 "inactive user
    interface components"; `Select`/`Switch` go to opacity 0.5, `select.tsx:82`, `switch.tsx:36`); the read-only status
    line itself must pass AA.
13. **Live persistence (ELC-7 preview):** change all five Appearance controls + persona → reload → all persisted; row count
    == 1; reopen Settings → no write (IR-1); console clean.
14. **Measured boot cost:** Loading duration **and** time-to-shell on `main` vs R3, 5 reloads each, at a recorded `uptime`.
15. Stage-4: Victor's recorded `visual-approved`.

**Docs (§XXIX, same commit):** `docs/modules/preferences/current-*` · web-client-runtime BR-RT-BOOT (the seed),
BR-RT-COMPROOT (eager at boot), BR-RT-7 (theme-store derived cache + the hint) · `preferences/CLAUDE.md` ·
`settings/CLAUDE.md` · `home/CLAUDE.md` · `stores` comments · reconciliation row status · X5 comments in every file touched.

## 5. Out of scope (owned elsewhere, unchanged)
Reduce motion persist + gating (R4) · Modules/⌘K persist (R5) · Locale/Notifications persist + the store's deletion (R6) ·
onboarding commit/revert + the `game` picker fix (R7) · the transition preference (R-T) · the live persona **read**
(gamification-rescope, G3-E6).

## 6. Risks
- **Eager boot cost (R3-BR-2):** measured in the gate. If it is material, the fallback is to seed only `user` (the theme
  table) and let `nav` load lazily. That would be a §XXVIII deviation, not a silent change.
- **Removing the theme setters** touches every caller: `App.tsx` (preview) and `appearance-pane.tsx`. Grep confirms no
  others before the edit.
- **Test blast radius:** `App.test` / `App.integration` (boot gate), `appearance-pane`, `settings-surface`, `home-surface`,
  `theme-store`, `guided-setup*` (preview), **and every test that renders `HomeSurface` or the router** (e.g.
  `routes.test.tsx`), since `useHomeArrangement` now needs the query provider + the composition-root mock. Tests that call
  `useThemeStore.setState({ selection })` (`settings-surface.test:24`, `appearance-pane.test:11`, `theme-store.test:6`) move
  to `resetThemeStoreForTests` / seeding the cache. Shared wrapper + `compositionRootMock()` (R2).
- **F007/LIF-250** (dev worker `open` timeout) can interrupt live checks: press Retry, re-run, record. Never measure the
  boot cost on a load the machine can't sustain; check `uptime` first.

## 7. Gate record
- **rev 2.2 (2026-10-26, Victor-approved):** build step 16's first-read-error test exposed an unbounded refetch loop; rev
  2.1's R3-BR-2 premise ("`useQuery` refetches once on mount") contradicted the library source and the governing
  `state-conventions.md` §3 (recovery = an explicit Retry → `refetch()`). Corrected to the doc: `retryOnMount: false` on
  both definitions + the §3 Retry affordance in R3-BR-6's error state + acceptance 1b. Not a departure from the docs — a
  PLAN line brought back to them. Second gate (independent critique + preflight): REVISE, 2 blocking — the polite
  announcement vs §3's assertive (resolved by the ratified `decisions.md:162` rule, now cited) · no Retry copy
  (`'Retry'`, the shipped wording) — + 5 nits (timing method, second reader, focus, DOM order/role query, unhandled
  rejection), all folded. Pre-ship /critique (independent): REVISE — 2 blocking (boot cost unmeasured on a quiet
  machine · reconciliation C8 listed two comments this diff fixed) + non-blocking folded: a failed later-error Retry
  left the Retry "pressed" so a later refetch stole focus (→ end on settle, mutation #5) · silent repeat failure (→
  re-keyed status line) · comment overstatement. Non-text contrast of the secondary-button fill / Select border
  (1.24–1.68) accepted under WCAG 1.4.11 (label 15.71 / chevron ≥ 4.94 identify them) → `decisions.md`.
- **Item 14 measured (2026-10-26, N6 / §XIII):** 10 interleaved cold reloads each (warm-up excluded), R3 vs its merge base
  `f796c34` (current `main` carries LIF-250's boot change, so it would not isolate R3), Vite dev server, Brave headless;
  load rose 12 → 63 during the run (interleaving exposes both sides equally). **Loading** median 3086 ms (p95 3381) vs
  3016 (3331) = **+70 ms (+50)**; **time-to-shell** 6766 (7026) vs 6721 (7091) = **+45 ms (−65)**. The eager seed costs
  ≈ 2 % of Loading, inside run-to-run spread → no rethink of the seed placement; the seed-only-`user` fallback (§6) is
  not triggered.
- **Stage 4 (item 15): Victor `visual-approved` 2026-10-26.**
- **rev 2.1 (gate-2 critique, at Approval 2):** `SyncStatus` clears on failure instead of showing `error` (no double
  announcement) · `?force=prefs-refetch-error` added (the later-error state was unreachable live).
- **rev 1 → independent critique: REVISE** (6 blocking, 14 nits). Folded:
  - B1 the preview layer was never cleared (EC-5 regression) → cleared on every exit; the finish-commit is R7's (stated
    interim); option (b) rejected (it would persist a skipped pick, E7).
  - B2 clearing the `<html>` paint at the provider's first commit exposed a white canvas in the router-suspend window →
    never cleared; it follows the selection (chosen over a `body` CSS-variable rule, which relied on unverified Tamagui
    variable names).
  - B3 "Saving…" contradicted the P4 copy contract and a hand-rolled line rebuilt `SyncStatus` → the primitive, saved|error.
  - B4 one read-only string was false on a later error, and the forced check only hit that path → two strings + `hasData`
    + a DEV `?force=prefs-read-error` that fails the boot read.
  - B5 the no-flash measurement couldn't be shown to fail → per-rAF sampling + a trace, with a negative control first,
    through the router-suspend window.
  - B6 "one toast per failed save" had no reliable trigger → fired by the writer per failed batch (`onFailed`).
  - Nits: persona placement + plainer copy + N8 superseded · subscription install/`removed`/HMR + a reset helper · the
    failed-seed path described exactly (+ the memoized build-failure limit) · boot cost framed as "moved before paint",
    time-to-shell measured · test 6 by render log · the wider blast radius · `HomeArrangement` moved · disabled-control AA
    exemption + tab order · the script in `<head>` · an explicit `ThemeName` map · a default for `useSettings()`.
  - The critique also confirmed: the `onConfirmed` hook is implementable exactly at `:125`/`:168`; `retry: 0` is needed;
    StrictMode shares the in-flight seed; IR-11 holds after a successful seed; the `<html>` theme class doesn't conflict
    with inline styles; hex values exist for all 8 themes; the arrangement readers are exactly three; scope is exact.
