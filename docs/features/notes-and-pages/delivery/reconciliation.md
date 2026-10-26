# Reconciliation Ledger — Notes & Pages · RESCOPE (notes-rescope, LIF-245)

> Entity Delivery Flow recovery variant, Step 4. The BUILT code of both planes swept item by item against the gated
> yardstick: `delivery/interpretation.md` (Step 3 PASS, `e74c2cd`), `delivery/envision.md` (EC-25…36 + EC-13 re-pin,
> approved 2026-10-26, `0fc3015`), fe-notes `envision.md` EC-1…24 + Re-pins, and the aspect docs.
> Buckets: ✅ aligned · ❌ wrong (built diverges from doc/EC) · 📄 undocumented · 🕳 gap (documented, not built) ·
> ⛔ ungated-owed. Plane tag: backend · frontend · shared · doc. Composed from four parallel area sweeps (A ① service +
> foundations · B ② collection + page · C editor/blocks/links/templates · D EC sweep + impact scan) and closed by a dry pass.
> Paths: `n/` = apps/web/src/notes · `col/` = apps/web/src/collection · `ent/` = apps/web/src/entity ·
> `ui/` = packages/ui/src/components · `core/` = packages/core/src · `I` = interpretation.md · `E2` = this unit's envision.md ·
> `E1` = fe-notes envision.md · `P` = golive-replan/process.md.

## Area A — ① service, composition, foundations (44 rows: 19 ✅ · 4 ❌ · 2 📄 · 19 🕳)

