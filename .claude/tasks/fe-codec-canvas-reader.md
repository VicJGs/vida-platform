# Task: fe-codec-canvas-reader
# Status: in-progress
# Linear: LIF-206
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #9 · NEW

## Goal
② Frontend — unit #9. CODEC · Canvas: Reader — read·listen·annotate.

## Dependencies
- blocked by `fe-codec-patterns`

## Entity Front Matter — GATED & APPROVED (2026-10-09)
Delivery docs: `docs/specs/foundation/fe-codec-canvas-reader/delivery/`
- **Step 0 BASELINE** — @vida/ui layer (current) · Books `current-*` (shipped) · token-pipeline (current). No refresh needed.
- **Step 1 INTERPRETATION ✅** — `interpretation.md`; IR-1…IR-10 (highlight-never-linkable · not-synced position · TTS deny-safe · summary=Notes-page · anchor=display-resolve · N-per-nature).
- **Step 1.5 ENVISION ✅ APPROVED** — `envision.md`; §3.75 FIRED; greybox rendered (retired); **EC-1…EC-15** pinned. 4 decisions: summary→Notes page (doc-fixed) · anchor→display-resolve vs TOC (doc-fixed) · middle-dot→breadcrumb-keeps/header-plain (precedent) · **accent→BOTH (Victor)**.
- **Step 2 DECOMPOSITION ✅ APPROVED** — `slice-map.md` + `seam-contract.md`; 6 slices, all `frontend`, coverage holds (14 structural ECs → ≥1 slice). NO `@vida/core` change.

## Build Steps (per-slice §XXVI double-gate + blocking Visual Gate)
- [x] S1 — CanvasReader frame + reading column + states (@vida/ui) — EC-1/2/3/8/9/10/11 — ✅ Visual Gate PASS (tsc 0 · eslint 0 · 9/9 tests · AA 0-fail incl warm-dark); §XXIX CLAUDE.md + canvas-reader.md current
- [x] S2 — Contents panel (summary + TOC) (@vida/ui) — EC-13 — ✅ Visual Gate PASS (tsc 0 · eslint 0 · 16/16 · AA 0-fail incl warm-dark; living-margin realized; Header flexWrap fix for 375 word-wrap, benefits S1)
- [x] S3 — Margin rail (annotations, IR-1) (@vida/ui) — EC-5/6/14 — ✅ Visual Gate PASS (tsc 0 · eslint 0 · 26/26 · text AA 0-fail worst 4.52 · marker 3:1 0-fail 4.95–6.41 incl. warm-dark · IR-1 every cell · axe 0 · stacks 390/768); pre-grouped `annotationGroups` + `annotationsState:ViewState` (§3 /contract refinements); g2 review SHIP; §XXIX CLAUDE.md + canvas-reader.md current
- [ ] S4 — Selection affordance (@vida/ui) — EC-4/3
- [ ] S5 — Listen control (SVG icons) (@vida/ui) — EC-7/15
- [ ] S6 — apps/web Books↔Reader adapter (display-resolve) — EC-14 (Verification Gate)

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|
| Envision | Greybox capture: Brave CLI `--screenshot` hangs | Known env issue (repo gate uses Playwright/CDP, not CLI) | Switched to Playwright (`playwright@1.62.1`) driving Brave via `executablePath`; full-page screenshots |
| Envision | Victor added 3 shape reqs (icons not emoji · summary+TOC · N-annotations anchored book→chapter→page→line) | Vision review | Folded into greybox round-2; surfaced 2 schema realities (summary=Notes page · anchor=display-resolve) — both doc-fixed |
| S2 Visual Gate | serif `$display` title broke MID-WORD at 375 | RNW `min-width:0` flex-collapse squeezed TitleGroup under the aside | Header `flexWrap` + `TitleGroup minWidth:240` + aside `flexShrink:0` (benefits S1 too) |

- 2026-10-09 — front matter gated+approved → S1 built+gated (`a9dfe21`) → S2 built+gated (`fcad3b8`) → S3 margin rail
  built+gated (full §XXVI double-gate: critique REVISE→folded [marker 3:1 · 3-line clamp] · preflight PASSED→2 folds
  [numberOfLines · titleLevel] · critique SHIP; g2 review SHIP; blocking Visual Gate PASS). Next: S4 selection affordance.
