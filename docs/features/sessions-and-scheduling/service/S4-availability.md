<!-- S4 forward spec — MOD-sessions ① · slice S4 (Availability). The §XXVI g1 gate object.
     CRUD over study_availability + availability_exceptions (SS-9). REFERENCES aspects + S1/_index. No-Guessing. -->

# S4 — Availability (forward spec · g1)

**Home:** extends `services/sessions/service.ts`. Two new repos over the DB-4 scheduler-input tables. No new
factory deps. Independent of S1–S3 (only needs the factory + repos).

## §1 Operations (return the row; signatures → `delivery/seam-contract.md`)
- `setAvailability(input): Availability` — create a recurring window (`study_availability`).
- `updateAvailability(id, patch): Availability` — patch a window.
- `removeAvailability(id): void` — **hard delete** (no `deleted_at`; syncs `operation:'delete'`).
- `listAvailability(): Availability[]` — all windows.
- `addAvailabilityException(input): AvailabilityException` — create a date-specific override (`availability_exceptions`).
- `removeAvailabilityException(id): void` — hard delete.
- `listAvailabilityExceptions(): AvailabilityException[]` — all exceptions.

## §2 Operation-flow & invariants
- **Repos (nuance-1, corrected):** `study_availability` + `availability_exceptions` → `{deviceId,
  encryptedFields:[], softDelete:false}` — **neither carries `deleted_at`** (bare `...baseColumns`); `remove*` is
  a hard delete. `[FACT: scheduling.ts:44,59 (no deleted_at); migration 014]`
- **Validation (IR-5, fail-loud, typed `InvalidSessionInput(field)` — reused):**
  - `study_availability`: `day_of_week` ∈ 0..6 (else `InvalidSessionInput('day_of_week')`); `preference_score`
    (nullable) ∈ 1..5 if present; `start_time`/`end_time` match `HH:MM` (`/^([01]\d|2[0-3]):[0-5]\d$/`); a window
    requires `end_time > start_time` (string compare works for `HH:MM`) → else `InvalidSessionInput('end_time')`;
    `preset_block` (nullable) ∈ `PRESET_BLOCK`; `max_session_minutes` (nullable) ≥ 1 if present.
  - `availability_exceptions`: `exception_date` matches `YYYY-MM-DD` (`/^\d{4}-\d{2}-\d{2}$/`); if partially
    available, `start_time`/`end_time` match `HH:MM` and `end > start`. `is_available` required.
  - App-layer validation runs BEFORE the write (fail-loud) so the raw DDL CHECK is never the surfaced error —
    mirrors S1/S3. The DDL CHECK remains the backstop.
- **`reason` (`[E]`)** on `availability_exceptions` passes through the `encryptedFields:[]` M1.0 seam (nuance-3).
- **`is_available` is orthogonal to the window (NOT a contradiction) — doc-resolved.** `study_availability`
  rows are **always timed** (`start/end_time` notNull); `is_available` flags whether that recurring window is
  **free (`true`, default)** or a **blackout (`false`)** — a `false`+times row is a valid recurring-unavailable
  window. For `availability_exceptions`, `is_available` + *optional* times = whole-day (`false`, no times) or
  partial (times given) (un)availability. S4 validates the times if present but NEVER rejects a `false`+times
  combination. `[FACT: intake:31-33 "recurring weekly windows"; SS-9; structure-data:16]`
- **NO uniqueness / overlap constraint — doc-resolved.** structure-data, SS-9, and the intake impose none, and
  the schema has no `UNIQUE`; availability is the **input** the (deferred, G5) placement algorithm consumes.
  So multiple / overlapping per-day windows (and multiple exceptions per date) are **valid Planner input** —
  S4 **stores them as-is, never dedupes or rejects an overlap**. `[FACT: scheduling.ts no UNIQUE; SS-9; G5 deferred]`
- **`preset_block`** ∈ the 7 `PRESET_BLOCK` values (`early_morning`…`night`), nullable — a categorization of the
  window, not a uniqueness key. `[FACT: knowledge.ts:30-38; intake:33]`
- **SS-9 ownership** — these are the Planner's scheduling INPUT this module owns; Routines may later preset
  windows (deferred), the Global Calendar only renders placed results (M2). S4 builds the CRUD only.

## §3 Contract (delta)
Adds the 7 methods to `SessionsService`. Input types `AvailabilityInput` / `AvailabilityExceptionInput` +
patch. Rows returned decrypted. Reuses `InvalidSessionInput`. No new factory deps or typed errors.

## §4 Acceptance criteria (Verification Gate — live unlocked vault)
1. `setAvailability({day_of_week:1, start_time:'09:00', end_time:'11:00', preference_score:4})` writes a row;
   `listAvailability` returns it; a `sync_queue` row is enqueued.
2. `updateAvailability` patches a field; `removeAvailability` hard-deletes (gone from `listAvailability`;
   `sync_queue` `operation:'delete'`).
3. Typed-error assertions (no write): `day_of_week:7` → `InvalidSessionInput('day_of_week')`;
   `preference_score:6` → `('preference_score')`; `start_time:'25:00'` → `('start_time')`; `end_time:'08:00'`
   with `start_time:'09:00'` → `('end_time')`.
4. `addAvailabilityException({exception_date:'2026-10-01', is_available:false, reason:'holiday'})` writes;
   `listAvailabilityExceptions` returns it; `exception_date:'10/01/2026'` → `InvalidSessionInput('exception_date')`.
5. `removeAvailabilityException` hard-deletes.
6. **Blackout window accepted (not rejected):** `setAvailability({day_of_week:2, start_time:'13:00',
   end_time:'14:00', is_available:false})` succeeds and round-trips `is_available:false` (a recurring
   unavailable window — doc-resolved orthogonality).
7. **Overlap allowed (no dedupe/reject):** two `setAvailability` calls for the same `day_of_week` with
   overlapping times both persist (`listAvailability` returns 2) — valid Planner input (SS-9/G5).
8. `tsc` clean; full `@vida/core` suite green.

## §5 Implementation prompt (order)
1. `types.ts` — `AvailabilityInput`, `AvailabilityPatch`, `AvailabilityExceptionInput` (+ `Availability` /
   `AvailabilityException` = the row types).
2. `validators/session.ts` — `AvailabilitySchema` + `AvailabilityExceptionSchema` (Zod; ranges + HH:MM + date).
3. `service.ts` — `availabilityRepo` + `exceptionRepo` (`softDelete:false`); the 7 methods with pre-write
   validation → `InvalidSessionInput`.
4. `__tests__` — AC1–AC5 on a live vault.

## §6 Out of scope (homed)
Routines presetting windows → Routines module · Global Calendar render → M2 · `generatePlan` consuming
availability → S5 (endpoints) / M1.2 (algorithm) · `reason` encryption activation → M3/DB-5.