| id | item | plane | bucket | built evidence | anchor | EC/IR | fix direction |
|---|---|---|---|---|---|---|---|
| A-1 | `createPage` (Zod · NP-2 clash · registry · defaults) | backend | ✅ | core/services/notes/service.ts:106-126 | BR NP-2/NP-6 | — | — |
| A-2 | `getPage` hides deleted, not archived | backend | ✅ | service.ts:128; core/db/repository.ts:356-361 | I IR-R3/R7 | IR-R3/R7 | surface handles deleted/archived targets |
| A-3 | `updatePage` metadata-only (title · favorite · archive · icon · cover) | backend | ✅ | service.ts:130-133; validators/note.ts:50-62 | BR NP-11 | EC-7/25/29 | — |
| A-4 | `icon` / `cover_image` value validation | backend | 🕳 | validators/note.ts:56-57 (any string) | contract (homed slice PLAN); E2 EC-29 | EC-29 | fix icon domain (Lucide name) + cover ref, tighten validator |
| A-5 | every update stamps `updated_at` | backend | ✅ | repository.ts:421-428 | I IR-R9 | IR-R9 | view sort must be explicit |
| A-6 | `writePageContent` has no content shape guard | backend | ❌ | service.ts:138-139 | BR fail-loud; current BR-5 | IR-R4 | minimal EditorDocument guard |
| A-7 | writes succeed on a soft-deleted page | backend | ❌ | repository.ts:404-413; current BR-7c | I IR-R2/R3 | IR-R2/R3 | reject writes when `deleted_at` set (typed error) — scope: notes vs repository-wide |
| A-8 | `word_count` not derived | backend | ✅ (homed) | service.ts:138-139 | current-spec (editor/FTS) | — | — |
| A-9 | `softDeletePage` | backend | ✅ | service.ts:141-143; repository.ts:457-461 | BR NP-9 | EC-26 | — |
| A-10 | re-deleting re-stamps `deleted_at` (resets the 30-day clock) | backend | 📄 | repository.ts:458-461 | BR NP-9 (30 days) | EC-26/27 | no-op when already deleted |
| A-11 | `restorePage(id)` | backend | 🕳 | absent (types.ts:56-105); precedent sessions/service.ts:382-383 | contract ⚠ INTENDED | EC-26/27 | `update(id,{deleted_at:null})` |
| A-12 | restore collision (journal date / duplicate `*_note`) | backend | 🕳 | migrations/033_notes.ts:72; service.ts:172-175 | I IR-R10; E2 EC-28 | EC-28 | pre-check → `JournalExistsError` / typed `*_note` conflict |
| A-13 | deleted-pages read | backend | 🕳 | none; `findWhere` usable (repository.ts:379-382) | contract; I §5#1 | EC-27 | `listDeletedPages()` ordered by `deleted_at` + days left |
| A-14 | OS-wide Trash cross-module deleted-items seam | shared | 🕳 | nothing exists | E2 EC-27 + Picks | EC-27 | a provider registry `{entityType, listDeleted, restore, purge}`; notes registers first; composed |
| A-15 | hard delete + NP-9 cascade | backend | 🕳 | building block `repo.hardDelete` repository.ts:467-482 | BR NP-9; contract | EC-27 | `deletePageForever(id)` (one tx; spaces rows via AR-6) |
| A-16 | Empty Trash / 30-day purge | backend | 🕳 | none | BR NP-9 (purge timing homed) | EC-27 | `emptyTrash()`; timing in PLAN |
| A-17 | soft delete keeps links/attachments live | backend | ✅ (by design) | service.ts:141-143,255-256 | I IR-R11 | IR-R11 | honest "page deleted" state on surfaces |
| A-18 | `listPages()` can't exclude archived; no type filter | backend | ❌ | service.ts:155-162; test notes-service.test.ts:209-216 (flips) | I §5#2; BR | EC-1/35 | exclude in a pages ReadProvider (preferred — Home/calendar callers) or ① filter |
| A-19 | `listPages` has no ORDER BY | backend | 📄 | repository.ts:379-382 | I IR-R9 | IR-R9 | order from the view sort (A-29) |
| A-20 | type/entity/journal-date reads filter deleted | backend | ✅ | service.ts:98-103,147-153 | current BR-7 | — | — |
| A-21 | `ensureJournal` | backend | ✅ | service.ts:190-194 | contract | IR-R10 | — |
| A-22 | `ensureEntityNote` | backend | ✅ | service.ts:165-183 | BR NP-8 | — | — |
| A-23 | attachments service ✅; size limit 🕳 | backend | ✅/🕳 | service.ts:196-217; note.ts:69-75 (no max) | E2 EC-30 | EC-8/30 | max in schema once PLAN fixes it |
| A-24 | page-link create/revive/remove/reads | backend | ✅ | service.ts:220-256 | BR NP-5/7 | IR-R12 | — |
| A-25 | `resolveWikiLink`: LIKE, no escape, no LIMIT, archived in, untitled `*_note` | backend | ❌ | service.ts:259-260 | I §2; E2 EC-31 | EC-10/31 | escape + limit + archived decision; multi-type merge = A-33 |
| A-26 | entity-link facade; `getBacklinks` unmerged | backend | ✅ | service.ts:265-290 | contract; BR NP-6 | IR-R12 | — |
| A-27 | tag reads only | backend | ✅ | service.ts:293-303 | contract | — | — |
| A-28 | `ViewsService` built, not composed | shared | ✅/🕳 | foundation/views/service.ts:26-111; composition-root.ts:115 | I §2, §5#6 | EC-1/35 | compose + expose on `Services` |
| A-29 | `ViewEngine.resolve` ignores `view.sort` | shared | ✅/🕳 | foundation/views/engine.ts:36-82 | I IR-R9 | EC-1/XCU-14 | apply sort in resolve or provider |
| A-30 | `ViewProviderRegistry` not composed; tasks provider never registered in apps/web | shared | 🕳 | provider-registry.ts:18-31; services/tasks/service.ts:976-981 | I §1a | EC-1 | compose registry + engine; register tasks too |
| A-31 | notes pages ReadProvider | shared | 🕳 | only tasks has one (tasks/service.ts:936-972) | I §2 | EC-1/35 | `createPagesReadProvider` (type note, not archived, "show archived" predicate) |
| A-32 | XCU-14 layout field declarations | shared | 🕳 | engine `degraded` covers providers only (engine.ts:50,58) | SD; contract | XCU-14 | renderer-side declarations + RATIFY append |
| A-33 | `[[` entity candidates need a label/text read seam | shared | 🕳 | ReadProvider has no query/label (views/types.ts:24-27); SearchProvider stub (command-bar/types.ts:79-81) | I §5#7; E2 EC-31 | EC-10/31 | label + match on a provider (or candidate registry); decide vs SearchProvider in PLAN |
| A-34 | "page-able" entity-type scope for `[[` | shared | ✅/🕳 | spaces/registry.ts:15-23 (no route flag) | I §5 carry | EC-10 | decide scope in PLAN |
| A-35 | default global notes view seed (XCU-06) | shared | 🕳 | none | I §2; SD | EC-1/35 | idempotent seed (space_id NULL, list, note filter) + XCU-06 append |
| A-36 | `TemplatesService` built, not composed | shared | ✅/🕳 | foundation/templates/service.ts:24-59 | I §2 | EC-13 | compose |
| A-37 | template instantiate + writer registry + `pages` writer | shared | 🕳 | types only (templates/types.ts:25-29) | E2 EC-13 re-pin; I IR-R14 | EC-13 | build fork engine + `TemplateWriterRegistry` + pages writer; unregistered type → partial-failure flag |
| A-38 | template capture (page-doc boundary) | shared | 🕳 | `TemplateCaptureError` type only | BR NP-12 (homed Step 5) | EC-13 | Step 5 append fixes the rule, then build |
| A-39 | capability registry holds only `habit_logger`; editor blocks are local defs | shared | ❌ | foundation/capability/registry.ts:35-47; editor integration-blocks.tsx:202-209 | ADR-008 L145-147 | EC-14/32 | register editor blocks + `/task` as inline definitions; editor reads the offered set |
| A-40 | offered-set inline branch ignores the page's Spaces | shared | ❌/🕳 | offered-set.ts:26-35; not composed | ADR-008 L135-137 | EC-14 | `resolveInlineForPage(pageId)`; compose |
| A-41 | capability enforcer built, not composed | shared | ✅/🕳 | foundation/capability/enforcer.ts | E2 EC-32/36 | EC-32/36 | compose with the first entity block |
| A-42 | no `app_state` accessor | shared | 🕳 | schema mirror only (db/schema/foundation/app-state.ts:18-21); ad-hoc SQL (onboarding/first-run-repo.ts:11-27) | I §5#3 | EC-5 | small KV accessor + an app_state `EntityModeStore` |
| A-43 | `EntityModeStore` is sync + in-memory; stale header | shared | ❌ | ent/adapter.ts:82-102 | I §5#3; IR-R16 | EC-5 | async/preloaded store; header → app_state |
| A-44 | `buildDashboard` ✅; `useJournalSummary` never calls it | shared | ✅/🕳 | services/journals/dashboard.ts:41-57; n/use-journal-summary.ts:48-51 | I §2 | EC-9 | flip hook; `summary_config`→`JournalSelection` in PLAN |

## Area B — ② collection + note page (66 rows)

