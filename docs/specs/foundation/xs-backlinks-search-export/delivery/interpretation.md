# Interpretation — xs-backlinks-search-export (#42)

> Entity Delivery Flow recovery variant · Step 2. Makes the implicit explicit from the gated source
> (Documentation Gate SHIP, 2026-09-20) + the BUILT CODE (a source in recovery). Every claim is
> `[FACT: path:line]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]`. No-Guessing binds.
>
> **Scope (decomposition.md:41, P4-SHIP):** legs `XCU-BSE-01…09` (the built backlink resolver) +
> `XCU-BSE-25` (the R7 read-seam PATTERN invariant). Builds NO new engine — search/export/graph are
> homed OUT (DB-8 · UI-3 · AR-8#2/Views · Notes). This is a **ratify + pattern-invariant** unit.

## DEPENDENCIES

Every upstream this unit's owned legs rest on.

- **AR-6 `entity_links` substrate** — the table this service reads; owned by `foundation/spaces`.
  `[FACT: backlink-resolver.ts:21]` imports `entityLinks, EntityLinkRow` from `db/schema/foundation/spaces`;
  `[FACT: current-spec.md:11]` "Reads: `entity_links` (owned by AR-6 `foundation/spaces`)".
- **`Repository` (encrypt/decrypt + soft-delete seam)** — `createRepository`, `findWhere`.
  `[FACT: backlink-resolver.ts:20,36]`.
- **`DrizzleDb` adapter** — the live DB handle (worker-bound on web). `[FACT: backlink-resolver.ts:19,32]`.
- **AR-6 schema DDL** — `idx_entity_links_entity (entity_type, entity_id)` (read path) +
  `UNIQUE(page_id, entity_type, entity_id)` (≤1 live row). `[FACT: current-spec.md:22-24]`.
- **`EntityLinkRow` row type** — re-exported via `db/schema/foundation/spaces` (NOT authored in `@vida/types`).
  `[FACT: backlink-resolver.ts:21]`; Zod/types convention `[FACT: services/search/CLAUDE.md:21]`.
- **Leg 25 R7 pattern sources** — the read-seam invariant is defined, not owned here:
  `[FACT: capability-framework.md:66 (R7)]` · `[FACT: ADR-011 §3.6 L66]` · `[FACT: ADR-007 §3.4 L20,81]`.

## NEEDS

Preconditions to function.

- **A migrated DB with `entity_links` present** (AR-6 migration run). `[FACT: current-spec.md:11]`.
- **`deviceId` at construction** — `RepositoryConfig` requires it even though the read path never uses it
  (`findWhere` never writes). `[FACT: backlink-resolver.ts:34-35]` (cites `repository.ts:179`).
- **NO vault / libsodium on the read path** — `[INTERP: from backlink-resolver.ts:34-35,38]` the repo is
  built with `encryptedFields: []` and `findWhere` never writes, so no keyless content-hash is computed and
  no vault key is fetched. This is the **inverse** of the MOD-notes write-crash class (a write needs
  libsodium loaded); a backlink READ has no such NEED. Corroborated by memory
  `[[m10-repos-use-empty-encryptedfields-seam]]` (getVaultKey only fetches when the `[E]` set is non-empty).
- **Repo-config parity with AR-6's `SpacesService`** — `encryptedFields: []` + `softDelete: true` — so
  `context` decryption stays correct once `[E]` activates at M3. `[FACT: backlink-resolver.ts:33-34,36-40]` ·
  `[FACT: current-business-rules.md:16-17 (BL-6)]`. This is a forward-compat coupling, not a today-only choice.

## ORGANIZATION

Ownership boundaries — OWNS vs CONSUMES vs DELEGATES.

- **OWNS** — the read/resolve surface `getBacklinksTo · getLinksFrom · resolveLink`
  `[FACT: backlink-resolver.ts:23-30]` + read invariants BL-1…BL-6 `[FACT: current-business-rules.md:4-17]`;
  and the **documentation/assertion of the R7 read-seam PATTERN** (leg 25) `[FACT: corpus:56]`.
- **CONSUMES** — AR-6 `entity_links` + its indexes/UNIQUE · `Repository` · `DrizzleDb`
  `[FACT: backlink-resolver.ts:19-21,36]`.
- **DELEGATES** (homed OUT — not this issue):
  - writes (`createLink`/`removeLink`) → AR-6 `SpacesService` `[FACT: current-business-rules.md:4-6 (BL-1)]`
  - page↔page link reads + merged panel → Notes ② `[FACT: corpus:42 (XCU-BSE-11)]`
  - FTS5 index/query/provider → DB-8/M1.4 `[FACT: corpus:44-49 (XCU-BSE-13..18)]`
  - MD/PDF/DOCX serializers → UI-3 `@vida/editor` `[FACT: corpus:50-52 (XCU-BSE-19..21)]`
  - neural-graph data-prep → AR-8 #2 / Views `[FACT: corpus:54 (XCU-BSE-23)]`
  - the R7 CONCRETE engines (`summary`/`dueIn`/`measure`/ViewProviderRegistry) → Journals/Sessions/
    Measurement/Views `[FACT: corpus:56-58 (XCU-BSE-25..27)]`.

## IMPLICIT RULES

Hidden invariants the docs imply but never state — the teeth of this layer.

1. **`findWhere` runs the predicate VERBATIM** — it does NOT auto-apply `notDeleted()` the way
   `findById`/`findAll`/`count` do. Every resolver query MUST append `isNull(deleted_at)` itself, or
   soft-deleted links leak into reads (violating BL-2). `[FACT: backlink-resolver.ts:42-44]` ·
   `[FACT: current-business-rules.md:7-9 (BL-2)]` · memory `[[repository-findwhere-skips-softdelete-filter]]`.
2. **The read path is vault-free** (see NEEDS) — a verification smoke can run WITHOUT `initVault()`.
   `[INTERP: from backlink-resolver.ts:34-35,38]`.
3. **`resolveLink`'s `rows[0] ?? null` is only correct because of the AR-6 schema UNIQUE** — a cross-layer
   dependency on DDL, not a service-local guarantee. `[FACT: backlink-resolver.ts:62-72]` ·
   `[FACT: current-business-rules.md:14-15 (BL-5)]`.
4. **`and(...)` is `SQL | undefined`; the trailing `!` mirrors AR-6** (`service.ts:165`) — a drizzle-typing
   convention, not a latent bug. `[FACT: backlink-resolver.ts:44,52,58,68]`.
5. **Unknown `entity_type` → `[]`, never throws** — the BR-2 fail-loud registry check is a WRITE-path guard
   (AR-6), NOT a read concern; the resolver has no registry gate. `[FACT: current-business-rules.md:10-12 (BL-3)]`.
6. **Leg 25 (R7) is an ASSERTION target, not an engine** — the corpus frames the PATTERN; the concrete
   engines "stay in their owners' Part A". Authoring any read-seam engine HERE would violate the pattern's own
   ownership rule. `[FACT: corpus:56]`. `[INTERP]` the correct M1.1.2 deliverable for leg 25 is a documented
   invariant + (optionally) a test/lint asserting the resolver honours R7 (read-only, no cross-module table
   read) — not new code.

## UNKNOWNs (this issue's scope)

- **None.** The corpus's 4 UNKNOWNs (merged-backlinks compose-home · graph schema · export split-home · FTS5
  ranking) each land on legs homed OUT of #42 (XCU-BSE-11/23/19-22/14). Documentation-Gate SHIP confirmed
  #42's own scope carries zero unresolved UNKNOWNs. `[FACT: Documentation Gate verdict 2026-09-20, claim C]`.
