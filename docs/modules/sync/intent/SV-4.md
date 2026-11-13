---
id: SV-4
kind: intent-row
module: sync
status: active
supersedes: []
summary: "The server is blind; it stores and relays only encrypted blobs and never decrypts, indexes, queries, links or merges them, and the plain header it reads (table, row, version, clock stamp, device, operation and the changed field names) is the disclosed limit of what it learns."
anchors: [docs/modules/sync/intent.yaml]
tokens: 105
generated: true
---
# SV-4 (intent only)

The server is blind; it stores and relays only encrypted blobs and never decrypts, indexes, queries, links or merges them, and the plain header it reads (table, row, version, clock stamp, device, operation and the changed field names) is the disclosed limit of what it learns.

- Uses: encryption
- Work: LIF-150

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
