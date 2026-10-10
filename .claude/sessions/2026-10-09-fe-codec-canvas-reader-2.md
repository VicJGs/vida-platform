---
Session 2 — 2026-10-09
Goal: ② Frontend unit #9 — CODEC Canvas: Reader; build S3 (margin rail) + S4 (selection affordance)
Profile: Add Frontend Component / Default (Entity Delivery Flow ②)
Branch: fe-codec-canvas-reader (off origin/main; now 4 commits; NOT merged — 4/6 slices; merge at slice 6)
---

## Accomplished
- **S3 — Margin rail (annotations)** (`@vida/ui`, `b4ba5bf`): the right Body zone completes the living margin.
  `annotationGroups:AnnotationGroup[]` (PRE-GROUPED by chapter — the adapter S6 groups, the shell never sorts/parses) +
  `ReaderAnnotation{id,nature,text,location}` + `annotationsState:ViewState` + `railOpen`/`onToggleRail`/`onAddNote`/
  `onLinkAnnotation`. **IR-1 shell-enforced by construction** (`linkable = nature!=='highlight'` gates affordances before
  handler presence → a highlight never shows Add-note/Link, EC-5). Three distinct natures (shape-differentiated accent
  markers + labels), grouped-by-chapter with counts (total + per-chapter), 3-line-clamped excerpts, 4-state `RailBody`,
  "Annotations" toggle. Full §XXVI double-gate + g2 review SHIP + blocking Visual Gate PASS.
- **S4 — Selection affordance** (`@vida/ui`, `d7bd5aa`): two exported pieces the consumer composes in `renderContent`
  (the shell can't own/anchor into the body it doesn't render). **`SelectionActions`** = a `role="toolbar"` (Tab-stops) of
  real inline-SVG icon buttons (Highlight·Quote·Bookmark·Listen-from-here; EC-15 no emoji; `currentColor` → ghost accent
  via ButtonText), render-when-handler, `size="lg"` 44×44, Listen gated by `listenAvailable` (IR-7); **`ReaderHighlightMark`**
  = a 2px accent-underline inline mark (EC-3), font+colour inherited (hold the text). The 4 `on*Selection` moved OFF
  `CanvasReaderProps`. Barrel also closed the S3 gap (`Nature`/`ReaderAnnotation`/`AnnotationGroup` now exported). Full
  §XXVI double-gate + g2 review SHIP + blocking Visual Gate PASS.
- Gates/tests: tsc 0 · eslint 0 (S4 files; the `index.ts:1` triple-slash is a pre-existing intentional B16 line) ·
  **33/33 canvas-reader** · full `@vida/ui` **503/503** green (one known untouched-file concurrency flake, green on re-run).
- §XXIX currency promoted each slice: `packages/ui/src/CLAUDE.md` + `docs/specs/components/ui-2-platform-views/canvas-reader.md`
  (S3/S4 contract + rules + verification) + the delivery slice-map gate ledger.

## Decisions Made
- **S3 pre-grouped contract** (`annotationGroups`, not a flat array) — EC-14 needs chapter grouping; the shell has no chapter
  key on a flat `{location:ReactNode}[]` + must not derive/sort (board/list-view `sections` precedent). `/contract` refine.
- **S3 `annotationsState: ViewState`** (not `ReaderState`) — `unavailable` is a reading-file concept, not an annotations one.
- **S4 surfacing model** — exported consumer-composed pieces, callbacks off `CanvasReaderProps`. Doc-resolved
  (IR-NEEDS-3: the body is a `renderContent` slot the shell can't anchor into; EC-12 "in-place" needs the consumer's
  Range); the independent critic UPHELD it as doc-forced and killed the two alternatives (shell `selectionActive` bar /
  `renderSelection` render-prop). Victor-approved at Approval 1.
- **S4 icon-button `size="lg"`** (48px, ≈56×48 ≥ 44×44) — the gate-1 critic caught `size="sm"` (32px) as below the §X floor.
- **S4 highlight mark = 2px accent `borderBottom`** (text held) — token-pure (no accent-surface token; list-view P1 lesson).

## Open Questions
- None blocking. Watch at S5: listen is a **persistent control the shell CAN render** (unlike the selection, which the
  shell can't own) — it's a slim bar on the frame, not a consumer-composed piece. Reuse the S4 inline-SVG icon pattern
  (play/pause) + the `HonestProgress` bar; IR-7 degrade to a calm "unavailable" state (never an error). `onListenToggle`.

## Next Session
First step: **S5 — Listen control** (EC-7 / EC-15) — the slim persistent listen bar: idle / playing (`HonestProgress`) /
unavailable (calm, IR-7) · real SVG play/pause icons (reuse the S4 `HighlightIcon`-style inline-SVG + currentColor pattern) ·
`onListenToggle` intent. Full §XXVI double-gate + blocking Visual Gate. Then S6 (apps/web Books↔Reader adapter — display-
resolve · the Verification Gate) → **PR at slice 6**.
Context to reload: `delivery/slice-map.md` (S5 row) + `delivery/seam-contract.md` §A (the `listen`/`listenProgress`/
`onListenToggle` props) + `delivery/interpretation.md` (IR-7 listen≠audiobook, TTS degrade) + `delivery/envision.md` (EC-7) +
`packages/ui/src/components/canvas-reader.tsx` (the S4 icon pattern + the header, where the listen bar likely sits) +
`packages/ui/src/CLAUDE.md` (the canvas-reader entry). Use Node 24 for tests/Storybook; Visual Gate = Brave via Playwright
(`/tmp/gate-s4.mjs` pattern). Branch `fe-codec-canvas-reader` (continue; merge at slice 6).
