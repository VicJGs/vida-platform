# P3 · overlay chrome (Dialog · Popover · Menu) — Level-3 elevation (forward spec)

> **Phase 3** of fe-codec-controls-refinement (LIF-231). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = the blocking Visual Gate (Brave, 3 presets × light/dark).
> Status: **gate-1 REVISE→folded → Approval 1 ✅ → preflight PASSED (§4b) → gate-2 SHIP → Approval 2 ✅ → IMPLEMENTED →
> Visual Gate PASS → DONE.** tsc 0 · @vida/ui 412 tests · eslint 0. Visual Gate: Brave, 3 overlays × 3 presets × light/dark —
> `box-shadow:shadow.overlay` present all 18 cells · light = Level-3 lift · dark = self-cancel (subtle, not a halo, screenshot-confirmed) ·
> axe 0 EXCEPT **1 pre-existing** danger-menu-item contrast (`#ef4444`/surface = 3.63, provisional ds-2 palette → M4/Figma; NOT
> P3 — a box-shadow can't affect text contrast). Gate script `/tmp/vg/p3-gate.mjs`.

## 0. Source model
Code-first. No hard-coded palette; no new token (reuse the shipped `shadow.overlay`); no new dep. No API change.

## 1. Baseline (ground truth) + the audit
The three overlay primitives are **already well-refined** — most P3 plan bullets are RATIFY:
- **RATIFY · Dialog title already serif-display** — `DialogTitle` is `fontFamily:'$display'` / `fontSize:'$heading'`
  (`render:'h2'`) [FACT: dialog.tsx:107-111]. Popover + Menu carry **no title** (anchored/command surfaces). No work.
- **RATIFY · Menu item hover + active already shipped** — `MenuItemRow` has `hoverStyle:{backgroundColor:'$colorSurfaceSecondary}`
  + an `active` variant + a `disabled` hover-cancel [FACT: menu.tsx:94-98] — the same §VIII-complete pattern P2 added to
  export-dialog. No work.

**The ONE real gap (design §V):** no overlay panel has an **elevation shadow**. `DialogPanel` / `PopoverPanel` /
`MenuPanel` float above content with only a **1px border + surface**, no shadow [FACT: dialog.tsx:84-94, popover.tsx:85-93,
menu.tsx:71-76]. Overlays are **Level-3 elevation** (design §V "Level 3 (overlay): modals, dropdowns, tooltips") — they
have none. And `shadow.ts` ships an **`overlay`** token (`0 12px 32px -4px rgba(15,23,42,0.18)`) named for exactly this,
**currently unused** [FACT: themes/shadow.ts].

## 2. The crux (one shared refinement — all presentational, no API change)
**Apply `shadow.overlay` (Level-3) to the three overlay panels**, via the **injected-stylesheet elevation mechanism**
(the Card precedent: `card-styles.ts` injects `box-shadow` reading `shadow.ts` [FACT: card-styles.ts:1,29]). Each panel
already has a stable class + an injected stylesheet:
- `internal/dialog-styles.ts` → `.vida-dialog-panel`
- `internal/popover-styles.ts` → `.vida-popover-panel`
- `internal/menu-styles.ts` → `.vida-menu-panel`
Add `box-shadow:${shadow.overlay}` to each panel's **base** rule (static — NOT animated; the enter keyframes stay
transform/opacity-only, B12). Import `shadow` from `../themes/shadow` in each (as `card-styles.ts` does).

**Dark mode (design §XI — self-cancel by construction, gate confirms):** `shadow.overlay`'s COLOR is
`rgba(15,23,42,·)` = **the dark surface/page color**. So on dark it blends to near-nothing — the **same self-cancel**
that makes the Card's resting shadow vanish in dark (design §XI "Shadows in dark mode are reduced or replaced by subtle
borders"; the 1px panel border carries dark elevation). This satisfies §XI **by construction**, not by a mode check. The
ONLY open question: `shadow.overlay` is `0.18` alpha (3× the resting `0.06` that definitely self-cancels) — is it low
enough on navy to vanish, or does it leave a faint halo? **The Visual Gate CONFIRMS the self-cancel holds at 0.18**; if a
halo shows, the fallback is a reduced dark shadow targeting the dark `<html>` scheme class (V1).

**Spacing rhythm (R3):** verify the panel padding/radius land on the 4pt grid + read intentionally (likely already
conformant — `borderRadius:'$lg'`, padding tokens). Change only if a value is off-grid.

