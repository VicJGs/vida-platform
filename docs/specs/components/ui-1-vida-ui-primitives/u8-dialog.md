# U8 — Dialog · forward spec (Step 1, document-first lite) → DS-5 contract → Tamagui v2

DS-5 primitive 8/10 (**overlay/organism tier, 1st of 3**). A **modal** surface that blocks the rest of the app
until the user completes or dismisses a focused task. The first _modal_ primitive — the category shift from
Select/Menu (floating-but-non-modal) is the **focus TRAP**, an **inert background**, and a **scrim**.
Implements `docs/specs/components/ds-5-primitive-contracts/dialog.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X → §10].
**Rev 1 (2026-08-08) — Step 1 forward capture + PLAN** (intent · baseline · acceptance · flagged decisions).
**Rev 2 (2026-08-08) — Gate 1 resolutions** (§13): independent adversarial critique REVISE → 2 blockers + 4 material +
3 minor, all addressed in-place (portal-root identity; keyframe enter; focus-trap algorithm; capture/restore guard;
dismissible-Esc DS defect; scroll-lock deferred). Affected sections amended below + summarized in §13.
**Rev 3 (2026-08-08) — Gate 2** (§14): /preflight **PASSED** + second independent critique REVISE → 1 material + 2
minor, all addressed (portal-root **lazy `useState` init** so it exists during first render; test #24 reworded to a
jsdom-safe class assertion + reduced-motion routed to the Visual Gate; deferred-scroll-lock test #17 removed → 24 tests).
**Rev 4 (2026-08-08) — IMPLEMENTED + Visual Gate PASS** (§15). Shipped; @vida/ui 185/185. The Visual Gate caught **2
bugs** typecheck+tests were blind to: (1) **DS-WIDE square corners** — `borderRadius:'$radius'` (sub-theme key) inert
for dimension props on ALL 8 primitives → 0px; root-fixed to the primitive radius token (`$md` control / `$lg` card),
**DEF-U8-h**, [[tamagui-dimension-props-read-token-scale-not-theme]]; (2) Dialog **body collapse** — `flex={1}`
(grow:1/basis:0%)+minHeight:0 → 0px body clipping all children → `flexShrink:1`/minHeight:0.

---

## 1. Intent [FACT: dialog.md §Intent]

A **modal** surface that blocks the rest of the app until the user completes or dismisses a focused task or
decision.

### What it is NOT [FACT: dialog.md §Intent]

- **NOT transient feedback** → that is `Toast` (U10), announced via `aria-live`, focus not moved.
- **NOT a non-blocking anchored surface** → that is `Popover` (U9), anchored to a trigger, no focus trap.
- **NOT a whole route/page** → that is the router (UX-3).

## 2. Baseline (code-as-is — verified this session)

- **Build approach settled by the shipped pattern — no fork.** U1–U7 are hand-built on `@tamagui/core`
  (`styled()` + native `render:'<tag>'` + injected CSS for what `styled()` can't see; no new deps, web-first).
  A dialog kit (`@tamagui/*`, Radix) is out of scope by definition — UI-1's reason to exist is to **build** the
  primitives. [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] [FACT: U1–U7 pattern; ADR-001 §9]
- **Sub-theme already generated, not yet registered.** `light_Dialog`/`dark_Dialog` exist in `themes.ts:18-19`
  (keys: `background`, `radius`) but `tamagui.config.ts:12-29,74-93` wires only Button/Input/Checkbox/Select/Card/
  Tabs/Menu. → the U8 config change is **additive**: import + add `light_/dark_Dialog` to the `themes:` object (the
  Menu/Select/Card/Tabs precedent). [FACT: themes.ts:18-19; tamagui.config.ts:12-29,74-93]
- **Component tokens** [FACT: tokens/component.json → dialog]: `background → {color.surface.primary}` ·
  `radius → {radius.card}`. Both resolve to shipped DS-2 semantics (three-layer intact). **No component token for:**
  the **scrim** (contract §34 flags this — convention `{color.surface.inverse}` @ ~0.5 opacity, no dedicated token;
  a DS-2/brand-pass detail, NOT fabricated here) → **DEF-U8-c** candidate. [FACT: component.json; dialog.md:34-36]
- **zIndex tokens present** [FACT: primitive.json:76-82]: `overlay: 1200`, `modal: 1300` (a structural scale
  consumed directly — no semantic alias, like Menu's `$dropdown`). Scrim → `$overlay`, panel → `$modal` (contract
  acceptance §58 = `zIndex.modal`). Both cited (the overlay/organism-tier rule "each cites its zIndex token", DS-5 §3).
- **Motion tokens typed + wired.** `motion.ts` exports `duration.{instant,fast,moderate,slow}` +
  `easing.{in,out,inOut,linear}` (consumed by select-/tabs-/menu-styles injected CSS). Scrim = `fast`/`out`; panel =
  `moderate`/`out`. [FACT: motion.ts; menu-styles.ts]
- **Reusable from Menu/Select (the floating precedent — verified via `menu.tsx` + CLAUDE.md):**
  - Panel **portalled to `document.body`** (react-dom `createPortal`) re-wrapped in **`<Theme name="Dialog">`** so
    the `_Dialog` sub-theme (`$background`/`$radius`) crosses the portal (base light/dark crosses via `<html>`; the
    `name` scope does not). [FACT: menu.tsx:412-470; CLAUDE.md → Menu/Select]
  - Injected-CSS-reading-`motion.ts` for the enter animation + reduced-motion `@media` (`internal/dialog-styles.ts`,
    the menu-styles precedent). [FACT: menu-styles.ts]
  - `render:'<tag>'` for semantic hosts; `forwardRef`; `NODE_ENV` dev-warn precedent; jsdom `*.test.tsx`;
    `composeHandlers`/`assignRef` ref/handler helpers pattern. [FACT: menu.tsx:114-131]
- **Divergence from Menu (do NOT copy wholesale) — this is the modal delta:**
  - **No `trigger` slot.** Dialog is _fully controlled_ by `open`/`onOpenChange` (contract API §11-24 has no
    trigger). So "return focus to the trigger" (§XIV) is done by **capturing `document.activeElement` at open** and
    restoring it on close — NOT Menu's `cloneElement` trigger ref. [FACT: dialog.md:11-24; engineering §XIV]
  - **Focus TRAP** (the one sanctioned trap, §XIV): Tab/Shift+Tab cycle _within_ the panel. Menu did NOT trap (Tab
    closes it). [FACT: dialog.md:48; engineering §XIV]
  - **Centered, not anchored** → no `getBoundingClientRect`/flip/positioning math (Menu's biggest chunk). The panel
    is flex-centered in a full-viewport container. Simpler geometry; harder focus.
  - **Background inert** (`inert` + `aria-hidden` on the portal's body siblings) — Menu left the app live.
    [FACT: dialog.md:49]
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui **160** tests). [FACT: CLAUDE.md]

## 3. API surface (ship verbatim — [[deliverable-is-the-doc-not-my-discretion]]) [FACT: dialog.md:11-24]

```ts
export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** REQUIRED — the accessible name (aria-labelledby). */
  title: React.ReactNode
  description?: React.ReactNode // aria-describedby
  footer?: React.ReactNode // slot (actions)
  size?: 'sm' | 'md' | 'lg'
  /** Esc + backdrop click close. Default true; set false for destructive-confirm dialogs. */
  dismissible?: boolean
  children: React.ReactNode
}
// forwardRef<HTMLDivElement, DialogProps> → the dialog surface (panel). Props exported.
```

- **Ship the interface verbatim.** No `showCloseButton`/`onClose` extras. A visible close (✕) affordance is NOT in
  the contract — dismissal is Esc + backdrop (dismissible) or the consumer's `footer` actions (Cancel/Confirm).
  → **DEF-U8-a** (contract has no close-button slot; a consumer composes one in `footer`/`children`). [FACT: no such
  prop in dialog.md:11-24] — the U5-Card/U6-Tabs "state matrix can outrun the API" precedent.

## 4. Visual states (8, per §VIII — a modal _container_; interactive states live on inner controls) [FACT: dialog.md:26-32]

| State                                     | Trigger        | Visual (exact)                                                                                                                                                                        | Token                                                          |
| ----------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **default**                               | `open`         | scrim (dim overlay) + centered panel: `$background`, `$radius` (radiusCard), inset padding                                                                                            | `dialog.background` · `dialog.radius` · `zIndex.modal` · scrim |
| **loading**                               | async content  | panel body shows consumer skeleton/spinner; consumer sets `aria-busy`; consumer disables actions                                                                                      | (consumer-composed; no `loading` prop → **DEF-U8-b**)          |
| **empty**                                 | no content yet | consumer empty-state rendered in `children`                                                                                                                                           | `dialog.background`                                            |
| hover · focus · active · disabled · error | —              | **N/A at the shell** — live on the Button/Input controls _inside_ the dialog (their own contracts). Documented as the container-primitive exception (§VIII), demonstrated in stories. |

## 5. Motion spec (B12) [FACT: dialog.md:38-43]

| Transition  | Duration                  | Easing       | Property                                                            |
| ----------- | ------------------------- | ------------ | ------------------------------------------------------------------- |
| scrim in    | `duration.fast` (150)     | `easing.out` | **opacity** (0 → ~0.5)                                              |
| panel enter | `duration.moderate` (250) | `easing.out` | **opacity** (0→1) + **transform** scale(0.96→1) + translateY(8px→0) |

Reduced-motion: scrim + panel appear instantly (no scale/translate) — `@media (prefers-reduced-motion:reduce)`.
B12: only `opacity`/`transform` in every transition — never background/size/top. [FACT: themes/CLAUDE.md B12]

**Mechanism = a mount-triggered CSS keyframe `animation`, NOT a transition gated by a JS reveal flag** (Gate-1
BLOCK-2). A `@keyframes` animation runs automatically when the element mounts — no `entered` state, no rAF, no
two-commit reveal — and the **resting base is `opacity:1`** (`animation-fill-mode: both` supplies the `from` opacity:0
before it starts). So a missed/absent animation **fails safe = visible** (never a permanently-invisible `opacity:0`
panel), and it's deterministic in jsdom. This is the U6 Tabs panel-enter-keyframe precedent (themes/CLAUDE.md →
tabs-styles "panel enter-fade keyframe"), chosen over Menu/Select's `.is-open` transition specifically because a
modal must never render invisible. Reduced-motion → `@media` sets `animation:none` → base `opacity:1` = instant.
**Exit:** immediate unmount on close (no exit animation) — the Menu/Select precedent + the contract's perf budget
("mounts on open, unmounts on close, no hidden retained tree", §52). → **DEF-U8-d** (an exit fade would need a
delayed-unmount state machine; deferred, bounded).

## 6. Accessibility contract [FACT: dialog.md:45-49; engineering §XIV verbatim]

- **Role** `dialog`, `aria-modal="true"`, `aria-labelledby`→ generated title id, `aria-describedby`→ generated
  description id (**only when `description` is provided** — no dangling idref).
- **On open: focus moves to the first focusable element inside the panel**; if none, focus the panel itself
  (`tabIndex={-1}`) so focus is never lost and the SR announces the dialog. [FACT: §XIV "focus moves to the first
  focusable element inside"]
- **On close: focus returns to the element that was focused when the dialog opened** (captured `document.activeElement`
  at the top of the open-effect, _before_ focus-in moves it). Restore is **guarded**: only
  `if (captured && document.contains(captured) && typeof captured.focus === 'function')` — else fall back to
  `document.body` so a trigger that unmounted while the dialog was open never throws or loses focus (Gate-1 MAT-2).
  [FACT: §XIV "focus returns to the element that triggered it"]
- **Focus TRAP — explicit algorithm** (Gate-1 MAT-1; the one sanctioned trap, §XIV). On `Tab`/`Shift+Tab` in the
  panel `onKeyDown`, compute the live focusable set `F` (see §9.2 selector):
  - `F.length === 0` → `preventDefault()`, keep focus on the panel (which is `tabIndex={-1}`). Tab can never escape.
  - `F.length === 1` → `preventDefault()`, focus that one element (Tab and Shift+Tab both). No escape.
  - activeElement is the panel itself or not in `F` → `preventDefault()`, focus `F[0]` (Tab) / `F[last]` (Shift+Tab).
  - Tab on `F[last]` → `preventDefault()`, focus `F[0]`; Shift+Tab on `F[0]` → `preventDefault()`, focus `F[last]`.
  - otherwise → let native Tab move within the panel (no preventDefault).
- **Esc** closes when `dismissible`; **backdrop (scrim) pointerdown** closes when `dismissible`. When
  `dismissible={false}` both are inert (destructive-confirm). ⚠ This is a deliberate deviation from engineering §XIV
  ("Escape closes every overlay") — the sanctioned destructive-confirm exception — flagged **DEF-U8-f**; a non-dismissible
  dialog with no focusable action in `footer`/`children` can trap a keyboard user, so a dev-warn fires in that case (§9.2).
- Background body siblings get `inert` + `aria-hidden="true"` while open, restored on close — **identified by excluding
  the dialog's own portal-root container by identity** (Gate-1 BLOCK-1), never by tag/class. [FACT: dialog.md:49]

## 7. Performance budget [FACT: dialog.md:52]

Portals to a dedicated body-child container; mounts on open, unmounts on close (no hidden retained tree). Scrim is one
opacity layer. **Body scroll-lock is DEFERRED (Gate-1 MAT-4, DEF-U8-g)** — the contract's perf budget does not mandate
it, and a naive `overflow:hidden` risks CLS (scrollbar removal, engineering §XIII ≤0.1), clobbers nested-dialog state,
and misses iOS Safari. A robust ref-counted + scrollbar-gutter lock is a bounded follow-up, not UI-1 primitive scope.

## 8. Component tokens (three-layer intact) + sub-theme

- `dialog.background → {color.surface.primary}` → `$background` on the panel (in `<Theme name="Dialog">`).
- `dialog.radius → {radius.card}` → `$radius`.
- **Scrim** = `$colorSurfaceInverse` (base semantic, inherited through the Dialog sub-theme) at **opacity 0.5**,
  animated by opacity. No dialog/scrim component token exists (contract §34 flags it) → **DEF-U8-c**; NOT fabricated.
- **Size** → `maxWidth`: `sm 400` · `md 512` · `lg 720` (px), `width:'100%'` with viewport margin. No dialog-size
  token exists → **DEF-U8-e** (value review at brand pass). [INTERP: common modal widths; provisional palette]

## 9. PLAN — build steps (Step 1 → implementation after both approvals)

1. **`internal/dialog-styles.ts`** — injected sheet (menu-styles precedent), but a **keyframe `animation`, not a
   `.is-open` transition** (Gate-1 BLOCK-2): `@keyframes vida-dialog-scrim-in { from{opacity:0} to{opacity:0.5} }` +
   `@keyframes vida-dialog-panel-in { from{opacity:0;transform:scale(0.96) translateY(8px)} to{opacity:1;transform:none} }`;
   `.vida-dialog-scrim{opacity:0.5;animation:vida-dialog-scrim-in <fast>/<out> both}` +
   `.vida-dialog-panel{animation:vida-dialog-panel-in <moderate>/<out> both}` (resting base **opacity:1** — fails safe
   visible). Reads `motion.ts`. transform/opacity ONLY. `@media (prefers-reduced-motion:reduce){…{animation:none}}`.
2. **`components/dialog.tsx`**:
   - `styled(View)` `DialogScrim` (name:'Dialog', position:fixed, inset 0, backgroundColor `$colorSurfaceInverse`) +
     `DialogPositioner` (fixed, inset 0, flex center, padding = viewport margin) + `DialogPanel` (name:'Dialog',
     backgroundColor `$background`, borderRadius `$radius`, inset padding, `size` variant → maxWidth, `width:'100%'`) +
     `DialogTitle` (render:'h2', styled Text — **always carries the generated `titleId` regardless of ReactNode type**,
     Gate-1 MIN-3) + `DialogDescription` (render:'p', carries `descId`) + a `<footer>` slot (render:'footer').
   - **Portal root (Gate-1 BLOCK-1 + Gate-2 DEF-REV-1):** the dedicated `<div data-vida-dialog-root>` is created in a
     **lazy `useState` initializer** — `useState(() => (typeof document !== 'undefined' ? document.createElement('div')
: null))` — so it exists **during the first render** (thus `createPortal(<Theme name="Dialog">…, rootDiv)` renders
     the panel in the FIRST commit; an effect-created div would be null on first render → panel on the 2nd commit → the
     [[portal-open-focus-needs-a-mount-gated-effect-dep]] trap). Only `appendChild`/`removeChild` happen in a mount
     `useLayoutEffect` (keep the `typeof document` guard — menu.tsx:411 precedent, even under `disableSSR:true`). The
     inert/aria-hidden pass excludes **that div by identity** (`child !== rootDiv`), never by tag/class (the `<Theme>`
     renders a `display:contents` span that is tag-indistinguishable from an app-root `<div>`).
   - State: `useId` for title/description ids; refs for `panelRef`, `rootRef` (portal div), `prevFocusRef`
     (previously-focused element). **No `entered` state, no internal `open` state** (controlled-only; the keyframe
     removes the reveal flag).
   - **Effects:**
     (a) _focus + capture_ — a `useLayoutEffect` keyed on `open`: when open, `prevFocusRef.current =
