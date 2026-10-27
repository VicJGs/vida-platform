# foundation/sessions — substrate (ADR-004)

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is

Sessions supertype for all timed/scheduled activity (pomodoro/study/reading are sub-types); shared effect catalogue + lifecycle enum + idempotency rail

## Owning ADR

ADR-004

## Capabilities (framework §3)

S1 S4 S5

## Status

AR-5 (2026-07-28): `SessionTypeDef` 4-dim contract + thin `SessionRegistry` + tables (`sessions`,
`session_type_registry`, `session_attachments`) via migration 002. **XS-effect-rail #32 (2026-09-17):** the runtime
— `attachments.ts` (`resolveTargets`, XCU-10) + `lifecycle.ts` (`transition` + `fireCompletionEffects`, XCU-09):
validate declared transitions, stamp started_at/ended_at, **fire declared effects on completion** through the AR-7
rail (replay-safe fan-out, no-double-count keyed by target ‖ started_at-UTC-date). Structural scope only —
sensitive-consent is handler-side (`foundation/effects/gate.ts` seam, ADR-004 §3.2.5-A3/BR-17). Currency:
`docs/features/sessions-and-scheduling/current-*`. Deferred: per-module handlers + scheduler → #46/MOD-\*.
⚠ M1.0: use `encryptedFields:[]` (vault-locked pass-through seam) even though `key_learnings` is `[E]`.
