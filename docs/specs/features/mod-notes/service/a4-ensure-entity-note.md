<!-- Entity Delivery Flow · TRACK A (Service Build Flow) · slice A4 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC). Grounded in docs/features/notes-and-pages/{business-rules,conventions}.md
     + docs/specs/features/mod-notes/_index.md (the unit-spec grounding for the seed) + interpretation.md
     + ADR-003 §4.2 + real code cites. No-Guessing: every claim is [FACT: path:line].
     CORRECTION (2026-08-24): a prior draft sent the seed to `title` (an over-read of IR-7); the docs ground it to
     `content` — _index.md:46/95/107 + NP-8. See BR-A4-3. -->
<!-- ground-truth docs referenced by bare filename below live at docs/features/notes-and-pages/ (+ delivery/) and docs/specs/features/mod-notes/ -->

# A4 — ensureEntityNote (NP-8)  (MOD-notes ① · slice A4)

## 0. Source model & ground truth
Backend `@vida/core` service slice — no visual surface. Ground truth = the aspect docs (NP-8, conventions:7/10/25)
+ **`docs/specs/features/mod-notes/_index.md`** (the unit spec — §2 NP-8:46, §5:107, acceptance:95 — which pins the
seed to `content` and names the `EntityNoteSeed` type) + the Entity Front Matter + ADR-003 §4.2 + the shipped A1–A3.
The `current-*` docs are residue of the removed ①; consulted here ONLY as corroboration of the seed shape (they agree
with `_index.md`); §XXIX regenerates them at the A-track close.

## 1. Context & scope
A4 adds the **entity-note auto-seed** (NP-8): `ensureEntityNote` — the idempotent, client-deterministic seed that
makes a parent entity's `*_note` (task/task_group/milestone/deliverable) **auto-exist and never blank**. It defines the
`EntityNoteSeed` input type + its Zod schema, and extends `services/notes/service.ts`. It authors no new table.

**In scope (the frozen seam row tagged A4 — `seam-contract.md:24`, `_index.md:73`):**
- `entityNoteSeedSchema` (`validators/note.ts`) + `EntityNoteSeed = z.infer<…>` (`services/notes/types.ts`, single-homed
  like `CreatePageInput` — NOT a `@vida/types` interface; `_index.md:88,106`).
- `ensureEntityNote(pageType, entityType, entityId, seed: EntityNoteSeed): Promise<PageRow>` — idempotent (returns the
  existing `*_note` of this type, else creates it), seeding `content` with a deterministic minimal TipTap doc.

**Explicitly OUT (later slices / other planes — do NOT build):**
- **No registry guard on the page write (N3).** `entity_type` is plain TEXT (no CHECK); `assertRegistered` fires only
  on AR-6 link/tag WRITES `[FACT: interpretation.md:62 N3; schema/notes.ts:46]`. A4 does not touch `_deps`.
- **The `content`-sync split is NOT A4's.** ADR-003 §4.2 syncs `content` via a per-page Yjs unit (the LWW blob omits
  content); that refinement is realized at **sync-activation** (AR-9b/later), not here. In M1.0 sync is scaffold-only
  (AR-9 no-consumer invariant — nothing flushes) so the seed `content` sits locally as the **Yjs-doc genesis**
  `[FACT: ADR-003 §4.2 L142-160; sync/__tests__/scaffold.test.ts no-consumer invariant]`.
- tag reads/facade (A5), attachments (A6), summary (A7), cascade (A8) — not here.

**Pattern to mirror (same file):** A1 `createPage` (the write that accepts `content`) + the `live`/`getPagesForEntity`
read `[FACT: services/notes/service.ts:38-50,75-77]`; the A1 `z.infer` input-type pattern (`CreatePageInput`) for
`EntityNoteSeed` `[FACT: services/notes/types.ts:19-20]`.

## 2. Business rules (invariants A4 must hold)
- **BR-A4-1 · Idempotent — returns the existing `*_note` of THIS type, never a duplicate (IR-5/NP-8).** Reads the live
  pages for **`(type=pageType, entity_type=entityType, entity_id=entityId)`**; if one exists, **return it unchanged**;
  else create `[FACT: interpretation.md:90 IR-5; business-rules.md:16 NP-8; _index.md:46; seam-contract.md:24]`. The key
  **includes `type`** — a different-type page on the same entity (e.g. a `[[` create-on-miss `note` stub, A3/IR-4) must
  not satisfy a `task_note` request. (A prior soft-deleted note is excluded by the live read → create-fresh, like
  A1/D-1; `pages` is not a junction, so IR-11 revive does not apply.)
