# PLAN (§XXVI g1) — AR-7 Increment 1: the `effects` rail

> Session-split PLAN (gate 1 = the SPEC). AR-7 ⊞4, increment 1 of 4 (`effects → capability → measurement →
> economy`). Profile: Add Backend Component. Grounded via §2.1 Documentation-Gathering Protocol — every shape
> `[FACT: file:line]`; genuine gaps flagged, not derived. Shared substrate grounding: `../baseline.md`.

## §1. Scope + baseline (what the rail IS / is NOT)

**Is (build-now):** the exactly-once **effect rail** — the base AR-5 explicitly deferred here
(`foundation/sessions/registry.ts:8`, `sessions.ts:8`). Home `packages/core/src/foundation/effects` + schema
`db/schema/foundation/effects.ts` + `migrations/004_effects.ts` + `@vida/types`/`@vida/core` enum surface.

**Is NOT (deferred, cited):**
- Per-module **effect handlers** — measurement/economy increments + M1.1 modules register their own (ADR-004 §3.2.5-A "service methods in `packages/core/services/<module>`"). The registry ships **empty** (seam).
- **`effect_event_id` columns on effect-*output* / *triggering* rows** — those are per-consumer tables (`consequence_ledger`, habit occurrences, …), authored at each consumer's build. [FACT: ADR-002 §5.20 :3793 — an AMEND on consumer rows, not this table]
- **Cross-device convergence merge** — sync layer, AR-9/M4. [FACT: ADR-004 §3.2.5-B.3]
- **Repository tx-accepting variant** — a handler that needs the Repository's field-encryption *inside* the rail tx
  needs a `tx`-scoped Repository write path. No handler exists yet (empty seam), so this is **owed to DB-6/Repository
  when the first encrypting handler is built** (M1.1+ consumer). The rail's `(event, tx)` contract already admits it —
  grounded downstream dependency, not an open gap here.
- **Session-lifecycle → fires-effects wiring** (transition engine) — a *consumer* of the rail; deferred with the lifecycle engine (AR-5 note; not this increment).
- **`derive()` hash algorithm** — build-phase per ADR-011 §3.8:76; the rail ships the deterministic canonical-string form now (§3.3, RESOLVED). The hash is a later representation-only compaction, not an open contract.

**Baseline (live floor):** `foundation/effects/` = CLAUDE.md stub only; no `applied_effects` anywhere (grep clean);
next migration = **004**; `EFFECT_TYPE` already shipped (12 values, `session.ts:71-86`); `sync_queue` is the
local-only-table precedent (`sync-queue.ts` — no baseColumns/syncColumns, own id + business UNIQUE, DDL in migration).

## §2. Business rules

- **BR-1 (exactly-once / R1).** An effect identified by `effect_event_id` is applied **at most once per
  `(effect_event_id, effect_type, target_ref)`** — enforced by a UNIQUE on `applied_effects` + a check-and-insert in
  the same transaction as the handler call. [FACT: capability-framework §2 R1 :60; ADR-004 §3.2.5-B.2]
- **BR-2 (deterministic identity).** `effect_event_id = derive(subject_natural_key ‖ transition ‖ effect_type)` —
  same inputs → same id on any device, computed by the producer. [FACT: ADR-004 §3.2.5-B.1 :99-103; ADR-002 §5.20 :3793]
- **BR-3 (single write path / R2).** Every effect is applied through its **registered handler** — never a direct
  table write; `applyEffect` refuses an effect-type with no registered handler (typed error). [FACT: framework §2 R2 :61; ADR-004 §3.2.5-A]
- **BR-4 (one handler per effect-type).** The registry maps each `EFFECT_TYPE` → **exactly one** handler;
  re-registering the same effect-type is a typed error (no silent override). [FACT: ADR-004 §3.2.5-A "→ exactly one handler"]
- **BR-5 (effect classes are exhaustive).** Every one of the 12 `EFFECT_TYPE`s has exactly one taxonomy **class**
  {`keyed` · `additive` · `projection` · `intra_realm`}; a compile-time exhaustive map enforces it. [FACT: ADR-004 §3.2.5 taxonomy table :80-85]
