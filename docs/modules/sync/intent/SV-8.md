---
id: SV-8
kind: intent-row
module: sync
status: active
supersedes: []
summary: "Attachments travel apart from the row queue, at most 25 megabytes each, encrypted on the device and uploaded through a short-lived signed link, with their metadata row syncing last-writer-wins, downloaded only when opened and kept on the device, and deleted on the server 30 days after their row."
anchors: [docs/modules/sync/intent.yaml]
tokens: 158
generated: true
---
# SV-8 (intent only)

Attachments travel apart from the row queue, at most 25 megabytes each, encrypted on the device and uploaded through a short-lived signed link, with their metadata row syncing last-writer-wins, downloaded only when opened and kept on the device, and deleted on the server 30 days after their row.

- Uses: notes, NP-16, projects, PJ-8, learning, ED-13, books, BK-18, knowledge, FC-8
- Work: LIF-600
- Open: Where a file lives on the localhost web product (a database blob or a browser file store) and on a self-hosted server.

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
