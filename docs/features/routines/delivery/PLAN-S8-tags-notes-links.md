<!-- Forward spec — Routines ① S8 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Tags (entity_tags via Spaces), notes (a pages row via Notes), and page links (entity_links via Spaces) on `routine` + `routine_step`. -->

# PLAN S8 — Tags + notes + links

> Slice-map S8: ROU-23 / ROU-25 / ROU-26 · interpretation rules 14/19 · D2 · ledger A27. Base: S7 `0a99def` (`current-*` → **current**).

## Grounding
- **Targets** — D2 (`interpretation.md:180-181`), rule 14 (`:137`): notes, tags and links target **`routine_step`** and **`routine`**.
  `routine_action` is retired. Both entity types are pre-seeded in `ENTITY_TYPES` (§1a), so routines registers nothing.
- **Tags** — RT-16 / ROU-23: the shared `entity_tags` primitive owned by Spaces (ADR-006 SP1). Routines is a consumer and keeps no tag
  store of its own. Writes go through `spaces.tagEntity` / `untagEntity`, which are idempotent and resolve-then-soft-delete (the tasks S8
  precedent, `tasks/service.ts:668-686`).
- **Notes** — RT-15 / ROU-26 and rule 19: one linked `pages` row per routine and per step, never an inline column. It is reached through
  `notes.ensureEntityNote('note', 'routine'|'routine_step', id, seed)`, an idempotent find-or-create. The page type is `'note'` because
  `PAGE_TYPE` is CHECK-fixed with no routine type (the books/knowledge precedent).
- **Links** — ROU-26 "+ `entity_links`" and slice-map S8 "`spaces.createLink`": any page can link to a routine or a step
  (`createLink(pageId, entityType, entityId, context?)` / `removeLink`, SP4).
- **Saved views** — ROU-25 is **homed to 007/SP5** (reconciliation `:122`, R2): cited as consumed, not built here.
- **Deps** — seam `:26-27` (approved at the Re-scope Gate): `spaces: SpacesService` and `notes: NotesService` are **required**. They are
  not optional ports: honour the approved seam over a sibling's newer convention (tasks made them optional). The only caller of
  `createRoutinesService` is the test harness, so nothing else breaks.
- **Live tags only** — `deleteTag` does not cascade `entity_tags`, so a membership read filters to LIVE tags (the codebase fact behind the
  tasks orphan guard). A write onto a dead or unknown tag is rejected with Spaces' `TagNotFound` (the tasks guard, `:671`).
- **Read path (no Spaces tag-read API exists):**
  - the junction scan goes through the documented `notes.getTagsForEntity(entityType, id)` (`notes/service.ts:293`), which returns the live
    junction rows but doesn't check tag liveness;
  - tag liveness comes from a **read-only, soft-delete-filtered `tags` repo**. This is the codebase-wide exception: tasks
    `createTagReaders` `:853`, flashcards `:91`, books `:1138`, knowledge `:184`.
- **Links do not validate the page.** `createLink` checks only the entity registry (`spaces/service.ts:158-180`); `entity_links.page_id` is
  plain TEXT with no FK ("referential integrity is app/sync-layer", `db/schema/foundation/spaces.ts:20-22,71`); no `PageNotFound` error
  exists. Routines guards its own side (the routine or step), like every other `createLink` consumer: purposes `linkEntity`
  `:830-835`, notes `createEntityLink` `:265-273`.

## Scope
| # | Ledger | Change |
|---|---|---|
| 1 | seam | `RoutinesServiceDeps` += `spaces: SpacesService` and `notes: NotesService` (required) |
| 2 | A27 | **Tags:** `tagRoutine(routineId, tagId)` / `untagRoutine` / `getRoutineTags(routineId)` and `tagStep(stepId, tagId)` / `untagStep` / `getStepTags(stepId)`. A write requires a live routine/step (`RoutineNotFoundError` / `StepNotFoundError`) and a live tag (`TagNotFound`); an untag also requires the routine/step. Reads return the live `entity_tags` rows whose tag is live, never throw, and give `[]` for an unknown id |
| 3 | A27 | **Notes:** `getRoutineNote(routineId)` → `ensureEntityNote('note', 'routine', id, { title: routine.name })`; `getStepNote(stepId)` → `ensureEntityNote('note', 'routine_step', id, { title: step.title })`. Both are a find-or-create (a write, so T2: a live routine/step is required) and idempotent. The seed is **creation-only**: its title becomes the content's H1, the `pages.title` column stays NULL, and a later rename doesn't retitle the note |
| 4 | A27 | **Links** (the purposes `linkEntity(pageId, {type,id}, ctx?)` shape): `linkPage(pageId, target: { type: 'routine' \| 'routine_step'; id }, context?)` → `spaces.createLink`; `unlinkPage(pageId, target)` → `spaces.removeLink`. Both require a live target (the right type: a routine id given as a step → `StepNotFoundError`). `pageId` is not validated (see Grounding) |
| 5 | docs | seam deps (as-built) + the exposed methods · slice-map S8 row · `current-*` (§XXIX) · routines `CLAUDE.md` |

