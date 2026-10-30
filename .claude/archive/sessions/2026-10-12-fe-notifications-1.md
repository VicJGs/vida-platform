---
Session 1 — 2026-10-12
Goal: fe-notifications ② (LIF-192) — the UI/UX tier over the finished mod-notifications ①
Profile: Add Frontend Component / Default (Entity Delivery Flow ②)
---

## Accomplished
- **Shipped fe-notifications ② — a multi-lens notifications surface. PR #132 merged → main `f31fc4b`; LIF-192 → Done.**
  Pure ② over the finished `mod-notifications` ① — no `@vida/core`/`@vida/types` change.
- **Three user-selectable lenses over one pure model** (`apps/web/src/notifications/`):
  - **The Margin** (default) — a time-spine with a living **now-line**; anticipations above (from the Sessions
    `dueIn` agenda — NF-3, never phantom future rows), settled below; quiet severity; entity chips; System voice.
  - **Dispatches** — a calm serif briefing in the System's voice (Today / Earlier / Still ahead).
  - **Constellation** — attention as a life-area map (byArea hubs + count badges + severity-dotted orbits).
  - Shared: `attention-model.ts` (pure, one-model-three-renderers) · `use-notifications.ts` (honest-empty +
    `?sample`/`?force` gate hooks) · `use-notification-lens.ts` (local-persisted choice) · chrome (switcher ·
    derived unread badge · All/Unread/Archived filter · mark-all-read · optimistic-local lifecycle) · 8-state.
  - Route wired at `/notifications` (the shipped Bell nav link).
- **Full Entity Delivery Flow ②:** interpretation → **Envision Gate FIRED + APPROVED** (greybox rendered live in
  Brave across presets × modes; the multi-lens decision came out of the human review) → Decomposition Approval 1
  → 3 gated slices (S1 `c0abc2e`, S2+S3 `33ebeac`).
- **Gates:** tsc 0 · eslint 0 · @vida/web suite green · notifications 5/5 · **Visual/contrast Gate PASS** (Brave,
  3 presets × light/dark incl. warm/olive dark: titles 15.8–17.3 · voice/prose/caption 4.9–6.5 AA, measured).
- **Close-out:** PR #133 merged (`67576a9`→`e4aed53`) — task archived, `_index.md` + `TASKS.md` reconciled.
  Both worktrees removed, branches deleted. The throwaway `__envision__` greybox/harness stripped before the PR.

## Decisions Made
- **Multi-lens architecture (Envision-driven).** The baseline inbox was rejected as "too normal — not a Vida OS
  experience." Victor's steer "the user chooses" became the architecture: ONE surface, THREE lenses. Envision
  legitimately expanded scope (inbox → 3 lenses); sequenced flagship-first so value ships after slice 1.
- **Scope grounded in the gated decomposition, not the drifted task-header.** The authoritative legs are NOT-24
  (inbox UI) + NOT-25 (dangling); the header's "channel-matrix" was drift (a Preferences-config concern, not a
  traced leg) → out of scope. [[envision-gate-firing-is-a-doc-test-not-a-human-decision]]
- **Anticipations derive from the `dueIn` agenda, NOT notification rows** (NF-3: the dispatcher never writes a row
  before fire time → no phantom future inbox). Honest-empty at M1, `?sample` for the gate, live swap deferred.
- **Constellation = CSS/SVG, not the Sigma/WebGL NeuralGraph** (§XXVIII deviation): overkill for ~8 hubs + avoids
  the WebGL color seam; = the greybox that was visually approved. Recorded in the surface CLAUDE.md.
- **EC-8 "ghosted titles" measured, not guessed** — a `getComputedStyle` probe showed the title was already
  `rgb(250,247,240)` (near-white, Fraunces loaded); the ghost was the standalone harness not painting the
  AppShell surface background. Production titles are high-contrast serif. [[measure-browser-bugs-dont-hypothesize]]
- **Lifecycle is optimistic-local at M1** (session-only, resets on reload) — honest, avoids dead no-op buttons,
  no faked "saved"; durable writes bind at the first consumer with the reads.

## Open Questions
- none blocking. Follow-ups are all homed/deferred: live data plane (first-consumer) · durable lifecycle + lens
  pref (M1.1) · Constellation drill-down (tap area → its alerts) · digest/push reach (M2).

## Next Session
First step: **`mod-routines`** (backend, M1.1.2 — the computed `--next` head; add-backend-component / Entity
Delivery Flow ①; fresh worktree off main, Node 24).
Context to reload: `docs/roadmap/MVP-PATH.md` (next-head routing) · `docs/modules/notifications/current-*` only if
touching notifications again · the add-backend-component default scenario. Env: Node 24 via nvm for @vida/core.
NB: parallel sessions hold the fe-calendar/fe-notes-and-pages/fe-onboarding/fe-settings worktrees — don't disturb;
the shared root was intentionally left behind origin/main (fast-forwards at next `/begin`).
