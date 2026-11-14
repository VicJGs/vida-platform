---
id: EDT-11
kind: intent-row
module: editor
status: active
supersedes: []
summary: "The Word export renders every block and mark faithfully, keeps nested blocks inside quotes, callouts and table cells, prints an image as a labeled text placeholder until attachments resolve, and degrades instead of throwing; it is emit-only."
anchors: [docs/modules/editor/intent.yaml, packages/editor/src/serializers/to-docx.test.ts]
tokens: 104
generated: true
---
# EDT-11 (partly tested)

The Word export renders every block and mark faithfully, keeps nested blocks inside quotes, callouts and table cells, prints an image as a labeled text placeholder until attachments resolve, and degrades instead of throwing; it is emit-only.

- Proof: BR-E8-7 (tested), BR-E8-9 (tested)
- Work: LIF-607

Generated from `docs/modules/editor/intent.yaml`; edit the ledger, never this unit.