- **BR-A4-2 · The seed `content` is a PURE function of `EntityNoteSeed` (IR-5) — deterministic, no `Date.now`/random;
  determinism scopes the CONTENT VALUE only.** The seed renders the `EntityNoteSeed` fields in their **fixed declared
  order — `title · type · status · dates`** (NP-8's list; "stable key order" = the typed shape's fixed order, not an
  alphabetical sort of arbitrary keys), skipping nullish, into a short summary; same `seed` → identical `content`
  string, every device `[FACT: business-rules.md:16 NP-8; _index.md:46,107 IR-5]`. The row's `id`/`created_at`/
  `updated_at` are repository-generated and NOT part of the determinism claim `[FACT: _index.md:107; repository.ts:327,333]`.
  Generated **client-side**; no server round-trip, no plaintext egress (ZK-1) `[FACT: conventions.md:10,24]`.
- **BR-A4-3 · The seed lands in `content`, as a minimal TipTap-JSON doc (NP-8 + conventions:7).** NP-8 seeds `content`
  (`_index.md:46` "seeds content … same inputs → same seed string"); `content` is TipTap/ProseMirror JSON
  `[FACT: conventions.md:7]`, so the seed is a **minimal deterministic TipTap doc** — a single `paragraph` holding the
  summary text — stringified into the `content` column (a bare non-JSON string would fail the editor parse,
  business-rules.md:29). `title` is left unset (NP-8 seeds the body, not the title). **This corrects a prior draft that
  sent the seed to `title`:** IR-7/ADR-003 §4.2 govern content *sync* (via the Yjs unit), NOT the initial local seed
  write; the `content` column holds the genesis, sync-split deferred (§1 OUT) `[FACT: _index.md:46; conventions.md:7;
  interpretation.md:92 IR-7; ADR-003 §4.2]`.
- **BR-A4-4 · No registry guard on the page write (N3).** `ensureEntityNote` does NOT `assertRegistered(entityType)`
  — the page layer is registry-agnostic (`pages.entity_type` plain TEXT no CHECK); an entity-LINK to an unregistered
  type fails loud at A5, not here `[FACT: interpretation.md:62 N3; schema/notes.ts:46]`.
- **BR-A4-5 · Composes A1, authors no table; adds the seed validator + `z.infer` alias (`_index.md:88,106`).**
  `createPage`'s write is reused via `pageRepo.create({ type: pageType, entity_type, entity_id, content:
  buildSeedContent(seed) })` `[FACT: services/notes/service.ts:38-50]`. `EntityNoteSeed = z.infer<typeof
  entityNoteSeedSchema>` is **single-homed in `services/notes/types.ts`** (mirrors `CreatePageInput`; NOT duplicated as
  a `@vida/types` interface — that would be a zero-consumer drift); returns the Drizzle `PageRow`; no new error.
- **BR-A4-6 · N1/N2/N9 inherited.** The create stamps `_sync_hash` via `hashContent` (N1); empty-`[E]` pass-through,
  deviceId via the existing `pageRepo` `[FACT: services/notes/service.ts:32]`. Live-DB smoke (§4).

## 3. Contract (the A4 surface ② will bind to)
`EntityNoteSeed` is a **service-layer input DTO — single-homed as a `z.infer` alias in `services/notes/types.ts`**,
exactly like `CreatePageInput`/`UpdatePageInput` (`_index.md:88,106` lists it in that set; `types.ts:5-6` header:
"Input types are `z.infer` of the kept DB-9 validators, never hand-redeclared"). It is **NOT** a `@vida/types` entity
interface — that layer holds `SyncableEntity`/`SyncMetadata` interfaces + enum tuples, not service DTOs
(`@vida/types/CLAUDE.md`).
```ts
// validators/note.ts (canonical Zod — EXTEND the file, _index.md:88)
export const entityNoteSeedSchema = z.object({
  title: z.string().nullish(),
  type: z.string().nullish(),     // the PARENT entity's kind (e.g. 'task', 'milestone') — NOT PageType
  status: z.string().nullish(),
  dates: z.string().nullish(),    // a short human date descriptor
})

// services/notes/types.ts — the ONE home for the type (mirror CreatePageInput):
export type EntityNoteSeed = z.infer<typeof entityNoteSeedSchema>

