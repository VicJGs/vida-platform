<!-- Contract — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · ADR-004/006/007/008/009 · note.ts · backend-intent NOT-01..54 · module-dependency-graph.md -->
<!-- Restored 2026-10-26 (notes-rescope LIF-245, Documentation Gate) from eaf64f8^ and realigned. The as-built
     signatures (cited to code, current lines) are docs/modules/notes/current-spec.md; this doc is the intended
     surface. backend-intent NOT-* line cites refer to the eaf64f8^ text. -->

# Contract — Notes & Pages  (level: Feature)

> **Status:** the ① `@vida/core` NotesService is BUILT (S1–S4, 2026-09-19; `writePageContent` 2026-10-20;
> `ensureJournal` home-journal-go-live) and registered in the apps/web composition root. Intent items below that are
> not yet built are marked ⚠ INTENDED. `[FACT: docs/modules/notes/current-spec.md]`

## Exposed surface (`@vida/core` NotesService)
Notes & Pages is the **hub (in-degree 14)**. `[FACT: module-dependency-graph.md]`

- **Page CRUD & queries** (return Drizzle `PageRow`):
  - `createPage(input)` · `getPage(id)` · `updatePage(id, patch)` (metadata only — `.strict()`) · `softDeletePage(id)`
  - `writePageContent(id, EditorDocument)` — the editor-body path, separate from the LWW patch (NP-4)
  - `getPageByJournalDate(date)` · `ensureJournal(date)` (get-or-create the day's journal) · `getPagesByType(type)` ·
    `getPagesForEntity(entity_type, entity_id)` · `listPages({favorite?, archived?})`
  - a tag filter on lists rides the built `entity_tags` read `getEntitiesByTag` (⚠ INTENDED: wiring it into a list filter), not a `listPages` arg
    `[NOT-08 → NOT-26/27]`.
  - ⚠ INTENDED (NP-9 undo + Trash): `restorePage(id)` (clears `deleted_at` — `updatePage` cannot, BR-4 `.strict()`) and
    a deleted-pages read for the Trash view (`data-flow.md:154`). Hard delete / Empty Trash (app-layer cascade): no
    method; scope open (business-rules NP-9 (i)).
- **Entity notes:** `ensureEntityNote(pageType, entityType, entityId, seed)` — idempotent, deterministic seed (NP-8).
- **Linking:**
  - `createPageLink(source, target, context?)` (idempotent + revive) · `removePageLink` · `getPageLinksFrom/To`
  - `resolveWikiLink(text)` → candidate pages for the `[[` picker; the caller binds by id (NP-7); create-on-miss =
    `createPage` then `createPageLink` (G2)
  - `createEntityLink` / `removeEntityLink` → validate (notes registry) then delegate to AR-6 `SpacesService`
  - `getEntityLinksFrom` → AR-8 `BacklinkResolver`
  - `getBacklinks(entity_type, entity_id)` → `{pageLinks, entityLinks}` unmerged; the surface merges + groups by source
    module (G6 → resolved by EC-6)
- **Tags** — consumer of the ADR-006 universal primitive: reads `getTagsForEntity` / `getEntitiesByTag` here; writes
  (`upsertTag`, `tagEntity`) are `SpacesService`'s. `[INTENT: ADR-006 §3.1-3.2]`
- **Attachments:** `addAttachment(pageId, file)` · `getAttachments(pageId)` · `removeAttachment(id)`.
- **Summary** — N&P stores `summary_config` (opaque); the ENGINE is Journals `buildDashboard(date)` with per-module
  providers (HARD-1). The `/summary` block renders its sections. `[FACT: NOT-32; services/journals/dashboard.ts:41-44]`
- **Templates** — apply/save on a page use the ADR-009 templates foundation (`foundation/templates`): instantiate =
  fork a saved layout into a new page; capture = authored structure only (NP-12). ⚠ INTENDED (capture + instantiate
  are first-consumer-pull seams). `[FACT: storage = foundation/templates/service.ts:24-59; capture/instantiate seams = templates slice-map:24-51]`
- **Views** — the collection's renderer is selectable by an ADR-007 `views` row; each layout declares the fields it
  needs (XCU-14; calendar → date, gallery → cover) and degrades when absent. `[FACT: ADR-007 §3.3 (L60-64); xcut-views XCU-14]`
- **Pomodoro** — a widget-lens: the `/pomodoro` block launches a `focus_sessions` timer via the Sessions realm and the
  page links to that `session_id`. `[INTENT: ADR-004 §3.1]` `has_pomodoro` is caller-supplied (BR-8); who sets it
  (the `/pomodoro` block insert vs a Sessions effect, ADR-004 `attach_pomodoro`) is `[UNKNOWN — homed: notes-rescope
  Interpretation Gate]`.

## What it consumes
Structurally nothing (Wave 0) beyond the Spaces foundation it sits on: AR-6 `SpacesService` (entity-link/tag writes,
the taggable-type registry), AR-8 `BacklinkResolver` (entity-link reads), ADR-007 views, ADR-009 templates, ADR-008
capability registry. `/summary` data and the NP-8 seed are read-only integration points, never direct table access.
`[FACT: services/notes/types.ts:20-29; docs/core/business-rules.md INT-1 (L52)]`

## Surface intent (② — the page + collection surfaces)
- **Per-type Overviews (EC-18):** each page type has a distinctive Overview, not a generic dashboard. `note` = clean
  freeform: properties · attachments · backlinks (EC-18f). `journal` = the daily OS dashboard: today's agenda ·
  streaks/stats · `/summary` across the OS · check-in (EC-18a, re-homed to notes-rescope). `*_note` Overviews ride
  fe-tasks / fe-projects (EC-18b–e). Merged mode renders the SAME per-type sections as one continuous page (EC-19).
  `[FACT: fe-notes envision.md:45-52]`
- **Journal summary on the page:** `useJournalSummary` reads Journals `buildDashboard(date)`; until HARD-1 registers
  module providers the registry is empty (`apps/web/src/db/composition-root.ts:90-97`) and the block shows the honest
  empty state. The `summary_config` → `JournalSelection` mapping is `[UNKNOWN — homed: the hook-flip slice PLAN]`.
- **Inline palette (CAP-13):** offers the union of the page's Spaces' capabilities + the editor base (ADR-008
  L134-137); inline instances live in the page doc (L120-124). Which registry entries get real bodies in this unit vs
  keep the honest "available when its module ships" placeholder: `[UNKNOWN — homed: notes-rescope Interpretation Gate
  (the #31 root, debt-plan.md:22)]`. CAP-12 `block_instances` placement is homed to notes-rescope by
  coverage-report.md:50; whether it applies to the page surface at all (ADR-008 L120-124) is `[UNKNOWN — homed: notes-rescope Step 4 reconciliation]`.
- **Metadata values:** favorite/archive are booleans; glyphs are Lucide icons, never emoji (EC-22, envision.md:55);
  `cover_image` = a user-chosen image URL `[E]` (security-model.md:465). The icon value domain (Lucide name?) and
  whether a cover can reference an attachment: `[UNKNOWN — homed: the metadata leg's slice PLAN]`.
- **Attachment upload (M1, plaintext pass-through):** file → blob + optional thumbnail, lazy thumbnails
  (performance-strategy.md:132). Picker UX, size limit and storage (DB blob vs OPFS): `[UNKNOWN — homed: the
  attachments leg's slice PLAN / Envision Gate]`.
- **View-config persistence:** layouts are ADR-007 `views` rows; whether `/notes` persists a global row
  (`space_id` NULL) given NOT-48's "selection primitive DEFERRED (design-pass)": `[UNKNOWN — homed: notes-rescope
  Interpretation Gate]`.
- **Entity links from the editor (G6 creation half):** `/entity-link` block and entities as `[[` candidates — EC-10
  pins page candidates only: `[UNKNOWN — homed: notes-rescope Interpretation Gate]`.

## Contract error cases
- journal clash → `JournalExistsError` (NP-2) · unregistered `entity_type` → `UnregisteredEntityTypeError` (NP-6)
- duplicate link → idempotent no-op / revive (NP-5) · Zod failure → Promise rejection
- update on an unknown id → repository `Error('Row not found')` (DB-11 `ServiceError` reconcile pending)
- a `/summary` source unavailable → that section's typed empty/error; the rest render (G5)

## Completion checklist
- [x] exposed + consumed surface · [x] errors · [x] integration via documented points · [x] built vs ⚠ INTENDED marked
