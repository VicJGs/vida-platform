---
id: EN-1
kind: intent-row
module: encryption
status: active
supersedes: []
summary: "Three layers encrypt the vault; the whole database file at rest (SQLCipher), each field marked encrypted inside the database (field-level), and each row as one opaque blob in transit and on the server (the sync blob)."
anchors: [docs/modules/encryption/intent.yaml]
tokens: 87
generated: true
---
# EN-1 (intent only)

Three layers encrypt the vault; the whole database file at rest (SQLCipher), each field marked encrypted inside the database (field-level), and each row as one opaque blob in transit and on the server (the sync blob).

- Work: LIF-149

Generated from `docs/modules/encryption/intent.yaml`; edit the ledger, never this unit.
