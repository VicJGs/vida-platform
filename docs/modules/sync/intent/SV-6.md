---
id: SV-6
kind: intent-row
module: sync
status: active
supersedes: []
summary: "Each row of a synced table is one sync unit, serialized whole, compressed and encrypted into one blob whose plain header carries each changed field's clock stamp, so a device can merge per field before it decrypts."
anchors: [docs/modules/sync/intent.yaml]
tokens: 84
generated: true
---
# SV-6 (intent only)

Each row of a synced table is one sync unit, serialized whole, compressed and encrypted into one blob whose plain header carries each changed field's clock stamp, so a device can merge per field before it decrypts.

- Work: LIF-98

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
