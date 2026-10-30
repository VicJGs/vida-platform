# Spec: U9 — Popover (UI-1 primitive 9/10, 2nd overlay)

<!-- type: component -->

Status: draft (2026-08-08) — forward spec, gate 1 (PLAN). Implements `ds-5-primitive-contracts/popover.md`.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Task: ui-1-vida-ui-primitives (LIF-86, M1.0 #27, Design System). Session: 2026-08-08.

---

## 1. Identity & Intent

**Popover** — a contextual, **non-modal** content surface anchored to a trigger; the app behind stays
interactive. [FACT: popover.md:4-6]

- **NOT modal** (→ `Dialog`, U8): no scrim, no focus trap, no `inert` background. [FACT: popover.md:6,43]
- **NOT a list of actions** (→ `Menu`, U7): the content is arbitrary, possibly-interactive children — no
  `menuitem`s, no roving focus, no type-ahead. [FACT: popover.md:6,10-12]
- **NOT hover-only help** (→ `Tooltip`, not in UI-1): opens on click, holds interactive content. [FACT: popover.md:6]

It is the **9th primitive**, 2nd of 3 overlays. It is a **genetic hybrid**: Menu's _floating machinery_ +
Dialog's _focus model_, minus modality. [INTERP: from the two contracts + menu.tsx/dialog.tsx]

## 2. API Contract [FACT: popover.md:9-22]

```ts
export interface PopoverProps {
  trigger: React.ReactNode // slot — a single focusable element (usually a <Button>)
  children: React.ReactNode // popover content (may be interactive)
  open?: boolean // controlled
  defaultOpen?: boolean // uncontrolled initial
  onOpenChange?: (open: boolean) => void
  placement?: 'top' | 'bottom' | 'left' | 'right' | `${'top' | 'bottom'}-${'start' | 'end'}` // 8 placements; default 'bottom'
  offset?: number // gap between trigger and panel, px; default 8
  'aria-label'?: string // accessible name when content has no heading
  'aria-labelledby'?: string // [INTERP: §XIV — a role=dialog needs a name; contract names only aria-label.
  //   labelledby is uncontroversial ARIA (dialog.tsx:293 uses it); a doc-sync note, not a deviation. DEF-U9-a.]
}
// forwardRef<HTMLButtonElement, PopoverProps> → the TRIGGER. [FACT: popover.md:21 says "HTMLButtonElement | View"]
//   **Deliberate narrowing** to HTMLButtonElement (the Menu precedent, menu.tsx:134): the `| View` is the RN
//   target, out of scope for the web-first UI-1 build. NOT a contract match — a scoped narrowing. [m1]
// Props exported.
```

**Controlled/uncontrolled:** identical mechanism to Menu — `open !== undefined` ⇒ controlled; else internal
state seeded from `defaultOpen`; `onOpenChange` fires in both modes. [FACT: menu.tsx:153-155,216-222]

**Default `placement`** — the contract does not state a default; `'bottom'` matches the anchored-below norm and
Menu's `'bottom-start'` family. [INTERP: popover.md silent → conventional default; flag as an assumption.]

## 3. Mechanism (reuse map — what comes from where)

### 3.1 Reused from Menu (`menu.tsx`) verbatim-in-shape

- **Trigger wiring via `cloneElement`**: inject `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`, a
  composed **`onClick` (toggle)**, and a merged ref (internal + forwarded + consumer-own, React 19 `props.ref`).
  Reuse `assignRef` + `composeHandlers` (module-level, pure). [FACT: menu.tsx:116-132,384-404]
  - **[G1 — preflight fold] NO composed `onKeyDown` on the trigger** (Menu has one for ArrowUp/Down/Enter/Space
    open; menu.tsx:255-266). A Popover is a **dialog opener, not a menu**: it opens on **click**, and a native
    `<button>` synthesizes a click on Enter/Space, so `onClick` toggle covers keyboard-open for free — **no
    arrow-key open** (that is menu/listbox semantics, wrong for a dialog popup). This also SIDESTEPS the U7
    Enter/Space→synthesized-click double-fire entirely (no keydown handler that also opens → nothing to
    `preventDefault`). Esc is handled on the **panel** (§3.3), not the trigger. [INTERP: WAI-ARIA dialog-button vs menu-button]
- **Portal to `document.body`** under `<Theme name="Popover">` (the portal detaches the `name:'Popover'`
  sub-theme scope; base light/dark still crosses via `<html>`). [FACT: menu.tsx:413-471; themes.ts emits light_/dark_Popover]
- **`position:fixed` positioning** with the **seed → refine → reveal** two-commit pattern:
  1. seed a provisional `pos` from the trigger rect (mounts the panel), 2. `useLayoutEffect` (dep on `pos`)
     measures the panel, flips/aligns/clamps, sets a **single** side property (never `top`+`bottom`), flips
     `entered`, 3. reveal via the injected `.is-open` transition. [FACT: menu.tsx:297-353]
- **⚠ Portal strategy = Menu's `pos`-gated (NOT Dialog's lazy-init).** The panel is gated on `pos != null`
  (menu.tsx:410-411), so it mounts in the SECOND commit — the two-commit trap
  ([[portal-open-focus-needs-a-mount-gated-effect-dep]]) applies. Dialog AVOIDS the trap via a lazy-init portal
  root that renders in the first commit (dialog.tsx:31,158-161) and so its focus effect deps `[open, dismissible]`
  (dialog.tsx:203). **U9 does NOT copy Dialog's deps** — U9 is Menu-shaped: `pos`-gated portal ⇒ the focus-into
  effect deps on **`[isOpen, entered]`** (menu.tsx:362) or the first `.focus()` no-ops. Only the focus-into
  _body_ comes from Dialog (§3.2); the effect _wiring_ is Menu's. [M1]
