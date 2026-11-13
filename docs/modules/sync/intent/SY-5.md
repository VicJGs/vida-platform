---
id: SY-5
kind: intent-row
module: sync
status: active
supersedes: []
summary: "Repeated edits of a row before a flush coalesce to its latest snapshot, and a create followed by a delete of the same row collapses to nothing before any push."
anchors: [docs/modules/sync/intent.yaml]
tokens: 71
generated: true
---
# SY-5 (intent only)

Repeated edits of a row before a flush coalesce to its latest snapshot, and a create followed by a delete of the same row collapses to nothing before any push.

- Work: LIF-98

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
