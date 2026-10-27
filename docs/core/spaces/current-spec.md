# Spaces — CURRENT SPEC (durable, living)

<!-- §XXIX Currency Rule: this reflects the CODE AS-IS. Refresh on every change to the Spaces substrate.
     Born 2026-07-29 by AR-6 (LIF-77). Promoted from docs/specs/foundation/ar-6-spaces/_index.md §3. -->

Level: CORE / foundation (a tier beneath Notes & Pages). Owning ADRs: ADR-006 (tags/links/spaces) · ADR-007 (views).
Status: **AR-6 built (2026-07-29)** — structure + thin services. M1.0 grain; deferrals below.
**XCU-SP-27 association-resolution SERVICE added 2026-09-18** (`xs-spaces-tags-links`, LIF-175) — the unify⇄separate read layer over `entity_tags` + `entity_links`; the resolution _surface_ (UI + persisted switch) remains P6.
**Templates store + types added 2026-09-19** (`xs-templates` #36, LIF-176) — the `templates` store CRUD (`TemplatesService`) + the bundle/terminal-state vocabulary; capture/instantiate/shipped-asset/preset are first-consumer-pull SEAMS (no M1.1 consumer — see Deferred).

## What exists in code

**Tables** (`packages/core/src/db/schema/foundation/spaces.ts` + migration `003_spaces.ts`, version 3):
| Table | Columns (beyond baseColumns + `deleted_at`) | Realizes |
|-------|----------------------------------------------|----------|
| `tags` | `name`[E] · `color` · `icon` · `description`[E] · `parent_tag_id` (nullable self-ref) | SP1/SP3 |
| `entity_tags` | `tag_id` · `entity_type` (open) · `entity_id` — `UNIQUE(tag_id, entity_type, entity_id)` | SP1 |
| `entity_links` | `page_id` · `entity_type` (open) · `entity_id` · `context`[E] — `UNIQUE(page_id, entity_type, entity_id)`; idx `(entity_type, entity_id)` (backlink read path) | SP4 |
| `spaces` | `root_tag_id` · `name`[E] · `icon` · `default_view_id` (nullable) · `parent_space_id` (nullable self-ref) | SP5 |
| `space_enabled_blocks` | `space_id` · `capability_def_id` (→ AR-7 registry, no FK) — `UNIQUE(space_id, capability_def_id)` | SP6 |
| `views` | `space_id` (nullable) · `name`[E] · `layout` (CHECK = `VIEW_LAYOUT`) · `filter`/`grouping`/`sort` (JSON TEXT) | V1–V3/V5 |
| `templates` | `name`[E] · `bundle`[E] (opaque serialized seed bundle, JSON TEXT) — no `template_id` anywhere (fork = no back-link, XCU-06) | T1/T2 (ADR-009) — separate file `schema/foundation/templates.ts` + migration `011_templates.ts` |

Conventions: no cross-table FK (refs plain TEXT + index); `entity_type` = plain TEXT, OPEN registry (no CHECK);
only `views.layout` is a FIXED SQL CHECK. `[E]` fields are the M3 target — M1.0 is pass-through (empty [E] set).

**Enum** (`@vida/types/src/view.ts`): `VIEW_LAYOUT` (list·table·board·gallery·calendar·graph·timeline) → `z.enum` in `core/validators/view.ts`; parity-tested against the SQL CHECK.

**Services** (`packages/core/src/foundation/{spaces,views}/`):

- `TaggableTypeRegistry` (SP2) — seeded from `_registry.ts` ENTITY_TYPES; runtime `register()`; governs both `entity_tags` + `entity_links`.
- `SpacesService` — tag/space CRUD; `tagEntity`/`createLink`/`addEnabledBlock` (idempotent, BR-14); `untagEntity`/`removeLink`/`removeEnabledBlock` (resolve-then-soft-delete, BR-15); entity_type validated (BR-2); tag/space nesting cycle guards (BR-3/BR-5). All mutations → DB-6 Repository → co-transactional `sync_queue`.
- `ViewsService` — view CRUD + **clone** (filter/grouping/sort stringified on write; `cloneView(sourceId, targetSpaceId)` copies them **raw** from the source row — XCU-05, independent copy) + **`listViews()`** (first-consumer-pull, mod-tasks S8 — live rows only, `created_at` then `id` order; callers scope by `filter`/`space_id` themselves — a task view = `entity_types` exactly `['task']`, ADR-007 §3.5). `CreateViewInput.grouping` accepts `null` (clears on update — matches the runtime `== null ⇒ NULL` write).
- `ViewProviderRegistry` (V4/R7) — read-provider seam; ships EMPTY at AR-6 — **first registrant: tasks** (`services/tasks` `registerTasksReadProvider`, mod-tasks S8); still empty at composition (no M1 root — modules register per-module at their build, wired at M2/P6).
- `ViewEngine.resolve(view)` (V3/V4/V5) — fans filter to registered providers, merges, groups (ungrouped bucket for missing group-by), returns terminal state (`loading`|`empty`|`error`|`success`); no-provider/provider-error degrade, never throw/drop.
- `AssociationResolver` (XCU-SP-27, `association-resolver.ts`) — the tag/link **unify⇄separate resolution** read layer. `resolveAssociations(ref, mode)`: `separate` → `{ tags, links }` (two typed relations); `unified` → one homogeneous `Association[]` (each edge keeps its `kind` — no blur/dedup, BR-4). Resolves an entity's **outgoing** half only: tag memberships (`entity_tags` by `(entity_type,entity_id)`) + outbound links (`entity_links` by `page_id`); **inbound refs are AR-8**, complete space = this ⊕ AR-8. Reads via the Repository (empty `[E]` set, explicit `isNull(deleted_at)`); `entity_type` registry-validated (BR-2); stateless on `mode` (switch persisted in Preferences/Spaces, P6).
- `TemplatesService` (XS-templates #36, `foundation/templates/service.ts`) — the `templates` **store CRUD** (ADR-009 §3.3 light store): `createTemplate({name, bundle})` (bundle → JSON TEXT on write) · `listTemplates` (findAll, soft-deleted excluded) · `getTemplate` (→ `TemplateNotFound`) · `deleteTemplate` (soft). **No `updateTemplate`** — fork model has no edit-in-place (XCU-01). Empty `[E]` set (M1.0 pass-through, XCU-09); via DB-6 Repository → co-transactional `sync_queue`. **Types** (`@vida/types/template.ts` + `foundation/templates/types.ts`): `TemplateBundle` 5-member envelope (members opaque — serialization is build-time, ADR-009:112-115) · `INSTANTIATION_STATUS` (`in-progress`|`success`|`partial-failure`, T5) · `InstantiationResult`/`FlaggedMember` (the instantiate contract, ADR-009:110) · `TemplateNotFound`/`TemplateCaptureError`. Validators: `BundleSchema` (envelope-only) + `InstantiationStatusSchema`.

## Deferred (owned elsewhere — NOT built here)

- Capability registry / `block_instances` → **AR-7** (ADR-008). `space_enabled_blocks.capability_def_id` is the forward seam (plain ref, no FK).
- Effect-firing rail (R1/R2) → **AR-7**. Backlink **resolver** service + neural-graph data-prep → **AR-8** (reads the `entity_links` AR-6 owns).
- Predicate-DSL grammar, per-layout visual specs → build-time (ADR-007 §"does NOT"). The unify⇄separate resolution **service** is now BUILT (XCU-SP-27, above); only its **surface** (UI + the persisted user switch) remains → P6/Preferences+Spaces (ADR-006 §3.3).
- `page_tags`→`entity_tags` migration → N&P build (M1.1; no live floor now).
- Field encryption of `[E]` columns → M3 (ADR-017 pass-through until then).
- **Templates capture/instantiate/shipped-asset/preset (XS-templates #36) → first-consumer-pull SEAMS.** The
  `templates` store (CRUD) + types are built (above); `captureFromSpace` (XCU-02/03/04/07-serializer),
  `instantiate`-fork execution (XCU-05/11), `listShipped` asset-source (XCU-08), and the preset primitive
  (XCU-12/13, tab = P6) have **no M1.1 consumer** (decomposition.md:49 read-seams "—"; template-capable surfaces
  = modules, capability-framework.md:239) → each is pulled by the first _module_ that saves-as-template /
  instantiates (ADR-009 invariants LOCKED, ADR-019 §3.5). No sibling-service reads added at #36.

## Tests

`packages/core/src/foundation/spaces/__tests__/spaces.test.ts` (23 — incl. 2 `listViews`: live-only + `created_at`/`id` order, mod-tasks S8) + `association-resolver.test.ts` (7 — shape · behavioral no-dedup · partiality · guards · stable order, live better-sqlite3 store) + `VIEW_LAYOUT` in `validators/enum-parity.test.ts`. The first module-side consumer of `ViewsService` + a registered `ReadProvider` is `services/tasks` (S8 tests drive the REAL engine end-to-end).
`packages/core/src/foundation/templates/__tests__/types.test.ts` (8 — envelope/status-parity/errors) + `service.test.ts` (6 — live-store CRUD/soft-delete/sync_queue/round-trip). XS-templates #36.
