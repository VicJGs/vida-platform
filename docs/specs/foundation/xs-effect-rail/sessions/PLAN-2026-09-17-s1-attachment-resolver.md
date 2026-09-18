# PLAN — S1 Attachment resolver (XS-effect-rail #32 · XCU-10)

> §XXVI gate-1 SPEC for slice S1. Home: `packages/core/src/foundation/sessions/attachments.ts`. Plane: backend.
> No-Guessing: every claim `[FACT: path:line]` / `[INTERPRETATION]`. Source: slice-map.md § S1.

## §1 — Context
The lifecycle engine (S3) fires a session's declared effects **scoped to its attachments** (XCU-10). The
`session_attachments` table is built (AR-5) but nothing reads it. S1 builds the read-side resolver: given a
session, produce the target set the fire step scopes each effect to. Pure read, no write.
`[FACT: schema/foundation/sessions.ts:69-79]`.

## §2 — Business rules
- **BR-S1-1 — Resolve by session.** `resolveTargets(db, sessionId)` returns the session's attachments (all
  `level`s). Reads `session_attachments WHERE session_id = ?`. `[FACT: sessions.ts:73]`.
- **BR-S1-2 — Both levels returned, distinguished.** Each result carries `entity_type`, `entity_id`, `level`
  (`'type' | 'instance'`). Type-level = "always attached to a habit"; instance-level = "this session is about
  Topic X". `[FACT: xcut-sessions.md:21; sessions.ts:74-76]`.
- **BR-S1-3 — Empty is legal.** A session with no attachments → `[]`, never an error. The fire step treats an
  empty set as "the session's own subject is the target" (S3 concern, not S1). `[INTERPRETATION: interpretation.md IR + slice-map S1]`.
- **BR-S1-4 — No re-validation on read.** `entity_type` was registry-validated at write-time (BR-6); the resolver
  does not re-check it. `[FACT: sessions.ts:74]`.
- **BR-S1-5 — No write, no tx, no soft-delete filter.** Pure query. `session_attachments` carries **no
  `deleted_at`** — `baseColumns` excludes it `[FACT: _shared.ts:34-39]` and the DDL confirms none
  `[FACT: migrations/002_sessions.ts:75-89]` (membership-table convention: the base session owns lifecycle,
  attachments are hard-deleted — [[session-extensions-carry-no-deleted-at]]). The resolver reads **all** rows for
  the session; removal is a row delete, not a flag. (The #31 `findWhere` soft-delete lesson does NOT apply — that
  table has `deleted_at`; this one does not.)

## §3 — Contract
```ts
export interface ResolvedTarget {
  entityType: string
  entityId: string
  level: 'type' | 'instance'
}
// Reads session_attachments for the session (excludes soft-deleted); [] when none.
export function resolveTargets(db: DrizzleDb, sessionId: string): Promise<ResolvedTarget[]>
```
- **Read via direct `db.select`** (decided): `db.select().from(sessionAttachments).where(eq(sessionAttachments.session_id, sessionId))`.
  No `[E]` fields, no writes, no soft-delete ⇒ no Repository needed (Repository exists for encrypt + sync-enqueue
  on writes we don't do). `[FACT: sessions.ts:69-79 (no /* E */); repository.ts (write-oriented)]`.
- Row→`ResolvedTarget` mapping is the only transform. No caller-facing throw (a bad `sessionId` → `[]`).

## §4 — Acceptance (live-store Verification Gate)
- A1: seed a session + 1 type-level + 1 instance-level attachment → `resolveTargets` returns both, levels correct.
- A2: session with no attachments → `[]`.
- A3: attachments for a *different* session are not returned (WHERE scoping).
- A4: `tsc` 0 · lint clean · @vida/core suite green.

## §5 — Implementation prompt (gate-2 fills the IMPLEMENTATION-PLAN)
1. Add `attachments.ts` with `ResolvedTarget` + `resolveTargets` (direct select, `where(eq(session_id))`).
2. Export from `foundation/sessions/index.ts`.
3. Test file `__tests__/attachments.test.ts` — A1–A3 on a live `better-sqlite3` store (migrate → seed → assert).
4. `tsc`, lint, run suite.

## Boundary
S1 does NOT scope/fire effects, resolve the session's own-subject fallback, or touch the engine — those are S3.
