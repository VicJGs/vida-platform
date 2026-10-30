# Diagnosis: reasoning-error (non-code) — DS-5 token-layer / Visual-Gate misread

Status: diagnosed — NO code fix required (deliverables verified sound). 2026-08-05.
Kind: reasoning/communication error (not a code defect) → diagnosis only, no bug-unit double-gate
(per victor-triage §4 non-defect clause).

## Symptom

Repeated flip-flopping on whether DS-5 has a Visual Gate: "deferred to UI-1" → "token Visual Gate
applies now" → "deferred to UI-1" (correct). Plus an over-reaction loop (branch-topology sync panic;
a temp-toggle hack Victor halted).

## Root cause (one sentence, STRUCTURAL in reasoning)

The error is caused by **conflating DS-5's component-token _references_ with DS-2's token-_value_
authoring** — a three-layer scope confusion — which made me wrongly believe DS-5 "produces a rendered
visual surface", NOT by any flaw in the DS-5 implementation.

## Confirmation against ground truth (files, not assumptions)

- DS-5 commit `dc7d58b` touched ONLY: the 11 contracts, `component.json` (DS-5's layer per ds-2:54/:101),
  and the GENERATED `themes.ts`/`variables.css`. **`primitive.json` + `semantic.json` (DS-2's value layers)
  were NOT touched.** [FACT: `git show dc7d58b --stat`]
- `button.background.primary`: `{color.brand.primary}` → `{color.brand.emphasis}` — a semantic _reference_
  change (which approved value the button points at), grounded in the contrast hand-off ds-2:169. NOT a
  value edit. [FACT: component.json diff]
- Every component-token value is a `{group.name}` ref (no raw literals); no contract hardcodes a hex.
  [FACT: grep clean]
- Per frontend-visual-gate.md render table, DS-5 is in the **Components/Storybook** row (deferred to its
  first-consumer unit UI-1), NOT the Design-tokens/`preview:tokens` row (DS-2/DS-3). DS-5 introduces no
  new token VALUES → no token Visual Gate. [FACT: frontend-visual-gate.md:42-46, :20-27]

## Blast radius

**ZERO on the implementation.** The mistake lived entirely in (a) the `_index.md` status line (corrected)
and (b) my session communication + the halted temp-toggle (never committed). The 10 contracts +
`component.json` were authored on the CORRECT scope understanding (references + contracts) BEFORE the
flip-flop, and were independently gated (components-gate critique REVISE→4 fixed→SHIP).

## Deliverables verdict: DONE PROPERLY

- Scope-clean (no value-layer overstep); all tokens are refs; §II three-layer honored.
- 10 contracts complete (7 sections, §VIII 8-state, §XIV a11y verbatim, B12 motion); components-gate SHIP.
- No dead tokens (post-fix sweep); source-model §0 guard ✓; @vida/ui 31/31; tokens:build ✓.

## Prevention

- **Anchor Visual-Gate applicability to the render-table classification**, don't re-derive it each time.
- A component token that **references** a semantic is NOT a token _value_ — value authoring is DS-2's;
  reference selection is the component layer's (DS-5). Don't conflate the layers.
- On a surprising conclusion: check the doc calmly; do not over-react or invent workarounds. [[dont-over-react-check-the-doc]]
