# Interpretation Layer — Notes & Pages · RESCOPE (notes-rescope, LIF-245) · both planes

> Entity Delivery Flow (v1) **recovery variant**, Step 2 (`entity-delivery-flow.md §3, §6`), revised at the Step 3
> Interpretation Gate. Makes the implicit explicit over the **gated** source (Step 1 PASS, `b40849b`) **and the built
> code** (Step 0 baseline, `010acb8`). Every claim is `[FACT: path:line]` / `[INTERP: from fact]` / `[UNKNOWN — homed: <step>]`.
> Supersedes the ① build's interpretation (`git show ef8c1ed:docs/features/notes-and-pages/delivery/interpretation.md`);
> reads alongside the ② build's (`docs/specs/foundation/fe-notes-and-pages/delivery/interpretation.md`).
> **Scope (charter):** `golive-replan/debt-plan.md:22` + `coverage-report.md` notes-rescope rows `:21-64, :81 (fe-home
> ORPHAN#14), :228-232 (ViewEngine logic · live `useCollection` · collection EC-5), :241 (XCU-14), :255 (viewmodes first
> consumer), :267-274 (X1–X8)` → closed on the Entity Live Close (`golive-replan/process.md` ELC-1…9).

---

## 0. Frame

① is BUILT and composed; ② shipped S1–S9 on stubs, and only 4 data legs are live (list · read page · create · content
write) `[FACT: docs/modules/notes/current-spec.md ② Hooks]`. The rescope closes the remaining legs, corrects the 8
diverged ECs, applies the cross-unit fixes, wires the engines this entity is the **first consumer** of (SavedView ·
Capability · Template — "each engine is wired in the closing slice of its first consuming entity", `process.md:107-108`),
and closes on ELC-1…9. Doc intent of record = `docs/features/notes-and-pages/*.md` (restored + realigned at Step 1).

---

## 1. DEPENDENCIES

### 1a. ① + foundations (built code)
| Dependency | Relation | Composed in apps/web? | Source |
|---|---|---|---|
| Repository layer | owns 3 repos; `update` always stamps `updated_at` | — | `[FACT: services/notes/service.ts:75-89; db/repository.ts:421-424]` |
| AR-6 Spaces + taggable-type registry | entity-link/tag writes; `entity_type` validation | ✅ | `[FACT: service.ts:92-96,265-277; composition-root.ts:85-86]` |
| AR-8 `BacklinkResolver` | entity-link reads | ✅ | `[FACT: service.ts:279-290; composition-root.ts:87]` |
| Journals `buildDashboard` | `/summary` engine | ✅ over an EMPTY registry | `[FACT: dashboard.ts:41-44; composition-root.ts:90-91,97]` |
| ADR-007 `ViewsService` + `ViewEngine` + `ViewProviderRegistry` | view rows · resolve · cross-module reads | ❌ not composed; registry ships empty (only tasks registers a ReadProvider) | `[FACT: foundation/views/service.ts:26-45; engine.ts; foundation/views/CLAUDE.md Status; composition-root.ts:115]` |
| ADR-009 `TemplatesService` | CRUD; instantiate/capture = 0-code seams needing writers | ❌ not composed | `[FACT: foundation/templates/service.ts:24-59; templates slice-map.md:24-51 (:34-37 writers)]` |
| ADR-008 capability registry · offered-set · enforcer | registry runtime homed "→ MOD-notes/UI-3"; `SHIPPED_CAPABILITIES` = `habit_logger` only | ❌ not composed | `[FACT: foundation/capability/{registry,offered-set,enforcer}.ts; registry.ts:35-48; foundation/capability/CLAUDE.md]` |
| `app_state` `{key,value}` KV (device-local, not synced) | candidate mode-memory store (§5) | table exists | `[FACT: ADR-002 L1264-1268; onboarding.md:59]` |
| `initVault()` | every repo write hashes content | ✅ | `[FACT: composition-root.ts:118-128]` |

`composeServices` returns `{notes, journals, sessions, habits, tasks, purposes, relationships}` only `[FACT: composition-root.ts:115]`.

