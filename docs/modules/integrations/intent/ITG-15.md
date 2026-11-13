---
id: ITG-15
kind: intent-row
module: integrations
status: active
supersedes: []
summary: "A connection's config syncs to the user's other devices only through a sync server (a self-hosted one included), and its secrets never sync between devices, so the user reconnects once per device; for background runs the user may separately grant their own server a connection's credential, and revoke it there."
anchors: [docs/modules/integrations/intent.yaml]
tokens: 116
generated: true
---
# ITG-15 (intent only)

A connection's config syncs to the user's other devices only through a sync server (a self-hosted one included), and its secrets never sync between devices, so the user reconnects once per device; for background runs the user may separately grant their own server a connection's credential, and revoke it there.

- Uses: sync, SV-33
- Work: LIF-578

Generated from `docs/modules/integrations/intent.yaml`; edit the ledger, never this unit.
