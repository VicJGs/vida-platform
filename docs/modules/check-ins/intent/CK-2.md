---
id: CK-2
kind: intent-row
module: check-ins
status: active
supersedes: []
summary: "There is one check-in per date and type, so morning, afternoon, evening and the reviews coexist on a day; a second check-in for a taken slot is a typed DuplicateCheckInError, never an overwrite, and the slot is immutable on update."
anchors: [docs/modules/check-ins/intent.yaml, packages/core/src/services/checkins/__tests__/checkins-service.test.ts]
tokens: 93
generated: true
---
# CK-2 (tested)

There is one check-in per date and type, so morning, afternoon, evening and the reviews coexist on a day; a second check-in for a taken slot is a typed DuplicateCheckInError, never an overwrite, and the slot is immutable on update.

- Proof: CK-2 (tested by name)

Generated from `docs/modules/check-ins/intent.yaml`; edit the ledger, never this unit.
