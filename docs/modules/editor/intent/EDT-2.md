---
id: EDT-2
kind: intent-row
module: editor
status: active
supersedes: []
summary: "The editor is uncontrolled; the initial document seeds it once, a host reset goes through the handle and is silent (never echoed to onChange), and the only non-edit emit is one idempotent echo at mount."
anchors: [docs/modules/editor/intent.yaml, packages/editor/src/editor.test.tsx]
tokens: 84
generated: true
---
# EDT-2 (tested)

The editor is uncontrolled; the initial document seeds it once, a host reset goes through the handle and is silent (never echoed to onChange), and the only non-edit emit is one idempotent echo at mount.

- Proof: BR-E1-1 (tested)

Generated from `docs/modules/editor/intent.yaml`; edit the ledger, never this unit.
