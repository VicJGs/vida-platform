---
id: INTENT-preferences
kind: intent
module: preferences
status: active
supersedes: []
summary: "Intended rules of preferences: 22 rows, 11 tested, 1 partly tested, 10 intent only."
anchors: [docs/modules/preferences/intent.yaml]
tokens: 160
generated: true
---
# Intended rules: preferences

Generated from `docs/modules/preferences/intent.yaml`; edit the ledger, never this unit. Each row is its own unit, fetched by its row key. A row is tested when a test under the module's 4 test paths (listed below) is named with its row key, or with each of its proof rules.

- Tested: PR-1, PR-2, PR-3, PR-4, PR-5, PR-6, PR-8, PR-9, PR-14, PR-15, PR-16
- Partly tested: PR-10
- Intent only: PR-7, PR-11, PR-12, PR-13, PR-17, PR-18, PR-19, PR-20, PR-21, PR-22

Test paths: `packages/core/src/services/preferences`, `apps/web/src/preferences`, `apps/web/src/settings`, `apps/web/src/stores/theme-store.test.ts`
