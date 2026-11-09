---
id: BK-4
kind: intent-row
module: books
status: active
supersedes: []
summary: "Positions map between formats automatically, from a transcription and table-of-contents anchors near the stopped point, never by manual calibration; while the mapping is pending, failed or absent, the user sees the native position and an explicit "not synced yet" state, and a mapped position is never guessed."
anchors: [docs/modules/books/intent.yaml, packages/core/src/services/books/__tests__/service.test.ts]
tokens: 125
generated: true
---
# BK-4 (partly tested)

Positions map between formats automatically, from a transcription and table-of-contents anchors near the stopped point, never by manual calibration; while the mapping is pending, failed or absent, the user sees the native position and an explicit "not synced yet" state, and a mapped position is never guessed.

- Proof: BR-BK-S3-5 (no test), BK-4 (tested by name)
- Uses: ai
- Work: LIF-501

Generated from `docs/modules/books/intent.yaml`; edit the ledger, never this unit.
