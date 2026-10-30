# Incident pointer: milestone-ordering-routing (surfaced here; owned by the toolkit)

This is a **toolkit** loop-routing gap (the loop has no deterministic next-issue selector, so it hand-derives the
frontier and "runs in circles"), not a vida defect. It SURFACED during vida's M1.0 loop on 2026-07-29.

- **Diagnosis + fix (canonical):** `~/dev-toolkit/docs/specs/fixes/milestone-ordering-routing/` +
  `~/dev-toolkit/docs/specs/features/tracker-sync-next-selector/` — the fix (`tracker_sync --next`) is PARKED at a
  g1 RETHINK: it needs the task-file `## Dependencies` blocker slugs reconciled to real slugs, a persisted sub-wave
  milestone order, and a stream/never-head marker, before a deterministic selector can be correct.
- **Impact on vida:** until `--next` lands, the M1.0 next-head is still chosen by reading the plan by hand; the
  dep-graph + milestone order in the delivery plan remain the authority.

The durable diagnosis lives with the fix in the toolkit; this is vida's pointer.
