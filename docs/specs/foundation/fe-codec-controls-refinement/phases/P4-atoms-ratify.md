# P4 · atoms (Button · Input · Checkbox · Select · Tabs · Toast) — RATIFY (forward spec)

> **Phase 4** (final) of fe-codec-controls-refinement (LIF-231). Profile: change-frontend-component · Entity Delivery Flow ②.
> §XXVI gate artifact — **RATIFY mode** (0 production code; the audit is the deliverable, the `xs-backlinks` precedent).
> Status: **gate-1 /critique REVISE→folded (challenged the rubber-stamp → VERIFIED focus-ring uniformity across all 6,
> §1a; one intentional tabs-inset variance, no defect) → RATIFY confirmed → awaiting Approval 1 (0 code; closes the task).**

## 0. Source model

Code-first audit. The question: do the 6 atoms meet the established codec model + the §VIII/§XIV bar, or is there a
concrete gap worth a refinement? No palette-VALUE churn regardless (brand = M4/Figma).

## 1. Audit (ground truth — grep + read across the 6 atoms + their stylesheets)

| Atom         | §VIII hover                                                                                                                                                                                                                                      | §VIII other states                                                                               | Tokens       | Verdict           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------ | ----------------- |
| **Button**   | ✓ own `hoverStyle` + shared `.vida-interactive` press/hover overlay [FACT: button.tsx; interaction-styles.ts:22]                                                                                                                                 | intents · sizes · `loading` · disabled · focus ring (5)                                          | 0 hard-coded | **RATIFY**        |
| **Input**    | ✓ `hoverStyle` ×3 [FACT: input.tsx]                                                                                                                                                                                                              | invalid · disabled · focus                                                                       | 0            | **RATIFY**        |
| **Checkbox** | ✓ shared `.vida-interactive` overlay [FACT: checkbox.tsx uses `vida-interactive`; interaction-styles.ts] — NOT a `.tsx` gap                                                                                                                      | checked · indeterminate · invalid · disabled (off the native pseudo-classes, checkbox-styles.ts) | 0            | **RATIFY**        |
| **Select**   | ✓ `hoverStyle` ×3 + active-option highlight [FACT: select.tsx; select-styles.ts]                                                                                                                                                                 | invalid · disabled · open · focus                                                                | 0            | **RATIFY**        |
| **Tabs**     | ✓ `:hover` label-strengthen [FACT: tabs-styles.ts:33]                                                                                                                                                                                            | roving · active indicator (B12) · disabled                                                       | 0            | **RATIFY**        |
| **Toast**    | ⚠ **MISSING (contract)** — `toast.md:27` requires hover = "**slight elevation** \| overlay opacity"; shipped has ONLY `onMouseEnter={pause}` (functional timer pause), NO visual elevation [FACT: toast.tsx:199; ToastPanel has no hover/shadow] | accent bar · enter/exit motion · live regions                                                    | 0            | **BUILD (slice)** |

**Findings:**

- **0 hard-coded colors** in any atom (all accent-fixed in fe-codec-theme → preset-aware).
- **§VIII complete** — every interactive atom has a hover (its own `hoverStyle`, the shared `.vida-interactive`
  press/hover overlay, or a stylesheet `:hover`), plus focus ring + its state matrix. The two `.tsx` "hover: 0" greps
  (Checkbox, Tabs) are **false gaps** — their hover lives in the shared overlay / the stylesheet (the Toast-reduced-motion
  pattern: conformance one layer down).
- **Density/size aware** (Button/Input/Checkbox/Select/Tabs carry a size scale).
- **No aesthetic headroom** worth a change: these are tight, contract-bound DS-5 primitives. The codec refinements
  (eyebrow/tabular/accent-bar/elevation) are **content/surface-level** (they live on the composed controls P1–P3, not
  the building-block atoms). An atom should stay a quiet, neutral block; adding editorial flourish to a Button/Input
  would be gilding AND would ripple into everything that composes them (a contract change, not a polish).

## 1a. Focus-ring UNIFORMITY verified (gate-1 critique challenge — §VIII non-negotiable)

Read the actual focus-ring declaration in each atom (presence ≠ canonical treatment):

