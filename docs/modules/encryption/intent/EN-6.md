---
id: EN-6
kind: intent-row
module: encryption
status: active
supersedes: []
summary: "The field and sync-blob layers use the vault key directly, and every other key taken from it (the database key, the blind-index key, the key-pair wrap) uses its own domain-separation label, so no two purposes share a key."
anchors: [docs/modules/encryption/intent.yaml]
tokens: 88
generated: true
---
# EN-6 (intent only)

The field and sync-blob layers use the vault key directly, and every other key taken from it (the database key, the blind-index key, the key-pair wrap) uses its own domain-separation label, so no two purposes share a key.

- Work: LIF-74

Generated from `docs/modules/encryption/intent.yaml`; edit the ledger, never this unit.
