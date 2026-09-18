# foundation/effects — substrate (framework §2)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
The exactly-once effect rail: effect_event_id + UNIQUE + applied_effects ledger; bindings->effects applied once. Ridden by sessions / economy / measurement

## Owning ADR
framework §2

## Capabilities (framework §3)
R1 R2

## Status
Built by AR-7 Increment 1 (2026-08-02). `applied_effects` dedup ledger (composite PK, local-only —
`db/schema/foundation/effects.ts` + migration 004) + `deriveEffectEventId` (BR-2, canonical string; hash =
build-phase) + `EFFECT_CLASS_OF` exhaustive taxonomy + `EffectRegistry` (one-handler-per-type, empty seam) +
`createEffectRail.applyEffect` (check-and-insert idempotent dispatch; handler co-writes through the same tx).
Currency docs: `docs/core/effects/current-{spec,business-rules}.md`. **XS-effect-rail #32 (2026-09-17):** added
`gate.ts` (`assertEffectPermitted` / `EffectConsentMissing`, XCU-22) — the fire-time sensitive-consent gate, a
**handler-side seam** (producer-agnostic; caller supplies the consented set; reuses `SENSITIVE_MODULE_CLASSES`).
The session lifecycle→fire wiring is now BUILT (`foundation/sessions/lifecycle.ts`) — the rail's first producer.
Deferred: per-module handlers + the gate's callers + consent-threading (#46/MOD-*), output-row `effect_event_id`
columns, cross-device merge (AR-9), the `derive()` hash.
