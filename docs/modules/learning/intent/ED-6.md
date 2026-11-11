---
id: ED-6
kind: intent-row
module: learning
status: active
supersedes: []
summary: "A calendar feed fetches on the device every sync interval as a user-added source under its external grant; events dedup by feed and uid and are ignored rather than deleted, unmatched events wait for a manual match, a failed fetch is kept in last error and never leaves a silently stale schedule, revoking a feed stops future fetches and keeps synced events, and the server never sees feed plaintext."
anchors: [docs/modules/learning/intent.yaml, packages/core/src/services/learning-education/__tests__/service.test.ts]
tokens: 220
generated: true
---
# ED-6 (partly tested)

A calendar feed fetches on the device every sync interval as a user-added source under its external grant; events dedup by feed and uid and are ignored rather than deleted, unmatched events wait for a manual match, a failed fetch is kept in last error and never leaves a silently stale schedule, revoking a feed stops future fetches and keeps synced events, and the server never sees feed plaintext.

- Proof: BR-LE-S5-1 (no test), BR-LE-S5-3 (no test), BR-LE-S5-4 (no test), BR-LE-S5-5 (no test), BR-LE-S5-6 (no test), BR-LE-S5-7 (no test), BR-ED-4 (no test), ED-6 (tested by name)
- Uses: integrations, sessions, ED-4
- Work: LIF-147
- Open: Whether a revoked feed is skipped by the sync loop (the S5 forward note), and how a matched event becomes a class session.

Generated from `docs/modules/learning/intent.yaml`; edit the ledger, never this unit.
