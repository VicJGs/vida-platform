---
id: ITG-1
kind: intent-row
module: integrations
status: active
supersedes: []
summary: "Every outside datum enters through the user's device, which fetches or reads it, parses, normalizes and encrypts it and writes the vault rows, or, with the server product, through the user's own server as a sealed hand-off; no server the user doesn't own fetches for the user, no server keeps or logs a plaintext import, and a fetch that could only work by a server reading the vault is refused, never downgraded."
anchors: [docs/modules/integrations/intent.yaml]
tokens: 143
generated: true
---
# ITG-1 (intent only)

Every outside datum enters through the user's device, which fetches or reads it, parses, normalizes and encrypts it and writes the vault rows, or, with the server product, through the user's own server as a sealed hand-off; no server the user doesn't own fetches for the user, no server keeps or logs a plaintext import, and a fetch that could only work by a server reading the vault is refused, never downgraded.

- Uses: IN-1, sync, SV-33
- Work: LIF-577

Generated from `docs/modules/integrations/intent.yaml`; edit the ledger, never this unit.
