# Task: fe-notifications
# Status: done (merged PR #132 → main f31fc4b, LIF-192 → Done)
# Worktree: .claude/worktrees/fe-notifications (branch fe-notifications off origin/main @ 5ef0ce7, Node 24) — removed
# Linear: LIF-192
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #25 — Notifications inbox UI (NOT-24) + dangling-subject state (NOT-25).

## Goal
② Frontend build (add-frontend-component) for notifications — the UI/UX tier over the finished ① service
(`mod-notifications` #53, LIF-132). Gated legs: NOT-24 (inbox UI) + NOT-25 (dangling-subject state). Pure ②,
no `@vida/core`/`@vida/types` change. Per-slice blocking Visual Gate (Entity Delivery Flow ②, ADR-021 §3.5).

## Outcome — SHIPPED (3 slices, PR #132 merged 2026-10-12)
**A multi-lens notifications surface — the System's out-loud voice, user-selectable.** The baseline inbox was
rejected at the Envision Gate ("too normal — not a Vida OS experience"); Victor's steer ("the user chooses")
became the architecture: one surface, three lenses the user picks between.

- **S1 — Foundation + The Margin** (`c0abc2e`) — the shared seam (`attention-model.ts` pure one-model-three-
  renderers · `use-notifications.ts` honest-empty + `?sample`/`?force` gate hooks · `use-notification-lens.ts`
  local-persisted choice, default Margin) + **The Margin** lens (time-spine + living **now-line**; anticipations
  above from the `dueIn` agenda — NF-3, never phantom future rows — settled below; quiet severity; entity chips;
  System voice) + chrome (switcher · derived unread badge · All/Unread/Archived filter · mark-all-read ·
  optimistic-local lifecycle) + full 8-state. Route wired at `/notifications` (shipped Bell nav link).
- **S2 — Dispatches lens** + **S3 — Constellation lens** (`33ebeac`) — two more renderers over the same model:
  Dispatches = a calm serif briefing in the System's voice (Today / Earlier / Still ahead); Constellation =
  attention as a life-area map (byArea hubs + count badges + severity-dotted orbits + "you" at center).
  **§XXVIII deviation (Constellation):** built as a CSS/SVG map, not the Sigma/WebGL `NeuralGraph` the slice-map
  named (overkill for ~8 hubs; avoids the WebGL color seam; = the approved greybox). Noted in surface CLAUDE.md.

## Front matter (gated)
Baseline → interpretation (scope grounded in the gated decomposition — the task-header "channel-matrix" was
drift, a Preferences-config concern, NOT a traced leg → out of scope) → **Envision Gate FIRED + APPROVED**
(the multi-lens decision; greybox rendered live in Brave across presets × modes) → Decomposition Approval 1
(slice-map + seam-contract). Each slice: build (types → states → dark → responsive) + blocking Visual Gate.

## Gates
tsc 0 · eslint 0 · `@vida/web` suite green · notifications 5/5 (pure model). **Visual/contrast Gate PASS**
across 3 presets × light/dark incl. warm/olive dark (titles 15.8–17.3 · voice/prose/caption 4.9–6.5 AA),
measured in a real browser (Brave via `playwright-core`). EC-8 ("ghosted titles") measured to be a harness
artifact (standalone entry not painting the AppShell surface) — production titles are high-contrast serif.
CI on PR #132: Typecheck/Lint/Test/E2E green; 2 pre-existing reds (Format repo-wide debt · Workers CF-config).

## Deferred (homed)
Live `NotificationsService.list()`/`unreadCounts()` + Sessions `dueIn()` data plane → first-consumer (the
worker-RPC Drizzle `values` seam + no composition root) · durable lifecycle writes (M1 = optimistic-local) ·
lens choice → `user_preferences` (M1 = local) · Constellation live drill-down (tap area → its alerts) ·
digest/batching (NF-15) + real push/email/OS reach → M2 · channel-matrix preference UI (not a traced leg).

## Currency / delivery
`apps/web/src/notifications/CLAUDE.md`; delivery `docs/specs/foundation/fe-notifications/delivery/`
(interpretation · envision [approved] · slice-map · seam-contract).

## Lessons
- The gated decomposition outranks a drifted task-header summary — grounding the scope (NOT-24/25, not
  "channel-matrix") kept the unit honest. [[envision-gate-firing-is-a-doc-test-not-a-human-decision]]
- **Measure a Visual-Gate "failure" before fixing it** — the ghosted warm-dark titles were a harness
  background gap, not a production AA bug; a `getComputedStyle` probe showed the title was already
  `rgb(250,247,240)` on a transparent page. [[measure-browser-bugs-dont-hypothesize]]
- Envision can legitimately EXPAND scope (one inbox → three lenses) when the human's vision review reshapes
  the slice list; sequence flagship-first so value ships after the first slice.