| id | item | plane | bucket | built evidence | anchor | EC/IR | fix direction |
|---|---|---|---|---|---|---|---|
| B-1 | layouts offer Calendar | frontend | ❌ | n/notes-surface.tsx:21; n/note-renderers.tsx:68-69 | E1 Re-pin EC-1; E2 EC-35 | EC-1/35 | drop calendar; flip n/note-renderers.test.tsx:30-31 |
| B-2 | calendar empty→success coercion | frontend | ❌ | n/note-renderers.tsx:69 | E1 EC-2 | EC-2 | removed with B-1 |
| B-3 | default scope lists archived, journals, `*_note` | shared | ❌ | n/use-notes-rows.ts:56; service.ts:155-162 | I §5#2; BR | EC-1/2 | default `type='note' AND NOT archived` (ReadProvider) |
| B-4 | "Show archived" control | frontend | 🕳 | no control; `onFilter` no-op col/use-collection.ts:39 | E2 EC-35 | EC-35 | header toggle → view predicate, persisted |
| B-5 | no sort | shared | ❌ | n/use-notes-rows.ts:62; col/use-collection.ts:34 | I IR-R9 | IR-R9 | view row sort |
| B-6 | Filter/Sort/New-view buttons are no-ops | frontend | ❌ | col/use-collection.ts:39-41; ui/collection-view.tsx:179-186 | P ELC-5 | ELC-5 | wire to ViewsService or hide |
| B-7 | view-config not persisted; ViewsService not composed | shared | ❌ | col/use-collection.ts:33; n/notes-surface.tsx:24 | I §5#6; P:107-108 | ELC-3 | compose + seed + `bindViewConfigWrites` (col/adapter.ts:74-81) |
| B-8 | `resolved` assembled locally | shared | 🕳 | n/notes-surface.tsx:32 | I §2 | — | from `ViewEngine.resolve` |
| B-9 | `degraded` dropped end to end | shared | 🕳 | n/notes-surface.tsx:32; col/adapter.ts:60-68; no prop in ui/collection-view.tsx | I §2; BR | XCU-14 | pass through + `degraded` slot in @vida/ui |
| B-10 | excerpt hard-coded `''`, blank line rendered | frontend | 🕳 | n/live-mappers.ts:44; n/note-renderers.tsx:41 | SD (rule homed slice PLAN) | — | derive in `toNotesRow`; hide when empty |
| B-11 | UTC row date | shared | ❌ | n/live-mappers.ts:25-27,46 | conventions; SD | IR-R8 | local fields + TZ-forced test |
| B-12 | `relLabel` goes stale | frontend | ❌ | n/live-mappers.ts:17-23; lib/query-client.ts:18-21 | I IR-R8 | IR-R8 | format at render with a tick |
| B-13 | graph honest empty | frontend | ✅ | n/note-renderers.tsx:70-75 | E1 EC-3; E2 (HARD-3) | EC-3 | keep |
| B-14 | New note | shared | ✅ | n/use-create-note.ts:24-32 | E2 EC-35 | EC-35 | — |
| B-15 | create failure only `console.error` | frontend | ❌ | n/use-create-note.ts:33-36; ToastProvider mounted App.tsx:8,128 | BR fail-loud; P ELC-6 | ELC-6 | error toast |
| B-16 | no "New from template" header entry | frontend | 🕳 | n/notes-surface.tsx:38-42 | E2 EC-35 | EC-35 | header button → dialog |
| B-17 | TemplatePicker shape ≠ EC-13 re-pin; DEV-only | frontend | ❌ | n/template-picker.tsx:65-119; n/note-entity.tsx:128,142-148 | E2 EC-13 | EC-13 | entity-grouped dialog; fork + navigate; "Save as template" in ⋯ |
| B-18 | templates hook stub; service not composed | shared | ❌ | n/use-templates.ts:55-61 | I §2 | EC-13 | compose + instantiate + capture |
| B-19 | search box (DB-8 borrowed) | frontend | ✅ | n/use-notes-search.ts:36-39 | E1 EC-12 | EC-12 | results become links when DB-8 lands |
| B-20 | note mode default tabbed + editor | frontend | ✅ | n/note-entity.tsx:42,120 | I §5#3; E1 EC-4 | EC-4 | — |
| B-21 | mode memory in-memory | shared | ❌ | n/note-entity.tsx:42; ent/adapter.ts:93-102 | I §5#3 | EC-5 | app_state store (+ ADR-006 append, Step 5) |
| B-22 | one global default for every type | frontend | ❌ | n/note-entity.tsx:42 | I §5#3 | EC-5 | per-type table; journal/`*_note` owned elsewhere |
| B-23 | merged = continuous page | frontend | ✅ | n/note-overview.tsx:36-48 | E1 EC-19 | EC-19 | — |
| B-24 | editor gate keyed on ENTITY_TYPES | shared | ❌ | ent/adapter.ts:33-35; core/db/schema/_registry.ts:5-8 | BR NP-10; E1 EC-15 | EC-15 | gate page surfaces on `PAGE_TYPE`; flip ent/adapter.test.ts:23-33 |
| B-25 | `editorState` 'success' | frontend | ✅ | n/note-entity.tsx:116 | I IR-R1 | IR-R1 | revisit with B-50 |
| B-26 | inline title rename | frontend | 🕳 | ui/entity-view.tsx:35-36,151-152 (title is plain text) | E2 EC-25; BR NP-11 | EC-25 | editable-title seam in EntityView → `updatePage({title})` |
| B-27 | ⋯ action menu never passed | frontend | 🕳 | slot exists ui/entity-view.tsx:39; dropped by ent/adapter.ts:39-79 | E2 EC-25/26/34 | EC-25/26/34 | carry `action` through `EntitySource`; Menu: Rename · Save as template · Move to Trash |
| B-28 | ⋯ → Rename dialog | frontend | 🕳 | none | E2 EC-25 | EC-25 | same mutation as B-26 |
| B-29 | delete → undo toast → in-Trash banner | shared | 🕳 | no delete affordance; deleted id → "Note not found" n/note-entity.tsx:84-95 | E2 EC-26; BR NP-9 | EC-26 | soft delete + toast Undo (`restorePage`) + deleted-aware read for the banner |
| B-30 | delete must settle the pending flush | frontend | 🕳 | n/use-note-content.ts:98-104 (no flush/cancel API) | I IR-R2 | IR-R2 | expose `flush()/cancel()`; delete awaits settle |
| B-31 | OS-wide Trash surface | frontend | 🕳 | not in nav/module-map.ts:114-121; no route | E2 EC-27 | EC-27 | shell global surface + route over the A-14 seam |
| B-32 | IA/surface-map Trash row | doc | ⛔ | docs/core/architecture/information-architecture.md:96-107 (no Trash) | E2 Picks | EC-27 | Step 5 append + owner |
| B-33 | restore conflict UI | shared | 🕳 | no restore path | E2 EC-28; I IR-R10 | EC-28 | inline typed message in the Trash row |
| B-34 | hard delete / Empty Trash cascade | shared | 🕳 | none | BR NP-9; I IR-R11 | EC-27 | ≡ A-15/A-16 |
| B-35 | metadata controls present + reflect state | frontend | ✅ | n/page-metadata.tsx:57-84 | E1 EC-7 | EC-7 | — |
| B-36 | metadata writes are no-ops | shared | ❌ | n/use-page-metadata.ts:27-38 | P ELC-5 | EC-7 | `useMutation(updatePage)` + full invalidation; IR-R7 |
| B-37 | icon picker | frontend | 🕳 | n/use-page-metadata.ts:36 | E2 EC-29 | EC-29/22 | Lucide grid; store the name |
| B-38 | chosen icon never rendered | frontend | ❌ | n/notion-header.tsx:44,56 | E2 EC-29 | EC-29 | render `page.icon`, fall back to type icon |
| B-39 | cover picker + real banner | frontend | 🕳 | n/page-metadata.tsx:103-121 | E2 EC-29 | EC-29 | link / attachment / remove; image banner |
| B-40 | attachments panel structure | frontend | ✅ | n/attachments-list.tsx:87-126 | E1 EC-8 | EC-8 | — |
| B-41 | attachments hook stub (dead Add/Remove) | shared | ❌ | n/use-attachments.ts:38-44 | P ELC-4/5 | EC-8 | live query + remove |
| B-42 | upload UX | frontend | 🕳 | n/attachments-list.tsx:54-84 | E2 EC-30 | EC-30 | file input + drop zone + progress + limit message |
| B-43 | backlinks panel (data HARD-3) | frontend | ✅ (borrowed) | n/backlinks-panel.tsx:26-61 | E1 EC-6 | EC-6 | HARD-3 flips data + navigation |
| B-44 | `note` Overview | frontend | ✅ | n/note-overview.tsx:36-76 | E1 EC-18f | EC-18f | — |
| B-45 | Overview renderer called as a function | frontend | ❌ | n/note-entity.tsx:110; n/overview-registry.ts:23 | I IR-R13 | IR-R13 | mount as a component |
| B-46 | Notes registers the journal Overview stub | frontend | ❌ (ownership) | n/overview-registry.ts:39; n/note-overview.tsx:80-111 | E1 Re-pin EC-18a | EC-18a | edge → journals-rescope registers; remove the notes stub |
| B-47 | fallback Overview for unregistered types | frontend | ✅ | n/overview-registry.ts:33-35 | E1 EC-18b–e | — | — |
| B-48 | `/summary` render ✅; data never fetched | frontend | ✅/❌ | n/summary-block.tsx:46-71; n/use-journal-summary.ts:48-51 | E1 EC-9 | EC-9 | ≡ A-44 |
| B-49 | save status is its own text, not SyncStatus | frontend | ❌ | n/note-editor-body.tsx:23-27,36-46 | E2 EC-34 | EC-34/IR-R15 | `<SyncStatus>` beside ⋯; Home placement too |
| B-50 | malformed content → blank editor → overwrite | shared | ❌ (data loss) | n/live-mappers.ts:30-37; n/note-editor-body.tsx:49; n/use-note-content.ts:48,85-90 | E2 EC-33; I IR-R4 | EC-33 | tagged parse result; malformed → `editable={false}` + notice + export; never write |
| B-51 | calendar shares `parseContent` | shared | ❌ | app/calendar/use-calendar.ts:19,138 | I IR-R4 | IR-R4 | adapt to the tagged result |
| B-52 | content write invalidates only `['pages',id]` | shared | ❌ | n/use-note-content.ts:58 | I N-1 | N-1 | full key set |
| B-53 | Home re-mount within 30 s may re-seed from a stale doc `[INTERP — needs live repro]` | shared | ❌ | home/use-journal-entry.ts:67 | I N-1, IR-R6 | ELC-7 | covered by B-52; verify live |
| B-54 | keys for metadata/rename/delete/restore | shared | 🕳 | mutations absent | I N-1 | N-1 | name the full set per mutation |
| B-55 | stale hook headers | frontend | ❌ | n/use-notes-rows.ts:5-9 · use-note-entity.ts:3-9 · use-backlinks.ts:3-5 · use-attachments.ts:3-4 · use-page-metadata.ts:4-5 · use-wikilink-picker.ts:3-5 · use-journal-summary.ts:6-7 · col/use-collection.ts:8-12 | I IR-R16 | IR-R16 | rewrite on flip |
| B-56 | stale / false component headers (note-overview claims "LIVE") | frontend | ❌ | n/note-overview.tsx:9-10; notes-surface.tsx:6-8; note-entity.tsx:9-13; notion-header.tsx:4-5; page-metadata.tsx:3; ent/adapter.ts:82-84 | I IR-R16 | IR-R16 | rewrite |
| B-57 | DEV `?sample` gates ✅; list sample still has journal/`*_note` rows | frontend | ✅/❌ | n/use-notes-rows.ts:35-44 | P ELC-4 | ELC-4 | note-only sample |
| B-58 | `?picker` / `?templates` DEV overlays are the only mounts | frontend | ⛔ | n/note-entity.tsx:29-38,127-150 | P ELC-5 | EC-10/11/13 | real entries, then delete overlays |
| B-59 | dead seam `CanvasEditor` + `page-binding` (styles live) | frontend | 🕳 | canvas-editor/page-binding.ts:14; n/note-editor-body.tsx:14,31 | I §3 (adopt or retire) | — | retire both, keep styles; update canvas-editor/CLAUDE.md |
| B-60 | duplicated type labels | frontend | ❌ | n/note-renderers.tsx:16-25 vs n/note-chrome.tsx:33-51 | current-spec | EC-22/23 | use note-chrome |
| B-61 | routes | frontend | ✅ | routes.tsx:76-87; nav/module-map.ts:68 | SD | — | — |
| B-62 | journal pages open in the Notes frame | frontend | 📄 | n/note-entity.tsx:103-123 | I §5 (journal day surface = Journals) | EC-18a | edge → journals-rescope |
| B-63 | card `aria-label` hides type/updated/favorite | frontend | 📄 | n/note-renderers.tsx:37,50 | E1 EC-16 | EC-16 | full label or no override |
| B-64 | control + state a11y hosts | frontend | ✅ | n/page-metadata.tsx:29-50; n/note-entity.tsx:45-82 | P ELC-6 | — | — |
| B-65 | chatty save announcements | frontend | ❌ | n/note-editor-body.tsx:36-46 | E2 EC-34 | IR-R15 | folds into B-49 |
| B-66 | tests asserting stub/obsolete behavior | frontend | ⛔ | note-renderers.test.tsx:30-31 · template-picker.test.tsx:82-92 · overview-registry.test.ts:6-9 · use-collection.test.ts:23-27 · adapter.test.ts:23-33 · backlinks-panel.test.tsx:66 | I N-4 | N-4 | flip in the leg's slice |

