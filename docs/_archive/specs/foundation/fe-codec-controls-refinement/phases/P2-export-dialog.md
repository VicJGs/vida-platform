# P2 · export-dialog — radio-row refinement + §VIII hover gap (forward spec)

> **Phase 2** of fe-codec-controls-refinement (LIF-231). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact (the PLAN). Acceptance oracle = the blocking Visual Gate (Brave, 3 presets × light/dark).
> Status: **gate-1 REVISE→folded → Approval 1 ✅ → preflight PASSED (§4b) → gate-2 REVISE→folded → Approval 2 ✅ →
> IMPLEMENTED → Visual Gate PASS → pre-ship /critique SHIP → DONE.** tsc 0 · @vida/ui 412 tests · eslint 0. Visual Gate:
> Brave, 3 presets × light/dark — hover bg `rgba(0,0,0,0)`→`$colorSurfaceSecondary` · accent bar flips per preset
> (editorial blue / reader oxblood / quietDesk olive) · exactly 1 bar/selected row · AA 4.94–6.53 · axe 0 · 375 fit.
> Gate script: `/tmp/vg/export-gate.mjs`.

## 0. Source model

Code-first. Tokens/variants only; no hard-coded palette; no palette-VALUE churn. No new dep.

## 1. Baseline (ground truth — `packages/ui/src/components/export-dialog.tsx` + v6 spec)

`ExportDialog` is **UI-2 · V6** — a presentational export modal that **composes UI-1 `Dialog`** (title/description/footer
props) + a hand-rolled APG `role="radiogroup"` of `role="radio"` divs + `Button`s. [FACT: export-dialog.tsx:131-179]

