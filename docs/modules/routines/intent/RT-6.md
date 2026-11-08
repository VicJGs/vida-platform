---
id: RT-6
kind: intent-row
module: routines
status: active
supersedes: []
summary: "The user sets how misses count and the acceptance window, how long a miss stays make-good-able before it is a real miss, and a make-good past the window is refused with a typed error; a routine is active, paused or off, and a paused or off routine generates no misses."
anchors: [docs/modules/routines/intent.yaml, packages/core/src/services/routines/__tests__/routines-service.test.ts]
tokens: 113
generated: true
---
# RT-6 (partly tested)

The user sets how misses count and the acceptance window, how long a miss stays make-good-able before it is a real miss, and a make-good past the window is refused with a typed error; a routine is active, paused or off, and a paused or off routine generates no misses.

- Proof: BR-RT-S6-1 (no test), RT-6 (tested by name)
- Work: LIF-482

Generated from `docs/modules/routines/intent.yaml`; edit the ledger, never this unit.
