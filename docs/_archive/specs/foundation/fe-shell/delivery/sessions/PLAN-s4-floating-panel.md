# PLAN — fe-shell S4 · Floating panel (B)

> Entity Delivery Flow ② · per-slice §XXVI gate. Front matter GATED+APPROVED; S1/S2/S3 shipped. This refines the S4 row
> into a buildable spec. **No `@vida/core`/`@vida/types` change.** Home: `apps/web/src/shell`. Every claim [FACT: path:line]
> or labeled INTERPRETATION. No-Guessing binds.

## §1. Context (ground truth)

- **S3 (shipped):** `ShellPanel` renders the DOCKED state (inline flush, content beside) + the two-row contained header;
  **Float is DISABLED** in the mode control (S4 enables it). `app-shell.foldDocked` composes docked+open panels; the
  bar toggles are a disclosure (`aria-expanded={dockedOpen}`). `[FACT: shell/shell-panel.tsx; shell/app-shell.tsx]`
- **Model (S1):** `isOverlay(p)` = `mode==='float'` · `panelAxis(edge)` · `PanelEdge` · `LAYERING` (`$overlay`/`$modal` z,
  `shadow.overlay` Level-3). `[FACT: shell/regions.ts:58-64,152-155]`
- **Overlay precedent (`@vida/ui` Dialog):** the proven MODAL pattern — portal to a body-child `<div>` (lazy-init so the
  panel is in the first commit), **focus capture→in→return** (guarded `document.contains`), **inert + aria-hidden**
  background siblings (by node identity), **Esc + focus TRAP** (Tab cycles within), mount-`@keyframes` motion with a
  visible resting base (reduced-motion → instant). `[FACT: packages/ui/src/components/dialog.tsx:146-260]`
- **Reusable from `@vida/ui`:** `shadow` (overlay token), `motion` tokens, `useReducedMotion`. `[FACT: packages/ui/src/index.ts:12-13,83]`

## §2. What S4 builds (scope)

S4 covers **EC-1 (enable Float) · EC-3 (floating overlay) · EC-6 (dismiss + focus)** + **EC-12 (feel, motion — live gate)**
`[FACT: slice-map.md:21,27-32]`. Home: `shell/shell-panel.tsx` + `shell/app-shell.tsx`.

1. **`ShellPanel` float branch (`shell-panel.tsx`).** When `placement.mode==='float'`, the SAME panel (header + body slot)
   renders as an **edge-anchored modal drawer**:
   - **Scrim** — a full-viewport dimming layer `$colorSurfaceInverse` at **opacity 0.5** (B1 — MATCH Dialog's
     `vida-dialog-scrim` exactly; `[FACT: internal/dialog-styles.ts:22,25]`) BEHIND the panel, ABOVE content — content
     keeps its width (M3/EC-3). Click → `onClose`. **EC-10 carve-out:** there is NO scrim-opacity token (Dialog flags
     this, DEF-U8-c); the raw `0.5` is the documented deviation, identical to the shipped Dialog scrim — not an invented
     value. The Visual Gate asserts the scrim darkens content, not a token lookup.
   - **Panel** — `position:fixed`, anchored to its `edge` **below the reserved top strip** (EC-7): the `top` anchor =
     `reservedTopInset(bp)`, so **left** `{left:0, top:inset, bottom:0}` · **right** `{right:0, top:inset, bottom:0}` ·
     **top** `{top:inset, left:0, right:0}` · **bottom** `{bottom:0, left:0, right:0}`; **content-fit on the cross axis**
     (hugs content, like docked), with **Level-3 elevation** (`box-shadow: shadow.overlay`; dark self-cancels → border
     carries it, the Card/overlay precedent). **Z (N1):** panel + scrim at **`$overlay`** — above content, **below
     `$modal`** so a ⌘K/Dialog opened over it wins. `[FACT: envision.md:45,29; design.md §V:188-190; regions.ts:58-64,161-163]`
   - **G1 — the overlay covers the BELOW-STRIP region, NOT the whole viewport.** The scrim + the `inert`/`aria-hidden`
     background are scoped to the **below-strip region** (the Content `<main>` + any docked panels) — top at
     `reservedTopInset(bp)`; the **persistent top strip (banner) is EXCLUDED**, so it stays visible + interactive. This
     is REQUIRED so **re-toggle (the bar toggle) still closes** the float (EC-6) and the reserved strip holds (EC-7) —
     Dialog's "inert ALL body siblings" is WRONG here (it would inert the bar + kill re-toggle). Mechanism: the float
     overlay mounts **inside the shell's below-strip region** (not a `<body>` portal), so the top strip is simply its
     sibling above — never inside the inert/scrim scope. `inert` is applied to the content/docked wrapper only.
   - **Dismiss (EC-6):** Esc · click-scrim · re-toggle (the bar toggle) → `onClose`.
   - **Focus (EC-6, N3):** **capture `document.activeElement` on open** (= the bar toggle that opened it) → focus moves
     into the panel (first focusable) → on close, **guarded restore** to the captured element (`document.contains` +
     body fallback) — Dialog's mechanism, which naturally returns to the trigger WITHOUT a separate `toggleRefs` path.
     A focus **TRAP** (Tab cycles within) + **inert/aria-hidden** background (modal, scrim-backed, §XIV "drawer = modal
     focus mgmt"). Mirror Dialog's algorithm (precedent, not shared code — apps/web can't import Dialog internals;
     rule-of-three = Dialog is the 1st consumer, this the 2nd → duplicate-once is allowed). `[FACT: dialog.tsx:181-213]`
   - **Motion (EC-12 feel), B2 — FAIL-SAFE-VISIBLE:** enter = opacity + transform (translate from the anchored edge) via
     an **injected `@keyframes` stylesheet** — a shell-owned `shell/shell-panel-styles.ts` mirroring `internal/dialog-styles.ts`
     (`ensureShellPanelStyles()` appends a `<style>`), reading `motion` (scrim `fast`/`out`; panel `moderate`/`out`) +
     `shadow.overlay`. The **resting base is VISIBLE** (scrim 0.5 / panel opacity 1, `transform:none`) so a missed/absent
     animation FAILS SAFE VISIBLE — a modal must never render invisible. **NOT Tamagui `enterStyle`** (which would strand
     the panel at `opacity:0` if the CSS-animation driver no-ops — the fail-UNSAFE path). Reduced-motion → `@media
(prefers-reduced-motion:reduce){animation:none}` (the visible base shows instantly). `[FACT: internal/dialog-styles.ts:6-30]`
2. **`shell-panel.tsx` — enable Float.** Remove `disabled` from the Float mode button (S3 deviation reversed — the overlay
   now renders). Dock/Float both live; `aria-pressed` reflects `mode`.
