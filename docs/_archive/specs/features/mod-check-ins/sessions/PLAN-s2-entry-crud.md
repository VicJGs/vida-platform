# PLAN — check-ins ① · S2 Entry CRUD

Status: draft (gate-1 = this spec) · Session: 2026-09-19-mod-check-ins · Slice: S2 (legs CHE-01, CHE-02, CHE-03, CHE-04, CHE-20, CHE-21, CHE-31)
No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN]. Grounded in the notes-service precedent + check-ins docs.

## 1. Identity

Stand up the `@vida/core` check-ins **service scaffold** (`services/checkins/{types,service,index}.ts`) and its
**entry CRUD** surface over `daily_check_ins`. Factory-object, hoisted closures, no `this.` (the ② destructure
shape). `[FACT: services/notes/service.ts:72; memory factory-service-no-this-for-intra-calls]`
**What it is NOT:** not templates/questions WRITES (S3 — but S2 uses a read-only questions repo for the CHE-20
gate, mirroring notes S1's read-only `entityTagRepo`, `notes/service.ts:85`); not the Journal `entity_links`
re-feed (CHE-16 → S5; `updateCheckIn` persists only, the link hook is added in S5); not derivations (S4).

## 2. Business Rules

- **CHE-01 — one per (date, type).** `createCheckIn` pre-queries the (`check_in_date`,`check_in_type`) slot via
  `getCheckIn`; on clash throws `DuplicateCheckInError`. Mirrors the `JournalExistsError` pre-query pattern
  (`notes/service.ts:108-113`). The DB `uq_daily_check_ins_slot` is the backstop (`check-ins.ts:63`). `[FACT: notes/service.ts:108-113; check-ins.ts:63; contract.md:46]`
- **CHE-02 — updateCheckIn persists a CONTENT patch; the slot key is IMMUTABLE.** `updateCheckIn(id, patch)`
  parses `UpdateCheckInSchema` (which OMITS `check_in_date`+`check_in_type` — CK-2: a check-in is keyed by its
  slot, editing = content edit, not a slot move; the notes `updatePageSchema` `.strict()`/NOT-03 precedent) →
  `repo.update`. Moving a slot = delete + recreate (no in-place re-key → no CK-2 hole). The Journal re-feed
  (CHE-16) is a S5 hook, NOT S2. `[FACT: validators/user.ts UpdateCheckInSchema; notes/service.ts:130-133; business-rules.md:57]`
- **CHE-03/04 — reads.** `getCheckIn(date,type)` (slot read → `findWhere` eq-clause, first row or null);
  `listCheckIns({from,to})` (range over `check_in_date`). **No `isNull(deleted_at)`** — check-ins tables have no
  `deleted_at` (CK-10 hard-delete); the `allOf(...,isNull)` idiom is soft-delete-only. `[FACT: check-ins.ts:61; memory repository-findwhere-skips-softdelete-filter]`
- **CHE-20 — required-question gate.** When a check-in REFERENCES a template (`template_id != null`), every
  `is_required=1` question of that template must have an answer (in `custom_data` or a standard field) → else
  `RequiredQuestionUnansweredError`. **When `template_id` is null (default-template entry), there is no custom
  template to gate against → no gate.** Reads `check_in_template_questions` via a read-only repo (table exists;
  S3 owns the write surface). INTERP leg (`[INTERP CK-5]`). `[FACT: business-rules.md:55; parts/check-ins.md CHE-20]`
- **CHE-21 — custom_data single-source discipline (REJECT, fail-loud).** Standard default-template answers → their
  real columns; ONLY extra user-question answers → `custom_data` (keyed by `field_key`); never duplicate a standard
  field. A `custom_data` key that collides with a `daily_check_ins` standard column name is **REJECTED with a typed
  error** (fail-loud, constitution §5 — never a silent strip, which would hide a caller bug). `[FACT: conventions.md:11-13,42; parts/check-ins.md CHE-21]`
- **CHE-31 — verify, don't build.** CK-2 composite UNIQUE + CK-3 6-type enum are ALREADY in DB-4
  (`check-ins.ts:63,52`); S2 CONFIRMS (the slot pre-query + enforcing the slot key), does not re-author. `[FACT: check-ins.ts:52,63]`
- **Persistence:** `createRepository(db, dailyCheckIns, { deviceId, encryptedFields: [], softDelete: false })` —
  no `deleted_at` → `softDelete:false` (hard delete, CK-10); `encryptedFields:[]` M1.0 pass-through (CHE-30).
  `create()` returns the input-derived row → backfill notNull-default columns. `[FACT: repository.ts:176-216; notes/service.ts:115-125]`

## 3. Contract

`services/checkins/types.ts`:

```ts
interface CheckInsServiceDeps { db: DrizzleDb; deviceId: string }   // S5 adds effectRail/links
interface CheckInsService {
  createCheckIn(input: CreateCheckInInput): Promise<DailyCheckIn>       // CHE-01
  updateCheckIn(id: string, patch: UpdateCheckInInput): Promise<DailyCheckIn> // CHE-02
  getCheckIn(date: string, type: CheckInType): Promise<DailyCheckIn | null>   // CHE-03
  listCheckIns(range: { from: string; to: string }): Promise<DailyCheckIn[]>  // CHE-04
}
type CreateCheckInInput = z.infer<typeof CreateCheckInSchema>   // UpdateCheckInInput likewise
class DuplicateCheckInError extends Error            // CHE-01 (mirror JournalExistsError shape)
class RequiredQuestionUnansweredError extends Error  // CHE-20
class StandardFieldInCustomDataError extends Error   // CHE-21 (fail-loud reject)
```

**Return type = `DailyCheckIn` (the parsed domain interface), NOT the raw Row** — this is a CONSTRUCTED/parsed
return (the JSON array/object fields are `text()` columns; `$inferSelect` types them `string | null`, the
interface types them `string[]`/`Record`). This is the "constructed returns use a view/domain type" case, NOT
the "raw list reader returns Row" case (memory [[drizzle-row-not-assignable-to-vida-types-interface]]), and it
matches the **approved seam-contract** (`Promise<DailyCheckIn>`) + the preferences `toMerged` precedent
(`service.ts:113`). `[DEVIATION 2026-09-19: S2 §3 originally said `DailyCheckInRow`, contradicting the
seam-contract; corrected to `DailyCheckIn` — Route History.]`

- **Serialization boundary (preferences precedent):** WRITE → `serialize()` `JSON.stringify`s the JSON fields
  (`top_intentions`/`wins`/`gratitude`/`challenges`/`tomorrow_focus`/`custom_data`) before `repo.create/update`
  (`service.ts:155-168`). READ → `toDailyCheckIn(row)` maps the Row to `DailyCheckIn`, `parseJson`ing those
  fields (fallback `[]`/`null`, never throws — `service.ts:96-104`). `reflection`/scalars pass through.
  The `_sync_status` Row(`string`)→union gap is cast once at the mapper boundary (the DB-11 reconcile).

## 4. Acceptance

- [ ] Service scaffold created + wired into `services/index.ts` barrel · `createCheckInsService(deps)` returns the object.
- [ ] `createCheckIn` persists a valid entry; a second create on the same (date,type) throws `DuplicateCheckInError`.
- [ ] Backfilled notNull-defaults present on the returned row (no `undefined` required field).
- [ ] `updateCheckIn` patches; `getCheckIn`/`listCheckIns` read correctly (range inclusive).
- [ ] CHE-20: create with an unanswered required question throws `RequiredQuestionUnansweredError`; passes when answered.
- [ ] CHE-21: a standard field duplicated in `custom_data` is rejected/stripped (guard).
- [ ] `tsc --noEmit` 0 · ESLint clean.
- [ ] **Verification Gate:** Vitest logic + ≥2 failure paths (dup slot, unanswered required) + **live-store smoke** (real DB create→read; slot-collision path) — mirror `preferences-service.test.ts`/`notes` **tests** live-store setup.

## 5. Implementation Prompt

1. `services/checkins/types.ts` — `CheckInsServiceDeps`, `CheckInsService` (S2 methods), input types via `z.infer` of the S1 schemas, `DuplicateCheckInError`/`RequiredQuestionUnansweredError` (mirror `notes/types.ts:103-116`).
2. `services/checkins/service.ts` — `createCheckInsService(deps)`; `dailyRepo` (softDelete:false), read-only `questionRepo` (for CHE-20). Implement the 4 methods + the CHE-20/CHE-21 guards per §2. Backfill defaults on create (§2). Reads use plain `eq()` clauses (no isNull).
3. `services/checkins/index.ts` — re-export; add `export * from './checkins'`-equivalent to `services/index.ts`.
4. `services/checkins/__tests__/checkins-service.test.ts` — unit + live-store smoke (§4), mirroring the sibling **tests** harness.
5. `pnpm --filter @vida/core test` + `tsc --noEmit` → §4 done-check.

## 6. Open UNKNOWNs

- [none blocking] — error class identifiers are [INTERP] (only `DuplicateCheckInError` is doc-named, contract.md:46). CHE-20 reads the questions table directly (grounded in the notes read-only-repo precedent).

## 7. Change Log

| Date       | Session                  | Change        |
| ---------- | ------------------------ | ------------- |
| 2026-09-19 | 2026-09-19-mod-check-ins | S2 PLAN draft |