- **BR-6 (projection effects are a rail no-op).** A `projection`-class effect (`surface_journal`·`surface_calendar`)
  is idempotent by construction (pull-aggregated at render — the journal `buildDashboard(date)` reads source data,
  not a projection row). The rail therefore does **not** insert an `applied_effects` row AND does **not** invoke a
  registered handler for it — projection is a documented rail no-op (there is no replay guard, so it must never carry
  a persisted side effect; a write-shaped consequence is `surface_notification`/additive, not projection). [FACT: ADR-004 §3.2.5 :83; F1 :57 "no id, no ledger, out of scope"]
- **BR-7 (local-only ledger).** `applied_effects` carries **no** `_sync_*` and never enqueues to `sync_queue` —
  a device-local dedup ledger, exactly like `sync_queue`. [FACT: ADR-002 §5.20 :3763 "local-only, not synced"; sync-queue.ts:5-7]

## §3. Contract (shapes — every shape cited)

### 3.1 `applied_effects` table — `db/schema/foundation/effects.ts` (Drizzle query-mirror; DDL in migration)
**Owning spec = F1** (`docs/specs/adr-revisions/f1-guarded-write-idempotency/PLAN.md §3B :61-71`) — its ratified DDL
is a **composite PK, no surrogate `id`** (nothing FKs to this local-only ledger). Local-only like `sync_queue` (no
baseColumns/syncColumns) but the exact columns follow F1, not the sync_queue surrogate-id shape:
| column | type | note |
|--------|------|------|
| `effect_event_id` | TEXT NOT NULL | deterministic (BR-2) |
| `effect_type` | TEXT NOT NULL | `enumText('effect_type', EFFECT_TYPE)` → SQL CHECK (BR-3); separates the N effects one event fans out to [FACT: F1 :60] |
| `target_ref` | TEXT NOT NULL | producer-supplied target dim (which target this effect is directed at — an `EffectEvent` input, known at derive time) [FACT: F1 :60,71] |
| `applied_at` | INTEGER NOT NULL | Unix ms |
- **PRIMARY KEY `(effect_event_id, effect_type, target_ref)`** (BR-1) [FACT: F1 :68] · index on `effect_event_id`.
- CHECK + composite PK live in `migrations/004_effects.ts` (hand-SQL, ADR-016 §3.2); the Drizzle mirror uses `primaryKey({ columns: […] })`.
- Migration registration = two edits: `version: 4` on the migration object + append `migration004Effects` to `ALL_MIGRATIONS` in `runner.ts:24` (mirrors 002/003 — no "version constant" switch).

### 3.2 Effect taxonomy — `foundation/effects/types.ts`
- `EFFECT_CLASS = ['keyed','additive','projection','intra_realm'] as const` (code-level; **not** a DB column, no CHECK — never stored).
- `EFFECT_CLASS_OF: Record<EffectType, EffectClass>` — exhaustive (compile-time; BR-5). Mapping per §3.2.5 taxonomy:
  keyed = `complete_habit_occurrence·emit_measurement_signal·contribute_purpose_metric`; additive =
  `log_time·award_xp·grant_currency·lock_currency·move_money·surface_notification`; projection =
  `surface_journal·surface_calendar`; intra_realm = `attach_pomodoro`. [FACT: ADR-004 §3.2.5 :80-85; ADR-012 4 effects Additive :3803]