3. **`app-shell.tsx` — mount float panels + widen the disclosure.** `foldDocked` stays docked-only. The **below-strip
   region** gains a float overlay layer (an absolutely-positioned child spanning the region, at `$overlay`): for each
   **float + open** panel, it renders the scrim + the `ShellPanel` (float branch). Because it's absolute over the region,
   the content/docked wrapper keeps its full width underneath (M3/EC-3). The scrim + `inert` wrap the content/docked
   wrapper (G1 — NOT the top strip). The bar-toggle disclosure widens: `aria-expanded = open` (docked OR floating now
   render a region) + `aria-controls = panelDomId(id)` whenever `open`. Focus-return is the float panel's own
   capture-restore (N3) — it captures the bar toggle on open; app-shell's `toggleRefs` stays the docked ✕-close path (S3).

## §3. Contract delta (seam-contract §B — no prop changes)

`ShellPanelProps` is UNCHANGED (S3 already defined `onClose`/`onSetMode`/etc.). S4 adds behavior to the `mode==='float'`
branch only. The panel keeps the SAME `id`/`panelDomId` so the toggle's `aria-controls` resolves in both modes.

- **Docked** (`mode:'dock'`): unchanged (S3) — a `<nav>`/`<aside>` **landmark** (persistent inline chrome).
- **Floating** (`mode:'float'`): scrim + edge-anchored fixed panel + Level-3 elevation + dismiss/focus/motion. **A11y
  role differs by mode (B4):** the float branch is a **`role="dialog"` + `aria-modal="true"`** overlay named by the title
  (`aria-labelledby`→the title node, or `aria-label`), NOT a `<nav>`/`<aside>` landmark — a scrim-backed, focus-trapped
  modal must announce the modal context (WAI-ARIA dialog pattern, §XIV). `aria-modal="true"` is consistent with the live
  top strip: the SR dismiss is Esc; pointer re-toggle serves sighted mouse users. _(N6, optional: the bar toggle may add
  `aria-haspopup="dialog"` in float mode.)_

## §4. Business rules (BR-S4-n)

- **BR-S4-1** Float render = a modal drawer: scrim (click-close) + edge-anchored fixed panel; **content keeps its width**
  (the panel floats OVER, never reflows content). [EC-3]
- **BR-S4-2** Level-3 elevation via `shadow.overlay` (static, B12 — never animated); dark self-cancels → border carries it. [EC-3]
- **BR-S4-3** Dismiss = Esc · click-scrim · re-toggle → `onClose`. [EC-6]
- **BR-S4-4** Focus moves into the panel on open; a TRAP keeps Tab within; on close focus RETURNS to the bar toggle;
  the content/docked wrapper is `inert`+`aria-hidden` while open (applied imperatively via a ref — the Dialog
  `setAttribute` precedent; N5). [EC-6 / §XIV]
- **BR-S4-4a** The float branch is `role="dialog" aria-modal="true"` named by the title (NOT a `<nav>`/`<aside>`
  landmark — that is the docked branch); the modal context must be announced (B4, WAI-ARIA dialog). [EC-6 / §XIV]
