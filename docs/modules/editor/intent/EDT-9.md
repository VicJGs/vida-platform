---
id: EDT-9
kind: intent-row
module: editor
status: active
supersedes: []
summary: "Markdown export and import round-trip losslessly from the document (document to Markdown to the same document); export writes one canonical spelling, callouts and inline blocks travel in carriers that keep their configuration, frontmatter is optional, and import degrades on anything else, never throwing."
anchors: [docs/modules/editor/intent.yaml, packages/editor/src/serializers/serializers.test.ts]
tokens: 118
generated: true
---
# EDT-9 (tested)

Markdown export and import round-trip losslessly from the document (document to Markdown to the same document); export writes one canonical spelling, callouts and inline blocks travel in carriers that keep their configuration, frontmatter is optional, and import degrades on anything else, never throwing.

- Proof: BR-5 (tested), BR-E6-6 (tested), BR-E6-9 (tested)

Generated from `docs/modules/editor/intent.yaml`; edit the ledger, never this unit.
