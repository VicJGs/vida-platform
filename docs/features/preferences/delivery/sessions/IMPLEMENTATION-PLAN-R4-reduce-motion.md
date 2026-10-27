<!-- IMPLEMENTATION-PLAN (§XXVI gate 2) — preferences-rescope · slice R4 · Reduce motion, end to end
     Implements PLAN-R4 rev 2 (Approval 1: Victor 2026-10-26, incl. §XXVIII D-R4-1). Worktree @ c09346c (main merged). -->

# IMPLEMENTATION-PLAN-R4 — Reduce motion, end to end

> **Status:** rev 2, 2026-10-26 — **Approval 2 given (Victor), incl. D-R4-2/3/4.** /preflight PASSED; independent critique REVISE (2 blocking, 5 folds, 12 nits), all folded
> in. **Three §XXVIII items for Victor at Approval 2: D-R4-2 · D-R4-3 · D-R4-4** (below).
> **Runtime:** run every suite on **Node ≥ 22** (`.nvmrc` = 22; this machine uses `~/.nvm/versions/node/v24.17.0`). The
> shell default here is v20.20.2, where jsdom/undici fails to load (`markAsUncloneable is not a function`).
> **Verified against:** React 19.2.4 (installed; `useSyncExternalStore` subscribes in a passive effect,
> `react-dom-client.development.js:8144`; context is read during render) · sigma 3.0.3 (`settings.d.ts:42-48`:
> `inertiaDuration` · `zoomDuration` · `doubleClickZoomingDuration`, all `number` ms) · vitest 3.2 (per-file
> `// @vitest-environment jsdom`; `packages/ui/vite.config.ts` pins `node`).

## §XXVIII — deviations from PLAN-R4 rev 2 wording (Victor, Approval 2)
- **D-R4-2 · `clearCodec` does NOT remove the attribute** (PLAN R4-BR-3(a) said it would). `clearCodec` is the cleanup of
  the `[preset, density]` effect `[FACT: packages/ui/src/provider.tsx:160-168]`, so React runs it on **every theme swap**,
  not only on unmount. If it removed `data-vida-motion`, a preset or density change with the preference on would leave
  `<html>` without the attribute, because the `[reduceMotion]` effect doesn't re-run. The CSS twins would go off while the
  JS context stays `true`, breaking EC-7. **Instead,** the motion effect's own cleanup removes the attribute, which covers
  unmount and is idempotent, and `clearCodec` stays as it is. The intent is unchanged (attribute set from the prop,
  gone on unmount). Mutation (b) is retargeted, and a new provider case guards the swap path (step 4).
- **D-R4-3 · Graph camera durations are `1` ms, not `0`, plus `inertiaRatio: 0`** (PLAN R4-BR-8 said `0`). sigma 3.0.3
  computes `t = (Date.now() - start) / options.duration` and runs the first frame synchronously
  `[FACT: sigma.esm.js:199]`. Duration `0` in the same millisecond gives `0/0 = NaN`, so the camera state is NaN for one rAF
  frame, a blank WebGL frame on every wheel tick, double-click and release. With `1`, the first frame renders the start
  (`t = 0`) and the next the end (`t ≥ 1`): instant, and numerically safe. `inertiaRatio: 0` stops a pan from jumping
  by the inertia delta on release (`sigma.esm.js:595-596`). This is the same intent: an instant state change (motion.md
  §Reduced Motion).