- **Dismiss handlers**: outside `pointerdown` (target not in trigger nor panel) · capture-phase `scroll` ·
  `resize` → close. [FACT: menu.tsx:364-382]
- **Injected motion CSS** reading `motion.ts` (→ `internal/popover-styles.ts`, mirrors `menu-styles.ts`).
  [FACT: menu-styles.ts pattern; CLAUDE.md:80-83]

### 3.2 Reused from Dialog (`dialog.tsx`)

- **Focus-into _body_** (only the body — the effect _wiring_ is Menu's `[isOpen, entered]`, see §3.1/M1): query
  `getFocusable(panel)`; focus the first; if none, focus the panel itself (`tabIndex=-1`) so focus is never
  lost. Reuse the `FOCUSABLE` selector + `getFocusable`. [FACT: dialog.tsx:52-57,182-189]
- **`role="dialog"`** on the panel + `aria-label`/`aria-labelledby`. [FACT: popover.md:39-40; dialog.tsx:291-294]
- **`aria-controls`** on the trigger → a STATIC `useId`-derived panel id (allocated unconditionally, not from
  mount state), set only while open: `aria-controls={isOpen ? panelId : undefined}` — so it always references a
  valid id even in the seed→refine window. [M2; FACT: menu.tsx:149-151,400]

### 3.3 Net-new to Popover (neither Menu nor Dialog has it)

- **Non-modal, no trap, no `inert`.** Do NOT copy Dialog's inert/aria-hidden sibling pass. Background stays
  interactive. [FACT: popover.md:6,43]
- **`role="dialog"` WITHOUT `aria-modal`** (the modal/non-modal distinction). [FACT: popover.md:39,49]
- **Trigger `aria-haspopup="dialog"`** (Menu uses `"menu"`; Dialog has no trigger). [FACT: popover.md:39]
- **Tab-leaves-closes** — a **React `onBlur` on the panel** (synthetic blur bubbles = `focusout`, and exposes
  `relatedTarget` — [G2 — preflight fold]: pin the mechanism as React `onBlur`, not a native listener). It fires
  on _every_ focus move (incl. INTERNAL panel-to-panel moves), so it MUST gate on `e.relatedTarget` (the incoming
  node): [B2, net-new — Menu has no focusout, it uses `onKeyDown` Tab→close at menu.tsx:288-289]
  - `relatedTarget` inside the **panel OR the trigger** → **ignore** (internal move / Esc-return; the trigger
    is explicitly allowed so B3's `triggerRef.focus()` doesn't trip this). [B2, B3]
  - `relatedTarget == null` (focus left to browser chrome, a non-focusable body click, window-blur/alt-tab, an
    iframe boundary) → **return, do NOT close**. Outside-`pointerdown` owns the click-to-empty path; a
    non-modal popover must survive window-blur. [B2]
  - else (a real focusable node outside panel+trigger, i.e. Tab-away) → **close, no forced focus** (the browser
    already moved focus; forcing it fights native tab order). [FACT: popover.md:42]
- **Esc** → close **and return focus to the trigger** (`triggerRef.focus()`, Menu's `closeMenu(true)`). Because
  focusout allows the trigger as `relatedTarget`, the Esc-return does not re-trigger a close; `setOpenState(false)`
  is idempotent (controlled + uncontrolled both no-op on a repeat). Outside-`pointerdown`/scroll/resize → close
  **without** forced focus. [B3; FACT: popover.md:42; menu.tsx:228-231,364-382]
- **8 placements with an AXIS-SPLIT positioning** — Menu's refine effect (menu.tsx:321-353) is **hard-wired
  vertical** (`wantTop`, `spaceBelow/Above`, a single `top`); it CANNOT place `left`/`right`. [B1] So U9's
  positioning generalizes to a **primary axis** + a **cross axis**:
  - `top`/`bottom` → **primary axis = vertical** (as Menu): primary space = `spaceAbove`/`spaceBelow`, flip
    top↔bottom when clipped, single property = `top`. Cross axis = horizontal; `-start`/`-end`/(center) align
    on `left`, clamp to `[8, vw − panelW − 8]`.
  - `left`/`right` → **primary axis = horizontal** (the INVERSE): primary space = `spaceLeft`/`spaceRight`
    (`rect.left − gap` / `vw − rect.right − gap`), flip left↔right when clipped, single property = `left`
    (computed: right = `rect.right + offset`; left = `rect.left − panelW − offset`). Cross axis = vertical;
    center the panel on the trigger's vertical midpoint (`-start`/`-end` not offered for left/right per the
    contract's type — only `top|bottom` take `-start|-end`), clamp to `[8, vh − panelH − 8]`. [FACT: popover.md:16]
  - `gap` = the `offset` prop (default 8; Menu hard-coded 4). Always ONE side property on each axis — never
    `top`+`bottom` nor `left`+`right` (the stale-inline-`top` bug, DEF-U4-e). [FACT: menu.tsx:345]
- **Motion = `scale(0.96→1)` + opacity from the anchor edge** (Menu used `translateY`). `transform-origin` set
  **inline** from the RESOLVED side across BOTH axes: `bottom`→origin `top`, `top`→`bottom`, `right`→`left`,
  `left`→`right` (Menu's inline origin only knew top/bottom — extended for the horizontal axis). [m2; FACT: popover.md:34; menu.tsx:434-435]

### 3.4 The arrow — IMPLEMENTED per the contract (not a decision)

The contract's **default** visual row specifies the panel has an _"arrow toward anchor"_ [FACT: popover.md:27] —
that is authoritative (deliver-the-doc, [[deliverable-is-the-doc-not-my-discretion]]). The arrow ships. The
acceptance-criteria silence [popover.md:48-52] and the absent `popover.arrow` token [component.json:68-72 — only
background/border/radius] do NOT reopen it; they are DEFs to flag, not a fork to escalate.

- **Build:** an 8px square rotated 45°, positioned at the panel edge facing the anchor, centered on the trigger
  midpoint (clamped within the panel's border-radius), `backgroundColor:'$background'` with a 1px `$border` on
  its two outer edges so it blends into the panel. **DEF-U9-b** — no arrow token → reuses
  `popover.background`/`border`.
- **Its position on flip/align is an INSTANT inline-style swap** (the Tabs-indicator width-swap precedent,
  CLAUDE.md:37-40) — NOT part of the animated reveal; do not animate the caret sliding across on flip. Only
  the panel's `opacity`+`scale` reveal is animated (B12). [M3]
- Across the axis-split (§3.3): the arrow sits on the panel edge facing the trigger — bottom-edge for a `top`
  panel, top-edge for `bottom`, right-edge for `left`, left-edge for `right`; centered on the cross axis.

## 4. Visual States [FACT: popover.md:24-30 · components §VIII]

| State                                     | Applies       | Visual                                                                                                         | Token                                                                                                                                                                                         |
| ----------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **default**                               | open          | surface panel, 1px border, `radius`, (arrow toward anchor — §3.4)                                              | `$background` (popover.background) · `$border` (popover.border) · `borderRadius:'$lg'` (radius.card via token scale — **not** the inert `$radius` sub-theme key, DEF-U8-h) · `zIndex.overlay` |
| **loading**                               | async content | consumer places a skeleton/spinner in `children`; panel sets `aria-busy` when…                                 | — [INTERP: no `loading` prop in the API → consumer-composed, the U5/U6/U8 precedent. `aria-busy` is consumer's on their content. Flag DEF-U9-c.]                                              |
| **empty**                                 | no content    | consumer empty-state slot in `children`                                                                        | `$background`                                                                                                                                                                                 |
| hover · focus · active · disabled · error | —             | **N/A at the shell** — these live on the trigger + inner controls (their own contracts). [FACT: popover.md:30] |

**No `loading` prop** — consistent with Card/Tabs/Dialog (contract's API has none); loading/empty are
`children` composition. [FACT: popover.md:10-20 has no loading prop; CLAUDE.md DEF-U5-f/U6-c/U8-b precedent]

## 5. Motion (B12) [FACT: popover.md:32-36]

| Transition | Duration                | Easing       | Property                                                               |
| ---------- | ----------------------- | ------------ | ---------------------------------------------------------------------- |
| open       | `duration.fast` (150ms) | `easing.out` | `opacity` 0→1 + `transform: scale(0.96)→scale(1)` from the anchor edge |

⚠ **Contract/standard tension surfaced (not buried) — DEF-U9-e**: motion.md §IX puts panels in the _Transition_
band (250–300ms); `duration.fast` (150ms) is the _Micro_ (hover/toggle) band. The contract mandates
`duration.fast` [FACT: popover.md:35], so U9 ships it verbatim (deliver-the-doc) and flags the tension for the
DS motion pass, rather than silently inheriting a micro-timed content panel. [M4]

- `transform-origin` set **inline** from the resolved side across BOTH axes (single authority; the stylesheet
  sets none): `bottom`→`top`, `top`→`bottom`, `right`→`left`, `left`→`right` (Menu's inline origin only knew
  top/bottom — extended for the horizontal axis, see §3.3). [m2; FACT: menu.tsx:434-436]
- **Reduced-motion**: instant appearance via `@media (prefers-reduced-motion: reduce)` in `popover-styles.ts`.
  [FACT: popover.md:36; motion.md §IX]
- Animated properties = `transform`/`opacity` ONLY (never bg/border/shadow/size). [FACT: motion.md:40-58]

## 6. Accessibility [FACT: popover.md:38-43]

- **Trigger**: `aria-expanded`, `aria-haspopup="dialog"`, `aria-controls`→panel id.
- **Panel**: `role="dialog"` (non-modal → **no** `aria-modal`), named by `aria-label`/`aria-labelledby`.
- **Focus**: enters the panel on open (first focusable, else the panel); **NOT trapped**; Tab may leave → close.
- **Esc** closes + returns focus to the trigger. **Outside-click** closes.
- Background NOT `inert`, stays interactive.
- Dev-warn (like Menu) when neither `aria-label` nor `aria-labelledby` is provided. [INTERP: menu.tsx:181-184 precedent]

## 7. Performance [FACT: popover.md:45-46]

Portals to body; positioned with a single transform; scroll/resize close (no per-frame reposition — cheaper
than a follow-anchor recompute, and the contract fences Popover to a click-open surface). [INTERP: menu.tsx dismiss-on-scroll]

## 8. Business Rules (the invariants the critique attacks)

- **BR-1** Controlled when `open !== undefined`; else internal state; `onOpenChange` fires both modes. [FACT: menu.tsx:153-155]
- **BR-2** Panel is `role="dialog"` **without** `aria-modal`; trigger `aria-haspopup="dialog"`. [FACT: popover.md:39]
- **BR-3** On open, focus enters the panel (first focusable, else panel@tabIndex=-1). [FACT: popover.md:42; dialog.tsx:187-189]
- **BR-4** Focus is NOT trapped. Panel `focusout` closes ONLY when `relatedTarget` is a real focusable node
  outside **both panel and trigger**; inside panel/trigger → ignore (internal move / Esc-return);
  `relatedTarget == null` → ignore (pointerdown owns it; survive window-blur). [B2, B3; FACT: popover.md:42]
- **BR-5** Esc closes + returns focus to trigger (`triggerRef.focus()`); the trigger is an allowed focusout
  target so the return doesn't re-close; `setOpenState(false)` idempotent. Outside-pointerdown/scroll/resize
  close (no forced focus). [B3; FACT: popover.md:42; menu.tsx:228-231,364-382]
- **BR-6** Background is NOT inert; stays interactive (no Dialog sibling pass). [FACT: popover.md:43]
- **BR-7** AXIS-SPLIT positioning: top/bottom = vertical primary (single `top`), left/right = horizontal
  primary (single `left`), each with its own space/flip/clamp; gap = `offset` (default 8). The portal is
  `pos`-gated (Menu strategy) ⇒ the focus-into effect deps on `[isOpen, entered]` (two-commit trap). [B1, M1; FACT: menu.tsx:321-362]
- **BR-8** `borderRadius:'$lg'` via the token scale (the sub-theme `$radius` key is inert for dimensions). [FACT: CLAUDE.md:101-108]
- **BR-9** Motion animates `opacity`+`transform` only; reduced-motion is instant. [FACT: motion.md; popover.md:36]
- **BR-10** No `loading` prop; loading/empty are `children`-composed. [FACT: popover.md API]

## 9. Acceptance Criteria [FACT: popover.md:48-52 + the state/a11y rows]

- [ ] `role="dialog"` non-modal (no `aria-modal`); trigger `aria-expanded`+`aria-haspopup="dialog"`+`aria-controls`; panel labelled.
- [ ] Focus enters on open (first focusable, else panel); **not trapped**; Esc + outside-click close; Esc returns focus to the trigger.
- [ ] `focusout` closes on a REAL outside focusable (Tab-away) only; ignores internal moves + `relatedTarget==null` (survives window-blur).
- [ ] Background stays interactive (not inert).
- [ ] `zIndex.overlay` (below modal, above dropdown); panel `$background`/`$border`/`borderRadius:'$lg'` resolve under `<Theme name="Popover">`.
- [ ] Motion: opacity + `scale(0.96→1)` from the anchor edge, `duration.fast`/`easing.out`; reduced-motion instant.
- [ ] **All 8 placements** resolve incl. **left/right** (horizontal primary axis); flip when clipped; clamp to viewport; single side property per axis (no top+bottom, no left+right); `offset` respected.
- [ ] Arrow toward anchor rendered (per popover.md:27), edge/center correct across all 8 placements; DEF-U9-b flagged.
- [ ] forwardRef → the trigger; `PopoverProps` exported; strict TS (zero `any`/`!` unjustified).
- [ ] Stories cover the applicable states × light｜dark; jsdom tests for open/close/focus/keyboard/dismiss/aria.
      **[G3 — preflight fold]** reduced-motion + real geometry (placement/flip/arrow/scale-origin) are NOT
      asserted in jsdom (offset\*/getBoundingClientRect = 0, matchMedia unreliable) — those are Visual-Gate/Brave
      claims, per the U6/U7/U8 precedent. jsdom covers logic: state, focus target, key handling, aria, dismiss.
- [ ] Visual Gate PASS measured in real Brave (both themes) — placement/flip/motion (unverifiable in jsdom).

## 10. Files

- `packages/ui/src/components/popover.tsx` (new)
- `packages/ui/src/components/popover.stories.tsx` (new)
- `packages/ui/src/components/popover.test.tsx` (new)
- `packages/ui/src/internal/popover-styles.ts` (new — injected motion CSS reading `motion.ts`)
- `packages/ui/src/index.ts` (barrel: `Popover`, `PopoverProps`)
- `tamagui.config.ts` — **register `light_/dark_Popover`** in the `createTamagui` `themes` map (+ import). Emission
  in `themes.ts` (DS-5) is necessary but NOT sufficient: the `ThemeName` type + runtime scope resolve from the
  config's `themes`, so `<Theme name="Popover">` fails to typecheck until registered. [corrected at impl — a
  mechanical step, not the pipeline; the same per-primitive registration every prior U did]
- `packages/ui/src/CLAUDE.md` — §XXIX currency refresh (Popover paragraph)

## 11. Deferrals / DEFs to flag for DS

- **DEF-U9-a** contract API names only `aria-label`; a `role=dialog` also accepts `aria-labelledby` (added — a
  doc-sync note, uncontroversial ARIA per dialog.tsx:293, not a real deviation).
- **DEF-U9-b** no `popover.arrow` component token (arrow reuses `popover.background`/`border`) — if arrow shipped.
- **DEF-U9-c** contract mentions `aria-busy` loading but the API has no `loading` prop (consumer-composed).
- **DEF-U9-d** logical tab-order after a portalled non-modal panel is body-relative (Radix-style focus-scope
  redirection is out of UI-1 scope); Tab-away simply closes. Flag for UI-2/polish.
- **DEF-U9-e** contract's `duration.fast` (150ms) is the _Micro_ motion band; a content panel is the _Transition_
  band (250–300ms) per motion.md §IX — shipped verbatim, flagged for the DS motion pass. [M4]

## 12. Resolved by the docs (recorded — not forks to escalate)

- **OQ-1 [RESOLVED — contract]** Arrow: **implemented** per popover.md:27 (deliver-the-doc). Not a decision; the
  token gap is DEF-U9-b. §3.4.
- **OQ-2 [RESOLVED — assumption]** Default `placement` = `'bottom'` (contract type lists the values, states no
  default; `'bottom'` is the anchored-below norm + the Menu family default). An implementation choice, disclosed.
