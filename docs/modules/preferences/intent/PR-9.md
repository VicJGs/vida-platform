---
id: PR-9
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "Every preference write succeeds locally first with a co-transactional sync_queue row, and config reconciles Last-Writer-Wins."
anchors: [docs/modules/preferences/intent.yaml]
tokens: 71
generated: true
---
# PR-9 (intent only)

Every preference write succeeds locally first with a co-transactional sync_queue row, and config reconciles Last-Writer-Wins.

- Proof: BR-PREF-8 (no test)
- Uses: sync

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
