---
id: GM-2
kind: intent-row
module: gamification
status: active
supersedes: []
summary: "A rule is a measured condition and a consequence; the condition is an acyclic event-trigger or derived-pull binding, and the consequence dispatches separate typed effects (grant_currency with award_xp as its experience case, lock_currency, move_money, surface_notification), each in its own Additive write class, never one umbrella effect or a new engine."
anchors: [docs/modules/gamification/intent.yaml, packages/core/src/services/gamification/__tests__/gamification-service.test.ts]
tokens: 151
generated: true
---
# GM-2 (tested)

A rule is a measured condition and a consequence; the condition is an acyclic event-trigger or derived-pull binding, and the consequence dispatches separate typed effects (grant_currency with award_xp as its experience case, lock_currency, move_money, surface_notification), each in its own Additive write class, never one umbrella effect or a new engine.

- Proof: BR-GM-9 (no test), BR-GM-10 (no test), BR-GM-13 (no test), GM-2 (tested by name)
- Uses: measurement, MS-7, effects, ECO-1, ECO-7

Generated from `docs/modules/gamification/intent.yaml`; edit the ledger, never this unit.
