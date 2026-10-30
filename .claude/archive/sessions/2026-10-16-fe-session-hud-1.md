# Session — fe-session-hud (#16, LIF-217) · 2026-10-16 → 2026-10-18

## Goal
Build the Session HUD (shell region 6) end to end — Entity Delivery Flow ②, worktree
`.claude/worktrees/fe-session-hud` (off origin/main @ 8c1070d, STACKED on open PRs #142+#143), Node 24.

## Completed — the whole unit, PR #144 open
- **Front matter:** interpretation (N1: no "active session" read on SessionsService) → **Envision Gate
  APPROVED** (greybox in the real AppShell hudSlot; EC-1..EC-10; answers: idle hidden in M1 · un-timed
  count-up · pause always-visible ≥768) → decomposition (g1 critic REVISE B1–B5 → folded → confirm SHIP) →
  **Victor-directed grounding pass** (pomodoro PD-1..12 + the V5 widget spec) which OVERTURNED two of my
  proposals: zero-cross = hold-complete (never overtime; PD-4/5/7 + the V5 held "${phase} complete") and the
  live interval clock is client-ephemeral BY DESIGN (B1's ① persistence widening was fighting the doc model)
  → **Approval 1**.
- **S1 substrate** (`d5d6f46`) · **S2 pill** (`1377cd6`) · **S3 shell mount** (`6ac01bd`) — each §XXVI
  double-gated, independent g2 (S1 REVISE→F1 sample-capture + nits; S3 SHIP), blocking Visual Gates
  Victor-reviewed (S2 0/108 cells; S3 real-app end-to-end incl. onboard→deep-link walk).
- **D-S3-1 (§XXVIII, Victor):** his S3 gate review caught the 375 ring↔Search overlap — the strip
  overcommits ~80px once the HUD fills the slot (element overlap, invisible to page-level overflow probes;
  Bar-1 scrollWidth 179 vs clientWidth 87). Options presented via previews; chosen **"Keep the time"**:
  scope compact → globe-only · Search → first More-menu row (still the ⌘K action) · HUD keeps ring+time.
  #15-owned files touched (shipped-primitive-fix precedent), 3 superseded tests updated.
- Verification: tsc 0 · eslint 0 · session-hud 46/46 (+TZ-forced) · shell 117/117 · full @vida/web 660/661
  (theme-picker = load-flake, green isolated) · /critique SHIP.

## Decisions / lessons
- **Ground in the capability docs FIRST** — both "open design questions" (zero-cross, interval persistence)
  were already doc-fixed; the grounding pass replaced my inventions with the V5/PD model.
- **A bare `window.location` read in a hook is render-time-only** — client-side pushState re-renders
  nothing; subscribe via `useRouterState`. jsdom tests mounted with the URL pre-set and missed it; only the
  real-browser gate caught it.
- **`text-decoration` propagates, it does not inherit** — a child's `none` can't cancel the anchor's line;
  reset at the anchor. The contrast probe read token-correct span colors and passed; only screenshots saw it.
- **Filling a reserved slot falsifies empty-slot co-fit math** (first-consumer-surfaces-latent-defect, again)
  — and element OVERLAP is invisible to scrollWidth probes; measure per-element boxes.
- Gate harness: dismiss the guided-setup invitation before screenshots; exclude sr-only text from contrast;
  module-captured sample timestamps drift (capture per call); vitest here needs explicit afterEach(cleanup).

## Close-out (same session, 2026-10-18 — Victor: "properly merge and wrap everything up")
- **Stack MERGED in order** (Victor-authorized over the CI billing outage, which he is resolving in a
  parallel session): PR #142 `49f83e9` → #143 `fc084f7` (routes.tsx union re-resolved + branch verified) →
  #144 `33278c1`. LIF-217 → Done (the --sync BACKLOG quirk corrected surgically, again) · LIF-218 confirmed
  Done · 3 worktrees + local/remote branches removed.
- **fe-codec-system #12 CLOSED — ratified-by-consumption, dissolved** (recorded in TASKS.md): a "reuse
  UI-4" unit; no SystemView/spec was ever intended; all System-type consumers (#24/#25/#32/#17/#15) shipped
  gated; the #7-style reshape gap carried zero residual scope → no Linear issue needed.
- Task file archived (.claude/tasks/archive/fe-session-hud.md); TASKS.md row → DONE/MERGED.

## Next session
- Next FE head: `fe-calendar` #19 (M1.2.1, READY — a worktree already exists at a1148f9, check its state
  first) or `fe-projects` (M1.2.2); backend: `mod-tasks` S7 (in flight in a parallel session — main checkout
  + mod-tasks worktree are its territory, do not touch).
