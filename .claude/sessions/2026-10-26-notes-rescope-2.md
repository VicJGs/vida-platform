# Session — notes-rescope (LIF-245) · 2 · 2026-10-26

**Profile:** Add Frontend Component · **Scenario:** entity-rescope · **Worktree:** `.claude/worktrees/notes-rescope` (Node 24)

## Done
- **R0 data safety — complete** (§XXVI double gate + two §XXVIII deviations, all Victor-approved).
  - Gate 1: PLAN-R0 rev 3 (critique r1/r2 REVISE → r3 SHIP) → Approval 1. 1a refreshed `docs/editor/current-*` (#7 drift).
  - Gate 2: IMPLEMENTATION-PLAN (preflight PASSED; critique r1 REVISE → r2 SHIP) → Approval 2.
  - Build: core guard + typed errors + editor-valid seeds · editor always-on content check · tagged parse · write seam
    (flush/cancel/lock, hide flush, re-queue, `expected` dedupe) · read-after-write barrier · EC-33 notice + exports.
  - **DEV-R0-1** (live leg found B-53 still open for warm caches): seed-point latest-body overlay + ownership re-save.
  - **DEV-R0-2** (pre-existing): undo back to the stored body (pending or in flight) wrote the undone doc.
  - Gates: live OPFS (Brave) 18/18 · Visual Gate 18/18, ACCEPTED by Victor (VoiceOver not done — accepted on automated
    a11y) · core 2049/2049 · editor 237+ · web 832/832 · tsc + lint clean · post-impl /critique r2 SHIP.
  - Commits: `853570e` core · `84b7f58` editor · `a6bd158` web + e2e · `f2c35cc` docs (+ plan docs `4bd4233` `3d4cb81` `287d2b9`).

## Decisions
- Overlay at the editor's SEED point, not the reader hooks (facet/tab remounts reuse a stale prop) · ownership re-save over
  zero-write (closes the after-unmount retry loss; costs one identical write) · no `cancelQueries` (generation re-read
  covers warm + cold) · direct promise instead of `useMutation` (synchronous barrier registration).
- Live/visual venue on macOS 12 = system Brave via playwright-core; the CI spec is committed but unrun (CI dark).

## Lessons
- A route swap / facet switch RENDERS the incoming component before the outgoing one's cleanup runs — an uncontrolled
  editor can't be handed state in a cleanup (memory saved).
- Measure library behaviour when readings disagree (`setContent(invalid)` throws; no latch).
- The parallel preferences-rescope session loads the machine → suite timeouts / "no tests"; run suites one at a time.

## Next session
First step: **R1 page frame** — §XXVI gate 1 (`/document-context` → `victor:planning` → `/documentation-component` → PLAN-R1).
Context: `.claude/tasks/notes-rescope.md` · `delivery/slice-map.md` R1 · `delivery/sessions/PLAN-R0…` §5a (forward obligations).
Watch: branch not pushed (ask) · Linear not synced this session · CI dark · `/favicon.ico` 404 (pre-existing).
