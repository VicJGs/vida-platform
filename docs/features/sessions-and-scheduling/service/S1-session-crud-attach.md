<!-- S1 forward spec — MOD-sessions ① · slice S1 (Session CRUD + attach). The §XXVI g1 gate object.
     Backend Service Build Flow §4 lenses folded into one slice spec. REFERENCES the aspects + delivery/ +
     service/_index.md — does not restate them. No-Guessing: every claim FACT / INTERPRETATION / UNKNOWN. -->

# S1 — Session CRUD + attach (forward spec · g1)

**Home:** `packages/core/src/services/sessions/` — new `service.ts` (`createSessionsService`) + `types.ts`
(input types) + `index.ts` barrel + `service.test.ts`. First real `services/*` build; mirror
`foundation/spaces/service.ts`.

**Slice boundary (why these ops, not more).** S1 stands up the factory + the **structural** write/read paths
over the spine + 1:1 extensions + attachments. It deliberately does NOT do: semantic `sub_type`/`entity_type`
**registry** validation or completion/lifecycle wiring — those are **S2** (so S1 has a clean, testable surface
and S2 layers meaning on top).

## §1 Operations (surface)

- `createSession(input): Promise<Session>` — write the `sessions` spine row; if `input.extension` present,
  co-transactionally write the matching 1:1 extension (`focus_sessions` | `study_sessions`).
- `getSession(id): Promise<Session | null>` — spine + (optional) extension, decrypted. `null` if not found /
  soft-deleted (not an error).
- `updateSession(id, patch): Promise<Session>` — patch spine and/or extension fields.
- `softDeleteSession(id): Promise<void>` — `sessionRepo.delete(id)` (soft; enqueues `operation:'update'`).
  **Spine only** — the extension has no `deleted_at` (base owns lifecycle, B2′) and becomes unreachable via
  `getSession` while the spine is soft-deleted.
- `restoreSession(id): Promise<Session>` — clear `deleted_at` on the spine (update-by-PK, N1); the extension
  reappears (it was never removed).
- `attach(sessionId, entityType, entityId, level): Promise<Attachment>` — idempotent structural create.
- `detach(attachmentId): Promise<void>` — **hard delete** (no `deleted_at`, IR-7).
- `resolveTargets(sessionId): Promise<ResolvedTarget[]>` — re-export the built #32 `attachments.ts` reader.

## §2 Operation-flow & invariants

**The `sub_type` → extension-table map (B1 — the single source of the routing).** Only two sub-types have a
1:1 extension today: `focus` → `focus_sessions`, `study` → `study_sessions`. Every other sub_type (`class`,
`reading`, `practice`, `daily`, `review`, `workout`, `work`, user long-tail) is **spine-only** — no extension
row is written, read, or expected. `getSession`/`updateSession`/`createSession` resolve the extension repo from
`sub_type` via this map; an unmapped sub_type → spine-only path (never an error). `[FACT: session-extensions.ts
ships focus_sessions + study_sessions only; deferred sub-types → DB-4/M1.1+ current-spec.md]`

- **createSession (validate → tx{ spine [+ extension] } → return):**
  - Structural validation (Zod, `validators/session.ts`): `sub_type` non-empty string; `scheduling_mode` ∈
    `SCHEDULING_MODE`; `status` ∈ `SESSION_STATUS` (**required — no schema default**, caller supplies the start
    state, e.g. `scheduled`/`planned`/`in_progress` per `scheduling_mode`); if both present `ended_at ≥
started_at` else `InvalidSessionInput('ended_at')` (IR-5). NO registry membership check (→ S2).
  - Extension atomicity (nuance-2) — the **one** operation the `Repository` API supports transactionally
    (`createInTx` exists; no `update/deleteInTx`): `db.transaction(tx => { spine = sessionRepo.createInTx(tx,
…); const extRepo = extRepoFor(input.sub_type); if (extRepo && input.extension) extRepo.createInTx(tx, {
session_id: spine.id, …extension-fields-only, spine-fields NEVER restored (BR-S1) }) })`. A crash leaves
    neither row. `input.extension` for an unmapped sub*type → `InvalidSessionInput('extension')`.
    `focus_sessions.status` defaults `running`, `type` required — validated per `POMODORO*\*`.
  - `key_learnings` (`[E]`) passes through the `encryptedFields: []` seam (nuance-3); no special-casing.
- **attach (idempotent, hard-create):** `findWhere(session_id ∧ entity_type ∧ entity_id ∧ level)`; a row exists
  → return it (no-op); else `create`. `level` ∈ `{'type','instance'}` (Zod). **No revive path** (no `deleted_at`).
  `entity_type` semantic registry validation → **S2** (structural only here). `[FACT: sessions.ts:69-79; IR-7]`
