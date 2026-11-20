---
id: PR-9
kind: intent-row
module: preferences
status: active
supersedes: []
summary: "Every preference write succeeds locally first with a co-transactional sync_queue row, and config reconciles Last-Writer-Wins."
anchors: [docs/modules/preferences/intent.yaml, packages/core/src/services/preferences/__tests__/preferences-service.test.ts]
tokens: 69
generated: true
---
# PR-9 (tested)

Every preference write succeeds locally first with a co-transactional sync_queue row, and config reconciles Last-Writer-Wins.

- Proof: BR-PREF-8 (tested)
- Uses: sync

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit.
