# AssociationResolver — Service Forward Spec (S1)

> The net-new read-composition service for XCU-SP-27. Ratifies AR-6 substrate; adds a read surface beside `SpacesService`. No schema change.

## Operations

| Op | Signature | Reads |
|----|-----------|-------|
| `resolveAssociations` | `(ref: TaggableRef, mode: AssociationMode) => Promise<AssociationResult>` | `entity_tags` (by entity) + `entity_links` (outbound by page) |

## Operation flow

1. **Validate** `ref.entityType` against `TaggableTypeRegistry` → unregistered throws `UnknownEntityType` (IR-3 / BR-2). Reuse the existing `registry.isRegistered` — no new registry.
2. **Read tags** — `entity_tags WHERE entity_type = ref.entityType AND entity_id = ref.entityId AND deleted_at IS NULL` (idx `idx_entity_tags_entity`; explicit `isNull(deleted_at)` — IR-2). Map each row → `{ kind:'tag', tagId: row.tag_id }`.
3. **Read links** — `entity_links WHERE page_id = ref.entityId AND deleted_at IS NULL` (outbound; page-anchored source — IR-1). Map each row → `{ kind:'link', target:{ entityType: row.entity_type, entityId: row.entity_id }, context: row.context }`.
4. **Compose by mode** (the behavioral resolution — a real OS computation, not a display flag `[FACT: ADR-006:90-92]`):
   - `separate` → `{ mode:'separate', tags, links }` — **two heterogeneous typed relations**, operated on independently.
   - `unified` → `{ mode:'unified', associations }` — **one homogeneous association relation**: the OS normalizes each tag-membership and each outbound link into a common `Association` edge and returns them as a single set (the entity's associations as one space). Each edge **retains its `kind`** so the distinct-primitives invariant holds *inside* the one space (BR-4 — never blur `[FACT: current-business-rules.md:11]`). Deterministic order (tags, then links; each by `id`) so the one space is stable. **No dedup** — a tag-membership and a link to the same id are semantically distinct associations; merging them would violate BR-4.

## Invariants

- **INV-1** Reads only. No write, no schema change — *"tables untouched either way"* `[FACT: ADR-006:93-94]`.
- **INV-2 (behavioral, not cosmetic).** The modes differ in **relation structure**, not container: `unified` = ONE homogeneous relation the OS derives by normalizing both storage shapes into a common edge; `separate` = TWO heterogeneous typed relations. This is the *"computed in the OS, not a display flag"* behavior `[FACT: ADR-006:90-92]` and the *"real behavioral resolution, not a cosmetic"* framing `[FACT: ADR-006:25-26]`. Reversible (storage untouched, either mode re-derivable on demand → Option-C merged-table stays rejected `[FACT: ADR-006:148-152]`) — but reversibility is a storage property, NOT a claim that `unified` is a reshape of `separate`.
- **INV-3** Soft-deleted rows never surface (IR-2). `findWhere` alone would leak them — filter `deleted_at` in the clause.
- **INV-4** `entity_type` registry-validated before any read (IR-3). Fail-loud, same error as the write path.
- **INV-5** Outbound-only for links (IR-1). Inbound refs are AR-8; this service must not query the target-idx read path.
- **INV-6** Stateless on `mode` (IR-5). No preference read.
- **INV-7 (partial by design — the outgoing half).** This head resolves the entity's **outgoing** association adjacency only: its tag memberships + its outbound (`page_id`) links. The **incoming** half (entities linking *to* it) is AR-8's backlink resolver `[FACT: current-spec.md:33]` `[FACT: spaces.ts:66]`. The complete bidirectional association space of `[FACT: ADR-006:90-92]` = **this head ⊕ AR-8**; a consumer needing the full space composes both. This is a documented boundary, not a gap.
- **INV-8 (query boundary).** Entity-centric resolution only. Querying the association space *by filter / by tag / across entities* (the "queries … together" clause at scale) is the views engine — ADR-007 / `xs-views` `[FACT: docs/core/spaces/current-spec.md:17]` — never re-implemented here.

## Contract (typed errors)

- `UnknownEntityType` — reused from `foundation/spaces/types.ts:37` (do not redefine).

## Composition

- **Reuses:** `TaggableTypeRegistry` (registry.ts), `entityTags`/`entityLinks` schema + row types (schema/foundation/spaces.ts). **Reads go through the `Repository`** via `findWhere(and(eq(...), isNull(deleted_at)))` — NOT a direct `db.select()`. The repo cfg **mirrors `SpacesService` exactly** `[FACT: packages/core/src/foundation/spaces/service.ts:69]`:
  ```ts
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }  // BR-13 M1.0 pass-through
  const entityTagRepo  = createRepository(db, entityTags,  cfg)
  const entityLinkRepo = createRepository(db, entityLinks, cfg)
  ```
  - `encryptedFields: []` — **required, not optional.** BR-13 M1.0 pass-through `[FACT: docs/core/spaces/current-business-rules.md:20]`: the empty `[E]` set keeps `findWhere`'s `decryptAll` a no-op that **never calls `key()`**, so no vault-locked throw on the read path `[FACT: memory m10-repos-use-empty-encryptedfields-seam]`. When M3 activates field-encryption, `context` (the sole `[E]` read field) is added to this set and `findWhere`'s `decryptAll` (repository.ts:381 — confirmed decrypts) handles it — the forward-safe reason reads go through the Repository, not a raw `db.select()`.
  - `softDelete: true` + explicit `isNull(deleted_at)` in the clause — `findWhere` does NOT auto-filter soft-deletes (only `findAll`/`findById` do, repository.ts:316), so the filter is mandatory (IR-2).
  - `deviceId` — a read-only service needs none for sync, but `createRepository` requires it in config → pass the injected `deviceId` (unused on the read path; mirrors the sibling).
- **Home:** new `foundation/spaces/association-resolver.ts` + factory `createAssociationResolver(db, deviceId, registry)`; export from `foundation/spaces/index.ts` (add `export * from './association-resolver'`). Sits beside `SpacesService`; consumes the same substrate.
- **Does NOT touch:** `SpacesService` write methods, `spaces`/`space_enabled_blocks`/`views`, AR-8 backlink paths.

## Verification Gate (Step 9) — plan

- Vitest logic:
  - **shape:** `separate` → `{tags, links}` (two typed relations); `unified` → one `Association[]` where every element is a normalized edge carrying `kind`.
  - **behavioral (INV-2, N2):** an entity carrying tag `T` AND linking to entity `T` (same id) yields **two distinct edges** in `unified` (a `kind:'tag'` and a `kind:'link'`) — proves no blur/dedup (BR-4); unified order is deterministic (tags before links, by id).
  - **partiality (INV-7):** a non-page entity → `links:[]`, `tags` still resolve; a page that only *receives* links (no outbound) → `links:[]` (inbound is AR-8, not returned).
  - **guards:** soft-deleted tag/link excluded (IR-2); unregistered `entity_type` → `UnknownEntityType` (IR-3).
- **Live-store smoke on better-sqlite3** (real migration 003 + Repository), not fixtures — seed tags + outbound links (+ a soft-deleted row + an inbound-only link that must NOT surface), resolve both modes, assert. Catches the `findWhere` soft-delete seam a mock hides.
