# Interpretation Layer — Notes & Pages · RESCOPE (notes-rescope, LIF-245) · both planes

> Entity Delivery Flow (v1) **recovery variant**, Step 2 (`entity-delivery-flow.md §3, §6`). Makes the implicit explicit
> over the **gated** source (Step 1 PASS, `b40849b`) **and the built code** (Step 0 baseline, `010acb8`). Every claim is
> `[FACT: path:line]` / `[INTERP: from fact]` / `[UNKNOWN — homed: <step>]`.
> Supersedes the ① build's interpretation (2026-09-19 — `git show ef8c1ed:docs/features/notes-and-pages/delivery/interpretation.md`)
> and reads alongside the ② build's (`docs/specs/foundation/fe-notes-and-pages/delivery/interpretation.md`); their still-true
> facts are carried forward here, cited.
> **Scope (the unit's charter):** `docs/specs/foundation/golive-replan/debt-plan.md:22` + `coverage-report.md:21-64` (§A notes
> rows) — fe-notes STUB/PARTIAL legs · the #31/ui-3 root · ❌ EC-5/7/10/11/13/15/18/18a · cross-unit fixes · the ELC close
> (`golive-replan/process.md` ELC-1…9).

---

## 0. Frame — what the rescope is

① is BUILT and live in the composition root; ② shipped S1–S9 on stubs, and only 4 data legs went live since (list ·
read page · create · content write) `[FACT: docs/modules/notes/current-spec.md ② Hooks]`. The rescope closes the
remaining legs, corrects the 8 diverged ECs, applies the cross-unit fixes, and closes the entity on the **Entity Live Close**
— every pinned EC re-verified live on real OPFS `[FACT: golive-replan/process.md:35-43]`. Doc intent of record =
`docs/features/notes-and-pages/{identity,business-rules,contract,structure-data,conventions}.md` (restored + realigned).

---

## 1. DEPENDENCIES — every upstream, both planes

### 1a. ① service plane (built — carried forward)
| Dependency | Relation | Source |
|---|---|---|
| Repository layer (`createRepository`, soft delete, sync enqueue) | owns its 3 repos | `[FACT: services/notes/service.ts:75-89; db/repository.ts]` |
| AR-6 `SpacesService` + taggable-type registry | delegates entity-link/tag WRITES; validates `entity_type` | `[FACT: service.ts:92-96,265-277]` |
| AR-8 `BacklinkResolver` | delegates entity-link READS | `[FACT: service.ts:279-290]` |
| Journals `buildDashboard` | the `/summary` ENGINE (N&P stores `summary_config` only) | `[FACT: services/journals/dashboard.ts:41-44]` |
| ADR-009 templates (`foundation/templates`) | CRUD built; instantiate/capture = 0-code seams | `[FACT: foundation/templates/service.ts:24-59; templates slice-map:24-51]` |
| ADR-007 views (`foundation/views`) | `ViewsService` CRUD + `cloneView` built | `[FACT: foundation/views/service.ts:26-45]` |
| `libsodium` via `initVault()` | every repo write hashes content | `[FACT: memory repository-writes-need-initvault; composition-root.ts:118-128]` |

### 1b. Composition (apps/web)
- `getServices()` builds `registry → spaces → backlinks → notes` after `ensureDbReady` + `initVault` `[FACT:
  apps/web/src/db/composition-root.ts:85-88,118-141]`; `journals` is composed over an **empty** `JournalRegistry`
  `[FACT: composition-root.ts:90-91,97]`. NotesService is injected into tasks/purposes/relationships `[FACT: :102-110]`.