## Area C — editor plane: `[[` links, blocks as widgets, templates, palette (52 rows)

`ed/` = packages/editor/src.

| id | item | plane | bucket | built evidence | anchor | EC/IR | fix direction |
|---|---|---|---|---|---|---|---|
| C-1 | `[[` trigger seam | frontend (editor) | 🕳 | fixed extension list ed/editor.tsx:149-160; only `/` (ed/extensions/slash-command.ts:96) | E2 EC-31; e4-slash-menu.md:31; coverage-report:47 | EC-31/10 | second Suggestion plugin with consumer items/render props (picker stays in apps/web) |
| C-2 | combobox ARIA keyed to slash only | frontend (editor) | ❌ | ed/editor.tsx:139-144; slash-command.ts:81-84 | I §2 | EC-17 | "any suggestion active" + per-surface listbox id |
| C-3 | `wikiLink` inline node | shared | 🕳 | not in packages/types/src/editor.ts:12-41; all integration nodes are block atoms (integration-blocks.tsx:175-176) | E2 EC-31; I IR-R12 | EC-31 | inline atom `{target_kind, target_page_id | entity_type+entity_id}`, label from target |
| C-4 | page AND entity targets | frontend | 🕳 | page-only pick (n/use-wikilink-picker.ts:27-29; n/wikilink.ts:55-63) | E1 Re-pin EC-10; I §5#7 | EC-10/31 | discriminated pick → page_links / entity_links |
| C-5 | doc nodes ↔ link rows consistency | backend/shared | 🕳 | content write only (service.ts:138-139) | I IR-R12 | IR-R12/EC-6 | reconcile the target set in ① on content write (set semantics) |
| C-6 | picker data stub | frontend | ❌ | n/use-wikilink-picker.ts:49-62 | coverage-report:26,37 | EC-10 | live query over `resolveWikiLink` |
| C-7 | `resolveWikiLink` semantics | backend | 🕳 | ≡ A-25 | I §5 carry | EC-10 | escape · limit · archived · `*_note` labels |
| C-8 | entity candidates seam | shared | 🕳 | ≡ A-33 | I §5#7 | EC-10/31 | decide in PLAN |
| C-9 | picker not grouped by type | frontend | ❌ | n/wikilink-picker.tsx:39-42,82-103 | E2 EC-31 | EC-31 | per-type `role=group` sections |
| C-10 | create row copy | frontend | ❌ (copy) | n/wikilink-picker.tsx:117-120 | E2 EC-31 | EC-10/31 | "Create note '…'" |
| C-11 | picker only a DEV overlay | frontend | ❌ | n/note-entity.tsx:127,135-140 | E2 EC-31 | EC-31 | mount via C-1 at the caret; delete overlay |
| C-12 | hover/focus preview | frontend | 🕳 | sample only (n/note-entity.tsx:139) | E1 EC-11 | EC-11 | node-view opens PreviewCard |
| C-13 | preview of a deleted/archived target | frontend | 🕳 | n/link-preview-card.tsx:13 | I IR-R11/R3 | EC-11 | honest "Page deleted" |
| C-14 | preview renders available data | frontend | ✅ | n/link-preview-card.tsx:13-35 | E1 EC-11 | EC-11 | keep |
| C-15 | token render (icon + underlined title) | frontend | 🕳 | no node-view | E2 EC-31 | EC-31/22 | via note-chrome `typeIcon` |
| C-16 | serializers drop inline nodes | shared (editor) | 🕳 | ed/serializers to-markdown.ts:89 · to-pdf.tsx:78 · to-docx.ts:94 | I §2 | IR-R12 | md `[[Title]]` (+id); pdf/docx label; spec rows |
| C-17 | `/entity-link` block vs `[[` token | shared | 📄 | block atom stores `label` (integration-blocks.tsx:49-53) | e4-slash-menu.md:31; E2 EC-32 | EC-32/IR-R12 | Step 5: block = widget card, token = inline; label fallback-only |
| C-18 | node-view injection seam | frontend (editor) | 🕳 | ed/editor.tsx:25-43; integration-blocks.tsx:202-204 | I §2 N-2 | EC-32/14 | `blockViews` prop via context; reaches Home's body |
| C-19 | widget frame | frontend | 🕳 | only `IntegrationBlockPlaceholder` (integration-blocks.tsx:147-163) | E2 EC-32; ADR-008 L142-143 | EC-32 | shared `BlockWidget` (header · 4 states · actions) |
| C-20 | honest placeholder for unowned blocks | frontend | ✅ | integration-blocks.tsx:152-160 | E2 EC-32 | EC-32 | re-skin inside C-19, name the owning edge |
| C-21 | `/summary` body | frontend | 🕳 | placeholder; SummaryBlock only in Overview | E2 EC-32; coverage-report:48 | EC-32/9 | inject SummaryBlock + "Open journal" |
| C-22 | `/summary` hook flip | frontend | ❌ | ≡ A-44 | coverage-report:27 | EC-9 | ≡ A-44 |
| C-23 | block config → `JournalSelection` | shared | 🕳 | types editor.ts:56-69 vs journals/types.ts:69; MODULE_ICON keys mismatch (summary-block.tsx:30-41) | I §5 carry | EC-9 | define the mapping (or retype the attr) |
| C-24 | `/summary` `date:null` meaning | shared | 📄 | integration-blocks.tsx:45 | undocumented | EC-9/IR-R8 | PLAN: host journal_date else local today |
| C-25 | `/entity-link` body | frontend | 🕳 | placeholder | E2 EC-32; extension-catalog.md:43 | EC-32 | card from target + "Open", writes via `createEntityLink` |
| C-26 | `/backlink` body | frontend | 🕳 | placeholder (integration-blocks.tsx:86-88) | E2 EC-32; extension-catalog.md:44 | EC-32/6 | mount BacklinksView for the host page (data HARD-3) |
| C-27 | `/task` node | shared | 🕳 | no command/node; `taskChecklist` attrs are filters (types editor.ts:132-138) | E2 EC-36 | EC-36 | new `taskBlock {task_id}` in types · commands · catalog |
| C-28 | `/task <text>` create-or-bind flow | frontend | ❌ | slash inserts a bare node (slash-commands.ts:188-191) | E2 EC-36 | EC-36/17 | widget empty state = create/search; tick → complete/reopen; "Open task page" |
| C-29 | Tasks API for `/task` | backend | ✅ | tasks/types.ts:251,261-262,280; composed | E2 EC-36 | EC-36 | consume as is |
| C-30 | `createTask` doesn't eagerly create the task page | backend | ❌ | tasks/service.ts:286-300 (only `getTaskNote` :689-695) | NOT-13; E2 EC-36 | EC-36 | widget calls `getTaskNote` after create; eager wiring = edge to fe-tasks |
| C-31 | `/tasks` (taskChecklist) body | frontend | 🕳 | placeholder | extension-catalog.md:36 (MOD-tasks, closed) | EC-32 | honest placeholder here; edge → fe-tasks |
| C-32 | `/habits` body | frontend | 🕳 | placeholder; Habits API composed | extension-catalog.md:39 (MOD-habits, closed) | EC-32 | honest placeholder here; edge → fe-habits |
| C-33 | `habit_logger` def vs `habitsBlock` node | shared | 📄 | registry.ts:35-47 | ADR-008 L47-49,146-147 | EC-14 | Step 5: one capability or two |
| C-34 | `/events` `/classes` `/milestone` `/timeline` `/chart` `/pomodoro` | frontend | 🕳 (honest placeholders) | integration-blocks.tsx:55-97 | extension-catalog.md:37-45 | EC-32 | placeholders + named edges to their ② units |
| C-35 | `/class-notes` block missing (11 of 12) | shared | 🕳 | types editor.ts:28-40 | NOT-52 (parts/notes-and-pages.md:66) | EC-32 | Step 5: add as a placeholder (owner Learning) or record its retirement |
| C-36 | capability registry not composed | shared | 🕳 | composition-root.ts:83-116 | P:107-108 | EC-14 | compose registry + resolver |
| C-37 | editor-local defs vs ADR-008 registry | shared | ❌ | integration-blocks.tsx:111-117; commands.ts:8-108 | ADR-008 L47-49,104-107,146-147; block-registry.md:26-30 | EC-14 | register shipped inline defs in core; adapter passes defs + views (pairs with C-18) |
| C-38 | CAP-13 offered set ignores the page | backend | 📄 | ≡ A-40 | xcut-capability.md:43 | EC-14 | `resolveForPage(pageId)` |
| C-39 | slash palette static | frontend (editor) | 🕳 | slash-commands.ts:173-175,198 | E1 EC-14; coverage-report:49 | EC-14 | `offered` prop narrows integration items |
| C-40 | "CAP-12 page applicability" | shared | 📄 | inline = node attrs ✅; `block_instances` service unbuilt | xcut-capability.md:42; coverage-report:50 | EC-14 | Step 5: inline half ✅ by construction; standalone placement re-homed (Space/dashboard) or service-only — record which |
| C-41 | templates list stub; service not composed | frontend + composition | ❌ | n/use-templates.ts:55-61 | coverage-report:29 | EC-13 | ≡ A-36 + live query |
| C-42 | grouped by type · Shipped/Yours · what it creates | frontend + shared | 🕳 | `TemplateItem = {id,name}` (n/use-templates.ts:21-29); no `listShipped` | E2 EC-13 | EC-13 | project types from `seed_entities`; shipped source; badge |
| C-43 | "Use template" forks + opens | backend + frontend | ❌ | no-op "Apply" (n/template-picker.tsx:95) | E2 EC-13; I IR-R14 | EC-13 | ≡ A-37; navigate to the first created item |
| C-44 | template entry points DEV-only | frontend | ❌ | n/note-entity.tsx:128,143-147 | E2 EC-35/13 | EC-13/35 | `/notes` header dialog + ⋯ "Save as template"; delete overlay |
| C-45 | Save as template (page capture) | backend | 🕳 | ≡ A-38 | BR NP-12 | EC-13 | Step 5 RATIFY rule, then build |
| C-46 | **malformed OR unknown-node content is wiped** (lenient TipTap load → empty → mount echo ≠ baseline → write) | shared | ❌ (data loss) | n/live-mappers.ts:30-37; ed/editor.tsx:146-174; n/use-note-content.ts:40,91; packages/editor/src/CLAUDE.md:123-124 | E2 EC-33; I IR-R4 | EC-33 | `enableContentCheck` + `onInvalidContent` prop; validate before mount; lossy load → read-only + notice, never write; also covers future nodes from another device |
| C-47 | read-only seam exists | frontend (editor) | ✅ | ed/editor.tsx:30,177-179 | E2 EC-33 | EC-33 | use it |
| C-48 | "Export a copy" has no consumer | frontend | 🕳 | no apps/web use of toMarkdown/toPdf/toDocx | E2 EC-33; coverage-report:89 (general export → shell-rescope) | EC-33 | at least `toMarkdown` on the raw content |
| C-49 | serializer copy for live blocks | shared (editor) | ❌ | to-markdown.ts:155; serialization-spec.md:107-108,159-160; to-docx.test.ts:276 | E2 EC-32 | EC-32 | label-only marker for live blocks |
| C-50 | `taskList` vs `taskChecklist` vs `/task` | shared | 📄 | extension-catalog.md:21,30-31 | E2 EC-36 | EC-36 | Step 5: record all three in the catalog |
| C-51 | EC-24 quote / task-list render | frontend (editor) | ✅ | editor-styles.ts:54-64 | E1 EC-24 | EC-24 | re-verify live; catalog styling note |
| C-52 | capability-framework template row lacks Projects + Notes pages | doc | 📄 | capability-framework.md:239 | E2 grounded changes | EC-13 | Step 5 append |