### 1b. ② surface plane (built)
| Dependency | Use today | Source |
|---|---|---|
| `@vida/ui` `CollectionView` / `NeuralGraph` / `EntityView` / `SyncStatus` (`LocalSyncState = 'saved'|'error'`) / `Toast` (supports an action) | frames; SyncStatus composed only by `canvas-editor.tsx` | `[FACT: packages/ui/src/components/sync-status.tsx:19-20; toast.tsx:154; canvas-editor.tsx:7,12]` |
| `entity/adapter.ts` | `offersEditor` + in-memory mode store; **only notes calls `toEntityProps`** | `[FACT: adapter.ts:33-35,91-102; note-entity.tsx:19,111]` |
| `collection/{use-collection,adapter}.ts` | layout in `useState`; filter/sort/new-view no-op; `degraded` dropped (the `ViewEngine` already emits it); only consumer = notes | `[FACT: use-collection.ts:32-43; collection/adapter.ts:60-69; foundation/views/engine.ts:43-58; notes-surface.tsx:24]` |
| `notes/overview-registry.ts` | `note` + `journal` registered; renderer called as a plain function inside `NoteEntityView` | `[FACT: overview-registry.ts:23,28-39; note-entity.tsx:110]` |
| `@vida/editor` `VidaEditor` | **closed**: no extension/node-view injection prop; fixed extension list; combobox ARIA keyed to `slashActive`; no wiki-link inline node anywhere (incl. serializers) | `[FACT: packages/editor/src/editor.tsx:25-43,139-144,149-160; grep "wiki|target_page" → none]` |
| integration blocks | 11 editor-local `INLINE_BLOCK_DEFS`, node-views hard-wired to `IntegrationBlockPlaceholder` | `[FACT: integration-blocks.tsx:202-209]` |
| `canvas-editor/` | `CanvasEditor` + `page-binding` bypassed (D-S2-1); `canvas-editor-styles.ts` IS live (imported by `NoteEditorBody`) | `[FACT: note-editor-body.tsx:14,31]` |
| React Query | `staleTime` 30 s, no window-focus refetch | `[FACT: lib/query-client.ts:18-21]` |
| Home journal | shares `NoteEditorBody` + `toNoteEntity`; `['journal',date]`; re-runs `ensureJournal(today)` on load | `[FACT: home/journal-page-region.tsx:22,70; home/use-journal-entry.ts:15-16,66-68]` |
| fe-calendar | shares `parseContent` | `[FACT: app/calendar/use-calendar.ts:19,138; live-mappers.ts:29]` |
| prod Playwright smoke (ELC-7 substrate) | `e2e` script + `playwright.prod.config.ts` | `[FACT: apps/web/package.json:13]` |

### 1c. Borrowed / cross-unit
| Leg | Owner | Source |
|---|---|---|
| backlinks data · open-a-backlink · neural graph data | HARD-3 | `[FACT: coverage-report.md:25,30,40,44]` |
| `/summary` providers | HARD-1 | `[FACT: coverage-report.md:27,45]` |
| FTS5 search | DB-8 | `[FACT: coverage-report.md:28,43]` |
| EC-18b–e/20/21 `*_note` Overviews | fe-tasks · fe-projects | `[FACT: coverage-report.md:65-70]` |
| SP-29 Space add-menu | fe-spaces-page | `[FACT: coverage-report.md:56]` |
| `offersEditor` gate | owner fe-codec-entity-facet, fix executed here | `[FACT: debt-census.md:84-88]` |
| the 8 module inline-block bodies (`/tasks` `/habits` `/chart` `/events` `/classes` `/pomodoro` `/milestone` `/timeline`) | each module's unit (catalog "MOD-*" column) | `[FACT: docs/editor/extension-catalog.md:35-45,53-54]` |
| `has_pomodoro` setter | rides the `/pomodoro` body (fe-sessions) — not a notes-rescope leg | `[FACT: sessions-and-scheduling/contract.md:55; pomodoro/identity.md:21-22; extension-catalog.md:42]` |

**DEPENDED-ON-BY:** journals-rescope ← notes-rescope `[FACT: debt-plan.md:23; coverage-report.md:354 (E2)]` ·
fe-tasks / fe-projects ← notes-rescope `[FACT: debt-plan.md:44; coverage-report.md:362 (E10)]`.

---

## 2. NEEDS — per leg (✅ exists · ❌ must be built here · ⛳ composition, ELC-3)