document.activeElement` (capture BEFORE moving focus, Gate-1 MAT-2) → focus `F[0]` (first focusable in the panel)
     or the panel itself if `F` is empty. Panel renders in the FIRST commit (no pos-gate, so — unlike Menu — the
     focusable children ARE present when this effect runs; the [[portal-open-focus-needs-a-mount-gated-effect-dep]]
     two-commit trap does not apply here, verified: Dialog never defers the panel behind a measured `pos`). Cleanup
     (close/unmount): guarded restore to `prevFocusRef.current` (see §6).
     (b) _inert background_ — a `useEffect` keyed on `open`: set `inert`+`aria-hidden` on every `document.body.children`
     el `!== rootRef.current` (saving prior values); cleanup restores.
   - **Focus trap:** panel `onKeyDown` computes `F` via selector `a[href], button:not([disabled]),
input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])` and
     applies the §6 algorithm (0/1/panel-focused/boundary cases). `Escape` → `dismissible && onOpenChange(false)`.
   - **Dismiss:** scrim/positioner `onPointerDown` (target outside panel) → `dismissible && onOpenChange(false)`;
     panel stops propagation. (pointerdown, not click — the Menu outside-dismiss precedent.)
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}`, `aria-describedby={description ? descId :
undefined}`, `tabIndex={-1}` on panel; `zIndex="$modal"` on panel, `"$overlay"` on scrim. `forwardRef` → panel,
     merged with internal `panelRef` (`assignRef`).
   - Dev-warns (`NODE_ENV !== 'production'`): `title` missing/nullish; **`dismissible === false` with no focusable
     descendant in the panel** (Gate-1 MAT-3 / DEF-U8-f — a keyboard user would be trapped).