### 1c. ② surface plane (built)
| Dependency | Use today | Source |
|---|---|---|
| `@vida/ui` `CollectionView` / `NeuralGraph` / `EntityView` | collection + page frame | `[FACT: current-spec ② Components]` |
| `apps/web/src/entity/adapter.ts` | `offersEditor` gate + in-memory mode store; **only notes consumes it live** | `[FACT: adapter.ts:33-35,93-102; grep: note-entity.tsx is the only live caller]` |
| `apps/web/src/collection/{use-collection,adapter}.ts` | layout state + chrome; filter/sort/new-view no-op; `degraded` ignored | `[FACT: use-collection.ts:32-43; collection/adapter.ts:60-69]` |
| `@vida/editor` `VidaEditor` | uncontrolled body; only `/` suggestion (`SlashCommand` over `@tiptap/suggestion`, `createRenderer`) | `[FACT: packages/editor/src/extensions/slash-command.ts:88-106]` |
| `@vida/editor` integration blocks | generic placeholder node-views | `[FACT: extensions/integration-blocks.tsx:147-161,202-204]` |
| `canvas-editor/{canvas-editor,page-binding}` | **bypassed** (D-S2-1); no production importer | `[FACT: note-editor-body.tsx:14,31]` |
| React Query client | `staleTime` 30 s, `refetchOnWindowFocus` false | `[FACT: apps/web/src/lib/query-client.ts:18-21]` |
| Home journal | reuses `NoteEditorBody` + `toNoteEntity`; key `['journal',date]` | `[FACT: home/journal-page-region.tsx:22,70; home/use-journal-entry.ts:15-16,67-68]` |

