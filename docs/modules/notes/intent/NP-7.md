---
id: NP-7
kind: intent-row
module: notes
status: active
supersedes: []
summary: "Wiki-links resolve by page id, never by text or slug; the [[ picker binds a concrete target_page_id, so links survive renames and title clashes."
anchors: [apps/web/src/notes/wikilink.test.ts, docs/modules/notes/intent.yaml, packages/core/src/services/notes/__tests__/notes-service.test.ts]
tokens: 74
generated: true
---
# NP-7 (tested)

Wiki-links resolve by page id, never by text or slug; the [[ picker binds a concrete target_page_id, so links survive renames and title clashes.

- Proof: BR-S3-4 (tested), NP-7 (tested by name)

Generated from `docs/modules/notes/intent.yaml`; edit the ledger, never this unit.
