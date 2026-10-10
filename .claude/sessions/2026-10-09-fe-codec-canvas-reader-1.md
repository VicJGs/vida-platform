---
Session 1 — 2026-10-09
Goal: ② Frontend unit #9 — CODEC Canvas: Reader (read·listen·annotate), @vida/ui shell
Profile: Add Frontend Component / Default (Entity Delivery Flow ②)
Branch: fe-codec-canvas-reader (off origin/main; 2 commits; NOT merged — 2/6 slices)
---

## Accomplished
- **Entity Front Matter — gated & approved** (`docs/specs/foundation/fe-codec-canvas-reader/delivery/`):
  - **Interpretation** (`interpretation.md`) — IR-1…IR-10, each `[FACT: path:line]`. Key: the backend already defers
    "the read/listen/annotate chrome" to this unit (`service.ts:177` / BR-BK-S6-6); `openReader → ReaderContext`.
  - **Envision** (`envision.md`) — §3.75 FIRED; throwaway greybox built in Storybook, rendered in Brave across the
    matrix (retired after the gate). **EC-1…EC-15 approved** after one review round (Victor's 3 additions folded).
  - **Decomposition** (`slice-map.md` + `seam-contract.md`) — 6 slices, all `frontend`, coverage holds (14 structural
    ECs → ≥1 slice). NO `@vida/core` change (consumes shipped Books).
- **S1 — CanvasReader frame + reading column + states** (`@vida/ui`, `a9dfe21`): title-hero header (serif `$display`,
  plain context, conditional `HonestProgress` bar, saveStatus/⋯, `gap:$16`), `positionNote` (IR-3), `renderContent`
  slot, 5 states via local `ReaderState = ViewState | 'unavailable'` (unavailable≠empty). 9 tests. Visual Gate PASS.
- **S2 — Contents panel (summary + TOC)** (`fcad3b8`): `ReaderChapter` + summary/chapters/contentsOpen/onToggle/onJump;
  shell-owned TOC (completion ✓ · current accent+`aria-current` · pressable-when-jump) + "Contents" toggle; realizes the
  living-margin layout. **Header reflow fix** (flexWrap + floor) — benefits S1. 16 tests. Visual Gate PASS.
- Reconciled `fe-codec-flow-session` task status in-progress→done (matched Linear; Victor confirmed shipped).

## Decisions Made
- **Summary home → a book-level Notes page** (`entity_type='book'`), NOT a schema column — doc-fixed (`conventions.md:20`
  "never inline columns"). The Reader consumes it via Notes.
- **Annotation anchor → display-resolve against the TOC + honest native position** — doc-fixed (`conventions.md:6-8`,
  `structure-data.md:73` "mapping anchors point at [the TOC], never duplicate it"). Structured chapter/page/line columns
  would be doc-contrary. Cross-format mapping stays the deferred design pass (BK-4).
- **Middle-dot → keep for location breadcrumbs, plain-language header context** — no repo rule; flow-session precedent.
- **Accent → BOTH** (Victor): oxblood carries the live reading signal AND the annotation nature-markers (not concentrated).
- **IR-1 shell-enforced** (at S3): a highlight row renders no link/note by construction → `AnnotationNotLinkableError`
  unreachable from the UI.
- **Header reflow fix** in the shared Header (flexWrap + TitleGroup minWidth:240 + aside flexShrink:0).

## Open Questions
- None blocking. Watch at S3: IR-1 enforcement is the load-bearing checkpoint (EC-5); the annotation `location` arrives
  pre-resolved from the S6 adapter (the shell never parses `position`).

## Next Session
First step: **S3 — margin rail** (annotations) — EC-5 (IR-1 highlight-never-linkable, shell-enforced) · EC-6 (3 distinct
natures) · EC-14 (grouped-by-chapter, N-per-nature, resolved location). Full §XXVI double-gate + blocking Visual Gate.
Context to reload: `delivery/slice-map.md` (S3 row) + `delivery/seam-contract.md` §A (the annotation props + IR-1 rule) +
`delivery/interpretation.md` (IR-1/IR-2/IR-8/IR-10) + `packages/ui/src/components/canvas-reader.tsx` (extend the Body
with the rail zone) + `packages/ui/src/CLAUDE.md` (the canvas-reader entry). Use Node 24 for tests/Storybook; Visual Gate
= Brave via Playwright (`/tmp/gate-s2.mjs` pattern). Branch `fe-codec-canvas-reader` (continue; merge at slice 6).