- **BR-S4-4b** (g2 fold) Focus-RETURN on dismiss is `onClose` → the bar toggle (`toggleRefs`), reliable for EVERY open
  path incl. the in-panel Dock→Float switch (capture-of-`document.activeElement` would grab `<body>` there — g2 #1);
  focus-IN on open stays the drawer's own effect. [EC-6]
- **BR-S4-4c** (g2 fold) While ANY float is open, the bar toggles are `tabIndex={-1}` — the drawer's focus trap is then
  COMPLETE (no tabbable sibling) + consistent with `aria-modal` (keyboard/SR dismiss = Esc; re-toggle is a pointer
  affordance). The toggle adds `aria-haspopup="dialog"` in float mode. [EC-6 / §XIV / CONFIRMED-1/2/6]
- **BR-S4-4d** Concurrent float panels are UI-UNREACHABLE (the inert wrapper blocks reaching a 2nd panel's Float control);
  coordinated multi-float = S5. Render every floatPanel (no silent-drop guard). [g2 #3]
- **BR-S4-5** Motion = opacity + transform from the anchored edge via an **injected keyframe** with a **visible resting
  base** (fail-safe-visible, NOT `enterStyle`); reduced-motion `@media` → instant; elevation is static. [EC-12]
- **BR-S4-5a** Scrim opacity = **0.5** (match Dialog exactly); raw value = the documented no-scrim-token deviation
  (DEF-U8-c). Panel + scrim at `$overlay` z (above stickyBars/content, below `$modal`). [EC-3/EC-10]
- **BR-S4-6** Float is now ENABLED (S3's `disabled` removed); the bar toggle's `aria-expanded={open}` + `aria-controls`
  cover both modes (both render a region with `panelDomId`). [EC-1]
- **BR-S4-7** Every value a DS token (`$colorSurfaceInverse` scrim · `shadow.overlay` · `$overlay`/`$modal` z · spacing). [EC-10]
- **BR-S4-8** The focus/inert machinery MIRRORS Dialog's ALGORITHM (capture→in→trap→guarded-restore; mount-gated focus
  effect — [[portal-open-focus-needs-a-mount-gated-effect-dep]]) but NOT its body-portal: the float overlay mounts
  **inside the shell's below-strip region** so the top strip stays a live sibling (G1), and `inert` targets the
  content/docked wrapper, never the whole body.

## §5. Implementation order

1. **Extract the shared panel chrome** — refactor `ShellPanel` so the header + body render once, wrapped by either the
   docked frame (S3) or the new floating overlay. Keep the docked path byte-identical in behavior.
2. **Float overlay** — an absolute layer in the below-strip region (NOT a body portal, G1): scrim (0.5, `$colorSurfaceInverse`)
   - edge-anchored fixed panel (`EDGE_ANCHOR` map, all 4 edges inset below the strip) + `shadow.overlay` + the same
     landmark/header/body as docked.
3. **Focus + dismiss** — capture `document.activeElement`→focus-in→trap→guarded-restore (mirror Dialog's algorithm) +
   Esc + scrim-pointerdown + re-toggle; `inert`+`aria-hidden` the content/docked wrapper (NOT the top strip).
4. **Motion** — `enterStyle` opacity+translate per edge, `animation` gated by `useReducedMotion`.
5. **Enable Float** — remove `disabled`; Dock/Float both live.
6. **app-shell** — mount float+open panels (self-portaling) + widen the disclosure (`aria-expanded={open}`, `aria-controls`
   when `open`). Keep `foldDocked` docked-only.
7. **Responsive (N2 — S4/S5 boundary).** S4 renders the FLOATING panel's natural content-fit → **near-full sheet at 375**
   (envision M7 — this is a _float render_ behavior, so it's S4's); no horizontal overflow. **S5 owns** dock-together +
   any docked↔float responsive _policy_ (e.g. preferring float/sheet on mobile) + the full-matrix gate. _(The S3 B1 note
   "mobile near-full-sheet = S5" referred to the awkward DOCKED column at 375, which S5 may resolve by preferring float —
   not a contradiction: S4 builds the float sheet; S5 decides WHEN to force it.)_
8. **Tests** — extend `shell-panel.test.tsx` (float render: scrim present, role/aria, Esc/scrim/re-toggle → onClose, focus
   trap) + `app-shell.test.tsx` (float+open mounts the overlay; toggle `aria-expanded`/`aria-controls`; focus-return).

## §6. Acceptance (§4 — blocking Visual Gate musts)

tsc 0 · eslint 0 · `@vida/web` green · **blocking Visual Gate PASS** (Brave real app, 3 presets × light/dark × 375/768/1440):

- **EC-1** Float is enabled; toggling dock⇄float reflects state.
- **EC-3** floating panel = scrim over content (content keeps width) + Level-3 elevation (light lift / dark self-cancel+border).
- **EC-6** Esc / click-scrim / re-toggle closes; focus returns to the bar toggle; Tab trapped within; background inert.
- **EC-10** every value a DS token; **text AA full-matrix incl. warm-dark**; scrim contrast; axe 0.
- EC-12 (`feel`) motion observed (transform/opacity from edge; reduced-motion instant).

## §7. Out of scope (homed)

Rearrange→`nav_preferences` PERSIST + dock-together cluster + full-matrix reflow + Verification Gate (**S5**) · real panel
bodies + live `nav_preferences` (first-consumer) · PR (**at S5**). `[FACT: slice-map.md:22,47]`