3. **`tamagui.config.ts`** — import + register `light_/dark_Dialog` (additive; Menu precedent).
4. **`dialog.stories.tsx`** — 8-state coverage × light｜dark: default (sm/md/lg), with-description, with-footer
   (Cancel/Confirm), non-dismissible (destructive confirm), loading (consumer skeleton + aria-busy), empty (consumer
   empty-state), long-scrolling-body, a live trigger button to exercise open→focus→close-return.
5. **`dialog.test.tsx`** (jsdom) — see §10.
6. **`index.ts`** — barrel `export { Dialog, type DialogProps }`.
7. **`packages/ui/src/CLAUDE.md`** — §XXIX currency (Dialog paragraph: modal trap + inert + scrim + focus-return).

## 10. Test plan (jsdom — 24 tests, parity with U7)

Each test file opts into DOM via a `// @vitest-environment jsdom` docblock (vite `test.environment:'node'`; the 7
shipped `*.test.tsx` all use this docblock — Gate-2 DEF-REV-2). Assertions are DOM/class-based, never `getComputedStyle`
of an `@media`/`@keyframes` result (jsdom evaluates neither) — motion/reduced-motion truth is the Visual Gate's job.

1. renders nothing when `open={false}` (no portal node)
2. `role="dialog"` + `aria-modal="true"` present when open
3. `aria-labelledby` points to the rendered `title`; title text present
4. `aria-describedby` present ⇔ `description` provided (absent otherwise — no dangling idref)
5. focus moves to the first focusable inside on open
6. focus moves to the panel when there is no focusable child
7. focus returns to the previously-focused trigger on close
8. `Escape` closes (calls `onOpenChange(false)`) when `dismissible` (default)
9. `Escape` does nothing when `dismissible={false}`
10. backdrop (scrim) pointerdown closes when dismissible; not when `dismissible={false}`
11. pointerdown _inside_ the panel does NOT close
12. Tab from the last focusable wraps to the first (trap)
13. Shift+Tab from the first focusable wraps to the last (trap)
14. `footer` slot renders
15. `size` variant applies the expected maxWidth
16. body siblings get `aria-hidden`/`inert` while open, restored on close
17. `forwardRef` resolves to the panel element
18. controlled: `onOpenChange` is the only close path (no internal open state)
19. **(Gate-1 MAT-1)** single focusable: Tab and Shift+Tab both keep focus on it (no escape)
20. **(Gate-1 MAT-1)** zero focusable: Tab on the panel is swallowed (focus stays on the panel, no escape)
21. **(Gate-1 MAT-2)** trigger unmounts while open → close does not throw and focus lands on a valid node (body fallback)
22. **(Gate-1 BLOCK-1)** the dialog's own portal subtree is NOT `inert`/`aria-hidden` (only true body siblings are)
23. **(Gate-2 DEF-REV-2, jsdom-safe rework of MIN-1)** the panel's resting class is present and carries **no inline
    `opacity:0`** (base is visible) — the true "reduced-motion appears instantly" check is a **Visual Gate** item (jsdom
    runs no `@media`/`@keyframes`).
