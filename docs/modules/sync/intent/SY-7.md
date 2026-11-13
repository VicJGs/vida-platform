---
id: SY-7
kind: intent-row
module: sync
status: active
supersedes: []
summary: "A failed push retries with backoff from 1 to 30 seconds up to three times, then is marked failed and shown as changes that failed to sync with a manual retry; a client error is never retried, an authentication error stops all sync and asks the user to sign in again, and an encryption error stops only that blob."
anchors: [docs/modules/sync/intent.yaml]
tokens: 109
generated: true
---
# SY-7 (intent only)

A failed push retries with backoff from 1 to 30 seconds up to three times, then is marked failed and shown as changes that failed to sync with a manual retry; a client error is never retried, an authentication error stops all sync and asks the user to sign in again, and an encryption error stops only that blob.

- Work: LIF-98

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit.
