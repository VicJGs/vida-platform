<!-- current-spec — features/sessions-and-scheduling · the BUILT slice (durable, §XXIX-maintained).
     The 5 aspect docs (identity/business-rules/contract/structure-data/conventions) are the INTENDED design
     authority; THIS file records what is actually SHIPPED in code, cited to file. Born: AR-5 (2026-07-28). -->

# Current Spec — Sessions & Scheduling (built slice)

**Status:** AR-5 shipped the Pillar-1 STRUCTURAL foundation. Everything else in the 5-aspect design docs
remains INTENDED (not yet built). `[FACT: this branch — commit pending]`

## What is BUILT (AR-5 · ADR-004 §3.1/§3.2)

### Enums (`packages/types/src/session.ts`)
- `SESSION_SUB_TYPE` (9, OPEN), `SESSION_PURPOSE` (6, OPEN), `SCHEDULING_MODE` (3, FIXED), `SESSION_STATUS`
  (7, FIXED — the S5 lifecycle), `EFFECT_TYPE` (12 — ADR-004 §3.2.2 base 8 + ADR-012 amendment 4). C2
  tuple-as-source; validators `z.enum(...)` in `validators/session.ts`.

### Tables (`db/schema/foundation/sessions.ts` + migration `002_sessions.ts`)
- **`sessions`** — the base spine (syncable). `sub_type`/`purpose` OPEN free-TEXT; `scheduling_mode`/`status`
  FIXED SQL-CHECK; `focus_rating`/`energy_level` CHECK 1..5; `key_learnings` `[E]`; `...baseColumns` + soft delete.
  Indexes: status, sub_type.
- **`session_type_registry`** — `id` PK + `sub_type` UNIQUE; persists user `SessionTypeDef`s (dims 2-4 as JSON).
- **`session_attachments`** — dim1 polymorphic (session_id + entity_type/entity_id + level CHECK). Index on session_id.
- NO cross-table FK (ADR-004 §3.4 — sync applies rows out of order; integrity is app/sync-layer).

### Contract types + thin registry (`foundation/sessions/{types,registry}.ts`)
- `SessionTypeDef` + `CapabilityEnvelope` + `SessionTransition` + 4 typed errors.
- `createSessionRegistry(db, deviceId)` → `register/get/list`. Shipped types in-memory (`SHIPPED_SESSION_TYPES`,
  seeded `focus`); user types persist via the db-6 `Repository` (co-transactional `sync_queue` enqueue) + sync.

## Contract (delivered surface)
- `register(def)`: validates BR-3 (4 dims), BR-4 (effects ⊆ allowed_effects ⊆ shipped envelope), BR-1
  (unique across shipped + persisted); persists user types. `get(sub_type)` / `list()` merge shipped ∪ user.
- Typed errors, fail-loud, no partial writes.

## What is BUILT (XS-effect-rail #32 · XCU-09/10 — `foundation/sessions/{attachments,lifecycle}.ts`)
- **`resolveTargets(db, sessionId): ResolvedTarget[]`** (`attachments.ts`, XCU-10) — the read-side of dim1: all
  `session_attachments` rows for a session (`{entityType, entityId, level}`), `[]` when none. Direct select, no
  soft-delete filter (`session_attachments` has no `deleted_at`).
- **`transition(deps, sessionId, event): {status, fired}`** (`lifecycle.ts`, XCU-09) — the lifecycle state machine:
  validate the declared `(status,event)` transition (else `InvalidTransition`, no write); stamp `started_at` at
  `in_progress`; **on completion** fire the type's declared effects; commit status **last** (fire-first, replay-safe).
- **`fireCompletionEffects(deps, session, def): {fired}`** (exported) — per (effect × resolved target) the
  replay-safe `applyEffect` fan-out (no outer tx); occurrence key = target entity + **stable `started_at` UTC date**
  (SS-6 no-double-count); no-attachment fallback = the session is the subject. Structural `canTouch` only —
  **sensitive-consent is handler-side** (ADR-004 §3.2.5-A3/BR-17), the S2 gate is the handler seam.

## What is DEFERRED (NOT built — see identity.md "What it is NOT")
Effect-firing rail primitive built by AR-7; **lifecycle engine + fire step now BUILT (#32).** Still deferred:
per-module effect **handlers** (review→SM-2, class→attendance, workout→volume) + consent-threading → #46/MOD-* ·
non-completion firing + heterogeneous-attachment target disambiguation → with handlers · scheduler
(`planned_blocks`, availability, `dueIn`, `generatePlan`, G5) · per-sub-type extension tables (Books/Education/…)
→ DB-4/M1.1+ · session/attachment WRITE paths (`attach()`, session CRUD) → with those write paths · view layer →
G9 · shipped-type editing → later · `key_learnings` encryption (M1.0 pass-through seam, `encryptedFields:[]`).

## Verification (2026-07-28)
typecheck 10/10 · @vida/core 110/110 · @vida/web 6/6 · deferral grep clean. Spec:
`docs/specs/foundation/ar-5-sessions-base/`.