24. **(Gate-1 MAT-3)** dev-warn fires when `dismissible={false}` and the panel has no focusable descendant

> Removed (Gate-2 DEF-REV-3): the old "body scroll lock" test — scroll-lock is deferred (DEF-U8-g), so there is no
> feature to test. → 24 tests.

## 11. Deferrals / DS defects flagged (bounded)

- **DEF-U8-a** — contract has no close-button (✕) slot; dismissal = Esc/backdrop (dismissible) or `footer` actions.
- **DEF-U8-b** — no `loading` prop (consumer-composed skeleton + `aria-busy`), like U5/U6.
- **DEF-U8-c** — no scrim component token (contract §34 flags it); scrim reaches the `surface.inverse` semantic @ 0.5.
- **DEF-U8-d** — exit animation deferred (immediate unmount per perf budget); a delayed-unmount state machine if wanted.
- **DEF-U8-e** — no dialog-size token; maxWidths are provisional (brand-pass value review).
- **DEF-U8-f** _(Gate-1 MAT-3)_ — `dismissible={false}` makes Esc inert, a deliberate deviation from engineering §XIV
  ("Esc closes every overlay") for the destructive-confirm case; the contract vs standard tension is flagged for DS, and
  a dev-warn guards the keyboard-trap footgun.
- **DEF-U8-g** _(Gate-1 MAT-4)_ — body scroll-lock deferred (not in the contract's perf budget; a naive lock risks
  CLS/nested-clobber/iOS); a robust ref-counted + scrollbar-gutter lock is a bounded follow-up.
