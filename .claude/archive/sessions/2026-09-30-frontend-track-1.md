---
Session 1 — 2026-09-30
Goal: Establish the frontend track for the whole OS (② UI tier), surface-first, without touching the backend.
Profile: Project Foundation / Milestone Delivery Planning
Isolation: git worktree .claude/worktrees/frontend-track (branch worktree-frontend-track), off main
---

## Accomplished
- Established the FRONTEND RE-PLAN with Victor across a long design conversation, and authored the master plan:
  `docs/specs/foundation/frontend-replan/_index.md`.
- Reframed the frontend unit of work: **SURFACE (page/tab the user navigates) — NOT module-twin.** The P6
  24 `fe-*` grain (22 per-module + 2 cross-cutting) repeats the backend per-module mistake; surface-first
  systematizes it (Victor's Calendar-with-Schedule-tab example: Sessions owns scheduling, but the user meets
  it on a Calendar page composing Tasks/Routines/Reminders).
- Adopted the process from Victor's sketch (ISO 9241-210 · Garrett Five Planes · Intake→Process→Output):
  **Foundation → Organization → Presentation → Development**, with the **3-lens gap audit** (WRONG / MISSING /
  OVERFLOWING against the standards bar) and the **Visual Gate as the final input** (Victor's methodology: docs
  don't hold all intent → the flow NOTICES gaps, doesn't transcribe).
- Enumerated the complete frontend FOUNDATION layer (corrected — I'd missed Sessions + Check-ins): preferences,
  sessions/focus/global-calendar, journals/home, notes+editor, check-ins, shell-wiring, onboarding. **Verified
  every M1.2.1 backend twin is merged to main → the whole foundation is buildable now.**
- Defined the G0–G6 establishment sequence with each gate's inputs/process/teeth/output home; G6 (Linear
  reshape) is Victor-approval-gated + carries an edge-migration ledger.
- Set up isolation: created the worktree off main; locked per-issue-branch → PR → merge; verified 0-behind and
  all done backends present in @vida/core.
- GATED the master plan: independent adversarial /critique → REVISE (6 findings) → all fixed → SHIP;
  /preflight → PASSED (gate output homes added to remove the last assumption).

## Decisions Made
- Frontend unit = surface, not module-twin (surface-first re-plan). Why: module grain hides cross-module
  features; same fix as backend-replan.
- Process = Five Planes / ISO 9241-210 expressed as Foundation→Organization→Presentation→Development + 3-lens
  audit + Visual-Gate-final. Why: Victor's sketch is the right spine; docs are input not ceiling.
- Quality bar gets its own gate (G1); the sketch is input, not authority (it may have left info behind).
- Scope = web-only for M1; mobile/desktop re-audit at M4.
- "Coverage preserved" clarified: the 222 P4 legs are the FLOOR; G2 discovers new cross-module surfaces.
- Isolation via worktree; frontend artifacts in new-path files only (no shared-file edits) to avoid conflicts
  with the parallel backend session.
- "features can't hide" = Victor's concern, doc-supported; the "≥2 reachable paths" metric is my proposal (a
  candidate G1/G4 criterion, not doc-law).

## Open Questions
- Aesthetic & density direction (information-dense vs. calm) — resolve at G0/G1.
- Spaces bar: build the seam now or defer (Spaces PARKED→M1.1)?
- Ratify the ≥2-reachable-paths surfacing rule, or replace?
- Sketch-gaps to hunt in G1 (perf budgets, reduced-motion, i18n/RTL, empty/error copy, dark-mode, focus mgmt,
  offline states, responsive strategy).

## Next Session
First step: **G0 — lock the process** into `docs/specs/foundation/frontend-replan/process.md` (Five Planes +
4 stages + 3-lens audit), then G1 (Quality-Bar gate).
Context to reload: **resume IN THIS WORKTREE** (`.claude/worktrees/frontend-track`, branch
worktree-frontend-track) — the plan + task file live on this branch, not on main. Re-read
`docs/specs/foundation/frontend-replan/_index.md` (§2 process, §5 gate sequence) + `.claude/tasks/frontend-track.md`.
