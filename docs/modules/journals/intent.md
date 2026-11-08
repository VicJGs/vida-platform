---
id: INTENT-journals
kind: intent
module: journals
status: active
supersedes: []
summary: "Intended rules of journals: 20 rows, 4 tested, 5 partly tested, 11 intent only."
anchors: [docs/modules/journals/intent.yaml]
tokens: 196
generated: true
---
# Intended rules: journals

Generated from `docs/modules/journals/intent.yaml`; edit the ledger, never this unit. Each row is its own unit, fetched by its row key. A row is tested when a test under `packages/core/src/services/journals`, `apps/web/src/home/journal-contribution.test.ts`, `apps/web/src/home/journal-page-region.test.tsx`, `apps/web/src/home/use-journal-entry.test.ts`, `apps/web/src/home/home-surface.test.tsx`, `apps/web/src/home/section-model.test.ts`, `apps/web/src/home/section-state.test.ts`, `apps/web/src/home/selection.test.ts` is named with its row key, or with each of its proof rules.

- Tested: JR-2, JR-3, JR-6, JR-7
- Partly tested: JR-1, JR-4, JR-5, JR-8, JR-18
- Intent only: JR-9, JR-10, JR-11, JR-12, JR-13, JR-14, JR-15, JR-16, JR-17, JR-19, JR-20
