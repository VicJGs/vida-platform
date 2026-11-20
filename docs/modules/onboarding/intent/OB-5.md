---
id: OB-5
kind: intent-row
module: onboarding
status: active
supersedes: []
summary: "Completing the first run writes the marker under the app-wide write lock and only then opens the app at Home; the write is idempotent, and a failed one shows a retryable error and keeps the device in its first run."
anchors: [apps/web/src/onboarding/first-run-repo.test.ts, apps/web/src/onboarding/onboarding.test.tsx, apps/web/src/onboarding/use-first-run.test.ts, docs/modules/onboarding/intent.yaml]
tokens: 89
generated: true
---
# OB-5 (tested)

Completing the first run writes the marker under the app-wide write lock and only then opens the app at Home; the write is idempotent, and a failed one shows a retryable error and keeps the device in its first run.

- Proof: OB-5 (tested by name)

Generated from `docs/modules/onboarding/intent.yaml`; edit the ledger, never this unit.
