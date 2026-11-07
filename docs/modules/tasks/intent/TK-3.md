---
id: TK-3
kind: intent-row
module: tasks
status: active
supersedes: []
summary: "Sub-tasks are one level; the parent shows the ADR-011 M4 weighted rollup of its children (per-child nesting weight, equal by default), derived on read with no stored progress, and completing a parent never completes its children, nor the reverse."
anchors: [docs/modules/tasks/intent.yaml, packages/core/src/services/tasks/__tests__/service.test.ts]
tokens: 112
generated: true
---
# TK-3 (tested)

Sub-tasks are one level; the parent shows the ADR-011 M4 weighted rollup of its children (per-child nesting weight, equal by default), derived on read with no stored progress, and completing a parent never completes its children, nor the reverse.

- Proof: BR-TK-S2-1 (no test), BR-TK-S2-2 (no test), BR-TK-S2-3 (no test), TK-3 (tested by name)

Generated from `docs/modules/tasks/intent.yaml`; edit the ledger, never this unit.
