# Spec: xs-views — `ViewsService.cloneView` (S1)

**Status:** draft (gate 1)
**Unit:** the ONE owed code slice of the xs-views head (#35). Everything else = ratify (see `docs/features/views/delivery/reconciliation.md`).
**Source-repo:** vida-platform · `@vida/core`
**Profile:** Add Backend Component · Scenario: Entity Re-scope (recovery)
**Grounding rule (Victor directive):** every element traces to a `[FACT: cite]`. No invented shape.

---

## 1. Identity

Add `cloneView` to `ViewsService` (`packages/core/src/foundation/views/service.ts`) — the leg **XCU-05**: the
user "clones a global into a Space or vice-versa (clone = independent copy, consistent with ADR-009's fork
stance)." `[FACT: ADR-007:50-51; intake spaces.md:72; xcut-views.md:18 (XCU-05)]` It is the sole gap in an
otherwise-ratified V1–V5 substrate. `[FACT: reconciliation.md §D]`

## 2. Business Rules (all cited — the IRs from interpretation.md §5)

- **BR-clone-1 (independent copy / fork).** The clone is a brand-new `views` row with a **fresh** UUIDv7 +
  fresh `_sync_*` + `deleted_at=null` — **no** `template_id`/source back-link, **no** copied sync metadata.
  `[FACT: ADR-007:50-51 "independent copy"; ADR-009 fork title; IR-1/IR-5; repo.create mints fresh — service.ts:49]`
- **BR-clone-2 (the documented variation = space_id — REQUIRED param, zero INTERP).** `targetSpaceId` is
  **required**: the two documented redirects, global→Space (`string`) and Space→global (`null`). Every value
  traces to a FACT; no speculative no-arg "duplicate-in-place" (no consumer needs it at #35 — YAGNI §XXIII; a
  future P6 duplicate passes `source.space_id` explicitly, grounded-added then). **No rename-on-clone** — not in
  ADR-007/intake; `name` copied verbatim. `[FACT: ADR-007:50-51 "clones a global into a Space or vice-versa";
  intake spaces.md:72]`
- **BR-clone-3 (verbatim content copy, raw TEXT).** Copy `name`, `layout`, `filter`, `grouping`, `sort` from the
  source row **as-is**; `filter/grouping/sort` are stored TEXT → passed raw to `repo.create` (no parse→stringify
  round-trip that could reject stored-but-unusual JSON). `[FACT: schema spaces.ts:119-124; service.ts:52-55]`
- **BR-clone-4 (absent source).** `sourceId` with no live row → reject with `ViewNotFound(sourceId)` (same as
  `getView`); async rejection, not a sync throw. `[FACT: service.ts:67-70; types.ts:46; factory-service rule]`
- **BR-clone-5 (no default_view_id wiring).** Clone does NOT touch `spaces.default_view_id` — a cloned-into-Space
  view is a plain member, not the opener. `[FACT: ADR-007:53-54; current-business-rules.md BR-9; IR-6]`
- **BR-clone-6 (syncable + M1.0 pass-through, M3-forward-safe).** The clone write flows through the DB-6
  Repository → co-transactional `sync_queue` (`operation:'insert'`); inherits the empty-`[E]` set. Raw-TEXT copy
  is M1.0-correct (empty `[E]`); at **M3** the Repository's decrypt-on-read → encrypt-on-write makes the `name`
  copy round-trip correctly, and filter-value `[E]` is a future concern already flagged (BR-12/13), NOT this slice.
  `[FACT: service.ts:44-45; current-business-rules.md BR-12/BR-13; IR-2/IR-3]`
- **FindWhere caveat (not applicable here).** clone uses `findById` (soft-delete-filtered), not `findWhere` — so
  the [[repository-findwhere-skips-softdelete-filter]] gotcha does not bite; a soft-deleted source → not found (correct). `[FACT: service.ts:68]`

## 3. Contract

```ts
export interface ViewsService {
  createView(input: CreateViewInput): Promise<ViewRow>
  updateView(id: string, patch: Partial<CreateViewInput>): Promise<ViewRow>
  deleteView(id: string): Promise<void>
  getView(id: string): Promise<ViewRow>
  cloneView(sourceId: string, targetSpaceId: string | null): Promise<ViewRow> // NEW — XCU-05 (required target)
}
```
`current-spec.md:28` line extends to: *"`ViewsService` — view CRUD + clone (filter/grouping/sort stringified on
write; clone copies them raw)."*
**§XXIX close (F2) — DONE:** promoted BOTH — extended `current-spec.md:28` + added `current-business-rules.md`
**BR-18** (BR-16/17 taken by XCU-SP-27; verified against the live doc, not assumed): *"cloneView = independent
copy — fresh id/`_sync_*`, no back-link; `targetSpaceId` redirects global↔Space; name/layout/filter/grouping/sort
verbatim; no `default_view_id` touch."* `[ADR-007:50-51]`

