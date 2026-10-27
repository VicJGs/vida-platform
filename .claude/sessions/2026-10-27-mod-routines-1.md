---
Session 1 — 2026-10-27 (opened 2026-10-21)
Goal: mod-routines ① — re-scope the routines service and close the ① track (LIF-138)
Profile: Add Backend Component / Entity Re-scope
---

## Accomplished
- Re-scope flow re-run (baseline → Documentation/Interpretation/Re-scope Gates) and slices S2c, S3, S4, S5, S5c, S6, S7, S8, S9 — each fully gated.
- PR #162 merged (`d2bc57a`); close-out PR #163 (`879d8a6`); LIF-138 → Done.
- Durable docs `docs/modules/routines/current-*` promoted every slice; delivery record in `docs/features/routines/delivery/`.

## Decisions Made
- The completion/miss policy is entirely the user's (no routines defaults).
- Every step drives an entity (S5c, Q1/RT-4/D3); routines registers no session sub-type.
- Reschedule = an SS-8 intent block; BR-RT-S6-5 (in-window make-good completes late) ratified by Victor.
- Routine-level effects follow rule 21 (write transition); reflection-only done does not emit.
- S9: one SS-7 due lane, summary-only Journal; register helpers shipped not called.

## Open Questions
- none (fe-routines owns the wiring; the agenda bridge is journals')

## Next Session
First step: `/begin` → `fe-routines` (LIF-197), fresh worktree off origin/main.
Context to reload: `docs/modules/routines/current-spec.md`, `docs/features/routines/delivery/slice-map.md` (§Borrowed legs, ① Track close), `.claude/tasks/fe-routines.md`.
