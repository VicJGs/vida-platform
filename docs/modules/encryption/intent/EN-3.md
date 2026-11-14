---
id: EN-3
kind: intent-row
module: encryption
status: active
supersedes: []
summary: "The master key is derived from the password with Argon2id and a random 16-byte salt at interactive limits, held in memory only while the vault key is derived, then wiped; it is never stored."
anchors: [docs/modules/encryption/intent.yaml]
tokens: 80
generated: true
---
# EN-3 (intent only)

The master key is derived from the password with Argon2id and a random 16-byte salt at interactive limits, held in memory only while the vault key is derived, then wiped; it is never stored.

- Work: LIF-619

Generated from `docs/modules/encryption/intent.yaml`; edit the ledger, never this unit.
