---
id: NP-9
kind: intent-row
module: notes
status: active
supersedes: []
summary: "A user delete is a soft delete with undo, and the page waits 30 days in the one Trash all modules share (NP-27); hard delete is an explicit confirm and an app-layer cascade, since there are no SQL foreign keys."
anchors: [docs/modules/notes/intent.yaml]
tokens: 104
generated: true
---
# NP-9 (intent only)

A user delete is a soft delete with undo, and the page waits 30 days in the one Trash all modules share (NP-27); hard delete is an explicit confirm and an app-layer cascade, since there are no SQL foreign keys.

- Proof: BR-6 (no test)
- Work: LIF-421
- Open: Purge timing and mechanics for the 30-day Trash.

Generated from `docs/modules/notes/intent.yaml`; edit the ledger, never this unit.
