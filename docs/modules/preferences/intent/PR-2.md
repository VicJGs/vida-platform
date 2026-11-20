---
id: PR-2
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "A preference read is never undefined; the stored row, or its absence, is overlaid on the one defaults object, and a malformed map or list field degrades to its default."
anchors: [docs/modules/preferences/intent.yaml, packages/core/src/services/preferences/__tests__/preferences-service.test.ts]
tokens: 82
generated: true
---
# PR-2 (tested)

A preference read is never undefined; the stored row, or its absence, is overlaid on the one defaults object, and a malformed map or list field degrades to its default.

- Proof: BR-PREF-2 (tested), BR-PREF-7 (tested)

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