- **DEF-U8-h** _(Visual-Gate, DS-WIDE)_ — Tamagui reads `$name` on **dimension** props (borderRadius/space/size) from
  the **token scale**, not the component sub-theme (theme = colors only). So `borderRadius:'$radius'` (a sub-theme key)
  was inert → 0px on all 8 primitives. Fixed at U8 across Button/Input/Checkbox/Select/Card/Menu/Dialog to the primitive
  token (`$md` control / `$lg` card). DS should decide whether component dimension tokens are worth expressing at all
  given this Tamagui constraint. [[tamagui-dimension-props-read-token-scale-not-theme]]

## 12. Open questions

- **OQ-1 [RESOLVED via contract + §XIV]:** focus target on open = **first focusable inside**, panel fallback if none
  (dialog.md:47 + engineering §XIV verbatim). Not a fork.
- **OQ-2 [RESOLVED via contract]:** no visible close button in the API → DEF-U8-a, ship verbatim, footer/children compose it.

## 13. Gate 1 — independent adversarial critique resolutions (Rev 2)

Verdict REVISE → 2 blockers + 4 material + 3 minor, ALL addressed in-plan:

- **BLOCK-1 (inert would hit the dialog itself)** — `<Theme>` renders a `display:contents` span, tag-indistinguishable
  from the app root; portal now targets a **dedicated `<div data-vida-dialog-root>`** and the inert pass excludes it
  **by identity**. §6, §9.2, test #23. ✅
