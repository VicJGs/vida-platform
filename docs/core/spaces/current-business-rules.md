# Spaces — CURRENT BUSINESS RULES (durable, living)
<!-- §XXIX Currency Rule: the enforced invariants of the Spaces substrate AS-BUILT. Refresh on change.
     Born 2026-07-29 by AR-6 (LIF-77). Promoted from docs/specs/foundation/ar-6-spaces/_index.md §2. -->
Owning ADRs: ADR-006 · ADR-007. Framework: SP1–SP7 (ADR-006), V1–V5 (ADR-007). Constitution: PC-1…PC-4, INT-1a.

| BR | Rule (enforced) | Where |
|----|-----------------|-------|
| BR-1 (SP1) | The tag primitive is `entity_tags(tag_id, entity_type, entity_id)` — no page-only tag path, no per-module tag table. | schema + SpacesService |
| BR-2 (SP2) | `entity_type` values come from the ONE open registry (`_registry.ts` + runtime `register`); plain TEXT, no SQL CHECK; unregistered type → `UnknownEntityType`. Governs `entity_tags` AND `entity_links`. | TaggableTypeRegistry, SpacesService |
| BR-3 (SP3) | `tags` nestable via `parent_tag_id`; `name`/`description` `[E]`. No SQL `UNIQUE(name)` (retired — `[E]` ciphertext + nesting); app-layer `(parent_tag_id, name)`. A parent cycle → `InvalidTagNesting`. | schema, SpacesService.assertNoTagCycle |
| BR-4 (SP4) | `entity_tags` (grouping) and `entity_links` (typed reference) are distinct tables, never merged; both draw `entity_type` from the one registry. | schema |
| BR-5 (SP5) | A Space is a `spaces` row (`root_tag_id` + `name`[E] + `icon` + `default_view_id` + `parent_space_id`), not "just a tag". A parent cycle → `InvalidSpaceNesting`. | schema, SpacesService.assertNoSpaceCycle |
| BR-6 (SP6) | Offered-capability palette = the `space_enabled_blocks` row-junction of capability-**definition** refs; distinct from `block_instances` (AR-7); never a projection over placements. | schema |
| BR-7 (SP7) | R3 + R4 on every Spaces-tier table: `_sync_*` + `deleted_at`; `name`/`description`/`context` are `[E]`. | schema (all 6 tables) |
| BR-8 (V1) | A saved surface is a `views` row (filter × layout × grouping), not a component. | schema, ViewsService |
| BR-9 (V2) | `views.space_id` nullable — NULL = global, set → Space-owned; `spaces.default_view_id` names the opener (create→create→update to wire). | schema, ViewsService |
| BR-10 (V3) | `layout` ∈ `VIEW_LAYOUT` (FIXED CHECK); filter/grouping/sort JSON TEXT; a group-by field a row lacks → 'ungrouped' bucket, never dropped; a layout's missing field → degraded, never crash. | ViewEngine |
| BR-11 (V4/R7) | Cross-module views fan out to registered `ReadProvider`s (INT-1); never a direct cross-module table read. A selected type with no provider → degraded note + empty contribution, never throws/drops. | ViewEngine, ViewProviderRegistry |
| BR-12 (V5/R5) | `views.name` `[E]`; user-literal filter values `[E]` (M3; M1.0 plaintext). Resolution declares terminal states; a provider error → `error` (fail-loud), never a crash. Engine never emits `loading` (consumer pre-await state). | ViewEngine |
| BR-13 | M1.0 encryption = pass-through: every repo created with an EMPTY `[E]` set (ADR-017:20); `[E]` marks are the M3 target; `views.filter` plaintext now. | SpacesService, ViewsService |
| BR-14 | Junction writes idempotent: `findWhere` business key before insert; live → no-op, soft-deleted → revive (no raw UNIQUE error on re-tag). | SpacesService |
| BR-15 | Junction removes resolve by business key → soft-delete (`operation:'update'`, syncs), never hard delete; absent → no-op. | SpacesService |
| BR-16 (XCU-SP-27) | The tag/link **unify⇄separate** choice is a REAL behavioral resolution, not a display flag: `unified` = ONE homogeneous association relation (tag + link edges normalized into a common shape, each retaining its `kind` so BR-4 holds inside the one space, no dedup); `separate` = two typed relations. Storage untouched (reversible). The switch is a caller-supplied `mode` (persisted in Preferences/Spaces, P6) — the service is stateless. | AssociationResolver |
| BR-17 (XCU-SP-27) | The resolver returns an entity's **outgoing** associations only: tag memberships + outbound (`page_id`) links. Inbound references are AR-8's backlink resolver; the complete bidirectional space = resolver ⊕ AR-8. Reads filter `deleted_at` explicitly (findWhere skips it) and validate `entity_type` against the registry (BR-2), fail-loud. | AssociationResolver |

**Fail-loud errors:** `UnknownEntityType` · `InvalidTagNesting` · `InvalidSpaceNesting` · `SpaceNotFound` · `ViewNotFound` · `NoProviderForEntityType` (direct-lookup only; engine degrades).
