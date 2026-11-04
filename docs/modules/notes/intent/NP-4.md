---
id: NP-4
kind: intent-row
module: notes
status: active
supersedes: []
summary: "Editor content has its own write path (writePageContent), never the LWW metadata patch, and merges as a per-page Yjs CRDT at sync (M4)."
anchors: [docs/modules/notes/intent.yaml]
tokens: 75
generated: true
---
# NP-4 (intent only)

Editor content has its own write path (writePageContent), never the LWW metadata patch, and merges as a per-page Yjs CRDT at sync (M4).

- Proof: BR-NEU-4 (no test)
- Uses: sync
- Work: LIF-98

Generated from `docs/modules/notes/intent.yaml`; edit the ledger, never this unit.
