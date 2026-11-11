---
id: CB-4
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A capability writes only through the target module's documented write interface under the guarded-write contract, and a timed or measurable outcome drives a session, which owns the effects; a pure-render capability emits nothing."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/capability/__tests__/capability.test.ts, packages/core/src/foundation/spaces/__tests__/spaces.test.ts]
tokens: 102
generated: true
---
# CB-4 (partly tested)

A capability writes only through the target module's documented write interface under the guarded-write contract, and a timed or measurable outcome drives a session, which owns the effects; a pure-render capability emits nothing.

- Proof: BR-3 (tested)
- Uses: effects, sessions
- Work: LIF-569

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
