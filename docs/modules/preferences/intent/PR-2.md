---
id: PR-2
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "A preference read is never undefined; the stored row, or its absence, is overlaid on the one defaults object, and a malformed map or list field degrades to its default."
anchors: [docs/modules/preferences/intent.yaml]
tokens: 83
generated: true
---
# PR-2 (intent only)

A preference read is never undefined; the stored row, or its absence, is overlaid on the one defaults object, and a malformed map or list field degrades to its default.

- Proof: BR-PREF-2 (no test), BR-PREF-7 (no test)

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
