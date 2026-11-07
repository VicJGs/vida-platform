---
id: HB-2
kind: intent-row
module: habits
status: active
supersedes: []
summary: "A streak is the run of consecutive scheduled occurrences that are done, and an elapsed scheduled miss resets it to 0 with no grace; current_streak, longest_streak and total_completions are a cache recomputed from the habit_completions ledger on every log, edit, delete and backfill, never adjusted by hand."
anchors: [docs/modules/habits/intent.yaml, packages/core/src/services/habits/__tests__/habits-service.test.ts]
tokens: 131
generated: true
---
# HB-2 (tested)

A streak is the run of consecutive scheduled occurrences that are done, and an elapsed scheduled miss resets it to 0 with no grace; current_streak, longest_streak and total_completions are a cache recomputed from the habit_completions ledger on every log, edit, delete and backfill, never adjusted by hand.

- Proof: BR-HB-12 (no test), BR-HB-13 (no test), BR-HB-14 (no test), BR-HB-15 (no test), HB-2 (tested by name)

Generated from `docs/modules/habits/intent.yaml`; edit the ledger, never this unit.
