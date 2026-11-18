---
id: INTENT-books
kind: intent
module: books
status: active
supersedes: []
summary: "Intended rules of books: 35 rows, 2 tested, 1 partly tested, 32 intent only."
anchors: [docs/modules/books/intent.yaml]
tokens: 160
generated: true
---
# Intended rules: books

Generated from `docs/modules/books/intent.yaml`; edit the ledger, never this unit. Each row is its own unit, fetched by its row key. A row is tested when a test under the module's 2 test paths (listed below) is named with its row key, or with each of its proof rules.

- Tested: BK-6, BK-17
- Partly tested: BK-5
- Intent only: BK-1, BK-2, BK-3, BK-4, BK-7, BK-8, BK-9, BK-10, BK-11, BK-12, BK-13, BK-14, BK-15, BK-16, BK-18, BK-19, BK-20, BK-21, BK-22, BK-23, BK-24, BK-25, BK-26, BK-27, BK-28, BK-29, BK-30, BK-31, BK-32, BK-33, BK-34, BK-35

Test paths: `packages/core/src/services/books`, `apps/web/src/reader`
