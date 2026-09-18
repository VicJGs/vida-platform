# foundation/effects — Current Business Rules

> Durable invariants for the effect rail (AR-7 Increment 1). Promoted from
> `docs/specs/foundation/ar-7-capability-registry/effects/` at §XXIX. Owning spec: ADR-004 §3.2.5 + F1.
> Kept current with `packages/core/src/foundation/effects/`.

- **BR-1 — Exactly-once (R1).** An effect is applied at most once per `(effect_event_id, effect_type,
  target_ref)`, enforced by the `applied_effects` composite PRIMARY KEY + an in-transaction check-and-insert.
  A second identical event returns `{applied:false}` and fires no handler. [ADR-004 §3.2.5-B; F1 §3B; framework §2 R1]
- **BR-2 — Deterministic identity.** `effect_event_id = derive(subject_natural_key ‖ transition ‖ effect_type)`,
  a **canonical string** (`a|b|c`). Same inputs → same id on any device. The `|` separator is safe because inputs
  are UUIDv7 ids / `YYYY-MM-DD` dates. The `derive()` **hash is build-phase** (ADR-011 §3.8) — a later
  representation-only compaction, not a contract change.
- **BR-3 — Single guarded write path (R2).** Every non-projection effect is applied through its registered
  handler; `applyEffect` throws `NoEffectHandler` (no write) when none is registered. No direct table writes. [framework §2 R2; ADR-004 §3.2.5-A]
- **BR-4 — One handler per effect-type.** The registry binds each `EFFECT_TYPE` to exactly one handler;
  re-registering throws `DuplicateEffectHandler`. [ADR-004 §3.2.5-A]
- **BR-5 — Exhaustive taxonomy.** Every one of the 12 `EFFECT_TYPE`s has exactly one class
  {keyed·additive·projection·intra_realm} via `EFFECT_CLASS_OF` — a `Record<EffectType,EffectClass>` whose
  missing key fails `tsc`. [ADR-004 §3.2.5 taxonomy; ADR-012 (4 economy effects = additive)]
- **BR-6 — Projection is a rail no-op.** `projection` effects (`surface_journal`·`surface_calendar`) write no
  ledger row and invoke no handler (idempotent by construction — pull-aggregated at render). They must never carry
  a persisted side effect; a write-shaped consequence is `surface_notification` (additive). [ADR-004 §3.2.5; F1 §3B]
- **BR-7 — Local-only ledger.** `applied_effects` carries no `_sync_*` and never enqueues to `sync_queue` — a
  device-local dedup ledger like `sync_queue`. [ADR-002 §5.20:3763]
- **Handler tx contract.** A handler receives the active transaction and co-writes through it (F1 §3B "same
  transaction") — a handler throw rolls back both its write and the ledger row. Handlers must never open their own
  `db.transaction` (nested BEGIN fails). *Owed to DB-6:* a `tx`-scoped Repository write path for the first
  encrypting handler (no handler exists yet — empty seam).

- **BR-8 — Fire-time sensitive-consent gate (XCU-22, #32).** `assertEffectPermitted(ctx, effectType, moduleClass?)`
  (`gate.ts`) throws `EffectConsentMissing` iff a non-projection effect targets a sensitive module
  (∈ `SENSITIVE_MODULE_CLASSES`) absent from `ctx.consentedSensitiveModules`. Producer-agnostic + pure; the caller
  supplies the consented set (session → `permissions.sensitive_optins`; ADR-010 cap → `grant.consented_sensitive_modules`).
  It is a **handler-side seam** — the consuming sensitive module invokes it (ADR-004 §3.2.5-A3; BR-17); producers
  (the session engine) never call it, and never infer `moduleClass` from a binding (IR-5). [ADR-004 §3.2.5-A3; BR-17]

## Deferred (not in this increment)
Per-module handlers + the actual invocation of the BR-8 gate + consent-threading (→ #46 / MOD-*); `effect_event_id`
columns on consumer output rows; cross-device convergence merge (AR-9/M4); the `derive()` hash.
**No longer deferred:** session-lifecycle→fire wiring is BUILT (#32, `foundation/sessions/lifecycle.ts`).