- **detach:** `hardDelete(attachmentId)` — attachments are hard-deleted; a re-attach re-creates.
- **updateSession:** patches spine and/or (mapped) extension fields. `sub_type` is **immutable after create**
  (B3 — a change would mismatch the 1:1 extension) → `SessionPatch` omits it; an attempt → `InvalidSessionInput
('sub_type')`.
- **soft-delete / restore — SPINE ONLY (B2′, corrected at implement time per §XXVIII).** The extensions
  (`focus_sessions`/`study_sessions`) use `...baseColumns` which carries **no `deleted_at`** — the base session
  owns lifecycle (`[FACT: session-extensions.ts; memory [[session-extensions-carry-no-deleted-at]]]`). So
  `softDeleteSession` = `sessionRepo.delete(id)` (soft) **only**; `getSession` then returns `null` (via
  `findById`, which is soft-delete-aware) so the extension is unreachable — no cascade needed and none possible
  (`repository.ts` guards `softDelete && cols.deleted_at`). `restoreSession` = `sessionRepo.update(id,
{deleted_at:null})` **by PK** (N1 — NOT `findById`, which returns null for a soft-deleted row); the extension
  reappears untouched. (A future HARD delete would cascade-hard-delete the extension — out of S1 scope.)

## §3 Contract (the DX consumers feel)

Factory `createSessionsService({ db, deviceId, registry })` → object literal (no `this.`, IR-8). `registry`
(the AR-5 `SessionRegistry`) is injected **now** for a stable cross-slice signature though S1 does not use it
(S2 does — registry validation); TS strict has no `noUnusedParameters`, so this is clean. Repos (nuance-1):
`sessions` → `{deviceId, encryptedFields:[], softDelete:true}` (has `deleted_at`); `study_sessions`/
`focus_sessions`/`session_attachments` → `{deviceId, encryptedFields:[], softDelete:false}` (no `deleted_at`,
B2′ — deleted only on a hard delete). `getSession` composes the return by
reading the spine then, for a mapped sub_type, `findWhere(ext.session_id == id)` and merging into
`Session = { …spine, extension?: FocusExt | StudyExt }`. Returns decrypted rows. Typed errors:
`InvalidSessionInput(field)` (S1's own). Async on every mutation (rejection, not sync throw).

## §4 Acceptance criteria (the Verification Gate proves these)

1. `createSession` (focus, with extension) on an **unlocked live vault** writes a `sessions` row + a
   `focus_sessions` row sharing `session_id`; `getSession` round-trips both. `[N1 — real store, not fixtures]`
2. **Atomicity:** a forced failure on the extension write leaves **zero** `sessions` rows (tx rollback).
3. `attach` twice with the same key → one row (idempotent); `detach` removes it hard; re-`attach` re-creates.
4. `resolveTargets` returns both `type` and `instance` attachments.
5. Typed-error assertions: `ended_at < started_at` → `InvalidSessionInput('ended_at')`, no write; bad
   `scheduling_mode`/`status`/`level` → Zod rejection, no write.
6. `softDeleteSession` hides the session from `getSession`/`findAll` (spine soft-delete → extension
   unreachable, B2′); `restoreSession` brings it back with its extension intact (update-by-PK); a `sync_queue`
   row is enqueued per mutation. A spine-only sub_type (e.g. `class`) round-trips with no extension read/write.
7. `tsc --noEmit` clean; `@vida/core` suite green.

## §5 Implementation prompt (type-first order — scenario Step 7)

1. `types.ts` — `CreateSessionInput` (`{ sub_type, purpose?, scheduling_mode, status, started_at?, ended_at?,
focus_rating?, energy_level?, distraction_count?, key_learnings?, planned_block_id?, extension?:
{kind:'focus', …FocusFields} | {kind:'study', …StudyFields} }`), `SessionPatch`, `AttachInput`, `Session`
   (spine + optional extension), `InvalidSessionInput`.
2. Zod validators — extend `validators/session.ts` (reuse `SchedulingModeSchema`/`SessionStatusSchema`; add
   `CreateSessionSchema`). Parity with the FIXED enums.
3. `service.ts` — factory + repos + `createSession`/`get`/`update`/`softDelete`/`restore`/`attach`/`detach`;
   re-export `resolveTargets` from `foundation/sessions/attachments`.
4. `index.ts` barrel.
5. `service.test.ts` — Vitest logic + failure paths (mirrors spaces' service.test.ts structure).
6. Wire into the `@vida/core` barrel (`services/sessions` export).

## §6 Out of scope (homed)

Registry validation of `sub_type`/`entity_type` → S2 · completion/`transition` wiring → S2 · focus timer
mechanics → S3 · `[E]` activation → M3/DB-5.
