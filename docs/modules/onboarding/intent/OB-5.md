---
id: OB-5
kind: intent-row
module: onboarding
status: active
supersedes: []
summary: "Completing the first run writes the marker under the app-wide write lock and only then opens the app at Home; the write is idempotent, and a failed one shows a retryable error and keeps the device in its first run."
anchors: [docs/modules/onboarding/intent.yaml]
tokens: 86
generated: true
---
# OB-5 (intent only)

Completing the first run writes the marker under the app-wide write lock and only then opens the app at Home; the write is idempotent, and a failed one shows a retryable error and keeps the device in its first run.

- Work: LIF-635

Generated from `docs/modules/onboarding/intent.yaml`; edit the ledger, never this unit.