**Block-body ownership (doc-decided):** `/summary` · `/entity-link` · `/backlink` · `/task` → **notes-rescope** (E2 EC-32 names
them; the catalog's MOD-tasks home is closed and `P:84-87` forbids homing to a closed unit). The widget frame, injection
seam and registry wiring → notes-rescope (first Capability consumer, `P:107-108`). `/tasks` → fe-tasks · `/habits` → fe-habits ·
the other module blocks → their open ② units, as **edges** (`P:88-92`), honest placeholders here until then. Step 5 amends
the extension-catalog Real-body column and adds those legs to the ② units' task files.

## Area D — EC sweep (the ELC-9 close set)

Buckets here: ✅ met as built · ❌ missing/diverging, notes-rescope owns it · 🕳 live/feel-only (verified at the live close) ·
⛔ borrowed (bucketed by its owner, not a notes ❌).

### fe-notes EC-1…24 (+ Re-pins)
| EC | assertion | owner | built state | bkt |
|---|---|---|---|---|
| EC-1 (re-pin) | List · Gallery · Graph, switches live, persisted | notes-rescope | 4 layouts incl. calendar (n/notes-surface.tsx:21); layout in `useState` (col/use-collection.ts:33) | ❌ |
| EC-2 | every layout honors the state machine | notes-rescope | states ✅ (n/use-notes-rows.ts:59-63); scope wrong (archived/journals listed) | ❌ |
| EC-3 | graph honest "being prepared" | HARD-3 | n/note-renderers.tsx:70-75 | ⛔ ✅ |
| EC-4 | note page leads with the editor | notes-rescope | n/note-entity.tsx:42,120 | ✅ (feel 🕳) |
| EC-5 | per-type default, remembered | notes-rescope | in-memory store (ent/adapter.ts:93-102) | ❌ |
| EC-6 | backlinks grouped by source | HARD-3 | shape ✅, data stub (n/use-backlinks.ts:68-76) | ⛔ |
| EC-7 | metadata reflect + act | notes-rescope | writes no-op (n/use-page-metadata.ts:27-38) | ❌ |
| EC-8 | attachments | notes-rescope | hook stub (n/use-attachments.ts:38-44) | ❌ |
| EC-9 | `/summary` per-section degrade | notes render · HARD-1 data | ladder ✅; hook stub (n/use-journal-summary.ts:46-50) | ❌ hook / ⛔ data |
| EC-10 (re-pin) | `[[` across every page-able entity, grouped, explicit Create | notes-rescope | DEV `?picker` only; hook stub; no trigger/grouping | ❌ |
| EC-11 | preview card | notes-rescope | DEV only (n/note-entity.tsx:139) | ❌ |
| EC-12 | search + honest unavailable | DB-8 | n/notes-search.tsx:54 | ⛔ ✅ |
| EC-13 (re-pin) | entity-based templates | notes-rescope | DEV `?templates`; no-op; service not composed | ❌ |
| EC-14 | capability palette | notes-rescope | 11 placeholder blocks, no offered set (packages/editor/src/editor.tsx:149-160) | ❌ |
| EC-15 | 6 page types editor-led | notes-rescope | 4 `*_note` types get **no editor** (ent/adapter.ts:33-35) | ❌ |
| EC-16 | light/dark × 375·768·1440 | notes-rescope | live check | 🕳 |
| EC-17 | editor/link feel | notes-rescope | `[[` unbuilt | 🕳 |
| EC-18/18f | Overview slot + note Overview | notes-rescope | present; panels stubs; renderer called as fn (n/note-entity.tsx:110) | ❌ partial |
| EC-18a | journal Overview | journals-rescope | stub still registered here (n/overview-registry.ts:39) | ⛔ (move out) |
| EC-18b–e/20/21 | `*_note` Overviews | fe-tasks · fe-projects | fallback noteOverview | ⛔ |
| EC-19 | merged continuous | notes-rescope | n/note-overview.tsx:37-48 | ✅ |
| EC-22 | Lucide, token-tinted | notes-rescope | n/note-renderers.tsx:13,27-30 | ✅ (re-verify live) |
| EC-23 | borderless editor, 740 measure | notes-rescope | n/note-editor-body.tsx:35,48 | ✅ |
| EC-24 | quote / task list / table render | ui-3 (consumed) | editor-styles.ts:64-67 | ✅ (live 🕳) |

### notes-rescope EC-25…36 (all notes-rescope)
| EC | built state | bkt |
|---|---|---|
| EC-25 rename inline + ⋯ | none; `updatePage({title})` exists | ❌ |
| EC-26 Move to Trash + Undo + banner | only `softDeletePage` | ❌ |
| EC-27 one OS-wide Trash | nothing | ❌ |
| EC-28 restore conflict | `JournalExistsError` exists; no restore | ❌ |
| EC-29 icon grid + cover picker | no-ops | ❌ |
| EC-30 upload UX | no file path | ❌ |
| EC-31 `[[` token + preview + grouped picker | no node, no seam | ❌ |
| EC-32 blocks are widgets | placeholder node-views (integration-blocks.tsx:119,209) | ❌ |
| EC-33 unreadable → read-only | **data-loss path** (B-50) | ❌ |
| EC-34 one SyncStatus beside ⋯ | ad-hoc text (n/note-editor-body.tsx:23-44) | ❌ |
| EC-35 collection header | only New note; calendar offered | ❌ |
| EC-36 `/task` create-or-bind | none | ❌ |

### Inherited CODEC ECs exercised (ELC-9, P:43)
| source EC | built state | bkt | owner |
|---|---|---|---|
| fe-codec-collection EC-1 switcher | ✅ (persistence = fe-notes EC-1) | ✅ | — |
| fe-codec-collection EC-2/6 chrome active, `+` | Filter/Sort/`+` no-ops (col/use-collection.ts:39-41) | ❌ | notes-rescope |
| fe-codec-collection EC-3 teaching empty | ✅ (calendar coercion moot once dropped) | ✅ | — |
| fe-codec-collection EC-4 375 condense ≥44px | live | 🕳 | notes-rescope |
| fe-codec-collection EC-5 `degraded` declared | hard-coded `[]` + dropped | ❌ | notes-rescope |
| fe-codec-collection EC-7/8 feel | live | 🕳 | notes-rescope |
| fe-codec-entity-facet EC-1/2/4/5 | ✅ | ✅ | — |
| fe-codec-entity-facet EC-3 page-less → no editor | fires wrongly for `*_note` pages | ❌ | notes-rescope (≡ EC-15) |
| fe-codec-entity-facet EC-6/7/8 | live | 🕳 | notes-rescope |
| fe-codec-canvas-editor EC-2/3/5/6/7 | ✅ (EC-3 superseded by EC-32; EC-5 copy differs) | ✅ | — |
| fe-codec-canvas-editor EC-1 masthead + SyncStatus | ≡ EC-34 | ❌ | notes-rescope |
| fe-codec-canvas-editor EC-9/11 sheet-on-desk | superseded by fe-notes EC-23 | n/a | — |
| fe-shell-scope EC-3 "6 global surfaces" / EC-4 System nav | **collides with EC-27 OS-wide Trash** (a 7th system surface) | ❌ | notes-rescope → re-pin fe-shell-scope EC-3 at the Re-scope Gate (Victor's EC-27 pick) |
| fe-codec-patterns / canvas-graph / viewmodes | no pinned ECs (Envision satisfied/skipped) | — | — |

## Impact scan — shared contracts the rescope changes (break-the-legacy guard)

| contract | call-sites | breaks | decision |
|---|---|---|---|
| `offersEditor` / `toEntityProps` → page-type gate | ent/adapter.ts:33,64,107,114 · n/note-entity.tsx:19,111-115 · ent/adapter.test.ts | adapter.test.ts:25-33 entity keying | **A** new page-type gate; entity gate stays for module entities |
| `EntityModeStore` (sync, in-memory) → app_state | n/note-entity.tsx:19,42,104,106 · ent/adapter.test.ts:61-74 | async read breaks the `useState` initializer + tests | **A** `createAppStateEntityModeStore` + seeding hook; keep in-memory as reference |
| `VidaEditorProps` / extension list (suggestion + node-view seams) | n/note-editor-body.tsx:47 (+ Home via journal-page-region.tsx:70) · canvas-editor.tsx:108 · 8+ editor test/story mounts | none if props are optional | **B** optional props (the `chrome` precedent) |
| `NoteEditorBody` + `useNoteContent` | 2 prod (notes, Home) + tests | read-only guard + keys + delete-cancel reach Home | **B** in place; additive returns |
| `parseContent` / `toNoteEntity` / `ymd` / `relLabel` | parseContent: calendar use-calendar.ts:19,138 + live-mappers:56; toNoteEntity: Home + notes | tri-state parse changes calendar + Home | **A** `parseContentResult` + additive `contentStatus`; keep `parseContent` null contract |
| `listPages` filters | 1 prod (n/use-notes-rows.ts:56) + mocks + core test :209-215 | changing the default breaks :213 | **B** additive (`archived:false` honored); default unchanged; views flip replaces the caller |
| `updatePageSchema` / `NotesService` additions | schema 3 sites + `.strict()` tests :165-172; NotesService consumed as a dep by 7 modules, implemented once | none for additive methods; never add `deleted_at` to the patch schema | **A** new methods (`restorePage`, `listDeletedPages`, `deletePageForever`) |
| `useCollection` / `toCollectionChrome` | 1 prod + tests + seams barrel | adding `degraded` needs a CollectionView prop; use-collection.test.ts:23 flips | **B** additive mapping; internals behind the same signature |
| `registerOverview` / `overviewFor` | n/note-entity.tsx:110 + registry test | call shape at :110; journal registration moves out (test :8) | **B** one site |
| `renderNotesView` layout set | 1 prod + note-renderers.test.tsx:31 | calendar case + NOTES_LAYOUTS; check notes-surface.test switcher count | **B** |
| `INLINE_BLOCK_DEFS` / integration-block extensions | integration-blocks.tsx · editor.tsx:156 · slash-commands.ts · 3 serializers · 5 test files | constants have no injection | **A** `createIntegrationBlockExtensions(renderers?)`; constant = no-arg default |
| `composeServices` return shape | composition-root.ts:83-127 + tests + 8 mocked test files | additive | **B** construct views/engine/templates/capability/trash after `notes` |

Untreated call-sites after the decisions above: **0** (each A keeps the legacy entry; each B enumerates every site). Verdict:
CLEAR to plan.
