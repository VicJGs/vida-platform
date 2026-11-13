---
id: INTENT-sync
kind: intent
module: sync
status: active
supersedes: []
summary: "Intended rules of sync: 42 rows, 1 tested, 0 partly tested, 41 intent only."
anchors: [docs/modules/sync/intent.yaml]
tokens: 167
generated: true
---
# Intended rules: sync

Generated from `docs/modules/sync/intent.yaml`; edit the ledger, never this unit. Each row is its own unit, fetched by its row key. A row is tested when a test under `packages/core/src/sync`, `packages/core/src/db/tests/repository.test.ts`, `apps/web/src/db` is named with its row key, or with each of its proof rules.

- Tested: SY-1
- Partly tested: none
- Intent only: SY-2, SY-3, SY-4, SY-5, SY-6, SY-7, SY-8, SY-9, SV-1, SV-2, SV-3, SV-4, SV-5, SV-6, SV-7, SV-8, SV-9, SV-10, SV-11, SV-12, SV-13, SV-14, SV-15, SV-16, SV-17, SV-32, SV-33, SV-18, SV-19, SV-20, SV-21, SV-22, SV-23, SV-24, SV-25, SV-26, SV-27, SV-28, SV-29, SV-30, SV-31
