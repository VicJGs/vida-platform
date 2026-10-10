# Task: fe-codec-canvas-editor
# Status: done — LIF-234 → Done · PR #123 merged (2026-10-10, `9cd2a37`)
# Linear: LIF-234 (created 2026-10-10 — reshape gap closed; blocked-by LIF-211, blocks LIF-187/LIF-191)
# Activated: 2026-10-10 (G6 unit #7; sole remaining unbuilt CODEC archetype shell after shell #14 merged; dep fe-codec-patterns ✅)
# Branch: fe-codec-canvas-editor (off origin/main @ f540b83) · worktree: .claude/worktrees/fe-codec-canvas-editor · Node 24 for @vida/ui
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (g6-reshape-runbook.md:37 + reconstructed-structure.md:27) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #7 · reuse UI-3 (@vida/editor)

## Goal
② Frontend — unit #7. CODEC · Canvas: Editor (the TipTap block canvas + the 11+11 block registry wiring).

## Dependencies
- blocked by `fe-codec-patterns` (LIF-211 ✅ done)
- blocks `fe-codec-seams` (#13, done — deferred around it), `fe-home` (#18), `fe-notes-and-pages` (#27)

## Scenario
add-frontend-component / Default (Entity Delivery Flow ②). Worktree `.claude/worktrees/fe-codec-canvas-editor` off origin/main. Node 24 for @vida/ui.

## Setup note (Linear reconcile — DONE)
LIF-234 created 2026-10-10 (Victor-approved) closing the reshape gap — #7 had no issue (g6-reshape-runbook.md:37
defines it; the reshape created LIF-202…221 but canvas-editor was never materialized). Cloned from LIF-206:
team Personal_Victor · project M1 — Whole Manual OS · milestone M1.2.1 · label `frontend` · In Progress.
Relations: blocked-by LIF-211 (patterns, done) · blocks LIF-187 (home #18) + LIF-191 (notes #27).
Omitted the historical blocks→LIF-212 (seams #13) edge — seams already shipped-around #7, so a blocker on a
Done issue would only create false "blocked" noise ([[verify-misses-status-drift-and-stale-linear-relations]]).
OPEN drift for close-out: LIF-204 (canvas-board) + LIF-205 (canvas-graph) still show "In Progress" in Linear
but are merged/Done (auto-mode denied fixing them mid-setup; needs explicit OK or do at /session-end).

## Slice log
- **Front matter — DONE**: interpretation.md (IR-1…7, §5.1 persistence=doc-resolved thin+defer) · **Envision gate FIRED + Victor-APPROVED** (EC-1…EC-11; feel correction "editor/notebook page" applied — paper sheet on a desk, opened frame, EC-7 dark-text fix) · Decomposition (slice-map 3 slices + seam-contract, **gate-1 critic SHIP + 2 NITs folded**, Approval 1 ✅). Delivery docs `docs/specs/foundation/fe-codec-canvas-editor/delivery/`.
- **S1 `@vida/editor` extension — DONE**: `chrome?:'framed'|'bare'` prop on `VidaEditorProps` + `EditorFrame` variant (`bare` zeroes border/bg/radius/padding, keeps `.vida-editor-frame` host → focus-ring survives) + `defaultVariants:{chrome:'framed'}` back-compat · **EC-7**: `.ProseMirror{color:var(--colorTextPrimary);line-height:1.7}` in `editor-styles.ts` (dark-mode readability bug the greybox caught; benefits every mount; font-size/family stay host-owned). editor.tsx · internal/editor-styles.ts · editor.test.tsx (+2 tests). tsc 0 · **@vida/editor 226/226** · **Visual Gate PASS** (Brave: framed + bare × light/dark — text readable both modes incl. dark EC-7; framed keeps border; bare opens the box). Per-slice g1 = decomposition gate-1 critic (verified chrome/EC-7/focus-ring against code) + self-review; g2 independent review deferred to the PR-level review with S2/S3.
- **S2 `apps/web` `CanvasEditor` composition — DONE**: `canvas-editor.tsx` (CanvasView masthead + `SyncStatus` top-right + desk `$colorSurfaceSecondary` + page sheet `$colorSurfacePrimary`+shadow hosting `<VidaEditor chrome="bare">`; 8-state: success→editor · loading→skeleton(not-mounted,EC-6) · empty→EmptyState · error→calm privacy voice; a11y region+editor names) + `canvas-editor-styles.ts` (scoped `ensureCanvasEditorStyles`: writing font-size 18 + preset family + block rhythm; color/line-height are S1's). tsc 0 · **7 tests** · **Visual Gate PASS** (Brave, PRODUCTION component, 3 presets × light/dark MEASURED: title 13.0–15.7 · body 15.8–17.3 · muted eyebrow/meta 4.52–5.22 AA incl. warm-dark · sheet-on-desk visible · no overflow 375/768/1440). EC-1/4/5/6/8/9/10/11 ✓.
- **S3 persistence convention + slot binding — DONE** (PURE): `page-binding.ts` — `PageLike`, `toCanvasEditorProps(page,opts)` (`pages`→props; meta=block count), `EditorDocReader=ProviderRead<EditorDocument>`; **no live hook / no @vida/core** (deferred to #27; #13 owns runtime wiring). The EntityView `editor`-slot producer is #6's `entity/adapter.ts` (`offersEditor`+`editorNode`) — #7 supplies `editorNode=<CanvasEditor …/>`, no new gate. tsc 0 · **4 tests** (node).
- **Gates**: decomposition gate-1 critic SHIP+NITs · **g2 independent review SHIP** (1 NIT fixed: skeleton `borderRadius $2`→`$sm`, invalid radius token). Currency (§XXIX): `packages/editor/src/CLAUDE.md` (chrome+EC-7) · `apps/web/src/canvas-editor/CLAUDE.md` (new) · delivery docs. Throwaway Envision/gate harness (`__envision__`, `envision.html`, `envision-drive.mjs`, temp route) removed.
- **Linear OPEN (close-out)**: fix LIF-204/LIF-205 "In Progress"→Done drift (auto-mode denied mid-setup; needs explicit OK or do at /session-end).
- **Next**: PR fe-codec-canvas-editor → main; LIF-234 → Done.