export interface NotesService {             // GROWS per slice; A4 appends ONE row
  ensureEntityNote(pageType: PageType, entityType: string, entityId: string, seed: EntityNoteSeed): Promise<PageRow>
}
```
- `②` consumer: the owning module (e.g. MOD-tasks) calls `ensureEntityNote` on entity create / first note open — the
  note is guaranteed to exist and be non-blank (a seeded TipTap body) before the editor mounts and Yjs takes over
  `content` `[FACT: intent-coverage.md:86 F-3]`.
- Determinism is over `content` only (BR-A4-2); the returned `PageRow` id/timestamps are repository-generated.

## 4. Acceptance — ░Verification Gate░ (blocking, per slice-map.md:25)
1. **Vitest — new `describe('A4 — ensureEntityNote')` in the same test file (reuse A1 `setup()`):**
   - **creates on first call:** `ensureEntityNote('task_note','task','t1',{title:'Buy milk',status:'todo'})` → a
     `PageRow` with `type='task_note'`, `entity_type='task'`, `entity_id='t1'`, **`content` non-null + parses as a
     TipTap doc** (`JSON.parse(content).type === 'doc'`) whose text contains the seed values.
   - **idempotent:** a 2nd identical call → **SAME id**; `getPagesForEntity('task','t1')` length 1 (BR-A4-1).
   - **idempotency keys on `type`:** a pre-existing `note` on `('task','t1')` (via `createPage`) + `ensureEntityNote(
     'task_note',…)` → creates a NEW `task_note` (returned `type==='task_note'`, id ≠ the note's) (BR-A4-1).
   - **deterministic `content` (IR-5):** two `ensureEntityNote` calls with the SAME `seed` on DIFFERENT entities →
     **identical `content` strings** (determinism is over the seed value, not the id) (BR-A4-2).
   - **fixed field order (BR-A4-2):** a seed with SCRAMBLED insertion order `{status:'s',dates:'d',type:'t',title:'ti'}`
     → the doc's text is the **exact** string `'ti · t · s · d'` (asserts the declared render order, not just "contains").
   - **no registry guard (BR-A4-4):** `ensureEntityNote('task_note','unregistered_type','x',{title:'y'})` succeeds.
   - **soft-deleted → create-fresh:** seed → `softDeletePage` → seed again → a NEW id.
2. **Live-DB smoke (REAL DB — N1):** cases run after `initVault()`; a real create round-trips (`_sync_hash` stamped).
3. **Green bars:** `pnpm --filter @vida/core test` all green (A1+A2+A3 stay green) · root `typecheck` 0 · `eslint` 0
   (the new `validators` + `services/notes/types` exports).
4. **§XXIX currency:** deferred to the A-track close — noted, not skipped.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `packages/core/src/validators/note.ts` — add `entityNoteSeedSchema` (z.object, 4 nullish string fields) — EXTEND
   the file (do NOT overwrite), mirroring `createPageSchema` `[FACT: _index.md:88]`. (No `@vida/types` change — the
   seed is a service input DTO, single-homed as a `z.infer` alias below, like `CreatePageInput`.)
2. `services/notes/types.ts` — `export type EntityNoteSeed = z.infer<typeof entityNoteSeedSchema>` (import the schema);
   append the `ensureEntityNote` interface row.
3. `services/notes/service.ts` — add a module-scope pure helper `buildSeedContent(seed): string`:
   ```ts
   // Fixed field order (NP-8), skip nullish → a short summary; wrapped in a minimal TipTap doc (conventions:7).
   function buildSeedContent(seed: EntityNoteSeed): string {
     const summary = [seed.title, seed.type, seed.status, seed.dates].filter((v) => v != null).join(' · ')
     return JSON.stringify({
       type: 'doc',
       content: [{ type: 'paragraph', content: summary ? [{ type: 'text', text: summary }] : [] }],
     })
   }
   ```
   and the method:
   ```ts
   async ensureEntityNote(pageType, entityType, entityId, seed) {
     const existing = await pageRepo.findWhere(
       and(eq(pages.type, pageType), eq(pages.entity_type, entityType), eq(pages.entity_id, entityId),
           isNull(pages.deleted_at))!,
     )
     if (existing.length > 0) return existing[0]                       // BR-A4-1 idempotent (type-keyed)
     return pageRepo.create({                                          // BR-A4-3 seed → content; BR-A4-4 no guard
       type: pageType, entity_type: entityType, entity_id: entityId, content: buildSeedContent(seed),
     })
   }
   ```
4. `services/notes/__tests__/notes-service.test.ts` — append the §4 `A4 — ensureEntityNote` cases.
5. Do NOT touch current-* (§XXIX). Do NOT wire the content-sync split (AR-9b). Do NOT add cascade (A8).

## 6. No open decisions
Every behavior is doc-fixed — implement per the cited sources; nothing to escalate:
- idempotent, returns existing `*_note` of this type (key includes `type`) → BR-A4-1 (`IR-5`·`NP-8`·`_index.md:46`·`seam:24`).
- **seed → `content`** (a minimal TipTap doc), NOT title → BR-A4-3 (`_index.md:46,95,107`·`NP-8`·`conventions:7`).
  *(Corrects the prior draft's IR-7-driven "seed→title"; IR-7/ADR-003 §4.2 govern content SYNC, not the local seed
  write — traced NP-8→_index.md:46 + conventions:7 to confirm, per [[follow-the-mirrors-x-pointer-before-declaring-unfixed]].)*
- deterministic `content` over the seed VALUE, fixed field order, client-side → BR-A4-2 (`IR-5`·`NP-8`·`_index.md:107`).
- `EntityNoteSeed` = `z.infer` alias single-homed in `services/notes/types.ts` (like `CreatePageInput`; NOT a
  `@vida/types` interface) + `entityNoteSeedSchema` validator → BR-A4-5 (`_index.md:88,106`·`NP-8`).
- no registry guard on the page write → BR-A4-4 (`N3`·`notes.ts:46`).
- content-sync split (LWW-omits-content, Yjs unit) → **deferred to AR-9b** (§1 OUT), not A4.