| Leg | Needs | State | Source |
|---|---|---|---|
| metadata (EC-7) | `updatePage({is_favorite,is_archived,icon,cover_image})` | ✅ | `[FACT: validators/note.ts:50-62]` |
| rename | `updatePage({title})` + a title affordance | ✅ service | `[FACT: validators/note.ts:52]` |
| delete / undo / Trash | `softDeletePage` ✅ · `restorePage` ❌ (revive precedent `linkRepo.update(id,{deleted_at:null})`) · deleted-pages read ❌ (`findWhere` skips the soft-delete filter) · hard delete + NP-9 cascade ❌ | partial | `[FACT: service.ts:141-143,233; repository.ts:379-382; data-flow.md:154]` |
| `/notes` default scope | exclude archived: `listPages` cannot (`{archived:false}` is a no-op) → a ViewEngine filter predicate or a ① filter ❌ | ❌ | `[FACT: service.ts:155-162]` |
| view-config | ⛳ compose `ViewsService` + `ViewEngine(registry)` + register a notes **pages ReadProvider** ❌; a global default notes view (seeded via templates → `createView`, XCU-06) ❌ | ❌ | `[FACT: process.md:107-108; fe-codec-collection slice-map.md:26,78-87; decisions.md:895]` |
| collection `degraded` + XCU-14 | pass the engine's `degraded` through the collection adapter; declare layout fields | ❌ (engine ✅) | `[FACT: engine.ts:43-58; collection/adapter.ts:60-69; xcut-views.md:27]` |
| mode memory (EC-5) | durable `readMode`/`persistMode` over SQLite | ❌ | `[FACT: entity-facet seam-contract.md:86-88; data-flow.md:431,466]` |
| attachments (EC-8) | service ✅ + a browser file→bytes path ❌ | partial | `[FACT: service.ts:196-217; PLAN-s6 D-S6-5]` |
| `[[` picker + trigger (EC-10) | ① ops ✅ · editor: a consumer-supplied **suggestion seam** + ARIA writer ❌ · a **`wikiLink` inline node** (+ serializers) ❌ · entity candidates via registered ReadProviders ❌ | ❌ | `[FACT: editor.tsx:25-43,139-160; cross-module-integration.md:125; ADR-007 §3.4]` |
| link preview (EC-11) | `getPage(target)` ✅; a deleted target → honest state | ✅ | `[FACT: service.ts:128]` |
| inline blocks (#31 root) | ⛳ capability registry + offered-set resolver (page → Spaces `enabled_blocks` ∪ editor base, CAP-13); an editor **node-view renderer injection seam** ❌; reconcile editor-local defs vs the ADR-008 registry | ❌ | `[FACT: ADR-008 L120-124,133-137; offered-set.ts; integration-blocks.tsx:202-209]` |
| block bodies here | `/summary` (mount `SummaryBlock`) · `/entity-link` · `/backlink` | ❌ | `[FACT: extension-catalog.md:35-45]` |
| journal summary | `useJournalSummary` → `buildDashboard(date)`; empty registry ⇒ honest empty | ❌ flip | `[FACT: composition-root.ts:90-97]` |
| templates (EC-13) | ⛳ compose `TemplatesService`; instantiate (+ a `pages` writer) + capture ❌ | ❌ | `[FACT: templates slice-map.md:24-51]` |
| editor for 6 page types (EC-15) | page-type gate | ❌ | `[FACT: adapter.ts:33-35; _registry.ts:7-8]` |
| SyncStatus (ELC-6) | map `NoteEditorBody`'s saving/saved/error onto `SyncStatus` (`saved|error`) — one live region | ❌ | `[FACT: sync-status.tsx:19-20; note-editor-body.tsx:23-27,38-44]` |
| journal Overview (EC-18a) | `registerOverview('journal', …)` rendered as a COMPONENT | ❌ | `[FACT: overview-registry.ts:28-39; note-entity.tsx:110]` |

Cross-cutting:
- **N-1 cache coherence.** Every mutation names all affected keys: content write → `['pages',id]` + `['notes','pages']` +
  `['journal',date]` (today only the first) `[FACT: use-note-content.ts:58]`; metadata/rename/delete/restore → the same set.
- **N-2 editor is closed.** `[[`, real block bodies and the palette all require editing `@vida/editor` to open seams; the
  picker/panels stay in apps/web (package direction editor → ui) `[FACT: editor.tsx:25-43; TASKS.md:29]`.
- **N-3 ELC-9 close set.** Own ECs + inherited CODEC ECs exercised by these surfaces are mapped in §6.
- **N-4 tests that flip with the stubs:** `notes/template-picker.test.tsx:85,88` · `notes/overview-registry.test.ts:6` ·
  `collection/use-collection.test.ts:23` · `entity/adapter.test.ts:23-33`.

---

## 3. ORGANIZATION

| | notes-rescope |
|---|---|
| **OWNS** | stub→live flips (metadata · attachments · `[[` picker · preview · templates apply/save · view-config · mode memory · journal summary) · rename · delete/undo/**notes-scoped Trash** + Empty Trash · `[[` trigger + `wikiLink` node · #31 root: capability-registry → inline node-view wiring, CAP-13 compute, bodies of `/summary` `/entity-link` `/backlink` · EC-5/7/10/11/13/15/18/18a · cross-unit: page-type gate, local-day row date, excerpt, `degraded` + XCU-14, SyncStatus, `canvas-editor`/`page-binding` adopt-or-retire, stale headers · ① additions (`restorePage`, deleted read, hard delete + cascade, archived exclusion) · composition: Views/ViewEngine/pages ReadProvider, Templates, Capability · templates S3–S5 + XCU-14 RATIFY appends |
| **CONSUMES** | ① + Spaces/Views/Templates/Capability foundations · `@vida/ui` · `@vida/editor` (seams opened here) · composition root |
| **DELEGATES / BORROWS** | backlinks + neural → HARD-3 · summary providers → HARD-1 · FTS → DB-8 · `*_note` Overviews → fe-tasks/fe-projects · Space add-menu → fe-spaces-page · 8 module block bodies → their units · `has_pomodoro` → fe-sessions |
| **DEPENDED-ON-BY** | journals-rescope · fe-tasks · fe-projects |

---

## 4. IMPLICIT RULES

- **IR-R1 · Honest states are per-panel.** The tabbed Overview's `state:'success'` is deliberate — each panel owns its
  loading/error/empty/populated ladder (D-S5-8), and `editorState:'success'` is honest because `NoteEntityView` only
  receives a loaded page `[FACT: note-overview.tsx:52,95; note-entity.tsx:102-103]`. ELC-6 therefore rests on every panel's
  ladder running over its LIVE hook.
- **IR-R2 · Delete settles the pending body write first.** The debounced write flushes on unmount and writes ignore
  `deleted_at` (BR-7c) `[FACT: use-note-content.ts:98-104; repository.ts:404-413]` → cancel/settle before soft-delete.
- **IR-R3 · A deleted page is unreachable by id** (`getPage` filters it) `[FACT: repository.ts:356-361]`; undo restores
  before re-navigating; Trash has its own read.
- **IR-R4 · Malformed content must not be overwritten.** `parseContent` → `null` → blank editor → next edit overwrites
  `[FACT: live-mappers.ts:29-37; use-note-content.ts:48,85-91]`; the guard (read-only + flag) also reaches fe-calendar
  (shared `parseContent`).
- **IR-R5 · The editor-gate change is narrow** — one live `toEntityProps` caller (notes) `[FACT: note-entity.tsx:19,111]`.
- **IR-R6 · Home shares the body** (and is in the live-close verification set) `[FACT: journal-page-region.tsx:22,70]`.
- **IR-R7 · Archiving must not orphan the open page** — `getPage` does not filter `is_archived` `[FACT: service.ts:128]`.
- **IR-R8 · Local day everywhere**; `relLabel` goes stale without a render tick `[FACT: live-mappers.ts:15-27]`.
- **IR-R9 · Every update moves the row.** `repository.update` stamps `updated_at` `[FACT: repository.ts:421-424]` and a
  non-journal row's calendar date is `ymd(updated_at)` `[FACT: live-mappers.ts:45-46; PLAN-s1:36-37]` → favoriting,
  archiving or renaming moves the note to today on the Calendar and relabels "updated". `listPages` has no ORDER BY
  `[FACT: repository.ts:379-382]` → list order must be defined by the view's sort.
- **IR-R10 · Restore can collide.** The journal partial-UNIQUE excludes deleted rows `[FACT: migrations/033_notes.ts:72]`
  and Home re-ensures today's journal on load `[FACT: use-journal-entry.ts:66-68]` → restoring a deleted journal whose date
  was re-created must surface `JournalExistsError` (NP-2: typed conflict, never overwrite). Same for `*_note`:
  `ensureEntityNote` ignores deleted rows `[FACT: service.ts:165-182]` → restore must check for a live duplicate.
- **IR-R11 · Soft delete does not cascade.** `page_links`, attachments, `entity_links` stay live `[FACT: service.ts:141-143,255-256]`
  → links/preview cards to a deleted target need an honest "page deleted" state; the NP-9 cascade runs only on hard delete.
- **IR-R12 · Doc-nodes ↔ `page_links` stay consistent.** A `wikiLink` node carries `target_page_id` (NP-7) and renders its
  label from the target; removing the token must `removePageLink` `[FACT: service.ts:244-250]`, or backlinks lie.
- **IR-R13 · Data-bearing Overviews render as components.** `OverviewRenderer` is invoked as a plain function inside
  `NoteEntityView` `[FACT: note-entity.tsx:110; overview-registry.ts:23,33-35]` → an EC-18a journal Overview with hooks
  must be mounted as `<Component/>` or its hooks bind to the parent.
- **IR-R14 · Templates fork into a new page.** Apply = instantiate a NEW page (deep copy, no `template_id`) and navigate
  to it; entry = "New from template" `[FACT: ADR-009 §3.2; fe-notes PLAN-s8-templates.md:10,39-41; IMPLEMENTATION-PLAN-s8:38-40]`.
  Capture is Space-shaped in ADR-009 (`captureFromSpace`) and excludes accumulated data `[FACT: ADR-009 L67-69,77;
  templates slice-map.md:29-33]` — the page-doc boundary is open (§5 Step 5).
- **IR-R15 · Single save announcement.** `NoteEditorBody`'s `role=status` and a `SyncStatus` chip must not both announce.
- **IR-R16 · Stale headers mislead** (8 hooks + `use-collection.ts:8-12` "worker `values` seam") — verify and rewrite on flip.

---

## 5. Resolved at the Interpretation Gate (doc-grounded) · and what remains

| # | Item | Resolution | Grounding |
|---|---|---|---|
| 1 | Delete leg scope | **IN:** soft-delete + undo toast + Trash (restore · delete forever · Empty Trash behind a danger confirm) + NP-9 cascade; 30 days. Trash = **notes-scoped** (a `/notes` collection entry over a NotesService deleted read); a global `/trash` would be a net-new IA surface — not invented here | `frontend-quality-bar:83`; p4 specimen `:120-127`; ADR-003 `:589`; intake G1; `data-flow.md:154`; `process.md:84-86` (no stub to a closed unit) |
| 2 | `/notes` default | default view = `note` pages, not archived; **Archived** and **type (Journal)** are view-filter predicates; journals' own views belong to Journals/Home. Changes BR-7b/BR-SUR-1 | JR-1 `journals/business-rules.md:11-13`; `information-architecture.md:71,102`; ADR-007 `:48-58`; `fe-codec-collection slice-map.md:65-66` |
| 3 | Mode memory | storage = `app_state` KV (`entity_mode:<type>:<id>`, device-local, not synced; boot-warmed cache); per-type defaults = OS constants in the adapter (no preference). **Preferences edge dropped** (PR-3: singletons, no per-instance list) | `frontend-quality-bar:127`; `data-flow.md:~455-466`; `entity-facet seam-contract.md:86-88`; `adapter.ts:91`; `preferences/business-rules.md:11`; `onboarding.md:59` |
| 4 | `has_pomodoro` setter | **OUT of scope** → rides `/pomodoro` body (fe-sessions) | §1c |
| 5 | Block bodies | here: registry wiring + `[[` + CAP-13 + `/summary` `/entity-link` `/backlink`; other 8 = honest placeholders with edges to their units | `extension-catalog.md:35-45,53-54`; census A#4-7,14,18 (`a-notes-home.md:307-321`) |
| 6 | `/notes` views row | **YES** — a global (`space_id` NULL) row; layout/filter/sort persist through `ViewsService` | `process.md:107-108`; `coverage-report.md:21,42`; `fe-codec-collection slice-map.md:26,78-87`; ADR-007 `:48-52` |
| 7 | G6 creation half | **IN:** `/entity-link` body + entities as `[[` candidates from registered ReadProviders (types without a provider degrade, XCU-12) | `cross-module-integration.md:125`; intake `:67`; ADR-007 §3.4 |
| 8 | Template Apply | **new page (fork) + navigate**; entry "New from template" | IR-R14 |

**Still open — needs Victor (no doc decides):**
- **Q1 · per-type default mode values.** Docs fix "per-type default, remembered per instance" but no values; the
  approval note only says what tabbed shows first (`envision.md:141`) and the code default is a global `tabbed`.
- **Q2 · EC-10 re-pin.** EC-10 pins title-LIKE *page* candidates (`envision.md:37`); item 7 widens the picker to entities —
  a pinned EC changes only by Victor's re-pin (`process.md` §2.5).

**Carried forward (homed):**
- Step 3.5 Envision trigger test — rename affordance · Trash surface · attachment upload · icon/cover picker · `[[` token +
  hover preview · journal Overview EC-18a; inherited ECs carried regardless (ELC-9).
- Step 4 — CAP-12 page applicability (ADR-008 L120-124) · EC-1 per-type views (census ✅ lenient) · editor-local block defs
  vs ADR-008 registry.
- Step 5 — templates S3–S5 RATIFY append incl. the page-doc capture boundary (business-rules NP-12) + the XCU-06 default
  notes view seed · XCU-14 RATIFY append · cross-unit edges for the 8 module block bodies.
- Slice PLANs — purge timing · excerpt rule · `summary_config` → `JournalSelection` · icon domain / cover ref · attachment
  upload UX · whether metadata edits should move calendar placement (IR-R9) · `resolveWikiLink` escape/limit/archived.

---

## 6. ELC-9 close set — EC → leg → owner

| EC | What | Leg | Owner |
|---|---|---|---|
| EC-1/2 | collection layouts per type | view-config + default scope | notes-rescope |
| EC-3 | graph honest empty | neural | HARD-3 (borrowed; lights up at its close, `process.md:88-92`) |
| EC-4/5/19 | merged⇄tabbed · per-type remembered mode · merged continuous | mode memory | notes-rescope |
| EC-6 | backlinks grouped by source | backlinks | HARD-3 (borrowed) |
| EC-7 | metadata reflects state | metadata | notes-rescope |
| EC-8 | attachments | attachments | notes-rescope |
| EC-9 | `/summary` anti-blank | journal summary | notes-rescope render · HARD-1 data |
| EC-10/11 | `[[` picker + create · preview | `[[` trigger + picker | notes-rescope |
| EC-12 | search box + honest unavailable | search | DB-8 (borrowed) |
| EC-13 | templates | templates | notes-rescope |
| EC-14 | capability palette | #31 root / CAP-13 | notes-rescope |
| EC-15 | 6 page types editor-led | page-type gate | notes-rescope |
| EC-18/18a/18f | per-type Overviews (note, journal) | Overviews | notes-rescope |
| EC-18b–e/20/21 | `*_note` Overviews | — | fe-tasks · fe-projects |
| EC-22/23/24 | Lucide glyphs · chrome · editor blocks render | all surfaces | notes-rescope (re-verify) |
| inherited | fe-codec-collection EC set · entity-facet ECs · canvas-editor ECs (for the bare editor) | exercised surfaces | re-verified live at close — enumerated in the Step 4 ledger |

## 7. Sources
Gated corpus (`docs/features/notes-and-pages/*`, `docs/intake/notes-and-pages.md`, `docs/modules/notes/current-*`) ·
`backend-intent/parts/notes-and-pages.md` · `fe-notes-and-pages/delivery/*` · `golive-replan/{process,debt-plan,debt-census,coverage-report}.md` ·
`frontend-quality-bar/_index.md` · p4 specimen · ADR-002/003/004/006/007/008/009/021 · `docs/core/architecture/{data-flow,information-architecture,cross-module-integration,onboarding}.md` ·
`docs/editor/extension-catalog.md` · built code in `packages/core/src/{services/notes,foundation/{views,templates,capability}}`,
`apps/web/src/{notes,entity,collection,canvas-editor,home,db,lib}`, `packages/editor/src`, `packages/ui/src/components`.