**What export-dialog OWNS (the P2 surface):** the `RadioGroup` + each `Radio` row (border box · `Dot` radio indicator ·
label · spacer · ext). [FACT: export-dialog.tsx:42-68]
**What it does NOT own (→ P3, not P2):** the **title** (`title` string → Dialog renders it, ED-1) and the instructional
**description** (Dialog's `description` prop) — both are **Dialog chrome**, refined in P3. P2 must not touch them.

**Current `Radio` styled (the gap):** `flexDirection:row · gap:$12 · padding:$12 · borderWidth:1 ·
borderColor:$colorBorderDefault · borderRadius:$md · cursor:pointer · focusVisibleStyle{…}`; variants `selected →
borderColor:$colorBrandPrimary`, `disabled → opacity 0.5`. **⚠ NO `hoverStyle`** — a §VIII conformance gap (hover must be
visually distinct). [FACT: export-dialog.tsx:43-57]

## 2. The crux (the refinement boundary — all Layer-1, no API change)

export-dialog has LOW headroom (thin Dialog-composing modal); the honest P2 surface is the Radio rows:

- **R1 · hover state (§VIII conformance fix — the one real gap):** add `hoverStyle` to the base `Radio` — a subtle
  `backgroundColor:'$colorSurfaceSecondary'` (perceivable, not color-sole since it's a fill change; the §VIII "at least
  one of bg/border/shadow" rule). Suppressed when `disabled` (the variant drops it, the checkbox/card precedent).
- **R2 · accent-as-moment on the selected row = an absolute left accent BAR (the Toast precedent — no layout shift).**
  Today selection = all-around `borderColor:$colorBrandPrimary` (ED-6). Refine to a **3px left accent bar** via the
  **Toast mechanism** [FACT: toast.tsx:96,108,116,120 — panel `position:relative`+`overflow:hidden`, an absolute
  `width:3` bar]: the `Radio` gets `position:relative`+`overflow:hidden`, and an `aria-hidden` absolute bar
  (`left:0 top:0 bottom:0 width:3`, `$colorBrandPrimary`) renders when selected. **Token-pure, NO new token, NO palette
  churn, NO layout shift** (preflight found a `borderLeftWidth` 1→3 would jump content 2px on a bordered box — the
  absolute bar avoids it). **⚠ Toast model = NEUTRAL border + the bar as the SOLE accent (gate-2 fix):** REMOVE
  `borderColor:$colorBrandPrimary` from the `selected` variant — the selected row keeps the **default
  `$colorBorderDefault` border**; the accent is the **3px bar + the filled `Dot`** (not a brand border AND bar doubled
  into a heavy ~4px left edge). Quiet border, one clear accent moment. `overflow:hidden` clips the bar to the radius,
  NOT the focus outline (outlines ignore overflow).
- **R3 · hairline rhythm + spacing:** confirm `padding`/`gap`/`borderRadius` land on the 4pt grid + read as intentional
  (design §IV); align the ext to the trailing edge cleanly; keep the `Dot` crisp.

**NOT in P2:** the title/description typography (Dialog-owned → P3); the roving-focus/keyboard/busy/self-heal logic
(ED-2…ED-5, UNTOUCHED — presentation only); `.ext` is not numeric → **no tabular** (the plan bullet was speculative).

## 3. Contract

**No `ExportDialogProps` change.** P2 is internal styled-host refinement (the `Radio`/`Dot`/`RadioGroup` styled defs +
hover variant). Zero API surface, non-breaking by construction.

## 4. Acceptance

- **Visual Gate (blocking):** Brave, 3 presets × light/dark. Assert: **hover** on a radio row is visually distinct
  (bg/border change, measured via computed style on `:hover`) and suppressed on the disabled/busy rows; **selected**
  row reads as the clear accent-as-moment (brand, flips per preset); **hairline rhythm** (4pt padding/gap); the ext is
  muted + aligned; **full-matrix AA** on label (primary) + ext (muted) incl. warm-dark (≥ 4.5); **375** the dialog panel
  - rows fit (no overflow).
- **a11y (UNCHANGED):** `role="radiogroup"`/`role="radio"`, roving tabindex, `aria-checked`, busy→`tabIndex=-1`+
  `aria-disabled` (ED-4), focus-into on the selected radio (ED-5) — all intact. axe 0. The hover adds no role/aria.
- **Logic UNCHANGED:** selection self-heal (ED-2b), keyboard (↑↓←→/Home/End/Space), Export/Cancel, busy — all existing
  export-dialog tests green. **Hover is the Visual Gate's assertion** (Brave `:hover` computed style — jsdom has no
  `:hover`, so NO brittle jsdom hover test); unit tests stay on logic + add only a selected-row accent-tick render check
  if cheap. `@vida/ui` suite green; tsc 0; eslint 0.
- **§XXIX currency:** `packages/ui/src/CLAUDE.md` (export-dialog paragraph: +hover/accent refinement) + v6 spec change-log.

## 4b. Preflight RESULT (2026-10-06 — PASSED, grounded in code)

- **V1 (R2 mechanism) RESOLVED → Toast absolute-bar, NOT a border-width change.** Preflight finding: a `borderLeftWidth`
  1→3 on the bordered radio box would shift content 2px on select (layout jump). Use the Toast accent precedent instead
  — `Radio` `position:relative`+`overflow:hidden` + an `aria-hidden` absolute `width:3` left bar shown when selected
  [FACT: toast.tsx:96,108,116,120]. Zero layout shift; token-pure.
- **V2 RESOLVED** — `$colorSurfaceSecondary` exists (themes.ts, 10 refs; the track/skeleton surface) → the subtle hover
  fill. Reads against the Dialog panel `$colorSurfacePrimary` at the gate (confirmed in the Visual Gate matrix).
- **V3 RESOLVED** — disabled cancels hover via a neutralizing `hoverStyle` in the `disabled` variant [FACT: select.tsx:82
  `disabled: { true: { …, hoverStyle: { borderColor: '$colorBorderDefault' } } }`] — mirror it: `disabled` variant sets
  `hoverStyle:{ backgroundColor:'transparent' }`. Selected still reads (the bar + border are not hover-gated).

## 4a. Preflight + /verify (resolved above in §4b)

## 5. Implementation prompt

Types-first: no prop change. In `export-dialog.tsx`: (R1) add `hoverStyle:{ backgroundColor:'$colorSurfaceSecondary' }`
to the base `Radio` styled; `disabled` variant cancels it via `hoverStyle:{backgroundColor:'transparent'}` (select.tsx:82
precedent). (R2) accent BAR: `Radio` `position:relative`+`overflow:hidden`; **REMOVE `borderColor:'$colorBrandPrimary'` from the
`selected` variant (keep the default border)**; render an `aria-hidden` absolute bar (`left/top/bottom:0`, `width:3`,
`backgroundColor:'$colorBrandPrimary'`) when `isSel` (the Toast accent precedent; the bar + Dot are the sole accent; no
layout shift). (R3) tune padding/gap/radius to the 4pt rhythm + ext alignment;
keep `Dot`/`DotInner` crisp. Do NOT touch the radiogroup keyboard/roving/busy/self-heal logic or the Dialog composition.
Update `.stories.tsx` (ensure a hover-observable + selected + busy cell) + tests (hover rule present; disabled none) +
§XXIX currency. Any divergence → §XXVIII.
