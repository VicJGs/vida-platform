---
id: ECO-6
kind: intent-row
module: gamification
status: active
supersedes: []
summary: "The grant and lock handlers write one ledger row inside the rail's transaction, unique on the effect event key, kind and target; the rail's applied-effects log guards replay, and the ledger's unique key converges devices."
anchors: [docs/modules/gamification/intent.yaml]
tokens: 96
generated: true
---
# ECO-6 (intent only)

The grant and lock handlers write one ledger row inside the rail's transaction, unique on the effect event key, kind and target; the rail's applied-effects log guards replay, and the ledger's unique key converges devices.

- Proof: BR-6 (no test)
- Uses: effects, sync

Generated from `docs/modules/gamification/intent.yaml`; edit the ledger, never this unit.
