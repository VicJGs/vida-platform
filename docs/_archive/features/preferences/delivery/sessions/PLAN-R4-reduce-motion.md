<!-- PLAN (§XXVI gate 1) — preferences-rescope · slice R4 · Reduce motion, end to end
     Scope: delivery/slice-map.md R4 (APPROVED 2026-10-21) · ledger rows D8 · D9 · ECs fe-codec-theme seam EC-7 ·
     fe-onboarding EC-10 · fe-home EC-9 · fe-shell EC-12. Inherits R2's writer (PLAN-R2 R2-BR-1…11) + R3's boot seed and
     derived theme store (PLAN-R3 R3-BR-2/3). No-Guessing: [FACT: path:line] · [INTERP — grounded] · [UNKNOWN].
     Worktree @ 4091206 + origin/main merged (LIF-250 #159). -->

# PLAN-R4 — Reduce motion, end to end

> **Status:** rev 2.1, 2026-10-26 — **Approval 1 given (Victor), incl. D-R4-1**; rev 2.1 = the three gate-2 corrections
> D-R4-2/3/4 (IMPLEMENTATION-PLAN-R4 §XXVIII), approved at Approval 2. rev 1 went to an independent critique (REVISE: 4 blocking, 10 nits); all are folded in
> (§7). §XXVIII D-R4-1 (how the hook reads the preference) — approved at Approval 1.
> **Plane:** shared (CODEC, `packages/ui`) + frontend. Both gates run: the **Verification Gate** (Vitest + a live smoke on
> real OPFS) and the **Visual Gate** (real browser · light/dark × 375/768/1440 · §XIV a11y · stage-4 Victor
> `visual-approved`).
> **Context baseline (§XXVI.1a):** `docs/modules/preferences/current-*` (refreshed by R3) · `docs/ui/token-pipeline/current-*`
> (B12, the motion contract) · `docs/specs/foundation/fe-codec-theme/delivery/seam-contract.md`. They describe the code as
> read for this plan.

## 1. Problem (as-built, after R3)

- **The switch doesn't persist (D8).** Appearance's "Reduce motion" `Switch` reads and writes the transitional mirror
  `preferences-store` `[FACT: apps/web/src/settings/appearance-pane.tsx:50-51,125-126]`. R3 left it there on purpose
  (PLAN-R3 §3, appearance-pane row). The writer can already persist it: `toNavPatch` maps `reduceMotion` →
  `nav_preferences.reduce_motion` `[FACT: preferences/preferences-view.ts:125-126]`, and the view reads it back
  `[FACT: preferences-view.ts:83]`. The control never calls it. (The switch is already `disabled` when read-only,
  `appearance-pane.tsx:124`; nothing to add there.)
- **The preference gates nothing (D9).** `useReducedMotion()` reads only the OS media query
  `[FACT: packages/ui/src/hooks/use-reduced-motion.ts:15-28]`. The store's own comment admits it: "actual motion gating is
  OS-media-query-driven" `[FACT: stores/preferences-store.ts:18-19]`.
- **13 CSS gates, not 12.** The ledger counted 11 in `packages/ui/src/internal/*-styles.ts` + `shell-panel-styles.ts`
  `[FACT: reconciliation.md:76]`. fe-calendar S7 added a 12th in `packages/ui` on 2026-10-22 (`internal/calendar-motion.ts:24`,
  commit `cc0e350`), after the ledger's DRY pass, and it reached this branch with the `f796c34` merge. The list
  `[FACT: grep "prefers-reduced-motion" packages/ui/src apps/web/src]`: `dialog-styles:30` · `interaction-styles:24` ·
  `switch-styles:38` · `calendar-motion:24` · `tabs-styles:35` · `menu-styles:27` · `sync-status-styles:20` ·
  `card-styles:35` · `popover-styles:25` · `toast-styles:35` · `select-styles:29` · `checkbox-styles:48` ·
  `apps/web/src/shell/shell-panel-styles.ts:36`.
- **Four JS consumers, all through the hook:** `button.tsx:187` (spinner) · `neural-graph.tsx:111` (0 layout iterations)
  · `onboarding.tsx:92-93` and `guided-setup.tsx:63-64` (the Tamagui `animation`/`enterStyle` gate).
- **One ungated motion source: the graph camera (B12 gap, pre-existing).** Sigma 3.0.3 animates the camera by default
  (`zoomDuration` · `inertiaDuration` · `doubleClickZoomingDuration`) `[FACT: node_modules/.pnpm/sigma@3.0.3…/settings.d.ts:42-48]`,
  and `NeuralGraph` passes no settings `[FACT: packages/ui/src/components/neural-graph.tsx:193]`. Neither the OS query nor
  the preference reaches it today. Everything else found by the sweep (`animation`, `transition`, `@keyframes`,
  `enterStyle`, `exitStyle`, `animateOnly` across `packages/ui/src` + `apps/web/src`) is one of the 13 gates or a hook
  consumer.

## 2. Business rules (after R4)

- **R4-BR-1 · The switch persists.** Appearance reads `usePreferences().view.reduceMotion` and writes
  `update({ reduceMotion })`, on the path R3 gave the theme controls (optimistic cache write → the nav queue →
  `nav_preferences.reduce_motion`). The mirror loses the field: `reduceMotion`/`setReduceMotion` leave `preferences-store`,
  and the bridge mirrors 9 fields `[FACT: preferences-bridge.tsx:21-32]`. This repeats R3's arrangement move.
- **R4-BR-2 · The app derives the value from the cache, before first paint.** `UIProvider` renders outside
  `QueryClientProvider` `[FACT: App.tsx:130-131]`, which is why R3 made `theme-store` a derived cache with one query-cache
  subscription `[FACT: stores/theme-store.ts:10-22,64-67]`. R4 extends that **same** subscription to `NAV_PREFS_KEY`
  `[FACT: preferences/preferences-keys.ts:7]` and derives `reduceMotion: boolean`. No entry or `removed` → `false`, and it
  sets only on a real change. [INTERP — grounded: `theme-store` is the exemption that already feeds the provider (PR-5,
  structure-data.md:46; BR-RT-7). A second store would add a second exemption.] R3's boot seed fetches both keys before the
  provider tree renders `[FACT: preferences/preferences-queries.ts:62-67; App.tsx:109]`, so a persisted `true` is there on
  the first themed frame. A failed nav read → `false` → the OS query still applies (R4-BR-6).
- **R4-BR-3 · The provider owns both outputs of one prop.** `UIProvider` gains `reduceMotion?: boolean` (default `false`)
  and turns it into:
  (a) **the root attribute for CSS:** `<html data-vida-motion="reduce" | "full">`, set in its **own** layout effect with
  deps `[reduceMotion]`. It follows the `data-vida-density` precedent `[FACT: provider.tsx:160-168; seam-contract.md:54-58]`.
  The effect's **own cleanup** removes the attribute, for unmount (rev 2.1, D-R4-2: `clearCodec` is the `[preset, density]`
  effect's cleanup, so it runs on every theme swap and must not touch the attribute). A separate effect keeps a motion
  toggle from running `clearCodec` over the fonts, preset class and density.
  (b) **a context value for JS:** `ReducedMotionContext` (default `false`), read by the hook (R4-BR-5; D-R4-1).
  It is **not** a `ThemeSelection` field: the seam fixes the app-owned theme state as `{preset, mode, density}`
  `[FACT: seam-contract.md:4,14]`, and reduce-motion is not a theme axis. `resolveTheme` is unchanged. The codec still holds
  no state (seam invariant R5, `seam-contract.md:64`): the value is a prop fed by the app.
  This edits `packages/ui`, which the CODEC owns (RATIFY). It ships here as a scoped CODEC edit, with fe-codec-theme as the
  edge `[FACT: interpretation.md:150-156; slice-map.md:114]`.
- **R4-BR-4 · Every CSS gate also keys on the attribute.** Each `@media (prefers-reduced-motion: reduce){S{D}}` rule gains a
  twin `[data-vida-motion="reduce"] S{D}` with the **same** declarations. The twin adds one attribute selector (0,1,0) to
  its base, so it wins by specificity, not source order. That holds for every base, including the tabs `[data-ready]` and
  toast `[data-phase]` rules ((0,2,0) → (0,3,0)). `<html>` is an ancestor of the body-portalled surfaces (Dialog, Menu,
  Popover, Select, Toast), so the twin reaches them. The 12 `packages/ui` modules emit both forms through one internal
  helper (`internal/reduced-motion-css.ts`), so the two forms can't drift. `shell-panel-styles.ts` hand-writes its twin,
  as it already mirrors `dialog-styles.ts` by hand `[FACT: shell-panel-styles.ts:1-3]`. There is no new public export.
- **R4-BR-5 · The hook ORs the preference into the OS query.** `useReducedMotion()` =
  `useContext(ReducedMotionContext) || <OS query>`. The OS part goes through `useSyncExternalStore` over
  `matchMedia('(prefers-reduced-motion: reduce)')` (the `change` event; server snapshot `false`; the `MediaQueryList` is
  read per subscribe, never cached at module scope, so a per-test `matchMedia` spy still works). Context is read during
  render, so the **first** render already has the right value: no observer and no ordering race. A primitive rendered with
  no provider (its own tests) keeps today's OS-only behaviour. Side effect, for the better: the OS value is also right on
  the first render, where today's hook returns `false` until its effect runs.
- **R4-BR-6 · Off never forces motion.** The preference only adds reduction. `reduceMotion: false` writes
  `data-vida-motion="full"` and context `false`; the CSS and the hook both still honour the OS query. There is no "always
  animate" state.
- **R4-BR-7 · Theme swaps stay instant (codec EC-7).** The swap adds no transition `[FACT: provider.tsx:161]`. With the
  attribute on, the primitives' transitions are off too, so nothing animates during a preset/mode/density change.
- **R4-BR-8 · The graph camera honours it (closes the B12 gap in §1).** When `reduced`, `NeuralGraph` passes
  `zoomDuration: 1`, `inertiaDuration: 1`, `doubleClickZoomingDuration: 1` and `inertiaRatio: 0` to `Sigma` (rev 2.1,
  D-R4-3: sigma divides by the duration, so `0` gives a NaN frame), so zoom and pan are instant state
  changes, as motion.md §Reduced Motion requires. Otherwise Sigma keeps its defaults. `reduced` is already in the effect
  deps `[FACT: neural-graph.tsx:200]`.

### §XXVIII D-R4-1 — the hook reads a context, not the attribute (Victor, Approval 1)

- **The doc says:** "the hook and the CSS both key on it" (the attribute) `[FACT: interpretation.md:150-154]`.
- **Why the literal reading fails:** to key on a DOM attribute the hook must subscribe to it. React 19 subscribes
  `useSyncExternalStore` in a **passive** effect `[FACT: react-dom-client.development.js:8144]`, so the observer starts
  after the provider's layout effect has already set the attribute, and never sees that change. The catch-up check runs in
  that same passive phase, and the boot render comes from a promise chain on the default lane `[FACT: App.tsx:80-87]`,
  so it isn't guaranteed to run before paint. Consumers mounted in the boot commit can paint one frame with `false`.
  `neural-graph` would lay out with 200 iterations, then tear down and rebuild with 0.
- **The change:** one source, two carriers. The provider turns the same `reduceMotion` prop into the attribute (CSS can
  only read the DOM) and a context value (JS reads it during render). The hook and the CSS can't disagree, because both
  come from one prop in one component. What changes is the doc's wording, not the intent. It will be updated in
  interpretation.md and seam-contract.md at currency (§3).
- **Recommendation:** approve. The alternative, keeping the observer and accepting a possible first-frame flash, breaks
  EC-10 and EC-12 ("reduced-motion → instant") on exactly the boot path R3 made flash-free.

## 3. Design

| File                                                                                                                                                      | Change                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/internal/reduced-motion-css.ts` (new)                                                                                                    | `reducedMotionCss(selectors, declarations)` → the `@media` rule + the `[data-vida-motion="reduce"]` twin (each selector prefixed) · `MOTION_ATTR` / `MOTION_REDUCE` constants |
| `packages/ui/src/internal/{dialog,interaction,switch,tabs,menu,sync-status,card,popover,toast,select,checkbox}-styles.ts` · `internal/calendar-motion.ts` | the reduced-motion line → `reducedMotionCss(…)`, same selectors and declarations                                                                                              |
| `packages/ui/src/hooks/use-reduced-motion.ts`                                                                                                             | `ReducedMotionContext` + the hook (R4-BR-5); JSDoc: the two triggers, and new gates use the helper                                                                            |
| `packages/ui/src/provider.tsx`                                                                                                                            | `UIProviderProps.reduceMotion?` · the context provider · the `[reduceMotion]` attribute effect, whose own cleanup removes it · `clearCodec` unchanged (D-R4-2)                |
| `packages/ui/src/components/neural-graph.tsx`                                                                                                             | `INSTANT_CAMERA` when `reduced`: the three durations at 1 ms + `inertiaRatio: 0` (R4-BR-8, D-R4-3)                                                                            |
| `apps/web/src/shell/shell-panel-styles.ts`                                                                                                                | the hand-written twin (R4-BR-4)                                                                                                                                               |
| `apps/web/src/stores/theme-store.ts`                                                                                                                      | `reduceMotion` from `NAV_PREFS_KEY` in the same subscription · the reset helper covers it                                                                                     |
| `apps/web/src/App.tsx`                                                                                                                                    | `<UIProvider selection={selection} reduceMotion={reduceMotion}>`                                                                                                              |
| `apps/web/src/settings/appearance-pane.tsx`                                                                                                               | the switch on `view.reduceMotion` + `update({ reduceMotion })`                                                                                                                |
| `apps/web/src/stores/preferences-store.ts` · `preferences/preferences-bridge.tsx`                                                                         | `reduceMotion` removed (9 mirrored fields) · the stale "OS-media-query-driven" comment goes with it                                                                           |
| **Docs (§XXIX, same commit)**                                                                                                                             |                                                                                                                                                                               |
| `docs/specs/foundation/fe-codec-theme/delivery/seam-contract.md`                                                                                          | `UIProviderProps.reduceMotion`; the :63 invariant → the swap honours the OS query **or** the in-app preference                                                                |
| `docs/ui/token-pipeline/current-business-rules.md` B12 (:44-50) · `packages/ui/src/themes/CLAUDE.md` (:45-49)                                             | B12's second trigger (`[data-vida-motion="reduce"]`); new gates go through `reducedMotionCss`                                                                                 |
| `apps/web/src/shell/CLAUDE.md` (:108, :113)                                                                                                               | the shell panel's reduced-motion rule names both triggers                                                                                                                     |
| `docs/features/preferences/delivery/interpretation.md` (:150-154)                                                                                         | D-R4-1: one prop, two carriers                                                                                                                                                |
| `docs/features/preferences/delivery/reconciliation.md`                                                                                                    | D8/D9 → ✅ · "12" → 13 (calendar-motion) · the §H EC rows (:170, :175 + EC-9/EC-12)                                                                                           |
| `docs/modules/preferences/current-*`                                                                                                                      | the switch persists; the app-wide gate                                                                                                                                        |
| `.claude/tasks/shell-rescope.md`                                                                                                                          | the file edge: `shell-panel-styles.ts` twin added by R4 (D9 names shell-rescope too, reconciliation.md:76)                                                                    |
| `.claude/tasks/fe-codec-theme` edge                                                                                                                       | recorded in the slice-map edge list (:114) — no task file of its own exists; the seam-contract refresh above is the record                                                    |

## 4. Acceptance

**Verification Gate (Vitest + live smoke)**

1. **Persist:** toggling the switch calls `update({ reduceMotion: true })`; the nav write carries `reduce_motion: true` (stored 1); a
   reload (fresh cache over the same DB) reads `true`. Live smoke on real OPFS: toggle → reload → the row and the view
   agree.
2. **Derive:** `theme-store.reduceMotion` follows the nav cache entry (set → `true`; `removed`/`clear()` → `false`); an
   unrelated nav change produces no new value; a failed nav seed leaves it `false`.
3. **Provider:** `reduceMotion` → `data-vida-motion="reduce"`; `false`/absent → `"full"`; a toggle updates it in place
   **without** touching the preset class, font vars or density; unmount removes it, and the existing "no codec marker
   left" assertions keep passing.
4. **Hook:** the value seen in the **first render** of a probe under `<UIProvider reduceMotion>` is `true` (a render log,
   not an effect capture). Under no provider: OS `reduce` → `true`, OS `no-preference` → `false`, an OS `change` event →
   re-render; no `window`/`matchMedia` → `false`. Under `<UIProvider reduceMotion={false}>` with OS `reduce` → `true`
   (R4-BR-6).
5. **Gate guard (packages/ui):** a test globs `src/**/*.{ts,tsx}` (excluding tests and stories) and fails if any file
   other than the helper, the hook and the provider contains `prefers-reduced-motion` (rev 2.1, D-R4-4). Identical
   declarations hold by construction (one body feeds both rules, the helper's unit test). There is no total count, so a
   new gate in any file is covered.
   **Gate guard (apps/web):** `shell-panel-styles` emits the twin with the literal `[data-vida-motion="reduce"]` and the
   same declarations as its `@media` block.
6. **Graph camera:** `NeuralGraph` with `reduced` passes `{ zoomDuration: 1, doubleClickZoomingDuration: 1, inertiaDuration: 1, inertiaRatio: 0 }` to `Sigma` (D-R4-3; proven via the context path — the hook test covers the OS OR); without it, it passes
   none (extends the existing A7 test, `neural-graph.test.tsx:175`).
7. **App wiring:** App integration with nav seeded `reduce_motion: true` → `<html data-vida-motion="reduce">` after boot.
8. **Mirror:** `preferences-store` has no `reduceMotion`; the bridge mirrors 9 fields; grep finds no other reader.
9. **Mutations killed:** (a) drop one twin → 5 fails · (a′) hand-write one group in a converted module → 5 fails · (b) drop the motion effect's cleanup → 3 fails · (b′) remove the attribute in `clearCodec` → the theme-swap case fails · (c) hook ignores the
   context → 4 fails · (d) hook drops the OS term → 4 fails · (e) switch writes the mirror again → 1 fails ·
   (f) subscription skips the nav key → 2 fails · (g) App drops the prop → 7 fails · (h) the motion effect calls
   `clearCodec` → 3 fails · (i) graph ignores `reduced` for the camera → 6 fails.
10. `tsc` 0 (after `pnpm --filter @vida/ui build`) · eslint 0 · the suite green (F008 timeouts re-run alone and recorded).

**Visual Gate (real browser, dev server, real OPFS)** 11. Toggle on → reload → `data-vida-motion="reduce"` on the first themed frame, and every live animated surface is instant,
in light and dark: Dialog, Menu, Popover, Select (panel + chevron), Tabs (indicator + panel), Toast, Switch, Checkbox,
Card elevation, the interaction overlay, the indeterminate progress, the calendar today-pulse + range-fade, the shell
panels + scrim (EC-12), the Button spinner (static arc), onboarding steps (EC-10). Probe: `document.getAnimations()`
empty after each trigger, plus computed `animation-name` / `transition-duration` on the element. - **Not checked live, recorded:** the neural graph (the M1 route renders `nodes={[]}`, `app/graph/index.tsx:9`) is
covered by acceptance 6. **fe-home EC-9** is satisfied by absence: the arrangement render has no motion source, so
there is nothing to gate. 12. Toggle off + OS emulated `reduce` → still instant (R4-BR-6). Toggle off + OS `no-preference` → the animations run
(negative control: the probe sees them). 13. A preset/mode/density swap with the preference on → no animation (codec EC-7). 14. The Settings pane at 375/768/1440 × light/dark: the switch states (off · on · disabled read-only) · axe 0 · the switch
is named "Reduce motion" · focus ring visible. 15. Victor `visual-approved` (stage 4).

## 5. Out of scope (owned elsewhere, unchanged)

The transition preference and its "reduce motion → `none`" rule (R-T; it reads this hook) · onboarding commit/revert
(R7; onboarding offers no reduce-motion choice) · Modules/⌘K (R5) · Locale/Notifications + deleting the store (R6) · any
change to the primitives' animations themselves.

## 6. Risks

- **The first-frame guarantee depends on R3 seeding the nav key.** PLAN-R3 §6's fallback ("seed only `user`",
  PLAN-R3:271) would break it: a persisted `true` would arrive after the first frame. If that fallback is ever taken, it
  is a §XXVIII deviation that has to weigh this.
- **`packages/ui` dist.** apps/web consumes `@vida/ui` as `dist`. Rebuild (`pnpm --filter @vida/ui build`) after each
  `packages/ui` edit, before apps/web tsc, vitest or the Visual Gate. In this worktree the symlink already resolves to its
  own `packages/ui` (checked with `readlink -f`, 2026-10-26).
- **Test blast radius:** `use-reduced-motion` · `provider` · each style module's test that snapshots its CSS string ·
  `neural-graph` (its `matchMedia` mock needs `addEventListener`/`removeEventListener` for the new subscribe) ·
  `shell-panel-styles` · `theme-store` · `appearance-pane` · `preferences-store` · `preferences-bridge` · `App`. Grep for
  `reduceMotion`, `matchMedia` and the CSS strings before the edit.
- **F008** (load 270–340 today): long suites hit the background time limit. Run targeted suites, then the full suite when
  the load allows. Record timeouts that pass when re-run alone.

## 7. Gate record

- **rev 1 → rev 2 (2026-10-26):** independent critique REVISE, 4 blocking, all folded in:
  (1) the first-mount reasoning was wrong (`useSyncExternalStore` subscribes in a passive effect, so the observer misses
  the provider's layout-effect write), and acceptance 4 couldn't prove it (a child's layout effect runs before its
  parent's) → context carrier, §XXVIII D-R4-1, render-log acceptance. Verified on disk: `react-dom-client.development.js:8144`,
  `App.tsx:80-87`.
  (2) The owed doc refresh was missing from §3 → the Docs rows, including the shell-rescope edge.
  (3) The gate guard couldn't import `internal/*` from apps/web and a fixed list can't catch a new file → a glob guard in
  packages/ui plus a shell test, no total count.
  (4) The sweep missed Sigma's camera animation (verified: sigma 3.0.3 `settings.d.ts:42-48`), and the graph can't be seen
  live (`nodes={[]}`) → R4-BR-8 + acceptance 6.
  Nits folded: citation ranges · "disabled when read-only" already true · separate `[reduceMotion]` effect · App
  integration check · mutation "hook drops the OS term" · no module-scope `MediaQueryList` + the mock's listeners ·
  EC-9 satisfied by absence · the R3 seed dependency · the shell's literal attribute asserted. The critique also judged
  the shared helper right-sized for the stage.
- **Build + gates (2026-10-26/27):** TDD steps 1–11 each red → green · mutations a, a′, b, b′, c, d, e, f, g, h, i
  **11/11 killed** (copy-restored) · `@vida/ui` 764/764 · apps/web 999/999 (two chunks; F008 at load 270) · tsc 0 (ui +
  web) · eslint 0 errors (4 pre-existing warnings in `db/client.test.ts`, LIF-250).
  **Live Visual Gate** (Brave headless, the worktree's dev server, real OPFS persistent profile):
  - Negative control (pref off, OS no-preference): Dialog keyframes · Select panel + chevron transitions · shell float
    scrim + edge slide · the interaction overlay **run** — the probe is sensitive.
  - Pref **on** → 0 running (dialog · select · theme swap EC-7 · shell float EC-12) · pref off + OS reduce → 0 (R4-BR-6) ·
    reload → the first themed frame already `data-vida-motion="reduce"`, the switch checked, 0 running (item 11).
  - EC-10 onboarding: control = the overlay transition running at every step; OS reduce = 0 at every step.
  - **Cascade proof, 13 gates in the real browser** (probe elements, `full` vs `reduce`): **9 proven live** — dialog ·
    interaction · switch · calendar · menu · card · toast · select · shell. **4 unit-proven only** — tabs · sync-status ·
    popover · checkbox: no M1 surface visited mounts them, so their stylesheet was never injected and the live check is
    vacuous; they use the identical `reducedMotionCss` call (helper unit test + glob guard).
  - Item 14: Settings light/dark × 375/768/1440 → axe 0, no overflow, the switch named "Reduce motion"; keyboard Tab →
    `:focus-visible`, a 2px solid ring on the track; read-only → disabled. Not R4's, recorded: the disabled Switch track
    is very faint (WCAG-exempt; the shipped primitive's disabled style — a DS-level sibling, like R3's 1.4.11 note).
  - **Stage 4: Victor `visual-approved` 2026-10-27** (checked live on the worktree's dev server).
  - Not live-checkable, recorded: the neural graph (M1 route `nodes={[]}`, acceptance 6 covers it) · fe-home EC-9
    (satisfied by absence).
- **rev 2.1 (2026-10-26):** D-R4-2/3/4 from the IMPLEMENTATION-PLAN's independent critique (B1 `clearCodec` scope · B2
  sigma's NaN frame · a stronger guard) — **approved at Approval 2 (Victor)**.
- **Approval 1: Victor, 2026-10-26, including §XXVIII D-R4-1** (the hook reads a provider context fed by the same prop as
  the attribute).