## 3. Contract
**No prop change** on any of the three. P3 = injected-CSS elevation (3 stylesheets) + the RATIFY notes. Non-breaking.

## 4. Acceptance
- **Visual Gate (blocking):** Brave, 3 presets × light/dark. For **each** of Dialog / Popover / Menu (open each):
  - **light:** the panel shows the `shadow.overlay` Level-3 lift (measured — `box-shadow` present + non-none on the
    panel's computed style), clearly separating it from the content beneath;
  - **dark:** the panel reads as elevated WITHOUT a harsh halo — border + (subtle or reduced) shadow separate it; if the
    0.18 halo is too heavy, apply a dark reduction (V1);
  - the enter motion still animates (transform/opacity) and the shadow is static (no shadow animation);
  - **full-matrix AA** unaffected (the shadow doesn't touch text contrast); axe 0; 375 unaffected.
- **RATIFY verified:** Dialog title still `$display`; menu hover/active intact (no regression).
- **Tests:** existing dialog/popover/menu suites green (the injected shadow is presentation-only — no behavior change);
  no new logic test needed (elevation is a Visual-Gate concern, like the card elevation). `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (the 3 overlay paragraphs: +Level-3 elevation) + the v-specs' change logs.

## 4b. Preflight RESULT (2026-10-06 — PASSED, grounded in the 3 stylesheets)
- **V2 RESOLVED — base panel rule exists in all 3.** `dialog-styles.ts` `.vida-dialog-panel{animation:…both}`;
  `popover-styles.ts` `.vida-popover-panel{opacity:0;transform…;transition:opacity,transform}`; `menu-styles.ts`
  `.vida-menu-panel{opacity:0;transition:opacity,transform}` [FACT: the 3 files]. Add `box-shadow:${shadow.overlay}` to
  each base rule; `import { shadow } from '../themes/shadow'` per file (the `card-styles.ts` pattern). **⚠ Each transition
  is EXPLICIT `opacity,transform` (NOT `all`)** → box-shadow stays STATIC (no B12 shadow-animation by accident).
- **V3 RESOLVED — no clipping.** Panels portal to `<body>` (no clipping ancestor); an element's own `overflow` never
  clips its OWN box-shadow (paints outside the border box) → Menu/Dialog overflow irrelevant, Popover `overflow:visible`
  already safe. No change needed.
- **V1 — dark self-cancel (expected; gate confirms).** `shadow.overlay` = navy `rgba(15,23,42,0.18)` on the dark
  scrim/page (same hue) → low-contrast, blends (§XI by construction). Gate verifies 0.18 vanishes; fallback = a reduced
  shadow on the dark scheme-class rule.

## 4a. Preflight + /verify (resolved above in §4b)
- **V1 — dark self-cancel CONFIRM (expected to hold):** `shadow.overlay` color = the dark surface `rgba(15,23,42,·)` →
  self-cancels in dark by the Card mechanism (§XI by construction). Gate CONFIRMS the `0.18` alpha vanishes on navy (vs
  resting `0.06`); if a faint halo shows, fallback = a reduced shadow on the dark `<html>` scheme-class rule. Not an open
  design choice — a grounded expectation the gate verifies.
- **V2 — stylesheet base-rule target:** confirm each `internal/*-styles.ts` has (or gets) a **base** `.vida-*-panel`
  rule to carry the static `box-shadow` (vs only keyframe/`.is-open` rules). Dialog's "visible resting base" suggests a
  base rule exists; add one where needed.
- **V3 — no double-elevation / clip:** confirm the shadow isn't clipped by an ancestor `overflow:hidden` (Popover keeps
  `overflow:visible` for the arrow; Menu/Dialog panels — verify the shadow paints outside the panel box).

## 5. Implementation prompt
In each of `internal/dialog-styles.ts`, `popover-styles.ts`, `menu-styles.ts`: `import { shadow } from '../themes/shadow'`
and add `box-shadow:${shadow.overlay}` to the base panel rule (`.vida-dialog-panel` / `.vida-popover-panel` /
`.vida-menu-panel`) — create the base rule if only keyframe rules exist. Static only (no transition on box-shadow). Verify
spacing on-grid (change only if off). Update the 3 CLAUDE.md overlay paragraphs + the v-spec change logs. Visual Gate
across the 3 overlays × preset × mode; resolve V1 (dark) at the gate. Any divergence → §XXVIII.
