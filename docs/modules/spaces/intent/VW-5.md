---
id: VW-5
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "A view's name and the user-literal values in its filter are encrypted client-side, every view declares loading, empty, error and success, and a provider error resolves to error, never a crash."
anchors: [docs/modules/spaces/intent.yaml, packages/core/src/foundation/spaces/__tests__/spaces.test.ts]
tokens: 91
generated: true
---
# VW-5 (partly tested)

A view's name and the user-literal values in its filter are encrypted client-side, every view declares loading, empty, error and success, and a provider error resolves to error, never a crash.

- Proof: BR-12 (tested)
- Uses: encryption
- Work: LIF-67

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
