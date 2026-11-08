---
id: PJ-4
kind: intent-row
module: projects
status: active
supersedes: []
summary: "A deliverable carries measurement_kind (natural milestone) and binding_mode; the five former backends (financial, task statistics, third-party metric, activity log, artifact) become kind by binding by source, a derived-pull deliverable reads its bound source through the measurement-source seam, and the order is manual override, then its tasks, then its source, then unmeasured."
anchors: [docs/modules/projects/intent.yaml, packages/core/src/services/projects/__tests__/service.test.ts]
tokens: 216
generated: true
---
# PJ-4 (partly tested)

A deliverable carries measurement_kind (natural milestone) and binding_mode; the five former backends (financial, task statistics, third-party metric, activity log, artifact) become kind by binding by source, a derived-pull deliverable reads its bound source through the measurement-source seam, and the order is manual override, then its tasks, then its source, then unmeasured.

- Proof: BR-PJ-S3-2 (no test), BR-PJ-S3-3 (no test), BR-PJ-S7-1 (no test), BR-PJ-S7-2 (no test), BR-PJ-S7-3 (no test), BR-PJ-S8-3 (no test), PJ-4 (tested by name)
- Uses: measurement, finance, tasks
- Work: LIF-492
- Open: How a raw source value becomes progress (baseline and target), which sources each kind may bind, and what an event-trigger deliverable listens to.

Generated from `docs/modules/projects/intent.yaml`; edit the ledger, never this unit.
