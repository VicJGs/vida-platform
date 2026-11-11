---
id: SPC-7
kind: intent-row
module: spaces
status: active
supersedes: []
summary: "Every Spaces-tier table syncs and soft-deletes, and tag, Space and link names, descriptions and contexts are encrypted client-side; in M1 encryption is a pass-through with an empty [E] set."
anchors: [docs/modules/spaces/intent.yaml]
tokens: 95
generated: true
---
# SPC-7 (intent only)

Every Spaces-tier table syncs and soft-deletes, and tag, Space and link names, descriptions and contexts are encrypted client-side; in M1 encryption is a pass-through with an empty [E] set.

- Proof: BR-7 (no test), BR-13 (no test)
- Uses: sync, encryption
- Work: LIF-67

Generated from `docs/modules/spaces/intent.yaml`; edit the ledger, never this unit.
