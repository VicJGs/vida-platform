---
id: SV-9
kind: intent-row
module: sync
status: active
supersedes: []
summary: "Structured data merges per field, last writer wins by clock stamp with the higher device id breaking an exact tie; the id, sync id and creation time never merge, updated_at takes the merge's wall-clock time, and a delete is an ordinary field, so a delete and an edit resolve by their stamps."
anchors: [docs/modules/sync/intent.yaml]
tokens: 104
generated: true
---
# SV-9 (intent only)

Structured data merges per field, last writer wins by clock stamp with the higher device id breaking an exact tie; the id, sync id and creation time never merge, updated_at takes the merge's wall-clock time, and a delete is an ordinary field, so a delete and an edit resolve by their stamps.

- Work: LIF-98

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