- **D-R4-4 · Acceptance 5's "per-file identical declarations" check → a stronger guard.** After conversion, no
  non-allow-listed file may contain `prefers-reduced-motion` at all. Only the helper can emit it. That catches a
  half-converted module (one group through the helper and one hand-written, which `toContain('reducedMotionCss(')` would
  miss). Identical declarations then hold by construction: one `body` feeds both rules (step 1's unit test). Re-reading
  each module's injected text would need jsdom plus per-module flag resets (`internal/dialog-styles.ts:12-16`) for no
  extra guarantee.

## Files (build order)
| # | File | Change | PLAN |
|---|---|---|---|
| 1 | `packages/ui/src/internal/reduced-motion-css.ts` (new) | `MOTION_ATTR = 'data-vida-motion'` · `MOTION_REDUCE = 'reduce'` · `MOTION_FULL = 'full'` · `reducedMotionCss(selectors: readonly string[], declarations: string): string` | BR-4 |
| 2 | `packages/ui/src/internal/reduced-motion-css.test.ts` (new) | helper output · the glob guard | acc. 5 |
| 3 | the 12 gate modules (`dialog` · `interaction` · `switch` · `tabs` · `menu` · `sync-status` · `card` · `popover` · `toast` · `select` · `checkbox` `-styles.ts` · `calendar-motion.ts`) | the `@media` string → `reducedMotionCss([...], '...')` with the same selectors + declarations | BR-4 |
| 4 | `packages/ui/src/hooks/use-reduced-motion.ts` | `ReducedMotionContext` (default `false`) + the hook | BR-5 |
| 5 | `packages/ui/src/hooks/use-reduced-motion.test.tsx` (new, jsdom) | acc. 4 | acc. 4 |
| 6 | `packages/ui/src/provider.tsx` | `reduceMotion?` prop (destructured, default `false`, so it never reaches `TamaguiProvider` via `{...rest}`) · `<ReducedMotionContext.Provider>` · its own `[reduceMotion]` layout effect whose cleanup removes `MOTION_ATTR` · `clearCodec` **unchanged** (D-R4-2) | BR-3 |
| 7 | `packages/ui/src/provider.test.tsx` (new, jsdom) | acc. 3 | acc. 3 |
| 8 | `packages/ui/src/components/neural-graph.tsx` + its test | when `reduced`: `zoomDuration: 1` · `doubleClickZoomingDuration: 1` · `inertiaDuration: 1` · `inertiaRatio: 0` (D-R4-3); otherwise `{}` · the `:50` comment reworded | BR-8, acc. 6 |
| 9 | `pnpm --filter @vida/ui build` | dist for apps/web | §6 |
| 10 | `apps/web/src/shell/shell-panel-styles.ts` + `shell-panel-styles.test.ts` (new, `// @vitest-environment jsdom`: apps/web defaults to `node`, `vite.config.ts:27`) | the hand-written twin + its literal check | BR-4, acc. 5 |
| 11 | `apps/web/src/stores/theme-store.ts` + test | `reduceMotion: false` in the interface + initial state · `syncMotionFromCache()` at module load **and** in the reset helper · the subscription branch | BR-2, acc. 2 |
| 12 | `apps/web/src/App.tsx` + `App.integration.test.tsx` | pass the prop · the seeded-nav case | acc. 7 |
| 13 | `apps/web/src/settings/appearance-pane.tsx` + `appearance-pane.test.tsx` · `settings-surface.test.tsx` | the switch on the seam · the `usePreferencesStore` import dropped (`noUnusedLocals`) · the revert case lives in `settings-surface.test.tsx` (it has the toast spy + `failNext`, `:7-9,182-192`) | BR-1, acc. 1 |
| 14 | `apps/web/src/stores/preferences-store.ts` · `preferences/preferences-bridge.tsx` + tests: `preferences-store.test.ts:7,13-22,27` (swap the "untouched key" canary) · `preferences-bridge.test.tsx:20,36,39` ("10 fields" → 9) · `appearance-pane.test.tsx:25,105-108` (the "still binds the transitional store" case → the seam case) · `settings-surface.test.tsx:34` | `reduceMotion` removed (9 mirrored). apps/web tsc includes tests (`tsconfig.json` `include: ["src"]`), so every one must change in the same step | BR-1, acc. 8 |
| 15 | docs: PLAN §3 Docs rows **plus** `apps/web/src/settings/CLAUDE.md:72,75` · `packages/ui/src/CLAUDE.md:470,740` · the hook JSDoc (`use-reduced-motion.ts:3-14`: two triggers + "new gates use the helper") | §XXIX currency | — |

## Key algorithms
**1 · `reducedMotionCss`**
```ts
export const MOTION_ATTR = 'data-vida-motion'
export const MOTION_REDUCE = 'reduce'
export const MOTION_FULL = 'full'
const TWIN = `[${MOTION_ATTR}="${MOTION_REDUCE}"]`

/** B12 gate: the OS query OR the in-app preference. Same declarations in both rules, so they can't drift. */
export function reducedMotionCss(selectors: readonly string[], declarations: string): string {
  const body = `{${declarations}}`
  return (
    `@media (prefers-reduced-motion: reduce){${selectors.join(',')}${body}}` +
    `${selectors.map((s) => `${TWIN} ${s}`).join(',')}${body}`
  )
}
```
- The spaced form `prefers-reduced-motion: reduce` is kept for every module. `calendar-motion.test.tsx:96` asserts it,
  and the 8 unspaced modules (dialog · switch · tabs · menu · popover · toast · select · checkbox) change form, not
  meaning. Calendar's `:95` `not.toMatch(/width|height|top|left|color/)` also holds on the helper output.
- **Multi-rule gates:** `tabs` and `toast` put several rules in one `@media` block with different declarations
  (`tabs-styles.ts:35`: indicator `transition:none` + panel `animation:none`; `toast-styles.ts:35`: three rules). They
  become one `reducedMotionCss` call per declaration group, so each pair stays identical.

**2 · The glob guard** (`reduced-motion-css.test.ts`, node env)
```ts
const SRC = fileURLToPath(new URL('..', import.meta.url))           // packages/ui/src
const ALLOW = new Set(['hooks/use-reduced-motion.ts', 'internal/reduced-motion-css.ts'])
const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.(test|stories)\./.test(f) && !ALLOW.has(f))
for (const f of files) {
  const src = readFileSync(join(SRC, f), 'utf8')
  expect(src, f).not.toContain('prefers-reduced-motion')   // D-R4-4: only the helper may emit it
}
```
Identical declarations hold by construction (D-R4-4). Verified: `readdirSync` recursive on darwin yields `/`-separated
paths (`hooks/use-reduced-motion.ts`), and the only non-gate source mentions are `neural-graph.tsx:50` (reworded) and
`provider.tsx:161` (re-worded to "reduced motion" at build, so the provider is scanned too — pre-ship critique nit 4).
`neural-graph.tsx`'s JSDoc mentions `prefers-reduced-motion` (`:50`). It is a hook consumer, not a gate, so its comment is
re-worded to "reduced motion" (no allow-list entry for a component file).

**3 · The hook**
```ts
export const ReducedMotionContext = createContext(false)

const QUERY = '(prefers-reduced-motion: reduce)'
const hasMM = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
function subscribe(cb: () => void) {
  if (!hasMM()) return () => {}
  const mq = window.matchMedia(QUERY)      // per subscribe — never cached at module scope (a per-test spy must work)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const getSnapshot = () => (hasMM() ? window.matchMedia(QUERY).matches : false)
const getServerSnapshot = () => false

export function useReducedMotion(): boolean {
  const pref = useContext(ReducedMotionContext)
  const os = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return pref || os
}
```
Both hooks are always called (rules of hooks), and the OR comes after. `getSnapshot` returns a primitive, so there's no
tearing loop.

**4 · The provider**
```tsx
useLayoutEffect(() => {
  document.documentElement.setAttribute(MOTION_ATTR, reduceMotion ? MOTION_REDUCE : MOTION_FULL)
  return () => document.documentElement.removeAttribute(MOTION_ATTR)
}, [reduceMotion])
// clearCodec(): UNCHANGED — it is the [preset, density] effect's cleanup, i.e. it runs on every theme swap (D-R4-2)
return (
  <TamaguiProvider …><ReducedMotionContext.Provider value={reduceMotion}>{children}</ReducedMotionContext.Provider></TamaguiProvider>
)
```
The effect's own cleanup removes only its attribute, so a toggle never touches the fonts, preset class or density
(mutation h), and a theme swap never touches the attribute (D-R4-2).

**5 · `theme-store`**: a second derived field, in the same subscription.
```ts
const NAV_PREFS_HASH = hashKey(NAV_PREFS_KEY)
function syncMotionFromCache() {
  const nav = queryClient.getQueryData<MergedNavPreferences>(NAV_PREFS_KEY)
  const next = nav?.reduce_motion ?? false
  if (useThemeStore.getState().reduceMotion !== next) useThemeStore.setState({ reduceMotion: next })
}
queryClient.getQueryCache().subscribe((event) => {
  if (event.query.queryHash === USER_PREFS_HASH) syncFromCache()
  else if (event.query.queryHash === NAV_PREFS_HASH) syncMotionFromCache()
})
```
`removed` → `getQueryData` is `undefined` → `false`. `resetThemeStoreForTests` calls both syncs.
[FACT: `MergedNavPreferences = Omit<NavPreferences, keyof SyncableEntity>` (`packages/types/src/entities/user.ts:267`) and
`NavPreferences.reduce_motion: boolean` (`user.ts:262`); the service defaults and merges it (`service.ts:183,196`).]

## Build Steps (TDD — each: write the test, see it fail, implement, see it pass)
0. Baseline: `pnpm --filter @vida/ui test` + the apps/web suites in the blast radius, green before any edit (record times).
1. Helper test (output shape: the `@media` block + the twin, identical bodies, every selector prefixed) → `reduced-motion-css.ts`.
2. Glob guard → red on all 12 modules (+ the `neural-graph` comment) → convert the modules one by one → green. Calendar's
   existing `:96` regex stays green.
3. Hook tests (render log: first-render value under `<ReducedMotionContext.Provider value>`; OS-only; `change` event; no
   `matchMedia`; pref false + OS true) → the hook. The `<UIProvider reduceMotion>` first-render case is written in step 4,
   because it can't go green before the provider exists.
4. Provider tests (attribute values · a toggle leaves `--vida-font-body`, the `t_reader` body class and `data-vida-density`
   untouched · **with `reduceMotion` on, changing `selection.preset` and then `density` leaves `data-vida-motion="reduce"`**
   (D-R4-2) · unmount removes all · the `<UIProvider reduceMotion>` first-render hook case) → the provider. There is no
   existing test of `<html>` state after an unmount, so this file is the only coverage.
5. Neural-graph A7 extension: the third `Sigma` constructor arg (`h.Sigma.mock.calls.at(-1)[2]`) is exactly
   `{ zoomDuration: 1, doubleClickZoomingDuration: 1, inertiaDuration: 1, inertiaRatio: 0 }` when reduced and `{}`
   otherwise → the component (a comment cites `sigma.esm.js:199`).
6. `pnpm --filter @vida/ui build` · `tsc` in packages/ui.
7. Shell twin test → `shell-panel-styles.ts`.
8. theme-store tests (nav set/removed/unrelated change/failed seed) → the store.
9. App integration case (seeded nav `reduce_motion: true` → `data-vida-motion="reduce"` after boot) → `App.tsx`.
10. Appearance + Settings-surface tests → the pane. The switch reads `view.reduceMotion` and writes through **`useSettings().update`**, the
    same `update` the preset/mode/density/persona controls use (`appearance-pane.tsx:49`), not a second path. Cases:
    toggle → `update({ reduceMotion: true })` · the view drives `checked` · **a failed nav batch reverts it (PR-4):** the
    writer restores the nav cache entry (`preferences-writer.ts:127`), `theme-store.reduceMotion` follows it back,
    and exactly **one** revert toast fires (R3-BR-7). The revert case lives in `settings-surface.test.tsx` (toast spy +
    `failNext`, which covers `updateNavPreferences`, `test/preferences-test-utils.ts:80-83`) and asserts on
    `theme-store.reduceMotion`; the `<html>` attribute is App-integration's (step 9). **Persistence (acc. 1, Vitest leg):**
    after `flushAll`, `testPreferences.state.nav.reduce_motion === true`, and a fresh cache over the same fake reads
    `view.reduceMotion === true`.
11. Mirror removal: store + bridge + every test in Files row 14, in **one** step (apps/web tsc includes tests) → grep for
    `reduceMotion` (no store reader remains).
12. Mutations a–i (PLAN §4.9), each restored from a **copy**, never `git checkout --` (memory: mutation check). (b) is
    retargeted (D-R4-2): drop the motion effect's cleanup → the unmount case fails. Plus (b′): re-add the removal to
    `clearCodec` → the theme-swap case fails. (a′): hand-write one group in a converted module → the guard fails.
    (i): durations back to `0` → step 5's exact-value assertion fails.
12b. `pnpm --filter @vida/ui build` again after the mutations are restored, before tsc and the Visual Gate.
13. `tsc` 0 (packages/ui + apps/web) · eslint 0 · the full suite (load permitting; F008 re-runs recorded).
14. Live Verification smoke on real OPFS (acc. 1) → the Visual Gate (acc. 11–15) → Victor `visual-approved`.
15. Docs (§XXIX) · /critique on the diff → SHIP · commit.

## Preflight (2026-10-26)
Ground truth read: `docs/modules/preferences/current-{spec,business-rules}.md` (R2 seam + R3 surface rules).
- **Frontend:** component = the Appearance `Switch` (states: off · on · disabled read-only · "Saved on this device" ·
  reverted) · data source = `usePreferences().view.reduceMotion` · interaction = `useSettings().update`. The CODEC
  side is fully specified (provider prop, attribute, context, hook, 13 gates, graph camera).
- **Backend:** no new API. `updateNavPreferences(patch)` already exists, is Zod-validated (BR-PREF-4), and enqueues
  `sync_queue` (BR-PREF-8). Error case = a failed batch → revert + toast (PR-4, R3-BR-7). Auth: none in M1 (local vault,
  no crypto layer).
- **Database:** `nav_preferences.reduce_motion` (existing boolean column, `user.ts:262`). Operation = update. **No schema
  change.**
- **Integration:** switch → `SettingsContext.update` → `updateView` → `toNavPatch` → `writer.writeNavPreferences`
  (optimistic `setQueryData`, debounced 500 ms DB write) → `updateNavPreferences` → repo. Cache `['preferences','nav']`
  → `theme-store` subscription → `<UIProvider reduceMotion>` → attribute (CSS) + context (JS).
- **BLOCKED → resolved (2 gaps, both doc-answered):** (1) the pane's write path said `update` without naming it. It is the
  Settings-context `update`, like every other Appearance control (step 10). (2) PR-4's revert path had no acceptance
  case. Added to step 10: the cache reverts, the store and attribute follow it, and there is one toast.
- **Assumptions (each checked or proven by a step):**
  1. The writer's optimistic `setQueryData` on the nav key emits a query-cache event that the `theme-store` subscription
     sees synchronously. This is the R3 mechanism, `theme-store.ts:61-63` "listeners run synchronously" (step 8 proves it
     for nav).
  2. The 500 ms debounce delays only the DB write. The attribute flips at once from the optimistic cache (step 10).
  3. No pre-React hint is needed for motion: the `index.html` / "Loading…" frame has no animation (R3-BR-4's hint is
     for colour only).
  4. Onboarding, guided setup and the toast host all render inside `<UIProvider>` (`App.tsx:130-150`), so they get the
     context.
  5. Toggling a Tamagui `animation` prop between `'moderate'` and `undefined` on a live element is safe. The OS-change
     path already does it today.
  6. `new Sigma(graph, container, settings)` takes a `Partial<Settings>` with the three duration keys (sigma 3.0.3,
     `settings.d.ts:42-48`). Step 5 type-checks it.
  7. `readdirSync(dir, { recursive: true })` is available (Node 24.17 in use; stable since 20.1).
- **VERDICT: PASSED** after the two fixes.

## Gate record
- rev 1 (2026-10-26): drafted from PLAN-R4 rev 2. /preflight: BLOCKED (2 doc-answered gaps) → resolved → PASSED.
- **rev 1 → rev 2 (2026-10-26):** independent critique REVISE. 2 blocking, both verified on disk and folded in:
  **B1** `clearCodec` runs on every theme swap (`provider.tsx` `return clearCodec` in the `[preset, density]` effect) →
  D-R4-2. **B2** sigma's `animate` divides by the duration (`sigma.esm.js:199`) → D-R4-3. Also folded: F1 a stronger glob
  guard (D-R4-4) · F2 the Vitest persistence leg of acc. 1 · F3 the acc. 5 change recorded as D-R4-4 · F4 the revert case
  moved to `settings-surface.test.tsx` · F5 the full test list for the mirror removal (tsc includes tests). Nits: the
  unspaced count (8) · Node ≥ 22 · the jsdom docblock for the shell test · theme-store load-time sync + initial state ·
  destructured provider prop · step-3/4 ordering · the dist rebuild after mutations · the missing CLAUDE.md/JSDoc rows. The
  critique confirmed the `matchMedia` stubs are safe, the Sigma mock records the 3rd arg, and nothing is over-engineered.
- **Approval 2: Victor, 2026-10-26, including D-R4-2 / D-R4-3 / D-R4-4.** Build starts at step 1.
- **Built + gated 2026-10-26/27** (PLAN-R4 §7). Pre-ship independent /critique: REVISE — 4 blocking, all doc currency (stale
  "pending" statuses, the D9 ledger row's superseded design, PLAN §3/§4 lines contradicting D-R4-2/3, a stale field count) +
  nits (a′ undefined in acc. 9, `true` vs stored 1, the guard's over-wide allow-list → `provider.tsx` dropped, re-run 67/67) —
  all folded → **SHIP**. Code judged correct; no code change beyond the guard.