### 1d. Borrowed / cross-unit (owned elsewhere — this unit consumes or coordinates)
| Leg | Owner | Source |
|---|---|---|
| backlinks data + open-a-backlink · neural graph data | **HARD-3** | `[FACT: coverage-report.md:25,30,40,44]` |
| `/summary` providers (module sections) | **HARD-1** | `[FACT: coverage-report.md:27,45]` |
| FTS5 ranked search | **DB-8** (consumer swap rides C·#69·BSE-15) | `[FACT: coverage-report.md:28,43]` |
| EC-18b–e/20/21 `*_note` Overviews | **fe-tasks · fe-projects** (gain `← notes-rescope`) | `[FACT: coverage-report.md:65-70; debt-plan.md:44]` |
| SP-29 Space add-menu | **fe-spaces-page** | `[FACT: coverage-report.md:56]` |
| `offersEditor` gate | owner **fe-codec-entity-facet**, fix executed here | `[FACT: debt-census.md:84-88; debt-plan.md:22]` |
| EC-5 mode default storage | soft ← **preferences-rescope** | `[FACT: debt-plan.md:22]` |

---

## 2. NEEDS — preconditions per leg (what must exist before each leg can go live)

| Leg | Needs (service op) | Exists? | Source |
|---|---|---|---|
| metadata (EC-7) | `updatePage({is_favorite,is_archived,icon,cover_image})` | ✅ in `.strict()` schema | `[FACT: validators/note.ts:50-62]` |
| rename | `updatePage({title})` | ✅ | `[FACT: validators/note.ts:52]` |
| delete + undo | `softDeletePage` ✅ · **`restorePage`** ❌ (repo has no restore; `updatePage` can't clear `deleted_at`) | partial | `[FACT: service.ts:141-143; db/repository.ts (no restore); contract.md ⚠ INTENDED]` |
| Trash view | a deleted-pages read ❌ | no | `[FACT: contract.md ⚠ INTENDED; data-flow.md:154]` |
| attachments (EC-8) | `add/get/removeAttachment` ✅ + a file→bytes path in the browser | service ✅, upload UX ❌ | `[FACT: service.ts:196-217; PLAN-s6 D-S6-5]` |
| `[[` picker + create (EC-10) | `resolveWikiLink` · `createPage` · `createPageLink` ✅ + an editor `[[` suggestion seam ❌ | service ✅, editor ❌ | `[FACT: service.ts:220-260; slash-command.ts (only '/')]` |
| link preview (EC-11) | `getPage(targetId)` ✅ | ✅ | `[FACT: service.ts:128]` |
| templates (EC-13) | instantiate-fork + capture ❌ (0-code seams) | no | `[FACT: templates slice-map:24-51]` |
| view-config | `ViewsService` ✅ (selection primitive DEFERRED, NOT-48) | service ✅ | `[FACT: foundation/views/service.ts:26-45]` |
| mode memory (EC-5) | a persisted store ❌ (`nav_preferences` has no column) | no | `[FACT: schema/preferences.ts:91-117]` |
| journal summary | `journals.buildDashboard(date)` ✅ over an empty registry | ✅ (empty) | `[FACT: composition-root.ts:90-97]` |
| editor for 6 page types (EC-15) | gate keyed on page type | ❌ (keys on `ENTITY_TYPES`) | `[FACT: adapter.ts:33-35; _registry.ts:7-8]` |

Cross-cutting NEEDS:
- **N-1 cache coherence.** A content write today invalidates only `['pages',id]` `[FACT: use-note-content.ts:58]`; list
  labels/dates (`['notes','pages']`) and Home (`['journal',date]`) stay stale ≤30 s `[FACT: query-client.ts:18-21]`. Every
  new mutation must name all affected keys.
- **N-2 package direction.** `@vida/editor` cannot import apps/web; the picker UI lives in apps/web
  `[FACT: fe-codec-canvas-editor keystone, TASKS.md fe-codec-canvas-editor row]` ⇒ the `[[` trigger needs an editor-side
  suggestion **seam** (items + render supplied by the consumer), mirroring `SlashCommand`'s `createRenderer` `[INTERP]`.
- **N-3 live close.** ELC-7 needs the running app on real OPFS; the prod-build Playwright smoke exists (LIF-250, PR #159)
  `[FACT: .claude/session-log.md 2026-10-25]`.

---

## 3. ORGANIZATION — OWNS · CONSUMES · DELEGATES (this unit)

| | notes-rescope |
|---|---|
| **OWNS (builds/fixes)** | the stub→live flips (metadata · attachments · `[[` picker · link preview · templates apply/save · view-config · mode memory · `useJournalSummary` → `buildDashboard`) · rename/delete UI · the `[[` editor trigger + the #31 root (integration-block bodies · palette compute CAP-13 · CAP-12 per coverage-report:50) · the 8 ❌ ECs incl. EC-18/18a Overviews · cross-unit: page-type editor gate, TZ row date, excerpt, `degraded` + XCU-14, SyncStatus on a live surface, dead seams (`canvas-editor`/`page-binding`: adopt or retire), stale headers · ① additions it needs (`restorePage`, deleted read) · templates S3–S5 + XCU-14 RATIFY appends `[FACT: debt-plan.md:22]` |
| **CONSUMES** | the ① service + Spaces/views/templates foundations · `@vida/ui` CODEC primitives · `@vida/editor` · the composition root |
| **DELEGATES / BORROWS** | backlinks + neural data → HARD-3 · summary providers → HARD-1 · FTS → DB-8 · `*_note` Overviews → fe-tasks/fe-projects · Space add-menu → fe-spaces-page |

---

## 4. IMPLICIT RULES — what the docs imply but never state

- **IR-R1 · Flip ≠ fake success.** The tabbed note Overview hard-codes every block `state:'success'` and the entity
  passes `editorState:'success'` `[FACT: note-overview.tsx:36-76; note-entity.tsx:103-151]`; once the legs are live, block
  states must derive from their queries or ELC-6 (honest states) fails `[FACT: process.md:40]`.
- **IR-R2 · Delete must cancel the pending body write.** `useNoteContent` flushes a debounced write on unmount
  `[FACT: use-note-content.ts:98-104]` and writes ignore `deleted_at` (BR-7c) — deleting a page while an edit is pending
  would write to the soft-deleted row (and a later restore would carry it). The delete path must cancel/settle the flush
  first `[INTERP from FACTs]`.
- **IR-R3 · A deleted page is unreachable by id.** `getPage` filters soft-deleted rows `[FACT: repository.ts:356-361]` →
  after delete, `/notes/$id` shows "Note not found"; undo must restore before re-navigating, and Trash needs its own read.
- **IR-R4 · Malformed content must not be overwritten.** `parseContent` → `null` → blank editor; the first emit is adopted
  as baseline, the next edit writes over the stored doc `[FACT: live-mappers.ts:30-37; use-note-content.ts:48,85-91]` —
  business-rules says "parse fail → read-only + flag". Data-loss guard required.
- **IR-R5 · The editor gate change is narrow.** `toEntityProps`/`offersEditor` has one live consumer (notes)
  `[FACT: grep apps/web/src]`; keying on page type for page surfaces leaves the `ENTITY_TYPES` gate intact for module
  entity surfaces (NP-10).
- **IR-R6 · Home shares the body.** Any change to `NoteEditorBody` (read-only guard, invalidations, SyncStatus) lands on
  Home's journal too `[FACT: home/journal-page-region.tsx:22,70]` — Home is in the live-close verification set.
- **IR-R7 · Archiving must not orphan the open page.** If archived pages leave the collection, the archive toggle on an
  open page keeps it reachable by id (`getPage` does not filter `is_archived`) `[FACT: service.ts:128]`.
- **IR-R8 · Local day everywhere.** The row date (`ymd`) and any new date (Trash timestamps, calendar placement) build
  `YYYY-MM-DD` from local fields `[FACT: conventions.md; live-mappers.ts:25-27]`; `relLabel` is computed at render and goes
  stale without a re-render tick `[FACT: live-mappers.ts:15-23]`.
- **IR-R9 · Journals are pages.** `ensureJournal` titles a journal with its date `[FACT: service.ts:190-194]`, so a journal
  row in `/notes` reads as a date; per-type availability (G3) offers journals Calendar/List/Gallery.
- **IR-R10 · Templates fork into a NEW page.** ADR-009 instantiate = fork `[FACT: ADR-009 title + §3]`; "Apply" on an
  existing page (EC-13) therefore needs a defined target (new page vs replace current body) `[INTERP]`.
- **IR-R11 · Stale header comments mislead.** 8 hook headers still say "no live composition root" `[FACT: current-spec ②]`;
  each flip rewrites its header (understandability rule §XX).
- **IR-R12 · `[[` link node.** An inserted wiki-link is an inline node carrying `target_page_id` (NP-7); a rename must
  re-render its label from the target, not from stored text `[INTERP from NP-7]`.

---

## 5. Flags carried to the gates

- **Step 3 (Interpretation Gate) — items to resolve, doc-first** (homed there by Step 1):
  1. delete leg scope — Empty-Trash/hard delete in or out · 2. archived pages + journals in `/notes` by default ·
  3. mode-memory storage home + per-type defaults (soft ← preferences-rescope) · 4. `has_pomodoro` setter ·
  5. which integration blocks get real bodies vs honest placeholder (#31 root) · 6. `/notes` persists a global `views` row? ·
  7. G6 creation half (`/entity-link` + entities as `[[` candidates) · 8. template "Apply" target (IR-R10).
- **Step 3.5 (Envision trigger test)** — affordances whose UI answer is not obvious from a shipped surface:
  rename (inline title vs ⋯ menu) · delete/undo/Trash (specimen exists: P4) · attachment upload · icon/cover picker ·
  `[[` inline token + hover preview · journal Overview EC-18a (pinned, unbuilt). Inherited ECs EC-1…24 are carried
  regardless (ELC-9).
- **Step 4 (Reconciliation)** — CAP-12 page-surface applicability (ADR-008 L120-124); EC-1 per-type views (census ✅ is
  lenient — code offers one 4-layout set to every type).
- **Slice PLANs** — purge timing · excerpt rule · `summary_config` → `JournalSelection` · icon domain / cover ref ·
  attachment upload UX.

## 6. Sources
Gated corpus: `docs/features/notes-and-pages/*.md` · `docs/intake/notes-and-pages.md` · `docs/modules/notes/current-*` ·
`docs/specs/foundation/backend-intent/parts/notes-and-pages.md` · `docs/specs/foundation/fe-notes-and-pages/delivery/*` ·
`docs/specs/foundation/golive-replan/{process,debt-plan,debt-census,coverage-report}.md` · ADR-004/006/007/008/009/021 ·
built code under `packages/core/src/services/notes`, `apps/web/src/{notes,entity,collection,canvas-editor,home,db}`,
`packages/editor/src/extensions`.