- **BLOCK-2 (rAF/`entered` reveal on opacity:0 base → risk of permanent-invisible panel)** — replaced with a
  mount-triggered **CSS keyframe** whose resting base is `opacity:1` (fails safe visible, deterministic, no reveal
  flag). §5, §9.1, test #24. ✅
- **MAT-1 (focus-trap edge cases)** — explicit algorithm for 0 / 1 / panel-focused / boundary. §6, tests #20, #21. ✅
- **MAT-2 (capture timing + stale restore)** — capture `document.activeElement` before focus-in; guarded restore with
  `document.contains` + body fallback. §6, §9.2, test #22. ✅
- **MAT-3 (dismissible=false vs §XIV Esc)** — flagged DEF-U8-f + dev-warn on a non-dismissible dialog with no focusable
  action. §6, §9.2, §11, test #25. ✅
- **MAT-4 (scroll-lock scope creep/CLS)** — deferred to DEF-U8-g (not primitive scope). §7, §11. ✅
- **MIN-1** reduced-motion test added (#24). **MIN-2** token/role-cross-portal → Visual Gate checklist (real browser;
  jsdom can't resolve Tamagui vars). **MIN-3** `DialogTitle` always carries `titleId` for any ReactNode. §9.2. ✅
- **Confirmed no-action (critique agreed):** API verbatim; `$overlay`/`$modal` tokens exist + `$`-consumable;
  `light_/dark_Dialog` additive; `dialog.*` tokens three-layer intact; scrim reaches `surface.inverse` (no token,
  DEF-U8-c); B12 clean (maxWidth is an instant style, not animated); pointerdown-not-click dismiss.

## 14. Gate 2 — /preflight + second independent critique resolutions (Rev 3)

- **/preflight → PASSED** — single frontend layer fully specified; 7 bounded assumptions, none blocking; no ground-truth
  module docs (currency = `packages/ui/src/CLAUDE.md`).
- **Second independent critique → REVISE (1 material + 2 minor), all addressed:**
  - **DEF-REV-1 (material) — portal-root creation contradicted the first-commit focus guarantee.** "Create on mount"
    (effect) would leave `createPortal`'s target null on first render → panel on the 2nd commit → the very
    [[portal-open-focus-needs-a-mount-gated-effect-dep]] trap. Fixed: **lazy `useState` initializer** so the div exists
    during first render; only append/remove in the effect. §9.2. ✅
  - **DEF-REV-2 (minor) — test #24 claimed a jsdom guarantee jsdom can't give** (no `matchMedia`/`@media`/`@keyframes`).
    Reworded to a class/DOM assertion (resting class present, no inline `opacity:0`); reduced-motion truth → Visual Gate.
    Added the `// @vitest-environment jsdom` docblock note. §10. ✅
  - **DEF-REV-3 (minor) — test #17 tested deferred scroll-lock** (DEF-U8-g). Removed → 24 tests. §10. ✅
- **Verified-correct-against-precedent (critic confirmed, not just claimed):** tabs-styles.ts:29-30 keyframe pattern
  real; `cubic-bezier(...)` commas are inside parens → valid `animation` shorthand; `fill-mode:both`+`opacity:1` base
  fails safe visible; keyframe doesn't restart on re-render; `$colorSurfaceInverse` falls through the Dialog sub-theme
  (menu.tsx consumes non-sub-theme keys inside `<Theme name="Menu">`); additive config; capture-before-focus ordering;
  trap algorithm across all 4 branches; B12 clean.

**Gate 2 = SHIP after Rev 3.** Ready to implement.
