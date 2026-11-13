---
id: SV-8
kind: intent-row
module: sync
status: active
supersedes: []
summary: "On the device a file is stored encrypted on its own row in the device's database; across devices it syncs apart from the row queue, at most 25 megabytes, uploaded through a short-lived signed link while its metadata syncs last-writer-wins, downloaded only when opened and kept on the device, and deleted on the server 30 days after its row."
anchors: [docs/modules/sync/intent.yaml]
tokens: 158
generated: true
---
# SV-8 (intent only)

On the device a file is stored encrypted on its own row in the device's database; across devices it syncs apart from the row queue, at most 25 megabytes, uploaded through a short-lived signed link while its metadata syncs last-writer-wins, downloaded only when opened and kept on the device, and deleted on the server 30 days after its row.

- Uses: notes, NP-16, projects, PJ-8, learning, ED-13, books, BK-18, knowledge, FC-8
- Work: LIF-600
- Open: Where a self-hosted server keeps files (R2 on Workers, or another store).

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
