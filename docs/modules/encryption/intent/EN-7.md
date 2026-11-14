---
id: EN-7
kind: intent-row
module: encryption
status: active
supersedes: []
summary: "An encrypted field is sealed with XChaCha20-Poly1305 under the vault key with a fresh random 24-byte nonce on every write and stored as one text value of nonce and ciphertext; it decrypts to the same value and type it was written with, and a wrong key or tampered value fails to decrypt."
anchors: [docs/modules/encryption/intent.yaml]
tokens: 104
generated: true
---
# EN-7 (intent only)

An encrypted field is sealed with XChaCha20-Poly1305 under the vault key with a fresh random 24-byte nonce on every write and stored as one text value of nonce and ciphertext; it decrypts to the same value and type it was written with, and a wrong key or tampered value fails to decrypt.

- Work: LIF-622

Generated from `docs/modules/encryption/intent.yaml`; edit the ledger, never this unit.
