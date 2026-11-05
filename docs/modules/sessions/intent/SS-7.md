---
id: SS-7
kind: intent-row
module: sessions
status: active
supersedes: []
summary: "The engine owns planned_blocks and its own generated sessions but never stores a copy of another module's due work; the agenda is its own blocks plus live dueIn provider reads."
anchors: [docs/modules/sessions/intent.yaml]
tokens: 97
generated: true
---
# SS-7 (intent only)

The engine owns planned_blocks and its own generated sessions but never stores a copy of another module's due work; the agenda is its own blocks plus live dueIn provider reads.

- Proof: BR-34 (no test), BR-37 (no test)
- Uses: books, knowledge, learning, languages, journals

Generated from `docs/modules/sessions/intent.yaml`; edit the ledger, never this unit.
