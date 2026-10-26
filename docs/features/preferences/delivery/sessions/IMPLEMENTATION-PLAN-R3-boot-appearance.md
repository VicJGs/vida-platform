<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R3 · Boot + Appearance + honest states
     Implements PLAN-R3-boot-appearance.md rev 2 (Approval 1: Victor 2026-10-22). TDD-ordered. -->

# IMPLEMENTATION-PLAN-R3 — Boot + Appearance + honest states

> **Status:** rev 3.1, 2026-10-26 — implements PLAN-R3 **rev 2.2** (Victor-approved correction to `state-conventions.md` §3: `retryOnMount: false` + the Retry affordance; §Gate record). rev 3, 2026-10-22. Gate-2 critique REVISE (6 blocking, 15 nits) → folded (§Gate record). /preflight vs `docs/modules/preferences/current-business-rules.md` + web-client-runtime
> `current-business-rules.md`: 0 contradictions, 5 gaps → folded (§Preflight) → **PASSED**. Awaiting **Approval 2**.
> **Layers:** frontend + shared only. **No backend change, no schema change, no migration** (`persona` and every written
> column already exist, `schema/preferences.ts`; the ① service is consumed as-is).
> **Env:** worktree `preferences-rescope` @ `f796c34`, Node 24 (`PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"`).
> Check `uptime` before any suite; run suites with no dev server up (F008).
> **Imports:** `ThemeSelection`, `ThemePreset`, `ThemeName`, `THEME_DEFAULT`, `resolveTheme`, the 8 theme constants
> (`light` · `dark` · `light_reader` · `dark_reader` · `light_quietDesk` · `dark_quietDesk` · `light_game` · `dark_game`),
> `SyncStatus`, `toast` from `@vida/ui` · `PERSONA`, `MergedPreferences` from `@vida/types` · `queryClient` from
> `lib/query-client.ts` · `USER_PREFS_KEY`, `NAV_PREFS_KEY` from `preferences/preferences-keys.ts` · `hashKey` from
> **`@tanstack/react-query`** (it re-exports query-core; `@tanstack/query-core` is not a direct apps/web dependency and pnpm
> doesn't hoist it) · `getVariableValue` from `@tamagui/core`.

## Files (build order)
| # | File | Change |
|---|---|---|
| 0 | `test/preferences-test-utils.tsx` | the fake gains read knobs: `failReads: 'none' \| 'all' \| 'after-first'` + `readGate` (a deferred promise every read awaits until released) · `resetTestPreferences()` clears them |
| 0b | `settings/settings-copy.ts` (+ `settings-copy.test.ts`) | **created here, before step 4** (the toast copy is needed by `writer-instance`); every R3 string, `lintCopy` over all |
| 1 | `preferences/preferences-writer.test.ts` → `preferences-writer.ts` | `onConfirmed?(t, row)` + `onFailed?(t, error)` options (algorithms below). Existing 15 tests stay green |
| 2 | `preferences/theme-hint.test.ts` → `theme-hint.ts` (new) | `THEME_HINT_KEY = 'vida.theme-hint.v1'` · `toThemeHint(sel)` · `writeThemeHint(row)` · `paintRoot(hint)` · the `ThemeName` map |
| 3 | `preferences/preferences-queries.test.ts` → `preferences-queries.ts` (new) | `userPreferencesQuery()` / `navPreferencesQuery()` · `seedPreferences(qc)` · pure `parseForceFlag(search)` + the module-load read (DEV) |
| 4 | `preferences/writer-instance.ts` | wire `onConfirmed` (user → `writeThemeHint`), `onFailed` (→ the revert toast), and the DEV `?force=prefs-write-error` service wrapper |
| 5 | `preferences/use-preferences.ts` (+ test) | use the two definitions; return `hasData` |
| 6 | `preferences/preferences-view.ts` | own `HomeArrangement` (move the type; `preferences-store` keeps `TimeFormat`/`WeekStartsOn` until R6) |
| 7 | `stores/theme-store.test.ts` → `stores/theme-store.ts` | the derived store (algorithm below) · `resetThemeStoreForTests()`. The old setter tests are **rewritten** to the derived contract (F1), not deleted |
| 8 | `index.html` + `src/index-hint-script.test.ts` (new, jsdom docblock) | the inline `<script id="vida-theme-hint">` after the process shim; the test (under `src/`, vitest's include is `src/**/*.test.{ts,tsx}`, `vite.config.ts:28`) reads `../index.html` with `fs`, extracts the script **by id**, runs it in jsdom |
| 9 | `App.tsx` (+ `App.test.tsx`, `App.integration.test.tsx`) | seed gate · `setPreview` · clear the preview on `'none'` · the guarded `paintRoot` layout effect · X5 comments. **Both App test files gain the standard afterEach reset** (`queryClient.clear()` · `resetPreferencesWriterForTests()` · `resetTestPreferences()` · `resetThemeStoreForTests()`): with a 5 min stale time a cached seed would otherwise make Loading tests order-dependent |
| 10 | (moved to 0b) | — |
| 11 | `settings/settings-context.tsx` (new) · `preferences/use-preferences.ts` | `SettingsContext` + `useSettings()`. The default can't hold a hook, so the body of `useUpdatePreferences().update` is pulled into an exported module function `updateView(patch)` (no React state); the hook wraps it with `saveState`, and the context default is `{ readOnly: false, update: updateView }` |
| 12 | `settings/settings-skeleton.tsx` (new) | the §3.1 pane skeleton |
| 13 | `settings/appearance-pane.tsx` (+ test) | the view + `update`; the persona row under the theme rows; reduce motion still on the mirror; `disabled` when read-only |
| 14 | `settings/{modules,locale,notifications}-pane.tsx` (+ tests) | `disabled` / rename hidden when `useSettings().readOnly` |
| 15 | `settings/settings-model.ts` (+ search test) | the `persona` index entry |
| 16 | `settings/settings-surface.tsx` (+ test) | the 3 states · two error strings · `SyncStatus` · the provider |
| 17 | `home/home-surface.tsx` (+ test) | `useHomeArrangement` → `usePreferences().view.arrangement` |
| 18 | `stores/preferences-store.ts` (+ test) · `preferences/preferences-bridge.tsx` (+ test) | remove `arrangement` (10 mirrored fields remain) |
| 19 | tests touched by the boot/derivation change | **`routes.test.tsx`** + **`session-hud/session-hud-surface.test.tsx`** (both render the real router at `/` → HomeSurface on a per-test client): add `compositionRootMock({ notes: … })` as `App.integration.test.tsx:14-16` does (no singleton wrapper needed) · **`home/home-surface.test.tsx`** + **`settings/appearance-pane.test.tsx`** (render with no `QueryClientProvider`; `useHomeArrangement`/`usePreferences` now need it): the wrapper + mock · **`settings/settings-surface.test.tsx:50-108`** (~9 tests query the pane right after render and would hit the skeleton): seed the cache in `beforeEach` · `onboarding/guided-setup*.test.tsx` (preview) · every `useThemeStore.setState` caller (`settings-surface.test:24`, `appearance-pane.test:11`, `theme-store.test:6`) |
| 20 | docs (§XXIX) | per PLAN-R3 §4 "Docs" **+ `onboarding/CLAUDE.md:31,36`** (the preview now reverts on every exit; `:36`'s "local `useState`… no persistence layer" is stale) |

## Key algorithms
**Writer hooks (`preferences-writer.ts`, step 1)**
- `noteConfirmed(t, read, epochAtStart)`: when the accept branch runs (`epochs[t] === epochAtStart || confirmed[t] ===
  undefined`), assign `confirmed[t] = read`, then call `onConfirmed?.(t, read)`. A rejected (stale) read does **not** call it.
- `onSettled(outcome, …)`: if `outcome.ok`, assign `confirmed[t] = outcome.value`, then `onConfirmed?.(t, outcome.value)`;
  else call `onFailed?.(t, outcome.error)` **once** (one settle = one batch). Then the existing pending-drop + `syncCache` +
  idle-invalidate, unchanged.
- Each hook call is wrapped in its own `try/catch` (a throwing hook must never break the cache sync — the
  best-effort-side-effect rule). The outcome's error is passed through `classify` so `onFailed` gets a `PreferencesWriteError`.
- Never called from `write()` (enqueue) or `syncCache`.

**Theme hint (`theme-hint.ts`, step 2)**
- **The theme values are Tamagui `Variable` objects, not strings** (`themes/tokens.ts:4` `createTokens` wraps every leaf
  via `createVariable({ val, … })`; the type is `Variable<string>`). So: `const THEMES: Record<ThemeName, { colorSurfacePrimary:
  Variable<string>; colorTextPrimary: Variable<string> }> = { light, dark, light_reader, dark_reader, light_quietDesk,
  dark_quietDesk, light_game, dark_game }` (a missing name fails `tsc`), and the hex is read with
  `getVariableValue(v)` from `@tamagui/core` (→ `.val`). Never stringify the object (it would serialize to `{…}` and the
  inline regex would silently reject every hint).
- `toThemeHint(sel) = { scheme: sel.mode, bg: getVariableValue(THEMES[name].colorSurfacePrimary), fg:
  getVariableValue(THEMES[name].colorTextPrimary) }`, `name = resolveTheme(sel).themeName`. The test asserts `bg`/`fg`
  match `/^#[0-9a-f]{6}$/i` for **all 8 names** (the extracted value, not the object).
- `writeThemeHint(row: MergedPreferences)`: `toThemeHint(toView(row, NAV_PREFERENCES_DEFAULTS).selection)` →
  `localStorage.setItem(KEY, JSON.stringify(hint))` in `try/catch` (blocked storage = no-op).
- `paintRoot(hint)`: sets `documentElement.style.backgroundColor`, `.color` and `.colorScheme`.

**Inline script (`index.html`, step 8)** — after the process shim, inside `<head>`:
```html
<script id="vida-theme-hint">
  try {
    var h = JSON.parse(localStorage.getItem('vida.theme-hint.v1') || 'null')
    if (h && /^#[0-9a-f]{6}$/i.test(h.bg) && /^#[0-9a-f]{6}$/i.test(h.fg) && (h.scheme === 'light' || h.scheme === 'dark')) {
      var s = document.documentElement.style
      s.backgroundColor = h.bg; s.color = h.fg; s.colorScheme = h.scheme
    }
  } catch (e) {}
</script>
```
The key string is duplicated (the script can't import); `index-hint-script.test.ts` asserts it equals `THEME_HINT_KEY`,
so the two can't drift. jsdom normalizes `#FBFBFA` to `rgb(251, 251, 250)` on readback, so the test compares normalized
values; jsdom supports `colorScheme`.

**Queries + seed (`preferences-queries.ts`, step 3)**
- `userPreferencesQuery()` → `{ queryKey: USER_PREFS_KEY, queryFn }` with the current `use-preferences.ts:34-38` body
  moved verbatim (epoch → read → `noteConfirmed`). Same for nav.
- **DEV flag, the house pattern** (`gamification/use-currencies.ts:85-91`; `import.meta.env` is untyped in apps/web — no
  `vite/client` reference — so it is not used): `parseForceFlag(search): 'prefs-read-error' | 'prefs-refetch-error' |
  'prefs-write-error' | null` is **pure** (unit-tested over strings). The module-load read is `process.env.NODE_ENV !==
  'production' && typeof window !== 'undefined' ? parseForceFlag(window.location.search) : null` (the `window` guard
  keeps node-env tests that import the module safe). Behaviour in the read `queryFn`:
  - `prefs-read-error` → every read rejects (`Error('forced: prefs-read-error')`), the seed included → the **first-read**
    error state.
  - `prefs-refetch-error` → the **first** read per key succeeds, later reads reject. Driven live by one write: the writer's
    idle-invalidate (`preferences-writer.ts:129`) refetches, the refetch rejects, the data is kept → the **"last loaded"**
    state (PLAN §4.11's later-error case, otherwise unreachable live).
  - `prefs-write-error` → read by `writer-instance.ts`'s service wrapper; writes reject inside the queue's `write`, so the
    writer still classifies them (`'unknown'`).
- `seedPreferences(qc)`: `await Promise.allSettled([qc.fetchQuery({ ...userPreferencesQuery(), retry: 0 }),
  qc.fetchQuery({ ...navPreferencesQuery(), retry: 0 })])`. Never rejects.

**Derived theme store (`theme-store.ts`, step 7)**
- State: `persisted: ThemeSelection` · `previewPreset: ThemePreset | null` · `selection: ThemeSelection` (derived:
  `preview ? { ...persisted, preset: preview } : persisted`) · `setPreview(p | null)`.
- `syncFromCache()`: `const row = queryClient.getQueryData<MergedPreferences>(USER_PREFS_KEY)`; `persisted = row ?
  toView(row, NAV_PREFERENCES_DEFAULTS).selection : THEME_DEFAULT`; recompute `selection`. Set only when it **changed**
  (shallow compare), so an unrelated user-row field change causes no `UIProvider` re-render.
- Install: call `syncFromCache()` once, then `queryClient.getQueryCache().subscribe((e) => { if (e.query.queryHash ===
  hashKey(USER_PREFS_KEY)) syncFromCache() })` (listeners run synchronously inside `notifyManager.batch`, so a
  `setQueryData` updates the theme in the same tick — the EC-5 instant path). Removal (`queryClient.clear()`) emits
  `removed`; `syncFromCache` then reads `undefined` → `THEME_DEFAULT`. **No HMR dispose** (`import.meta.hot` is untyped
  here; a stacked dev-only subscription is idempotent because `syncFromCache` sets only on change — recorded, not fixed).
- `resetThemeStoreForTests()`: `previewPreset = null`, `syncFromCache()`.

**App (step 9)**
- `const [prefsSeeded, setPrefsSeeded] = useState(false)`; an effect on `dbReady`: `seedPreferences(queryClient).then(() =>
  active && setPrefsSeeded(true))`. The Loading condition becomes `!dbReady || !prefsSeeded || firstRun.status ===
  'resolving'`.
- `previewPreset = useCallback((p) => setPreview(p), …)`; `useEffect(() => { if (guidedPhase === 'none') setPreview(null) },
  [guidedPhase])` — **also above the early returns** (every App hook already is).
- `useLayoutEffect(() => { if (prefsSeeded) paintRoot(toThemeHint(selection)) }, [prefsSeeded, selection])`, declared
  **before** the early returns (Rules of Hooks). **Guarded on `prefsSeeded`:** before the seed settles `selection` is still
  `THEME_DEFAULT`, so an unguarded paint would overwrite the inline hint's dark paint with light during Loading, the exact
  flash R3 removes (self-review catch, rev 1). Until the seed settles, the inline script's paint stands; after it, the
  canvas follows the persisted (or, on a failed seed, the default) selection. Test: a dark hint + a pending seed →
  `<html>` stays dark; the seed resolves dark → still dark; resolves to a failure → default.

**Settings surface (step 16)**
- `const { view, state, hasData } = usePreferences()`; `const save = useUpdatePreferences()`;
  `readOnly = state === 'error'`. **`hasData` = both `user.data` and `nav.data` defined** (if only one table kept data,
  "showing what was last loaded" would be partly false, so it falls to the "showing defaults" line).
- The pane slot: `loading` → `<SettingsSkeleton/>`; otherwise the pane (or search results) inside
  `<SettingsContext.Provider value={{ readOnly, update: save.update }}>`. On `error`, the status line above the pane:
  `hasData ? copy.readErrorKept : copy.readErrorDefaults`, then the **Retry** button (rev 3.1): `Button intent="secondary"
  size="lg"` labelled `copy.retry`, `onPress={retry}`, outside `SettingsContext` (never read-only).
- `usePreferences` gains `retry(): void` (rev 3.1) — `refetch()` on each query whose `isError` is true (only the errored
  key(s); a healthy key is not re-read). Both definitions in `preferences-queries.ts` set `retryOnMount: false` so a
  mounting reader never refetches an errored query (PLAN R3-BR-2 rev 2.2); `seedPreferences` spreads the definition, so
  the seed inherits it harmlessly (`fetchQuery` ignores it).
- `SyncStatus`: `save.saveState === 'saved'` → `state="saved"`; otherwise not rendered, except that the last "saved"
  holds while a later save is `saving` (a ref). **On `error` the status is cleared, not set to `error`:** the failure is
  reported once, by the assertive toast (R3-BR-7), so a polite `SyncStatus` error would announce the same failure twice,
  and a stale "Saved" would be false. Use its **default copy** ("Saved on this device" /
  "Couldn't save on this device", `sync-status.tsx:67`) and **don't wrap it in another live region**: it already carries
  `role="status"` + `aria-live="polite"` (`:70`), so a wrapper would announce twice.

**Revert toast (step 4)** — `onFailed: () => toast({ intent: 'danger', title: copy.saveFailedTitle, description:
copy.saveFailedBody })`. The copy lives in `settings/settings-copy.ts` (created at step 0b; imports nothing, so no cycle).
`toast-store` is module-level and queues until `ToastProvider` renders. **Stated:** one `update()` spanning both tables that
fails would toast twice (one per table batch). In R3 no control writes both tables (reduce motion stays on the mirror until
R4), so it can't happen yet; R4 revisits it.

## Build Steps (TDD — each: write the test, see it fail, implement, see it pass)
0. Test-util read knobs (`failReads`, `readGate`, reset) + `settings-copy.ts` with its `lintCopy` test.
1. Writer hooks + tests: accept read → `onConfirmed`; stale read → none; ok batch → `onConfirmed`; **failed batch →
   `onConfirmed` spy `not.toHaveBeenCalled()`** (the kill target of mutation #1) and `onFailed` once (two edits in one batch →
   once; two failing batches → twice); enqueue → neither; a throwing hook → the cache still syncs.
2. `theme-hint` + tests: hex shape for all 8 names; write from a row; blocked storage → no throw; `paintRoot` sets 3 styles.
3. `preferences-queries` + tests: seed fills both keys; a rejecting read (`failReads: 'all'`) → the seed resolves, both
   queries in error; `retry: 0` (one call per key); `parseForceFlag` over strings; `after-first` semantics.
4. `writer-instance` wiring + a test with a fake service: a failed write → one `toast` call (spy) with the copy; a successful
   write → `localStorage` hint updated; an optimistic write that then fails → the hint unchanged.
5. `use-preferences`: switch to the definitions; extract `updateView`; `hasData` true after a success then a refetch error,
   false when only one table has data. Refetch waits use `waitFor(…, { timeout: 3000 })` (the singleton's `retry: 1` adds a
   1000 ms retry delay, past `waitFor`'s 1000 ms default).
6. Move `HomeArrangement`.
7. Theme store: seeded row → `selection`; a writer `update({ selection: { preset } })` → `selection` changes **synchronously**
   (PLAN §4.2); a rejected write → `selection` returns to the confirmed value; `removed` → default; preview layer over a
   cache update; `setPreview(null)` → persisted. *(`tsc` is red from here until step 13 — the removed setters are still
   called by `App` and the Appearance pane; no green claim in between.)*
8. `index.html` script + test: valid → 3 styles; corrupt/missing/invalid hex → nothing, no throw; key equals `THEME_HINT_KEY`.
9. App (with the afterEach reset): the gate holds Loading while `readGate` is closed; a rejecting seed (`failReads: 'all'`)
   → the app leaves Loading and Settings reaches `error` (`timeout: 3000`); **guarded paint:** a dark hint painted + the
   seed pending → `<html>` stays dark, resolves dark → dark, resolves to a failure → default; **preview, each exit** —
   finish, skip and close each return `selection.preset` to the persisted one, and then a Settings preset change moves it
   (PLAN §4.3b); **the first-render kill target of mutation #2:** persist `dashboardFirst` in the fake, `vi.mock` wrap
   `./home/home-surface` (imported directly by `routes.tsx:17`) to log the arrangement on every render, render `App`, and
   assert the **first** logged entry is `dashboardFirst`.
10–12. (copy at 0b) · context (+ `updateView` default) · skeleton.
13–15. Appearance (5 controls write through `update`; persona row order + `Not set` → `null`, **asserted through the real
   `UpdatePreferencesSchema`** so `null` is proven accepted, `PersonaSchema.nullable()`, `validators/user.ts:75`;
   read-only disables all), the
   three panes' `disabled`, the persona index entry (search "persona" finds it).
16. Surface: loading → skeleton + `aria-busy`; first-read error vs kept-data error strings; `SyncStatus` "Saved on this
   device" after a save, cleared on a failure; **a rejected save (`failNext`) → the control shows the reverted value** (PLAN
   §4.4) and one toast. (A "no 'Saving…' text" assertion is kept as a regression guard only: `LocalSyncState` is
   `saved | error`, so it can't target a bug.)
16b. (rev 3.1) **Loop guard + Retry**, TDD: (a) `preferences-queries` — both definitions carry `retryOnMount: false`;
   (b) surface — set `failReads = 'all'` and `await seedPreferences(queryClient)` first (`retry: 0` → a deterministic
   error, no global-`retry: 1` delay), then render the surface + a second reader (`renderHook(() => usePreferences())`,
   same provider), sample `testPreferences.state.reads`, `await new Promise((r) => setTimeout(r, 2100))`, sample again
   → equal; see it FAIL first on the current code (the loop), then pass with the flag; (c) Retry: one more read per errored key → skeleton → editable when `failReads` is reset, or
   the defaults copy again when it isn't; Retry is enabled while every pane control is `disabled`; a later-error Retry
   re-reads only the errored key; focus → skeleton on press, → pane region on success, → Retry on a repeat error;
   Retry via `getByRole('button', { name: 'Retry' })`, before the pane in DOM order; `waitFor` timeouts ≥ 3000;
   (d) `settings-copy` `retry: 'Retry'` passes `lintCopy`. Also correct the stale header comment
   at `preferences-queries.ts:9`. Mutation #4: drop `retryOnMount: false` → (b) fails.
17. Home (component level): a seeded `dashboardFirst` → the first render is Dashboard-first (the App-level kill target is
   step 9).
18. Remove `arrangement` from the store + bridge; the bridge test asserts 10 mirrored fields.
19. Fix the listed tests to the live contract (F1). `tsc` 0, eslint 0.
20. Mutation checks (each restored from a copy, never `git checkout --`), each with its named kill target: drop the
   `outcome.ok` guard on `onConfirmed` → step 1's failed-batch `not.toHaveBeenCalled` · render the router before the seed
   settles → step 9's first-render log · skip the preview clear → step 9's exit tests · (rev 3.1) drop
   `retryOnMount: false` → step 16b(b)'s flat-read guard.
21. Targeted suites → full apps/web suite (quiet machine) → triage reds as in R1/R2.
22. **Live:** dev server on an isolated origin; the Visual Gate per PLAN-R3 §4 items 9–15 (negative control first for item 9;
   item 11's later-error state via `?force=prefs-refetch-error` + one write).
23. Docs (§XXIX) in the same commit; `/critique` on the diff; Victor `visual-approved`; commit.

## Preflight (rev 1 → rev 2)
Checked against `docs/modules/preferences/current-business-rules.md` (BR-PREF-1…10, the ② seam rules), the feature
`business-rules.md` (PR-2/4/5, the Settings load table `:32`, the revert rule `:39`), and web-client-runtime
`current-business-rules.md` (BR-RT-1…11, BOOT, COMPROOT, PREFS, LOCK). **0 contradictions.** Verified on disk, not
assumed: `hashKey` exported by `@tanstack/query-core` 5.101.4 (`build/modern/index.d.ts:25`) · `SyncStatus` props
`{ state, label? }` + its own live region (`sync-status.tsx:56-75`) · `persona` nullable (`validators/user.ts:75`).
Gaps folded:
1. **Arrangement on a failed seed** (F13): Home renders `journalFirst`, and a later successful refetch can flip it to a
   persisted `dashboardFirst` — the same recorded limit as the theme's failed-seed path (PLAN-R3 R3-BR-2), now stated for
   both. Never blank chrome (PR-2).
2. **Persona `null`** proven through the real schema (step 13), not only the mapper.
3. **BR-RT-7 amendment, explicit:** besides the PR-5 `theme-store` exemption, the hint is a *device-local paint cache*
   in `localStorage` — derived from SQLite, written only from confirmed rows, read only by the pre-React script, never by
   the app. It is the one cross-session value outside SQLite, and the doc must say so, so it can't become a precedent.
4. **Layers stated:** no backend, no schema, no migration (header).
5. **`SyncStatus` live region:** use it bare (no double announcement).

Assumptions that remain (each is checked by a named test, so none survives to the browser unverified): the 8 theme
tokens resolve to `#rrggbb` literals (step 2) · a `setQueryData` on the user key emits a query-cache event for the
subscription (step 7) · `fetchQuery` with `retry: 0` makes one call per key (step 3).

**VERDICT: PASSED** — all layers specified.

## Gate record
- **rev 3.1 (2026-10-26, Victor-approved, PLAN-R3 rev 2.2):** step 16 exposed the refetch loop (query-core 5.101.4
  `shouldLoadOnMount` + `fetchState` reset to `pending`); the plan's refetch-on-mount recovery contradicted
  `state-conventions.md` §3. Added step 16b + mutation #4; the surface design gains Retry + `usePreferences().retry`.
  Second-gate critique REVISE (2 blocking: announcement politeness → `decisions.md:162`; Retry copy → `'Retry'`) + 5
  nits → folded (PLAN rev 2.2 §7). Pre-ship /critique REVISE → folded: `retry(): Promise<boolean>`; the surface ends a
  Retry on settle (failure focus via a `failedRetries` effect) and re-keys the status line; +2 tests; mutation #5 (drop
  the end-on-failed-settle) → the focus-leak test fails.
- rev 1 → /preflight: 5 gaps folded → PASSED (rev 2).
- **rev 2 → gate-2 critique: REVISE** (6 blocking, 15 nits) → rev 3. Folded:
  - B1 theme values are Tamagui `Variable`s (`tokens.ts:4` `createTokens`) → typed `Variable<string>`, read via
    `getVariableValue`; the hex-shape test covers all 8 extracted values. (Verified on disk before folding.)
  - B2 `import.meta.env`/`.hot` untyped + an unguarded `window` read at module load → the house
    `process.env.NODE_ENV` + `typeof window` pattern, a pure `parseForceFlag`, no HMR dispose. (Verified.)
  - B3 the later-error state was unreachable live → `?force=prefs-refetch-error` driven by one write.
  - B4 two mutation checks would survive → kill targets named: the failed-batch `onConfirmed` spy; an App-level
    first-render log.
  - B5 no seed seam + App tests not isolated → fake read knobs, the afterEach reset in both App tests, `timeout: 3000`.
  - B6 build-order inversion → `settings-copy.ts` moved to step 0b.
  - Nits: `hashKey` from `@tanstack/react-query` · the hint script by id, under `src/`, jsdom-normalized compare ·
    `updateView` as the context default · `hasData` = both tables · `session-hud-surface.test` + the 3 other unnamed
    breakers · the missing acceptance mappings (§4.2 sync/revert, §4.3b exits, §4.4 revert) · preview-clear above the
    returns · tsc red 7→13 stated · two-table double toast stated (unreachable in R3) · polite `SyncStatus` error dropped
    (the toast reports once) · `onboarding/CLAUDE.md` added to Currency · the "no Saving…" guard reclassified.
  - The critique confirmed sound: the writer hook points + outcome shape; query-core sync notify, `removed` on `clear`,
    default `hashKey`, `retry: 0`, shared in-flight fetch; no import cycles; toast works pre-provider; `ThemeName` is the
    exact 8; App hook order + Retry + onboarding branch; the write-error wrapper is still classified; full §3 coverage.