## Rules
- **T1 · Consumer only.** Routines never **writes** `entity_tags` / `pages` / `entity_links` directly; writes go through Spaces and Notes
  (constitution §6). The one direct read is `tags` liveness, because no contract exists for it (the codebase-wide exception above).
- **T2 · Fail loud on a write, never on a read.** Writes on a missing or archived routine or step throw its NotFound error. Tag reads return `[]`.
- **T3 · Archive keeps them.** Archiving a routine or removing a step leaves its tags, note and links untouched. The grounds: RT-17 ("soft
  delete hides while preserving") and ADR-006 (`:79-80`, `:165`: orphan-tag cleanup rides the soft-delete discipline). Rule 20 adds that
  routines touches only its own rows. Re-reading them after an archive is not a goal of this slice: reads by id still work, and writes
  are rejected (T2).

## Verification Gate (live store, Node 24; the harness wires the real `SpacesService` + `NotesService`)
1. **Tags round-trip:** tag a routine and a step → `get*Tags` lists them; tagging twice → one row (idempotent); untag → gone.
2. **Live-tag reads:** delete the tag in Spaces → `get*Tags` no longer lists it, though the junction row still exists.
3. **Guards:** tagging with an unknown/deleted tag → `TagNotFound`, no row. A missing or archived routine, or a removed step →
   `RoutineNotFoundError` / `StepNotFoundError` on tag, untag, note and link. A read with an unknown id → `[]`.
4. **Notes:**
   - `getRoutineNote` twice → the same page id, `type 'note'`, `entity_type 'routine'`, `content` containing the routine name (`pages.title`
     stays NULL);
   - `getStepNote` → `entity_type 'routine_step'`, content containing the step title;
   - on an archived routine → `RoutineNotFoundError`.
5. **Links:** `linkPage('routine', rid, pageId)` → one `entity_links` row; repeating it → still one (idempotent); `unlinkPage` → soft-deleted;
   the same for a step.
6. **Archive keeps them:** after `archiveRoutine`, the routine's tag rows and note page still exist.
7. **Edges:**
   - untagging a soft-deleted tag succeeds (deliberately cleanable);
   - re-tagging after an untag revives a single row;
   - `linkPage(pageId, { type: 'routine_step', id: <a routine id> })` → `StepNotFoundError`;
   - `unlinkPage` with no existing link → no-op.

**Harness:** one `TaggableTypeRegistry` shared by Spaces, Notes and Routines; Notes built with its required `backlinks` resolver (the tasks
`setupWithSubstrates` pattern, `tasks/__tests__/service.test.ts:1145-1148`).

Gates: tsc 0 · eslint 0 · routines suite · full `@vida/core` · g2 · /critique · §XXIX.

**Seam amendment:** the frozen seam lists no S8 methods, so the surface lands as `// ⟲ amended (A27)`:
- `tagRoutine` / `getRoutineNote` follow the tasks precedent (`tagTask` / `getTaskNote`);
- `linkPage` follows purposes `linkEntity`.

**Residual risk (recorded, not fixed):** `ensureEntityNote` returns any live `'note'` page for (`routine`, id), unordered, so a second user-made
note page attached to the routine could be returned instead. Books and knowledge share this behaviour.

## Out of scope (homed)
Saved views / user-extensible step-session types / templates (007/SP5, R2) · backlink reads and the neural graph (Notes/Spaces own the
reads) · routine-group-level notes (RT-15 ⚠ INTENDED extension, no doc defines a group) · providers + Journal (S9).

## g1 critique (folded): REVISE
**3 blocking:**
- B1: notes assert `content`, not `title`; the seed is creation-only;
- B2: the tag read path is named (`notes.getTagsForEntity` + the read-only `tags` liveness exception), and T1 reworded;
- B3: `pageId` is not validated anywhere; routines guards its own side.

**Non-blocking, folded:** N1 (ROU ids, no phantom "rule 25") · N2 (T3 grounded on RT-17 + ADR-006) · N3 (gate edges) · N4 (harness) ·
N5 (seam ⟲ amendment; `linkPage` follows the purposes shape) · N6 (residual risk recorded).
