---
id: RT-3
kind: intent-row
module: routines
status: active
supersedes: []
summary: "A step references the entity it drives by type and ref, and running it drives that entity, through a session sub-type or the entity's own completion; the routine reflects the entity and stamps only its own occurrence row, never a parallel completion or a second effect."
anchors: [docs/modules/routines/intent.yaml, packages/core/src/services/routines/__tests__/routines-service.test.ts]
tokens: 116
generated: true
---
# RT-3 (partly tested)

A step references the entity it drives by type and ref, and running it drives that entity, through a session sub-type or the entity's own completion; the routine reflects the entity and stamps only its own occurrence row, never a parallel completion or a second effect.

- Proof: RT-3 (tested by name)
- Uses: sessions, tasks, habits
- Work: LIF-448

Generated from `docs/modules/routines/intent.yaml`; edit the ledger, never this unit.
