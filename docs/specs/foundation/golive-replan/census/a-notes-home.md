# G1 census — auditor A: notes + home + 3 canvas CODECs

> Units: `fe-notes-and-pages` · `fe-home` · `fe-codec-canvas-editor` · `fe-codec-canvas-graph` · `fe-codec-canvas-reader`.
> Audited against `golive-replan/process.md` (ELC-1…9, §2.5, §3, §5) on branch `golive-replan` (= `main`, post #149/#150/#151).
> Composition root registers **only** `notes: NotesService` + `journals: JournalsService` `[apps/web/src/db/composition-root.ts:34-37,69-77]`.
> The journals registry is constructed **empty** (no providers registered) `[composition-root.ts:74-75]`.
> READ-ONLY audit; every row cites code. EC checks are code + Visual-Gate-ledger level (live re-verification = each debt unit's close).

---

## 1. fe-notes-and-pages (#27, LIF-191 — task DONE, PR #128; completed in part by #149/#150)

### A. Data legs (ELC-3/4)
| Leg (hook / route / region) | File:line | Status | Evidence |
|---|---|---|---|
| Collection rows `useNotesRows` (`/notes`) | apps/web/src/notes/use-notes-rows.ts:52-64 | LIVE | `useQuery(['notes','pages'])` → `getServices().notes.listPages()`; `?sample` DEV-only. Header comment :5-9 is stale ("M1 DEFAULT = empty… would throw"). |
| Create note `useCreateNote` | apps/web/src/notes/use-create-note.ts:21-39 | LIVE | `notes.createPage` + invalidate `['notes','pages']` + navigate. |
| Note entity read `useNoteEntity` (`/notes/$id`) | apps/web/src/notes/use-note-entity.ts:129-140 | LIVE | `useQuery(['pages',id])` → `notes.getPage(id)`. |
| Editor body write `useNoteContent` | apps/web/src/notes/use-note-content.ts:50-58,83-96 | LIVE | debounced `notes.writePageContent`, mount-echo dedupe incl. blank pages (`needsBaseline` :48). |
| Collection view-config (layout persistence · filter · sort · new view) `useCollection` | apps/web/src/collection/use-collection.ts:32-42 | STUB | layout = local `useState`; `onFilter/onSort/onNewView: () => {}`. No `ViewsService` in `Services`. |
| Title rename / soft-delete (`updatePage` title · `softDeletePage`) | (no caller — `grep updatePage\|softDeletePage apps/web/src` → 0 live calls) | STUB | seam-contract.md:15 lists both for S2; #150 PLAN:29 claimed "title edits persist via the existing metadata path" but no title-edit UI exists; every note stays "New note". |
| Page metadata (favorite · archive · icon · cover) `usePageMetadata` | apps/web/src/notes/use-page-metadata.ts:27-38 | STUB | all four mutations `noop` — although `notes.updatePage` is registered + live. |
| Attachments `useAttachments` | apps/web/src/notes/use-attachments.ts:38-45 | STUB | returns `[]`; `add`/`remove` no-op; `notes.getAttachments` is registered. |
| Backlinks `useBacklinks` | apps/web/src/notes/use-backlinks.ts:68-76 | STUB | always `{state:'empty'}` outside `?sample`; `notes.getBacklinks` is registered. |
| `[[` picker `useWikiLinkPicker` | apps/web/src/notes/use-wikilink-picker.ts:49-63 | STUB | `candidates=[]`, `pick`/`createAndLinkTitle` no-op; mounted only under DEV `?picker` (note-entity.tsx:127-141). |
| `/summary` `useJournalSummary` | apps/web/src/notes/use-journal-summary.ts:48-51 | STUB | never calls `journals.buildDashboard` (registered, but registry has 0 providers). |
| Notes search `useNotesSearch` | apps/web/src/notes/use-notes-search.ts:36-40 | STUB | `stubSearchProvider` → `search-unavailable` (DB-8). |
| Templates `useTemplates` | apps/web/src/notes/use-templates.ts:55-62 | STUB | `[]` + no-op actions; no `TemplatesService` in `Services`; DEV `?templates` mount only. |
| Neural layout data | apps/web/src/notes/note-renderers.tsx:70-75 | STUB | `nodes={[]} edges={[]}` always (AR-8). |
| Merged/tabbed mode memory | apps/web/src/notes/note-entity.tsx:42 | PARTIAL | `createInMemoryEntityModeStore('tabbed')` — remembered per instance in-session only; lost on reload. |

Counts: **S 10 · P 1 · L 4**.

### B. Interactions (ELC-5)
| Interaction | Wired? | File:line |
|---|---|---|
| Open a note from List/Gallery | yes | notes-surface.tsx:29; note-renderers.tsx:37,50 |
| New note → create-and-open | yes | notes-surface.tsx:39; use-create-note.ts:29-32 |
| Write in the note, persists across reload | yes | note-editor-body.tsx:32,47-52 |
| Switch layout (List·Gallery·Calendar·Neural) | yes (local, not persisted) | use-collection.ts:33,38 |
| Filter · Sort · New view buttons (rendered) | **no-op** | use-collection.ts:39-41; buttons rendered when handlers passed collection-view.tsx:179-186 |
| Rename a note (title) | **missing** | no title input; EntityView title static (note-entity.tsx:112) |
| Delete a note | **missing** | no `softDeletePage` caller |
| Favorite / Archive / Icon / Cover controls (rendered) | **no-op** | page-metadata.tsx:78-81 → use-page-metadata.ts:28-37 |
| Add / remove attachment (rendered "Add attachment") | **no-op** | attachments-list.tsx:54-84,119 → use-attachments.ts:42-43 |
| `[[` link: pick / create-on-miss | **missing** in prod (DEV `?picker` overlay only; hooks no-op) | note-entity.tsx:127-141; use-wikilink-picker.ts:59-60 |
| Link preview-card on hover | **missing** in prod (DEV sample only) | note-entity.tsx:139 |
| Templates apply / save-current | **missing** in prod (DEV `?templates`; no-op) | note-entity.tsx:142-147; use-templates.ts:59-60 |
| Search notes | yes (always resolves `search-unavailable`) | notes-search.tsx:102-105 |
| Merged ⇄ tabbed toggle | yes | note-entity.tsx:104-108 |
| `/` slash insert (standard + integration blocks) | yes (integration blocks = placeholders) | packages/editor/src/editor.tsx:150-160; slash-commands.ts:177-193 |
| Open a backlink source | missing (rows non-interactive, D-S3-4) | backlinks-panel.tsx:37-54 |

### C. Declared deferrals (DF-12 sweep)
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "The live swap + provider registration is the DATA-PLANE slice (homed later)" — list/get/create/content | delivery/sessions/PLAN-s1-notes-collection.md:10-22 | data-plane-wiring (PR #148) + #149 + #150 | done (those 4 legs LIVE) | HOMED |
| Same data-plane defer cited by backlinks / attachments / metadata / picker (`D-S3-1`, `D-S6-5`, `D-S4-5`, "Live swap (zero signature change)") | use-backlinks.ts:3-5; use-attachments.ts:2-4; use-page-metadata.ts:4-5; use-wikilink-picker.ts:2-5; PLAN-s6:30 | data plane / "live composition root" | data plane DONE; #150 OUT-listed "other surface go-lives" (#150 PLAN:35); module-go-lives queue did not list them (module-go-lives.md:27-41) | **ORPHAN** (service registered, hooks never flipped, no open issue) |
| "DATA LEG DEFERRED (D2): live `ViewEngine.resolve` + `ViewsService` write-through" (filter/sort/new view/layout persist) | apps/web/src/collection/use-collection.ts:8-12; seam-contract.md:34 ("Saved-view SELECTION primitive → ADR-007 design-pass") | first consumer = fe-notes itself (process.md §5: #13 engine wired in first consumer's closing slice) | fe-notes closed | **ORPHAN** |
| "FTS5 ranked search → DB-8 → `search-unavailable`" | seam-contract.md:29 | DB-8 (LIF-70) | planned, M1.4 | BORROWED (DB-8) |
| "Neural-graph data-prep → AR-8 / Views design-pass" | seam-contract.md:30 | HARD-3 (LIF-114) | planned, M1.4 | BORROWED (HARD-3) |
| "`/summary` aggregation ENGINE → MOD-journals; the block consumes the journals seam" | seam-contract.md:33 | MOD-journals (done) + providers → HARD-1 (LIF-112) | engine done; providers planned M1.4 | BORROWED (HARD-1) — but note the hook never calls the registered engine (A row) |
| "Preview-card enrichment → M1.1+" | seam-contract.md:31; interpretation.md:103 | "M1.1+" (milestone label) | no issue | **ORPHAN** |
| F-S4-1 "ui-3 `[[` suggestion-surface extension … Lands as a SEPARATE ui-3 PR" | .claude/tasks/fe-notes-and-pages.md:197-204 | ui-3 (LIF-88) | CLOSED 2026-08-16 | **ORPHAN** |
| F-S5-1 "ui-3 inline `/summary` block node-view … ui-3/#31" | .claude/tasks/fe-notes-and-pages.md:205-210 | ui-3 / "#31" | both CLOSED | **ORPHAN** |
| F-S9-1 CAP-13 "palette compute → UI-3 #29" | seam-contract.md:22,32; fe-notes task:211-216 | UI-3 #29 | CLOSED (LIF-88) | **ORPHAN** |
| F-S9-1 CAP-12 "`block_instances` placement → MOD-notes #31" | same | MOD-notes #31 | CLOSED (archive/mod-notes-and-pages.md) | **ORPHAN** |
| F-S8-1 "template instantiate-fork + capture … first-consumer-pull seams … separate `@vida/core` change" | fe-notes task:217-224 | first consumer (unnamed) | no issue | **ORPHAN** |
| D-S6-5 "the file→blob upload pipeline is deferred (encryption engine M3 + composition root)" | PLAN-s6-metadata-attachments.md:82-84 | M3 + composition root | root done; M1 plaintext ([E] pass-through) upload unowned | **ORPHAN** (M1 leg) |
| D-S6-6 "full icon library / image browser (over-scope; M1.1+)" | PLAN-s6:85-87 | "M1.1+" | no issue | **ORPHAN** |
| D-S2-3 "merged/tabbed memory … durable storage schema design-pass-open" | PLAN-s2-note-page-frame.md:85-88 | fe-codec-entity-facet O4 "design-pass" | no issue | **ORPHAN** |
| EC-18a journal Overview "RIDE → `fe-journals`" | slice-map.md:46 | fe-journals | renamed → fe-home (LIF-187, CLOSED) which never built the in-page journal Overview (g6-edge-ledger.md:13,142) | **ORPHAN** |
| EC-18b/c + EC-20 "RIDE → `fe-tasks` (+ sessions for the rail)" | slice-map.md:47 | fe-tasks (LIF-201) / fe-sessions | planned (task file does not name the RIDE overview — weak) | HOMED |
| EC-18d/e + EC-21 + EC-20 "RIDE → `fe-projects` (+ sessions)" | slice-map.md:48 | fe-projects (LIF-194) | planned (task file does not name the RIDE — weak) | HOMED |
| "Space-level add-menu = SP-29 → `fe-shell-integration-wiring`" | slice-map.md:32; fe-notes task:215-216 | fe-shell (renamed, LIF-199) | CLOSED | **ORPHAN** (not fe-notes' own leg) |

### D. Envision conformance (ELC-9) — 30 ECs (`fe-notes-and-pages/delivery/envision.md:28-57`)
| EC | Type | Assertion (short) | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | List·Gallery·Calendar·Neural switcher, switches live | ✅ | notes-surface.tsx:21,49; note-renderers.tsx:64-79 (choice not persisted — C row D2) |
| EC-2 | structural | every layout honors loading·empty·error·success | ✅ | use-notes-rows.ts:59-63 → chromeFor; S1 VG PASS (task:36-37) |
| EC-3 | structural | Neural → honest "being prepared" empty, never crash | ✅ | note-renderers.tsx:70-75 |
| EC-4 | structural+feel | note page LEADS with the editor facet, borderless, toolbar above | ✅ | note-entity.tsx:115,120 `defaultFacet:'editor'`; note-editor-body.tsx:47-52 (only for `note`/`journal` — see EC-15) |
| EC-5 | structural+feel | merged⇄tabbed; **per-type default, remembered per instance** | ❌ | toggle ✅ (note-entity.tsx:104-108) but ONE global default `'tabbed'` for every type (note-entity.tsx:42), and memory is in-memory only (adapter.ts:93-101) → lost on reload |
| EC-6 | structural | "What links here" merges page+entity links, grouped by source | ✅ | backlinks.ts:76-125; backlinks-panel.tsx:26-61; S3 VG PASS — live leg STUB so it always shows "Nothing links here yet." |
| EC-7 | structural | favorite·archive·icon·cover **controls** present + reflect state | ❌ | rendered (page-metadata.tsx:77-82) but every control is a no-op (use-page-metadata.ts:28-37) — the state they reflect can never change in the live app |
| EC-8 | structural | the page's attachments list is present | ✅ | attachments-list.tsx:87-126 (Add is a no-op — B) |
| EC-9 | structural | /summary renders per-section; missing source degrades THAT section only | ✅ | summary-block.tsx:46-71 per-section `state`; S5 VG PASS (live always the block-level empty — HARD-1) |
| EC-10 | structural | `[[` shows candidates + explicit "+ Create '<text>'" | ❌ | PickerView exists (wikilink-picker.tsx:38-126) but has no production mount — DEV `?picker` only (note-entity.tsx:32-37,127-141); `[[` trigger never built (F-S4-1 ORPHAN) |
| EC-11 | structural | a link shows a preview card, no dead card | ❌ | PreviewCard (link-preview-card.tsx:13-37) only in DEV `?picker` with a hard-coded sample target (note-entity.tsx:139); no links exist in prod |
| EC-12 | structural | search box renders + honest `search-unavailable` | ✅ | notes-search.tsx:54-56,86-98; notes-surface.tsx:43 |
| EC-13 | structural | template picker + apply + save-current-as-template | ❌ | DEV `?templates` only (note-entity.tsx:142-147); actions no-op (use-templates.ts:59-60) |
| EC-14 | structural | editor offers the capability palette (basic + platform) | ✅ | consumed `@vida/editor` slash menu: slash-commands.ts:177-196; editor.tsx:153-160 |
| EC-15 | structural | note page composes across the **6 page-types** (editor-led); journal shows /summary | ❌ | `offersEditor` = `schema.isEntityType(type) && hasPage` (apps/web/src/entity/adapter.ts:33-34); `ENTITY_TYPES` holds `page·note·journal` but **not** `task_note·task_group_note·milestone_note·deliverable_note` (packages/core/src/db/schema/_registry.ts:5-8; grep → 0) → those 4 types get NO editor facet (latent: no live surface creates them yet). Journal /summary ✅ (note-overview.tsx:80-110). |
| EC-16 | feel | light/dark × 375·768·1440 everywhere | ⏳ | live VG; per-slice PASSes pre-date #149/#150 |
| EC-17 | feel | writing immediate; slash + linking responsive + undoable | ⏳ | live VG; linking absent in prod (EC-10) |
| EC-18 | structural | each page-type has a DISTINCTIVE Overview | ❌ | registry holds only `note` + `journal` stub (overview-registry.ts:38-39); 4 types fall back to the note layout (:33-35) |
| EC-18a | structural | journal Overview: agenda · streaks/stats · /summary · check-in | ❌ | journalOverviewStub = Summary + Properties only (note-overview.tsx:80-110); RIDE home ORPHAN |
| EC-18b | structural | task_note work-canvas (chips · effect rail · subtasks · time) | ❌ | absent (RIDE → fe-tasks, planned) |
| EC-18c | structural | task_group_note roll-up + checklist | ❌ | absent (RIDE → fe-tasks) |
| EC-18d | structural | milestone_note progress · timeline · deliverables · vault | ❌ | absent (RIDE → fe-projects) |
| EC-18e | structural | deliverable_note measurement · binding · staged proof · rail | ❌ | absent (RIDE → fe-projects) |
| EC-18f | structural | note Overview: properties · attachments · backlinks | ✅ | note-overview.tsx:36-76 |
| EC-19 | structural | merged = continuous Notion page of the per-type sections → editor | ✅ | note-overview.tsx:37-48 (NotionHeader + eyebrow sections, no boxes) + EntityView merged layout→editor |
| EC-20 | structural | effect rail on task_note + deliverable_note | ❌ | absent (RIDE fe-tasks/fe-projects + sessions) |
| EC-21 | structural | staged proof track | ❌ | absent (RIDE fe-projects) |
| EC-22 | structural | Lucide icons tinted by token, no emoji | ✅ | note-chrome.tsx:27-31; note-renderers.tsx:13,27-30; grep emoji → 0 |
| EC-23 | structural | borderless editor, focus-ring on keyboard focus only | ✅ | note-editor-body.tsx:47-48 `chrome="bare"`; editor.tsx:92-105; editor-styles `:has(.ProseMirror:focus-visible)` |
| EC-24 | structural | Quote · Task list · Table render (ui-3, consumed) | ✅ | packages/editor/src/internal/editor-styles.ts:58-66; S9 consume-verify PASS |

Counts: **✅ 14 · ❌ 14 · ⏳ 2 · ? 0** (30).

**Verdict:** `fe-notes-and-pages — ELC: PARTIAL · legs S10/P1/L4 · ORPHANs 13 · EC ✅14/❌14/⏳2/?0 · debt: only list/open/create/write are live; metadata·attachments·backlinks·picker·summary·templates·view-config stay stubs/dev-gated with the service already registered, rename/delete missing, 4 page-types lose the editor, per-type Overviews unbuilt.`

---

## 2. fe-home (#18, LIF-187 — task done; journal entry made live by #151)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| Today's journal entry read `useJournalEntry` | apps/web/src/home/use-journal-entry.ts:63-76 | LIVE | `useQuery(['journal',date])` → `notes.ensureJournal(todayLocalYmd())` (local date :28-33) |
| Journal entry write | journal-page-region.tsx:70 → notes/note-editor-body.tsx:32 | LIVE | reuses `useNoteContent` → `writePageContent` |
| Arrangement read `useHomeArrangement` | home-surface.tsx:25-27; stores/preferences-store.ts:7-9 | PARTIAL | reads the in-session Zustand store; "do not survive reload" (persistence seam §A0; comment cites the now-resolved `values` blocker) |
| Dashboard widget set `useHomeWidgets` | home-dashboard.tsx:65-79 | STUB | fixed `DEFAULT_HOME_WIDGETS`, every widget hard-coded `state:'success'` |
| Widget bodies `renderHomeWidget` | home-dashboard.tsx:86-92 | STUB | placeholder `hint` text, no data |
| Personalization `getSelection`/`setSelection` | home/selection.ts:26-33 | STUB | both throw `JournalSeamNotActivated` |
| Greeting user name | home-surface.tsx:29-52 | STUB | "M1 greets without a name" (user_profile seam) |

Counts: **S 4 · P 1 · L 2**.

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Write today's journal, persists | yes | journal-page-region.tsx:70 |
| "/" insert a block in the journal | yes (integration blocks insert as "Available when its module ships" placeholders) | editor.tsx:153-160; integration-blocks.tsx:154-159 |
| Arrangement switch (control lives in Settings) | yes, in-session only | home-surface.tsx:74-76 |
| Widget "open →" gateway link | missing (`link` never set) | home-dashboard.tsx:65-74 |
| Personalize the widget set | missing | selection.ts:26-33 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "A arrangement READ — default `journalFirst` → Preferences / fe-settings" (persistence) | seam-contract.md:54 | fe-settings (done) / Preferences | persistence never wired; was module-go-lives #2 "settings" (module-go-lives.md:30-31), now superseded → golive-replan | BORROWED (settings/preferences entity ELC) |
| "B widget set + data → journal-contribution registry / first consumer" | seam-contract.md:55 | HARD-1 (LIF-112) | planned M1.4 | BORROWED (HARD-1) |
| "C widget bodies → each capability's standalone renderer" | seam-contract.md:56 | per-module ② units | planned (per module) | BORROWED (each module's ELC / HARD-1) |
| "D journal page → `@vida/editor` VidaEditor mount / first consumer" | seam-contract.md:57 | #151 home-journal-go-live | done | HOMED |
| "Inline integration-block node-views (/dailySummary, …) remain the deferred #31 seam" | journal-page-region.tsx:10-12; home/CLAUDE.md:21; home-journal-go-live PLAN-S1.md:61 | "#31" (MOD-notes / xs-capability) | CLOSED | **ORPHAN** |
| "get/setSelection storage → Preferences/MOD-journals (M1.1)" | home/selection.ts:3,25-33 | mod-preferences / mod-journals | both CLOSED | **ORPHAN** |
| "`registerJournalContribution` … inert until MOD-journals #33 (M1.1)" | home/journal-contribution.ts:52-57 | MOD-journals | CLOSED; @vida/core `createJournalRegistry` exists but nothing registers providers | BORROWED (HARD-1) — apps/web seam file is stale |
| "The user NAME is a user_profile seam (deferred)" | home-surface.tsx:29 | none | — | **ORPHAN** |
| "'Wrapped' temporal reviews → design-pass / Wave 3-4" | slice-map.md:80 | design-pass | no issue (post-M1 intent) | **ORPHAN** (non-blocking for M1) |

### D. Envision conformance — 9 ECs (`fe-home/delivery/envision.md:62-72`)
| EC | Type | Assertion (short) | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | two distinct entities: journal page (inline) + Dashboard (standalone) | ✅ | home-surface.tsx:80-94 |
| EC-2 | structural | arrangement per persisted Settings pref, default Journal-first | ✅ | home-surface.tsx:25-27,80-94; default journalFirst — persistence is the borrowed Settings leg (A row) |
| EC-3 | structural | journal page = prose + **inline** integration blocks + a "/" insert affordance | ❌ | `/` works (slash menu), but (a) the journal is created BLANK — no inline blocks (notes service.ts:190-193 `createPage({type:'journal',…})`, no seed); (b) any inserted integration block renders only the "Available when its module ships" placeholder (integration-blocks.tsx:154-159) — the envisioned "page showcasing OS info via inline blocks" (envision.md:17-18,34) is absent; (c) the "/" hint is unreachable live: it sits only in the `empty` arm (journal-page-region.tsx:56-61) that `ensureJournal` never yields (:44-45), and `NoteEditorBody` passes no `placeholder` (note-editor-body.tsx:47-52). #151 SKIPped Envision and did not carry this EC (PLAN-S1.md:28-30). |
| EC-4 | structural | **personalized** grid of standalone stat/summary widgets across OS domains | ❌ | grid across 8 domains ✅ (home-dashboard.tsx:65-74) but not personalized (fixed set; selection throws, selection.ts:26-33) and no stats/summaries (placeholder hints :86-92) — cause = BORROWED legs (HARD-1 / per-module) + ORPHAN selection storage |
| EC-5 | structural | per-widget degrade, never a blank Home | ✅ | per-widget `state` threaded to DashboardView (home-dashboard.tsx:104-110); S1 VG PASS (unobservable live: all widgets hard-coded success) |
| EC-6 | structural | greet header: eyebrow date + serif greeting + sub-line | ✅ | home-surface.tsx:36-52 |
| EC-7 | structural | 2-col → single column at 375, no overflow | ? | layout code unchanged (home-surface.tsx:57-59) but the region now hosts the live editor + toolbar (#151); 375 not re-verified since (home-journal-go-live.md:3-4 live gate covers persistence only) |
| EC-8 | feel+VG | preset identity, AA both modes | ⏳ | live VG |
| EC-9 | feel | arrangement render instant / RM-safe | ⏳ | live VG |

Counts: **✅ 4 · ❌ 2 · ⏳ 2 · ? 1** (9).

**Verdict:** `fe-home — ELC: PARTIAL · legs S4/P1/L2 · ORPHANs 4 · EC ✅4/❌2/⏳2/?1 · debt: journal entry live, but the journal page has no inline integration blocks and no visible "/" hint (EC-3), and the dashboard is a fixed placeholder grid (borrowed HARD-1 data; orphaned selection storage).`

---

## 3. fe-codec-canvas-editor (#7, LIF-234 — CODEC)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `CanvasEditor` composition | apps/web/src/canvas-editor/canvas-editor.tsx:52-120 | N/A-by-role | presentational; **0 runtime consumers** (grep `CanvasEditor` outside the dir → 0; fe-notes chose `VidaEditor chrome='bare'` directly, D-S2-1, note-editor-body.tsx:2-6) |
| `page-binding.ts` `toCanvasEditorProps` / `EditorDocReader` | apps/web/src/canvas-editor/page-binding.ts:18-61 | N/A-by-role | pure convention; **unused** (#150 wired `VidaEditor.onChange` → `useNoteContent` instead, #150 PLAN:29) |
| `ensureCanvasEditorStyles` | canvas-editor-styles.ts:11-25 | N/A-by-role | consumed by note-editor-body.tsx:31,35 (scope class reused) |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Edit the hosted document | yes (in component; exercised via fe-notes' direct VidaEditor mount) | canvas-editor.tsx:108-114 |
| SyncStatus save chip | n/a — no consumer passes `syncState` | canvas-editor.tsx:76 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "the live `usePage`/`useEditorDoc` hook … = first consumer #27" | slice-map.md:38 | #27 → #150 | done (by a different path) | HOMED |
| "O1 — real `CapabilityRegistry` block wiring → MOD-notes #31" | slice-map.md:42 | MOD-notes #31 | CLOSED | **ORPHAN** (same root as fe-notes F-S5-1/F-S9-1, fe-home "#31") |
| "O2 — live page persistence → #27 / #13 seams" | slice-map.md:43 | #27/#150 | done | HOMED |
| "O3 — EntityView Editor-facet chrome → #6" | slice-map.md:44 | fe-codec-entity-facet | done | HOMED |
| "O4 — export (md/pdf/docx) affordances → serializers shipped, surfacing is later" | slice-map.md:45 | "later" (fe-shell task claims "wires … export dialog · MD/PDF/DOCX serializers", fe-shell.md:13) | fe-shell CLOSED; `grep ExportDialog\|toMarkdown\|toPdf\|toDocx apps/web/src` → 0 | **ORPHAN** |

### D. Envision conformance — 11 ECs (`fe-codec-canvas-editor/delivery/envision.md:29-40,59`)
| EC | Type | Assertion (short) | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | masthead eyebrow + serif title + meta + SyncStatus + hairline | ✅ | canvas-editor.tsx:72-90 via CanvasView — unexercised (0 consumers) |
| EC-2 | structural | shipped VidaEditor is the hosted body | ✅ | canvas-editor.tsx:108-114; exercised by fe-notes/fe-home |
| EC-3 | structural | integration blocks render as calm placeholders, never crash | ✅ | packages/editor/src/extensions/integration-blocks.tsx:154-159 |
| EC-4 | structural | empty → EmptyState teaching invitation | ✅ | canvas-editor.tsx:78-80 — unexercised |
| EC-5 | structural | calm privacy-preserving error | ✅ | canvas-editor.tsx:81-87 — unexercised |
| EC-6 | structural | loading skeleton; editor not mounted until ready | ✅ | canvas-editor.tsx:91-92 — unexercised |
| EC-7 | structural | editor body binds `--colorTextPrimary` (dark readable) | ✅ | packages/editor/src/internal/editor-styles.ts:44 |
| EC-8 | feel | preset swap re-voices canvas incl. editor | ⏳ | live VG |
| EC-9 | structural | content width cap (CanvasView 1136) | ✅ | packages/ui/src/components/canvas-view.tsx:66 — unexercised |
| EC-10 | structural | 375/768 masthead + toolbar wrap, no overflow | ✅ | canvas-view.tsx:73; toolbar.tsx:63 — unexercised |
| EC-11 | feel(+structural) | notebook-page feel: sheet on desk, opened frame | ⏳ | component has it (canvas-editor.tsx:71,96-107); the live note page deliberately uses the borderless Notion page instead (D-S2-1) — feel needs the live gate |

Counts: **✅ 9 · ❌ 0 · ⏳ 2 · ? 0** (11).

**Verdict:** `fe-codec-canvas-editor — ELC: N/A-by-role · legs N/A · ORPHANs 2 · EC ✅9/❌0/⏳2/?0 · debt: CanvasEditor + page-binding have zero consumers (the live path bypasses them); integration-block bodies + export surfacing homed to closed units.`

---

## 4. fe-codec-canvas-graph (#8 — CODEC; Envision SKIPPED)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `NeuralGraph` renderer | packages/ui/src/components/neural-graph.tsx:97-200 | N/A-by-role | presentational; nodes/edges are props |
| Consumers: `/graph` route | apps/web/src/app/graph/index.tsx:8-10 | STUB (consumer) | `nodes={[]} state="empty"` (AR-8) |
| Consumers: notes Neural layout · notifications constellation | note-renderers.tsx:70-75; notifications/lens-constellation.tsx | STUB (consumer) | empty in notes; counted under fe-notes |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Node click → navigate | n/a — prop exists, no consumer passes `onNodeClick` with data | app/graph/index.tsx:9 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "AR-8 graph-prep / module-interconnection data — a backend seam, unbuilt in M1" | delivery/slice-map.md:35 | HARD-3 (LIF-114) | planned M1.4 | BORROWED (HARD-3) |
| "Surgical live-recolor … is homed to first-consumer (AR-8)" (colors stale until re-topology, BR-10) | _index.md:62-66; neural-graph.tsx:198-200 | first consumer (AR-8) | HARD-3 planned | BORROWED (HARD-3) |
| "Feature Atlas `/features`, Skill Graph, Contributions graph, Relationships graph — per-feature P6 surfaces" | slice-map.md:36-37 | fe-feature-atlas · fe-skills · fe-relationships · fe-purposes-and-goals | planned (task files exist) | HOMED |
| "10K-node webworker performance — a documented future ceiling" | slice-map.md:40-41 | none | — | **ORPHAN** (perf ceiling; not M1-blocking) |

### D. Envision conformance
No ECs pinned — Envision Gate SKIPPED, Victor-confirmed 2026-10-08 (`delivery/interpretation.md:92`; `slice-map.md:48-50`). Ink voice/reduced-motion carried as per-slice VG MUSTs and present in code (neural-graph.tsx:105-111,190-192).

**Verdict:** `fe-codec-canvas-graph — ELC: N/A-by-role · legs N/A (all consumers empty) · ORPHANs 1 · EC n/a (0 pinned) · debt: every consumer renders the empty terminal until HARD-3 graph-prep; live preset recolor stale-until-retopology.`

---

## 5. fe-codec-canvas-reader (#9 — CODEC)

### A. Data legs
| Leg | File:line | Status | Evidence |
|---|---|---|---|
| `CanvasReader` shell (+ `SelectionActions`, `ReaderHighlightMark`) | packages/ui/src/components/canvas-reader.tsx:597-850 | N/A-by-role | presentational, state-as-prop; **0 apps/web consumers** |
| `reader/adapter.ts` (display-resolve + intent binding) | apps/web/src/reader/adapter.ts | N/A-by-role | pure type+convention; live `useReader` deferred to fe-books #36; no BooksService in `Services` |

### B. Interactions
| Interaction | Wired? | File:line |
|---|---|---|
| Jump-to-chapter · add-note · link · highlight/quote/bookmark · listen | n/a — intents only, no consumer yet | canvas-reader.tsx:97-113,781-800 |

### C. Declared deferrals
| Deferral (quote) | Doc:line | Home named | Home status | Verdict |
|---|---|---|---|---|
| "Live `useReader` data hook deferred to the first consumer (fe-books #36)" | delivery/slice-map.md:18,58; seam-contract.md:101-102 | fe-books (LIF-178) | planned M1.2.3 | HOMED |
| "cross-format position mapping (BK-4 design pass)" / `transcribeForMapping` | slice-map.md:58-59; interpretation.md:90; adapter.ts:37 "at M1 always `not-synced`" | "design pass" | no issue (grep BK-4 .claude/tasks → 0) | **ORPHAN** (M1 renders `not-synced` honestly) |
| "structured anchor columns (doc-contrary)" | slice-map.md:59 | n/a — rejected, not deferred | — | n/a |

### D. Envision conformance — 15 ECs (`fe-codec-canvas-reader/delivery/envision.md:78-94`)
| EC | Type | Assertion (short) | Status | Evidence |
|---|---|---|---|---|
| EC-1 | structural | reading column with a living margin | ✅ | canvas-reader.tsx:153-235 (3-zone row); S1–S3 VG PASS (slice-map.md:47-49) |
| EC-2 | structural | title-hero header + context + HonestProgress + SyncStatus slot + ⋯; no eyebrow | ✅ | canvas-reader.tsx:65-79,137-151; S1 VG PASS |
| EC-3 | structural | measured serif column + inline highlight mark | ✅ | canvas-reader.tsx:166 (maxWidth 660), :231; S4 VG PASS |
| EC-4 | structural | selection offers Highlight·Quote·Bookmark (+Listen-from-here) | ✅ | canvas-reader.tsx:781-800 `SelectionActions` |
| EC-5 | structural | IR-1: highlight shows NO link/note | ✅ | canvas-reader.tsx:409-411 |
| EC-6 | structural | 3 natures visually distinct, located, chronological | ✅ | canvas-reader.tsx:396,445-500; S3 VG PASS |
| EC-7 | structural | listen idle/playing/unavailable (calm) | ✅ | canvas-reader.tsx:550-590 |
| EC-8 | structural | loading·empty·access-unavailable·calm error·not-synced·**photo-saved-text-pending** | ❌ | loading/empty/unavailable/error/not-synced present (:21-23,77,304-318) but **photo-saved-text-pending (IR-4) is absent** from the shell, the stories and the adapter (grep -i "photo\|pending" canvas-reader.tsx → 0; adapter.ts maps no photo state); dropped at decomposition (slice-map.md:13 S1 state list omits it) |
| EC-9 | structural | rail drops below at 375, no overflow | ✅ | canvas-reader.tsx:141-172,210 flexWrap; S1/S3 VG PASS |
| EC-10 | structural | designed dark + preset accent flip + AA | ✅ | VG ledger S1–S5 (slice-map.md:47-51) |
| EC-11 | structural | semantic type scale; accent on signal + markers | ✅ | canvas-reader.tsx:231,343-350; VG ledger |
| EC-12 | feel | annotate/listen immediate, in-place, RM-safe | ⏳ | live VG (no consumer yet) |
| EC-13 | structural | Contents panel: summary + scalable TOC, current chapter, jump | ✅ | canvas-reader.tsx:339-392 |
| EC-14 | structural | every annotation shows resolved book→chapter→page→line; scales | ✅ | adapter.ts display-resolve (S6 Verification PASS 28/28) + rail grouping canvas-reader.tsx:482-500 |
| EC-15 | structural | real SVG icons, never emoji | ✅ | canvas-reader.tsx:743-760 |

Counts: **✅ 13 · ❌ 1 · ⏳ 1 · ? 0** (15).

**Verdict:** `fe-codec-canvas-reader — ELC: N/A-by-role · legs N/A (0 consumers; closes via fe-books) · ORPHANs 1 · EC ✅13/❌1/⏳1/?0 · debt: the photo-saved-text-pending state (EC-8/IR-4) was never built.`

---

## Unit verdict lines
- `fe-notes-and-pages — ELC: PARTIAL · legs S10/P1/L4 · ORPHANs 13 · EC ✅14/❌14/⏳2/?0 · debt: list/open/create/write live; metadata·attachments·backlinks·picker·summary·templates·view-config stubbed or DEV-only though NotesService is registered; no rename/delete; 4 page-types lose the editor; per-type Overviews unbuilt`
- `fe-home — ELC: PARTIAL · legs S4/P1/L2 · ORPHANs 4 · EC ✅4/❌2/⏳2/?1 · debt: journal entry live; no inline blocks / hidden "/" hint (EC-3); dashboard = fixed placeholder grid`
- `fe-codec-canvas-editor — ELC: N/A-by-role · ORPHANs 2 · EC ✅9/❌0/⏳2/?0 · debt: CanvasEditor + page-binding unused; block bodies + export orphaned`
- `fe-codec-canvas-graph — ELC: N/A-by-role · ORPHANs 1 · EC n/a (SKIP) · debt: all consumers empty until HARD-3`
- `fe-codec-canvas-reader — ELC: N/A-by-role · ORPHANs 1 · EC ✅13/❌1/⏳1/?0 · debt: photo-pending state missing`

**Totals:** ORPHANs **21** (13 + 4 + 2 + 1 + 1). They reduce to ~12 distinct roots, because one "#31 / ui-3" root covers 5 rows. ❌ ECs: **17** (14 + 2 + 0 + 0 + 1).

---

## ORPHAN list (all)
1. fe-notes: remaining NotesService hooks never flipped after the data plane landed (backlinks · attachments · metadata · picker). The service is registered and no issue owns the flip (use-backlinks.ts:68-76 etc.).
2. fe-notes: SavedView view-config (filter/sort/new view/layout persist). Process.md §5 makes fe-notes its first consumer, and fe-notes is closed (use-collection.ts:8-12,39-41).
3. fe-notes: preview-card enrichment → "M1.1+" (seam-contract.md:31).
4. fe-notes F-S4-1: the `[[` editor trigger → ui-3 (closed).
5. fe-notes F-S5-1: inline `/summary` node-view → ui-3/#31 (closed). **Same root:** fe-home "#31 inline node-views" and canvas-editor O1.
6. fe-notes F-S9-1: CAP-13 palette compute → UI-3 #29 (closed).
7. fe-notes F-S9-1: CAP-12 `block_instances` placement → MOD-notes #31 (closed).
8. fe-notes F-S8-1: template instantiate-fork + capture seams, plus a real menu entry point.
9. fe-notes D-S6-5: attachment file→blob upload (the M1 plaintext leg).
10. fe-notes D-S6-6: icon/cover pickers → "M1.1+".
11. fe-notes D-S2-3: durable merged/tabbed mode memory → "design-pass-open".
12. fe-notes EC-18a: the journal Overview RIDE → fe-journals. That unit was renamed to fe-home (closed).
13. fe-notes: the Space-level add-menu SP-29 → fe-shell (closed).
14. fe-home: inline integration-block node-views → "#31" (closed). Same root as #5.
15. fe-home: `get/setSelection` personalization storage → Preferences/MOD-journals (both closed).
16. fe-home: greeting user name → user_profile seam (no home).
17. fe-home: "Wrapped" temporal reviews → design-pass. This is post-M1 intent and does not block M1.
18. canvas-editor O1: CapabilityRegistry block wiring → MOD-notes #31 (closed). Same root as #5.
19. canvas-editor O4: export (md/pdf/docx) surfacing. fe-shell claims it and is closed; apps/web has 0 consumers.
20. canvas-graph: 10K-node webworker perf ceiling (no issue; does not block M1).
21. canvas-reader: BK-4 cross-format position mapping design pass (no issue; M1 shows `not-synced` honestly).

## EC divergence list (all ❌)
- **fe-notes EC-5:** "user switches merged ⇄ tabbed; the choice is a per-type default, remembered per instance." Today there is one global `'tabbed'` default, and the memory is in-memory only.
- **fe-notes EC-7:** "favorite · archive · icon · cover controls present + reflect state." The controls render, but every one is a no-op.
- **fe-notes EC-10:** "typing shows title-LIKE candidates + an explicit '+ Create <text>'." Built, but mounted only under DEV `?picker`, and there is no `[[` trigger.
- **fe-notes EC-11:** "a link shows a preview card." DEV-only, using a hard-coded sample.
- **fe-notes EC-13:** "template picker + apply + save-current-as-template." DEV-only, and the actions are no-ops.
- **fe-notes EC-15:** "the note page composes across the 6 page-types (editor-led)." `offersEditor` rejects task_note, task_group_note, milestone_note and deliverable_note, because they are not in `ENTITY_TYPES`.
- **fe-notes EC-18:** "each page-type has a DISTINCTIVE Overview." Only `note` and a `journal` stub are registered.
- **fe-notes EC-18a:** "journal Overview: Today's agenda · Streaks/stats · /summary · Check-in." The stub shows Summary + Properties only.
- **fe-notes EC-18b / 18c / 18d / 18e:** the task / task-group / milestone / deliverable Overviews are absent. They are homed (RIDE) to fe-tasks and fe-projects.
- **fe-notes EC-20:** the effect rail on task_note + deliverable_note is absent.
- **fe-notes EC-21:** the staged proof track is absent.
- **fe-home EC-3:** "The journal page = prose + inline integration blocks + a '/' insert affordance."
  - The `/` key works.
  - The journal is created blank, with no inline blocks.
  - Inserted blocks render only as placeholders.
  - The `/` hint is unreachable in the live app (it sits in the `empty` arm, and no editor placeholder is set).
  - #151 skipped Envision without carrying this EC.
- **fe-home EC-4:** "a personalized grid of standalone stat/summary widgets across OS domains." The set is fixed and the bodies are placeholder hints. Caused by borrowed HARD-1 data plus orphaned selection storage.
- **canvas-reader EC-8:** "… photo-saved-text-pending (IR-4)." This state was never built.

## Cross-unit notes
- **CODEC defect seen at fe-notes → owner `fe-codec-entity-facet` (or the `@vida/core` registry):**
  - `offersEditor` gates on `ENTITY_TYPES` (apps/web/src/entity/adapter.ts:33-34).
  - `ENTITY_TYPES` has no `task_note` / `task_group_note` / `milestone_note` / `deliverable_note` (packages/core/src/db/schema/_registry.ts:5-8).
  - Result: those pages will open with no editor. This blocks fe-tasks/fe-projects RIDE overviews too.
- **fe-notes date bug:** `live-mappers.ts:25-27` builds the calendar `date` for non-journal pages via `toISOString()` (UTC). In BRT this files notes on the wrong day near midnight (the [[date-code-needs-tz-forced-tests]] class). Journals are safe (`journal_date`).
- **fe-notes empty excerpt:** `live-mappers.ts:43` sets `excerpt: ''`, so every live list card renders an empty excerpt line (note-renderers.tsx:41).
- **journals is registered but idle:** `useJournalSummary` never calls `buildDashboard`, and the registry is empty. When HARD-1 providers land, the fe-notes hook still has to be flipped. That is not automatic.
- **Stale comments that misstate liveness:** use-notes-rows.ts:5-9, use-note-entity.ts:3-5 and note-entity.tsx:9 still say "M1 stub / would throw". preferences-store.ts:7-9 still cites the resolved `values` blocker. Currency debt (ELC-8).
- **Dead / duplicated apps/web seams:**
  - `canvas-editor/canvas-editor.tsx` and `page-binding.ts` have no runtime consumer.
  - `home/journal-contribution.ts` duplicates the real `@vida/core` `createJournalRegistry` with a throwing stub.
  - Decide at the debt units: retire them or adopt them.
- **One "#31 / ui-3" orphan root** is cited by fe-notes (F-S5-1, F-S9-1), fe-home (inline node-views) and canvas-editor (O1). Re-home it once (integration-block real bodies + palette compute + `[[` trigger) rather than per unit.