### 3.3 `effect_event_id` derivation — `foundation/effects/event-id.ts` (RESOLVED — Approval 1, 2026-08-02)
`deriveEffectEventId(subjectNaturalKey: string, transition: string, effectType: EffectType): string`
- **Inputs are doc-fixed, not chosen:** `derive(subject_natural_key ‖ transition ‖ effect_type)`. [FACT: F1 §3B :60; ADR-004 §3.2.5-B.1 :99-103; ADR-002 §5.20 :3793]
- **Form = canonical string** `` `${subjectNaturalKey}|${transition}|${effectType}` ``. This is **not** an open
  decision: the ADRs place the **hashing of `derive()` at build-phase** [FACT: ADR-011 §3.8 :76 "the `derive()`
  hash … those are **build-phase**"; ADR-004 §3.2.5 leaves the hash unspecified], so the rail commits only the
  determinism the spec requires (same inputs → same id) and defers the hash as the ADRs direct — no invention.
- **Collision-safety is grounded, not asserted:** the `|` separator is safe because every input component is a
  UUIDv7 `TEXT` id or a `YYYY-MM-DD` calendar date — neither contains `|`. [FACT: project conventions — "PKs: UUIDv7
  TEXT", "dates: TEXT `YYYY-MM-DD`", CLAUDE.md Conventions]. A reserved-separator invariant is documented in the fn's JSDoc.
- **Upgrade path is tracked, not hanging:** the later hash (BLAKE2b compaction of this canonical string) is a
  build-phase hardening carried in the effects context's `current-business-rules.md` at §XXIX (BR-2 note), and is a
  pure representation change (same identity semantics) — it does not reopen this contract. Recorded in §6 (deferred).

### 3.4 Handler registry + dispatch — `foundation/effects/registry.ts` + `service.ts`
- `EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>` — the handler receives the **active
  transaction** and MUST co-write through it (F1 §3B:71 "same transaction"); it must never open its own
  `db.transaction` (the sqlite-proxy emits a bare `BEGIN` → nested-BEGIN fails). Signature **locked now** to avoid a
  breaking change to future registrants. `EffectEvent = { subjectNaturalKey, transition, effectType, targetRef, payload? }`.
- `EffectRegistry`: `register(effectType, handler)` (BR-4 dup→`DuplicateEffectHandler`), `resolve(effectType)` (→ handler | `NoEffectHandler`). Ships **empty** (seam).
- `createEffectRail(db, registry)` → `applyEffect(event): Promise<{ applied: boolean }>`:
  1. class = `EFFECT_CLASS_OF[event.effectType]` (unknown type → `UnknownEffectType`).
  2. `projection` → **rail no-op**: return `{applied:true}`, **no handler invoked, no ledger row** (BR-6).
  3. else (keyed/additive/intra_realm): `resolve(effectType)` FIRST — absent → `NoEffectHandler` (BR-3, fail-loud,
     no ledger write); then `id = deriveEffectEventId(...)`; in ONE tx — insert `applied_effects(effect_event_id=id,
     effect_type, target_ref, applied_at)` ON CONFLICT DO NOTHING; if inserted → call the resolved handler; if
     conflict → no-op `{applied:false}` (BR-1).
- Typed errors in `types.ts`: `UnknownEffectType·DuplicateEffectHandler·NoEffectHandler`.

### 3.5 Barrels
`foundation/effects/index.ts` exports registry/service/types/event-id; `db/schema/index.ts` += effects table; `@vida/core` barrel += effects. No `@vida/types` change (EFFECT_TYPE exists; EFFECT_CLASS is core-local).

## §4. Acceptance
1. `applied_effects` table + migration 004 registered; `pnpm typecheck` 10/10.
2. `EFFECT_CLASS_OF` exhaustive over all 12 EFFECT_TYPE (compile-time; a missing entry fails tsc).
3. Tests (`__tests__/effects.test.ts`): dedup (same event twice → 1 ledger row, 2nd `{applied:false}`); projection writes no row; unknown-type + no-handler + duplicate-handler throw typed; one-handler-per-type.
4. `@vida/core` suite green; `enum-parity` (effect_type CHECK ↔ EFFECT_TYPE) passes.
5. Local-only proven: `applied_effects` has no `_sync_*` and never touches `sync_queue`.
6. Every shape traces to a cited line; the one flagged decision (§3.3) resolved at Approval 1.

## §5. Implementation Prompt (→ IMPL-PLAN at gate 2)
Order: (1) `foundation/effects/types.ts` (EffectClass, EFFECT_CLASS_OF, EffectEvent/Handler, errors) → (2)
`event-id.ts` → (3) `db/schema/foundation/effects.ts` (composite-PK mirror) + `schema/index.ts` → (4) `migrations/004_effects.ts`
(`version: 4`) + append `migration004Effects` to `ALL_MIGRATIONS` in `runner.ts:24` → (5) `registry.ts` → (6) `service.ts` (applyEffect) → (7) `index.ts` barrels + `@vida/core`
→ (8) `__tests__/effects.test.ts` → (9) typecheck + core suite. Then Currency Rule → `docs/core/effects/current-*`.