## 4. Acceptance (Verification Gate — live store, not mocks)

1. clone a global view (`space_id=null`) with `targetSpaceId='sp1'` → new row, `space_id='sp1'`, identical
   `name/layout/filter/grouping/sort`, **new id** ≠ source. `[BR-clone-2/3]`
2. clone with `targetSpaceId=source.space_id` (duplicate in same Space) → same `name`, new id; editing the clone
   (`updateView`) leaves the source unchanged (independence). `[BR-clone-1]`
3. clone with `targetSpaceId=null` on a Space-owned source → clone is global (`space_id=null`). `[BR-clone-2]`
4. clone of an absent / soft-deleted id → rejects `ViewNotFound`. `[BR-clone-4]`
5. **live-store smoke** (better-sqlite3 + migration): assert **both** the cloned `views` row **and** the
   co-transactional `sync_queue` `create` row are present (F1: "atomicity" = both-present, inheriting
   `repo.create`'s `db.transaction` — NOT a new rollback test; rollback is DB-6's already-gated property),
   reusing the `createView`/`createTag` pattern in `spaces.test.ts:127-144`; the cloned row persists + reads back. `[BR-clone-6]`
6. no `spaces.default_view_id` mutated by clone. `[BR-clone-5]`
7. typecheck 0 · lint 0 · `@vida/core` suite green (+ new cases).

## 5. Implementation Prompt

In `packages/core/src/foundation/views/service.ts`:
1. Add `cloneView` to the `ViewsService` interface (§3).
2. Implement it in the returned object literal, closing over `repo` (NO `this.` — factory-service rule):
```ts
async cloneView(sourceId, targetSpaceId) {
  const source = await repo.findById(sourceId)
  if (!source) throw new ViewNotFound(sourceId)   // BR-clone-4 (async rejection)
  return repo.create({
    space_id: targetSpaceId,    // BR-clone-2 (required: string → Space, null → global)
    name: source.name,          // BR-clone-2 (verbatim, no rename)
    layout: source.layout,      // BR-clone-3
    filter: source.filter,      // raw TEXT — BR-clone-3
    grouping: source.grouping,  // raw
    sort: source.sort,          // raw
  })                            // repo.create mints fresh id/_sync_*/deleted_at — BR-clone-1/6
}
```
   (`ViewNotFound` already imported — service.ts:14.)
3. Tests in `packages/core/src/foundation/spaces/__tests__/spaces.test.ts` (or a new `views.test.ts` beside it) —
   the 7 acceptance cases §4, the live-store smoke on the real driver (not a mock).
4. Do NOT add: a `createRow` refactor (repo.create already takes the field object — createView:49), a `name`
   param, any layout-field logic, any seed logic. Scope = this method only.

## 6b. Preflight notes (verified against code — grounding)
- **PICK, don't spread.** `ViewRow` (`$inferSelect`) carries `id`/`_sync_*`/`created_at`; `repo.create` takes
  `CreateInput<T>` (excludes them). Impl PICKS the 6 fields — never spreads the source row. `[FACT: repository.ts:187,349; schema spaces.ts:116-125,141]`
- **repo.create is co-transactional.** `create` = `db.transaction(tx => createInTx(tx, data))` → enqueue `'create'`. `[FACT: repository.ts:344,349-351]`
- **Non-existent `targetSpaceId` = silent allow** (no cross-table FK; `space_id` plain TEXT). Out of scope — UI supplies a valid Space. `[FACT: current-spec.md conventions; spaces.ts:117]`
- **ENV (implement-time, §XXIV resolution — not a spec gap):** active node v20.20.2 < repo's `.nvmrc`=22; `better-sqlite3` is ABI-locked → `nvm use` before the `@vida/core` suite.
- **Test harness reused** — `spaces.test.ts` better-sqlite3 + `migrate` + `createViewsService`; sync_queue-assert pattern at `:127-144`. No new harness. `[FACT: spaces.test.ts:15-68,127-144]`

## 6. Out of scope (ratified/seams — reconciliation.md §A)
default-view seed (→Templates #36) · predicate exclude-mode (→build-time) · layout field-declaration (→P6) ·
dueIn/journal-contribution (→consumption seam) · nav pref (→Preferences).
