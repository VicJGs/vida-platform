<!-- Entity Delivery Flow · Step 2 (DECOMPOSITION) · Notes & Pages · the backend↔frontend SEAM.
     The service API TRACK B (② UI) consumes from TRACK A (① service). This keeps the two tracks coherent without
     forcing them serial: ② plans against this KNOWN surface (real once ① lands each slice). Grounded in contract.md
     + interpretation.md + baseline §2. Signatures are the intended shape; each ① slice makes its rows real + gated. -->

# Seam contract — Notes & Pages (① service → ② UI)

**Factory:** `createNotesService(db, deviceId, deps: { spaces: SpacesService, backlinks: BacklinkResolver, registry: TaggableTypeRegistry }): NotesService`
— object literal (no `this`; intra-calls via closures — the destructure-safe shape). Every method: **validate (Zod) → repository → encrypt-seam (empty-`[E]` M1.0) → return Drizzle Row**.

## Returns = Drizzle **Rows** (not `@vida/types` interfaces)
`PageRow` · `PageLinkRow` · `NoteAttachmentRow` · `EntityLinkRow` · `EntityTagRow` (the DB-11 interface reconcile is not this entity's job — baseline C2).

## Methods (the surface ② binds to)
| Group | Method | Returns / throws | ① slice |
|-------|--------|------------------|---------|
| Pages | `createPage(input)` | `PageRow` · **`JournalExistsError`** (NP-2) · `ZodError` (async reject) | A1 |
| | `getPage(id)` · `updatePage(id, patch)` · `softDeletePage(id)` | `PageRow`/`void`; `updatePage` `.strict()` excludes `type`/`journal_date` (IR-9) | A1 |
| | `getPageByJournalDate(date)` · `getPagesByType(type)` · `getPagesForEntity(entityType, entityId)` | `PageRow[]` / `PageRow \| null` | A1 |
| | `listPages({favorite?, archived?, tag?})` | `PageRow[]` — the built-in collection filter (EC-9) | A1 |
| Page-links | `createPageLink(source, target, context?)` | `PageLinkRow` — idempotent, **revive-or-noop** (IR-11) | A2 |
| | `removePageLink(source, target)` · `getPageLinksFrom(pageId)` · `getPageLinksTo(pageId)` | `void` / `PageLinkRow[]` — `getPageLinksTo` = the reverse read (ex-AR-8) | A2 |
| Wiki | `resolveWikiLink(text)` | `PageRow[]` candidates; **create-on-miss is a caller compose** (IR-4) | A3 |
| Seed | `ensureEntityNote(pageType, entityType, entityId, seedFields)` | `PageRow` — idempotent, **pure-deterministic** seed (NP-8/IR-5) | A4 |
| Tags (read) | `getEntitiesByTag(tagId)` · `getTagsForEntity(entityType, entityId)` | `EntityTagRow[]` — **net-new read** (AR-6 has no tag-read, B1) | A5 |
| Facade → AR-6 (writes) | `createEntityLink(pageId, entityType, entityId, context?)` · `removeEntityLink(...)` · `tagEntity(...)` · `untagEntity(...)` | delegate; **`entityType` validated vs the runtime registry** (IR-2), NOT `EntityLinkTargetSchema`; **`UnregisteredEntityTypeError`** | A5 |
| Facade → AR-8 (read) | `getEntityLinksFrom(pageId)` | pure AR-8 delegate (`getLinksFrom`) — entity_links only | A5 |
| Merged read (① composes) | `getBacklinks(entityType, entityId)` | **NET-NEW merge, NOT a raw AR-8 passthrough** — composes AR-8 `getBacklinksTo` (entity_links) **+** A2 `getPageLinksTo` (page_links), G6; A5's Verification Gate owns the merge shape (baseline C4) | A5 (← A2) |
| Attachments | `addAttachment(pageId, file)` · `getAttachments(pageId)` · `removeAttachment(id)` | `NoteAttachmentRow` / `void` | A6 |
| Summary (config storage) | `getSummaryConfig(pageId)` · `setSummaryConfig(pageId, config)` | config storage only (plain-text JSON, IR-8) → `JournalSummaryConfig \| null` / `PageRow`. ⚠ **`buildJournalSummary` is NOT an ① method — it is the ② `/summary` BLOCK (B7), consuming MOD-journals' engine directly** (`contract.md:20`·`identity.md:19`·`current-spec.md:62`; corrected 2026-08-24; cross-ref refreshed B7). | A7 |
| Cascade | `softDeletePage` triggers the **service-driven cascade** (page_links/entity_links/entity_tags/attachments, page-last) — per-entity, **eventually-consistent + re-drive** (IR-13, gated); NOT transactional (no `*InTx`) | A8 |

## Typed errors (local-first — no HTTP codes)
`JournalExistsError(journalDate)` (NP-2) · `UnregisteredEntityTypeError(entityType)` (NP-6/SP2) · Zod validation → **async Promise rejection** (never sync throw). Bespoke `extends Error` (AR-6/AR-8 convention).

## What ② consumes, per slice
- **B1** ← `listPages`/`getPagesByType`/`getPageByJournalDate` (renderers + filters).
- **B2** ← `getPage`/`updatePage`/`softDeletePage` (+ @vida/editor for content).
- **B3** ← `resolveWikiLink` + `createPageLink`.
- **B4** ← `createEntityLink`/`getBacklinks`/`getEntityLinksFrom` + `getPageLinksTo`.
- **B5** ← `getPageLinksFrom` (graph edges).
- **B6** ← `listPages` filters + `tagEntity` (create-with-tags) + page metadata via `updatePage`.
- **B7** ← `get/setSummaryConfig` (from ①); **`buildJournalSummary` is B7's OWN `/summary` block surface**, consuming MOD-journals' engine directly (NOT an ① method — intent authority `contract.md:20`·`current-spec.md:62`).

## Seams OUT (Notes provides / consumes)
- **PROVIDES:** `summary_config` + the `/summary` block surface → MOD-journals; the journal `entry` editor mount → Home.
- **CONSUMES:** AR-6 `SpacesService` (link/tag writes) · AR-8 `BacklinkResolver` (entity-link reads) · MOD-journals `summary(date)` engine · (later) DB-8 FTS5.
- **REGISTRY:** the `@vida/ui` tag-picker + view builder/selector are **MOD-spaces**; ② composes the tag-picker (B6), and the view-config layer is Spaces (cross-ref, slice-map).

**Freeze point:** this contract freezes when ① lands (per-slice). ② plans against it; any change to a landed signature runs the **Deviation Protocol (§XXVIII)**.
