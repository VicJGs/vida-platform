---
id: PR-6
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "command_key is unique and recording it again increments use_count; the palette ranks pinned first, then by frecency."
anchors: [docs/modules/preferences/intent.yaml, packages/core/src/services/preferences/__tests__/preferences-service.test.ts]
tokens: 64
generated: true
---
# PR-6 (tested)

command_key is unique and recording it again increments use_count; the palette ranks pinned first, then by frecency.

- Proof: BR-PREF-10 (tested)

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