- **Button** `focusVisibleStyle{outlineColor:'$colorFocusRing',outlineWidth:2,solid,outlineOffset:2}` [FACT: button.tsx:32-33] ✓
- **Input** frame-lifted `.vida-input-frame:has(input:focus-visible)` with `$colorFocusRing` [FACT: input.tsx:9-13; input-styles.ts] — focus lands on the inner `<input>`, documented deviation ✓
- **Checkbox** box-lifted `:focus-visible` + `--colorFocusRing` [FACT: checkbox-styles.ts:44] ✓
- **Select** `focusVisibleStyle{$colorFocusRing,2,solid,offset 2}` [FACT: select.tsx:72] ✓
- **Tabs** `$colorFocusRing,2,solid` — **tab ring `outlineOffset:-2` (INSET), panel `+2`** [FACT: tabs.tsx:87,130]. The
  inset tab ring is **deliberate + correct**: an outset ring on a packed tab would overlap neighbors/the indicator — not
  a defect. Color/width/`:focus-visible` are canonical; only the offset SIGN differs, for a valid layout reason.
- **Toast** no own ring — `tabIndex=-1` surface; its action/dismiss are UI-1 `Button`s carrying the canonical ring ✓
  **Result: the non-negotiables (token `$colorFocusRing` · 2px · solid · `:focus-visible`) are UNIFORM across all 6.** The
  single variance (Tabs inset tab ring) is intentional. No divergence to fix → RATIFY stands.

## 1c. Documentation grounding (Victor directive — cross-check each atom vs its DS-5 contract + the quality bar)

Not just the code grep — each atom's SHIPPED state checked against its durable `ds-5-primitive-contracts/<atom>.md`
Visual-States row + the quality bar's 3-lens (WRONG/MISSING/OVERFLOWING, `frontend-quality-bar/_index.md §0`):

- **Button** — every contract state delivered (hover/focus/active/disabled/loading; error N/A) [FACT: button.md:44-53]. ✓
- **Input/Checkbox/Select/Tabs** — contract hover rows ("border strengthens" / "border/fill strengthens" / "border
  strengthens" / "label strengthens") are ALL delivered [FACT: input.md:36, checkbox.md:32, select.md:29, tabs.md:26 vs
  the shipped hover]. ✓ No WRONG/MISSING/OVERFLOWING.
- **Toast — MISSING (the one gap the docs caught):** `toast.md:27` hover = "slight elevation \| overlay opacity"; the
  shipped Toast pauses the timer but renders NO visual elevation. A real contract gap → a BUILD slice, not RATIFY.

## 2. Decision — 5 RATIFY + 1 BUILD (Toast)

**Button · Input · Checkbox · Select · Tabs = RATIFY** (0 code): token-clean, §VIII/§XIV-complete, contract hover rows
delivered, focus-ring uniform (§1a), density/preset-aware. No concrete gap, no proportionate aesthetic refinement
(gilding an atom ripples into everything that composes it). The `xs-backlinks` RATIFY shape for these 5.
**Toast = BUILD** — deliver the contract-missing hover "slight elevation" (overlay-opacity mechanism, the Card
elevation precedent). ⚠ Mechanism note: ToastPanel has `overflow:hidden` (clips the accent bar), which would CLIP a
Card-style raised-shadow overlay CHILD → the Toast slice needs its own forward spec to resolve the mechanism (overlay
outside the clip, or an instant-hover panel shadow — a §XXVI slice decision), NOT folded here.

## 3. Contract

No change to any atom. No new token, no new dep, no API change.

## 4. Acceptance

- The audit above is grounded (every row cites code). No atom has an unaddressed §VIII state or a hard-coded color.
- No Visual Gate run needed (0 render change) — the atoms' own UI-1 Visual Gates stand; fe-codec-theme already
  preset-verified them. `@vida/ui` suite unchanged (no code); tsc 0; eslint 0 (nothing touched).
- §XXIX: a CLAUDE.md note recording the P4 RATIFY (atoms audited at the bar) + the task close-out.
- **Carry-forward (NOT P4):** the pre-existing danger-signal contrast (`#ef4444` = 3.63, M4/Figma) from P3 — a palette
  concern, already homed as an M4 follow-up.

## 5. Implementation prompt

None (RATIFY — 0 code). Promote the audit to the CLAUDE.md currency note; close P4 + the fe-codec-controls-refinement
task (all 4 phases complete). If gate-1 /critique finds an atom NOT at the bar, that atom becomes a real build slice and
this flips out of RATIFY.
