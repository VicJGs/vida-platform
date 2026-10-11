# Task: fe-notes-and-pages
# Status: in-progress
# Worktree: .claude/worktrees/fe-notes-and-pages (branch fe-notes-and-pages off main @ 8392e06, Node 24)
# Linear: LIF-191
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #27 — #27 Notes — Collection+Graph · Note Entity (Editor-led) · /summary.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for notes & pages — the UI/UX tier over the finished ① service (`mod-notes-and-pages`), 13 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-collection`
- blocked by `fe-codec-canvas-graph`
- blocked by `fe-codec-entity-facet`

## Entity Front Matter (Entity Delivery Flow ②) — delivery/ at docs/specs/foundation/fe-notes-and-pages/delivery/
- **Step 0 BASELINE ✅** — ① `NotesService` complete (S1–S4); 3 codec deps shipped (CollectionView·NeuralGraph·EntityView);
  @vida/editor + canvas-editor shipped; clean-slate FE (no live notes UI). Terrain mapped.
- **Step 1 INTERPRETATION ✅** — `interpretation.md` (DEPENDENCIES·NEEDS·ORGANIZATION·IMPLICIT, all [FACT]); F2 boundary doc-resolved.
- **Step 1.5 ENVISION ✅ LOCKED (Victor, 2026-10-10)** — `envision.md`; §3.75 FIRED; greybox (deleted) → **EC-1…EC-24 approved**.
  Notion standard · Lucide icons · borderless editor · per-entity-type Overviews · merged = continuous Notion page.
- **Step 2 DECOMPOSITION ✅ (gate pending Victor)** — `slice-map.md` (9 FE slices) + `seam-contract.md`. Boundary confirmed:
  fe-notes = notes substrate + note-page frame/slot; rich entity overviews RIDE fe-journals/fe-tasks/fe-projects via the
  S2 Layout-facet slot. 13 legs → 0 unhomed; every structural EC homed (slice or RIDE).

## Build Steps (per-slice §XXVI double-gate + blocking Visual Gate; PR at S9) — all `frontend`
- [x] S1 — Notes Collection + `/notes` route (NOT-48/49; EC-1/2/3/22). **Built**: `collection/use-collection.ts` (first
  CollectionView consumer — view-config + `chromeFor`, composes shipped `toCollectionChrome`; live data-leg drop-in
  deferred) · `notes/use-notes-rows.ts` (data seam — M1 honest-empty default + `?sample` DEV gate; live swap = React
  Query over `listPages`) · `notes/note-renderers.tsx` (List/Gallery/Calendar/Neural; graph→empty AR-8) ·
  `notes/notes-surface.tsx` · `/notes` lazy route. **tsc 0 · eslint 0 · 19/19 tests** · **Visual Gate PASS** (Brave,
  4 layouts × L/D × 375/768/1440: axe 0 · 0 overflow · graph empty terminal · icons · honest empty · console clean).
  Self-/critique SHIP. D2 resolved: data-leg STUB (live blocked by worker-RPC Drizzle `values` seam + no composition root).
- [x] S2 — Note-page frame (editor-led) + Layout-facet slot (NOT-52; EC-4/5/15/18f/19/23). **Built** (apps/web/src/notes/):
  `note-entity.tsx` (`/notes/$id` surface — EntityView merged⇄tabbed, `defaultFacet='editor'`, first consumer of `toEntityProps`
  + `EntityModeStore`) · `note-editor-body.tsx` (borderless `VidaEditor chrome='bare'` + `ensureCanvasEditorStyles`, **D-S2-1**:
  NOT the sheet-on-desk CanvasEditor — envision precedence over the #7 seam) · `overview-registry.ts` (the Layout-facet **slot**
  / RIDE seam: `registerOverview`/`overviewFor`, absent⇒note fallback) · `note-overview.tsx` (note full + journal stub,
  merged continuous / tabbed grid) · `notion-header.tsx` (`NotionHeader`+`PropertyRows`) · `use-note-entity.ts` (honest-stub:
  empty default + `?sample`) · `note-chrome.tsx` (shared EC-22 icon/eyebrow atoms) · `routes.tsx` `/notes/$id` lazy route.
  **Decisions all DOC-RESOLVED** (D-S2-1 envision precedence · D-S2-3 O4 in-memory convention, no invented schema · content
  CRDT metadata-only). Reconciled a **pre-existing S1 regression** (`App.integration.test.tsx` expected `/notes`→not-found;
  S1 built `/notes` but ran only the 19 notes tests — full-suite gate caught it). tsc 0 · eslint 0 err · **@vida/web 368/368**
  (62 files, +9 new S2 tests) · **g2 correctness SHIP** + **g2 a11y REVISE→folded** (B1 loading `aria-busy`→host; N1 state-ladder;
  N-corr-2 drop redundant aria-label) · **blocking Visual Gate PASS** (Brave real app via onboarding→`/notes/1?sample`,
  applySelection class-switch; 3 presets × light/dark × {tabbed,merged}: min text AA **4.94–6.03** incl. warm-dark · axe 0 ·
  EC-22 Lucide svg>0 · EC-23 editor border 0px · EC-4 Note-tab default · EC-5 tabs+toggle · EC-18f overview region ·
  EC-19 merged continuous [no DashboardView boxes] · EC-15 journal /summary seam · 0 overflow 375/768/1440; the editor's
  disabled undo/redo are WCAG-1.4.3-exempt). /critique SHIP.
- [x] S3 — Backlinks panel (merged, grouped by source) (NOT-24; EC-6). **Built** (apps/web/src/notes/):
  `backlinks.ts` (PURE merge/group core — `mergeBacklinks(raw, resolveSource)` folds the ①'s two UNMERGED lists
  [pageLinks→`source_page_id`, entityLinks→`page_id`] into **one item per source** w/ occurrence `count` [D-S3-3, no
  silent drop], first-snippet, max-`created_at`; `groupBySourceModule` → recency-desc, module asc; `MODULE_FOR_TYPE`
  EC-6 key; genuinely pure — type-only `@vida/types` import) · `use-backlinks.ts` (DATA seam — honest-empty default +
  `?sample`; 4-state `loading|error|empty|populated`; live swap = React-Query over `getBacklinks`, drop-in zero-sig,
  prefix-safe `['links','backlinks',…]` key) · `backlinks-panel.tsx` (`BacklinksView` state-as-prop [the NoteEntityView
  split, G2] + thin `BacklinksPanel` hook shell; per-module `role=list`+`aria-label`, non-interactive rows [D-S3-4],
  EC-22 Lucide) · wired into `note-overview.tsx` both overviews (merged Section + tabbed block→`state:'success'`),
  `BacklinksSeam` removed. **Decisions DOC-RESOLVED**: D-S3-1 live source-resolution deferred w/ the data plane (not
  skipped — `getPage`/`listPages` throw on the absent composition root, the S1-D2/S2 cause) · D-S3-2 `MODULE_FOR_TYPE`
  · D-S3-3 one-row-per-source + count `[INTERPRETATION]` · D-S3-4 non-interactive · D-S3-5 prefix-safe key. §XXVI
  double-gate (g1 critique REVISE→folded [error-state·grain/no-drop·perf·grounding]→Approval 1 → preflight BLOCKED→folded
  [purity G1·testability split G2]→/critique→Approval 2) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-s3-backlinks-panel.md`.
  tsc 0 · eslint 0 err · **@vida/web 386/386** (+18: 10 pure + 8 panel) · **g2 code-review SHIP** (0 blocking, 3
  leave-as-is nits) · **blocking Visual Gate PASS** (`/tmp/vg/s3-gate.mjs`; Brave real app `/notes/1?sample` populated
  + `/notes/3?sample` empty; 3 presets × L/D × {tabbed,merged}: EC-6 Notes+Projects groups · EC-22 Lucide svg ·
  D-S3-3 "· N links" count · panel-scoped AA **4.94–6.03** incl. warm-dark 5.76 · axe 0 · 0 overflow 375/768/1440).
- [x] S4 — `[[` picker + create-on-miss + preview-card (NOT-19/BSE-12; EC-10/11). **Built** (apps/web/src/notes/):
  `wikilink.ts` (PURE — `toCandidates` [id-bound, drop null/blank titles, NP-7] · `createRowFor` [explicit create-on-miss
  row, blank→null] · `createAndLink(createPage, createPageLink, src, title)` [the IR-4 two-call compose over INJECTED fns —
  create THEN link, ordered, errors propagate not swallowed; no bundled `createNoteAndLink`]) · `use-wikilink-picker.ts`
  (DATA seam — honest-empty default + `?sample`; 4-state `searching|empty|populated|error`; `_`-prefixed stub params,
  live swap = RQ over `resolveWikiLink` + compose mutations, zero-sig) · `wikilink-picker.tsx` (`PickerView` state-as-prop
  [listbox + option roles + `aria-selected` + keyboard ↑/↓-wrap/Enter + focus-visible/hover + distinct "Create '<q>'" row]
  + `WikiLinkPicker` hook shell) · `link-preview-card.tsx` (`PreviewCard` — EC-11 available-data, never dead) · `note-entity.tsx`
  `?picker` DEV-overlay mount (B1; the real caret-anchored trigger is ui-3 — D-S4-1). **Doc-resolved boundary**: the `[[`
  **suggestion-surface editor extension is ui-3** [e4-slash-menu.md:31 "separate suggestion surface"; IR-1/DELEGATES] →
  NOT authored here (see parking lot F-S4-1); fe-notes owns the picker UI + compose (NOT-19 UI split). §XXVI double-gate
  (g1 critique REVISE→folded [mount·pick/create boundary·preview mount·§VIII states]→Approval 1 → preflight PASSED [overlay
  mount·unused-param]→/critique→Approval 2) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-s4-wikilink-picker.md`. tsc 0 · eslint 0
  err · **@vida/web 405/405** (+19: 7 pure + 9 picker + 3 preview) · **g2 code-review SHIP** (0 blocking; adversarially
  traced keyboard-nav clamping + create-on-miss ordering; 3 nits, N1 aria-activedescendant→ui-3 finding, N2/N3 leave-as-is)
  · **blocking Visual Gate PASS** (`/tmp/vg/s4-gate.mjs`; Brave `/notes/1?sample&picker`; 3 presets × L/D: EC-10 listbox
  4 options incl. Create row · EC-11 PreviewCard · EC-22 Lucide svg · AA **4.52–5.22** incl. warm-dark 4.86 · axe 0 · 0
  overflow 375/768/1440).
- [x] S5 — `/summary` block + per-section degrade (NOT-32/34; EC-9). **Built** (apps/web/src/notes/):
  `use-journal-summary.ts` (DATA seam — consumes the MOD-journals ENGINE `buildDashboard(date).summary: SectionData[]`;
  honest-empty default + `?sample` MIXED-state fixture [success+empty+error]; `_date`-prefixed stub, live swap zero-sig;
  type-only `SectionData` from `@vida/core`) · `summary-block.tsx` (`SummaryView` state-as-prop + `SummarySection`
  [renders each section by its ENGINE-produced `state` — success→`dataPoints[].label`s · empty · scoped `role=status`
  error — per-section degrade EC-9/NOT-34, the anti-blank invariant] + `SummaryBlock` hook shell; `moduleLabel`/
  `moduleIcon` map+fallback for EC-22; `items` opaque → never rendered, D-S5-7) · `use-note-entity.ts` extended
  (`NoteEntityData += journalDate: string|null`, maps `pages.journal_date`; cascade-fixed `note-entity.test.tsx` literal)
  · wired into `journalOverviewStub` both modes (`note-overview.tsx`; tabbed summary block→`state:'success'`, D-S5-8),
  `SummarySeam` removed. **Doc-resolved boundary**: engine=journals-service · UI render=P6 (NOT-32/34) · the inline
  editor `/summary` NODE-VIEW = ui-3/#31 (E5 placeholder → F-S5-1), NOT built here. §XXVI double-gate (g1 critique
  REVISE→folded [B1 ground SectionData/DataPoint shape · N1 tabbed flip · N2 gate mode]→Approval 1 → preflight PASSED
  [SectionData export confirmed · NoteEntityData cascade]→/critique→Approval 2) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-
  s5-summary-block.md`. tsc 0 · eslint 0 err · **@vida/web 413/413** (+8) · **g2 code-review SHIP** (0 blocking;
  adversarially verified anti-blank holds · key collision-free · moduleLabel empty-safe; 1 leave-as-is nit) · **blocking
  Visual Gate PASS** (`/tmp/vg/s5-gate.mjs`; Brave `/notes/2?sample` journal; 3 presets × L/D × {tabbed,merged}: EC-9
  success+empty+error all render [anti-blank] · EC-15 seam replaced · EC-22 Lucide · AA **4.94–6.53** incl. warm-dark
  5.76 · axe 0 · 0 overflow 375/768/1440).
- [x] S6 — Page metadata + attachments (NOT-47; EC-7/8). **Built** (apps/web/src/notes/) — **fully fe-notes-owned, NO
  editor/ui-3 defer** (first self-contained slice this session): `attachments.ts` (PURE — `toAttachmentItems` + `formatBytes`
  B/KB/MB) · `use-attachments.ts` (DATA seam — `getAttachments` stub + `?sample`; 4-state; `add`/`remove` stubbed, file→blob
  pipeline deferred D-S6-5) · `attachments-list.tsx` (`AttachmentsView` state-as-prop + `AttachmentsPanel`; rows = file-type
  Lucide icon + name + `formatBytes` size + keyboard-operable Remove; Add affordance) · `use-page-metadata.ts` (reflects
  `page.{favorite,archived,icon,cover}` + stubbed `updatePage` mutations) · `page-metadata.tsx` (`MetadataControlsView`
  state-as-prop + `MetadataControls` + `CoverBanner` merged-only placeholder strip; favorite/archive = `aria-pressed`
  toggles reflecting state, icon/cover = action controls with set/unset labels, EC-7) · `use-note-entity.ts` extended
  (`NoteEntityData += icon, cover`; cascade-fixed `note-entity.test.tsx`) · `notion-header.tsx` (CoverBanner + MetadataControls
  added; **PropertyRows DROPPED favorite/archived rows** → now MetadataControls toggles, no duplicate display — preflight
  B-pf1) · `note-overview.tsx` noteOverview both modes (AttachmentsPanel replaces AttachmentsSeam; tabbed Properties block =
  PropertyRows + MetadataControls, D-S6-8). §XXVI double-gate (g1 critique REVISE→folded [B1 cover-scope · N1 sibling · N2
  toggle-semantics]→Approval 1 → preflight PASSED [B-pf1 redundancy · NoteEntityData cascade]→/critique→Approval 2) on
  `sessions/{PLAN,IMPLEMENTATION-PLAN}-s6-metadata-attachments.md`. tsc 0 · eslint 0 err · **@vida/web 431/431** (+18:
  5 pure/attach + 6 attach-list + 7 metadata) · **g2 code-review SHIP** (0 blocking; adversarially verified formatBytes
  boundaries · aria-pressed genuine-reflect · PropertyRows-drop clean · keyboard-operable; 2 leave-as-is nits) · **blocking
  Visual Gate PASS** (`/tmp/vg/s6-gate.mjs`; Brave `/notes/1?sample` favorited note; 3 presets × L/D × {tabbed,merged}:
  EC-7 4 controls + favorite aria-pressed=true reflect + cover banner [merged] · EC-8 ≥2 attachment rows + Add + Remove ·
  EC-22 Lucide · AA **4.52–6.53** incl. warm-dark 4.86 · axe 0 · 0 overflow 375/768/1440). **NO F-finding** (fully
  fe-notes-owned). **NB:** `journalOverviewStub` tabbed Properties block renders PropertyRows only (no MetadataControls) —
  a stub asymmetry (journal merged gets controls via the shared NotionHeader); fe-journals reconciles the full journal overview (g2 N2).
- [x] S7 — Search UI (search-unavailable) (NOT-50; EC-12). **Built** (apps/web/src/notes/) — **fully fe-notes-owned,
  a pure CONSUMER slice, NO F-finding**: `use-notes-search.ts` (DATA seam — holds `query` + `?sample` seed, **delegates
  the async outcome to the shipped `useCommandSearch(query, provider)`** [race-guarded, provider-agnostic, live-swap-ready;
  B1 reuse not reinvent]; default `stubSearchProvider`) · `notes-search.tsx` (`NotesSearchView` state-as-prop + `NotesSearch`
  hook shell — `role="search"` region, `@vida/ui` `Input` + leading Lucide `Search`, **exhaustive `never`-guarded switch
  over all 7 `SearchStatus`** [fail-loud §VIII; only `idle`/`search-unavailable` reachable in M1], calm `role="status"`
  degrade with **VOICE copy** "Search turns on once your notes are indexed." [B2 — NOT the stub's `(DB-8)` dev string, NOT
  `$colorSignalDanger`], Esc-clears [D-S7-9]) · `notes-surface.tsx` edited (search box mounted ABOVE `CollectionView` in a
  column; collection keeps `flex:1`/`minHeight:0` — RNW flex-collapse guard). **Reuses the already-shipped DB-8 search seam
  end-to-end** (`command-bar/{types,search-provider}` + `shell/use-command-search`) → ⌘K + notes share ONE async-search
  mechanism; live swap = flip the default provider at the composition root (zero view/shell/call-site change). **Boundary
  doc-resolved**: the FTS5 ranked-search ENGINE is DB-8/#60/M1.4 (deferred, degraded honestly in-place per IR-2) — the
  only defer; distinct from the ⌘K launcher (shared chrome, interpretation:127). §XXVI double-gate (g1 critique REVISE→folded
  [B1 reuse the hook · B2 user-facing copy · N1 Esc · N2 search≠filter · N3 flex]→Approval 1 → preflight PASSED [`Muted`
  local · `ResultList` inline · notes-surface.test safe to wrap · C1 live-swap honesty]→/critique→Approval 2) on
  `sessions/{PLAN,IMPLEMENTATION-PLAN}-s7-search-ui.md`. tsc 0 · eslint 0 err · **@vida/web 445/445** (+14: 13 search + 1
  surface) · **g2 code-review SHIP** (0 blocking; adversarially verified the exhaustive switch, the B2 copy guard [test
  feeds the leaky `(DB-8)` as a prop + asserts it's not rendered], the reused race-guard, no flex-collapse; 3 non-blocking
  nits deferred: results empty-list guard [M1-unreachable, R1] · `devSampleActive` 4th-copy [M1.1 shared helper] · status
  politeness [already correct]) · **blocking Visual Gate PASS** (`/tmp/vg/s7-gate.mjs`; Brave real app `/notes?sample`
  [seeded query → search-unavailable + populated collection] + `/notes` [idle resting box]; 3 presets × L/D: EC-12 box
  renders · VOICE copy no `(DB-8)` · calm not-danger · collection still renders below · idle = box w/ no status · EC-22
  Lucide svg · AA **4.94–6.53** incl. warm-dark 5.76 · axe 0 · 0 overflow 375/768/1440).
- [x] S8 — Templates picker/save (NOT-51; EC-13). **Built** (apps/web/src/notes/) — an **S4-shaped honest-degraded
  consumer** over the ADR-009 templates substrate: `use-templates.ts` (DATA seam — `listTemplates` stub + `?sample` +
  `toTemplateItems` projection [structural `TemplateLike`, Row not re-exported]; `apply`/`saveCurrent` = **deferred
  injected seams**, stubbed no-op) · `template-picker.tsx` (`TemplatePickerView` state-as-prop + `TemplatePicker` shell —
  `role="group"` "Templates" panel, 4-state, `role=list` of templates each w/ an **Apply** button + a **Save current as
  template** action; keyboard-operable `ActionButton` [AddButton/PressIcon idiom]) · `note-entity.tsx` edited
  (`devPickerActive`→`devFlagActive(flag)` + a dual `?picker`/`?templates` overlay tail; no-flag path returns bare
  EntityView unchanged). **Tier split doc-resolved (NOT-51 SPLIT):** *template storage + apply* = service-tier (①/@vida/core),
  *picker/save UI* = ②/fe-notes. `listTemplates` IS built → the list is a normal data-plane stub; **apply (instantiate-fork,
  XCU-05/11) + saveCurrent (captureFromSpace, XCU-02/03/04/07) are UNBUILT @vida/core first-consumer-pull seams** → ①-tier,
  outside fe-notes' ② boundary → the affordances ride injected deferred fns (**F-S8-1**). **DEV-mount not a visible button
  (D-S8-4):** Apply/Save are pure actions w/ no display-state → a visible no-op would be a dead affordance (contrast S6's
  state-reflecting controls), so gated behind `?templates` until the seam lands. §XXVI double-gate (g1 critique REVISE→folded
  [B1 DEV-mount honesty justification + S6 contrast]→Approval 1 → preflight PASSED [baseColumns.id · icons verified · N1
  apply≠pageId]→/critique→Approval 2) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-s8-templates.md`. tsc 0 · eslint 0 err ·
  **@vida/web 456/456** (+11) · **g2 code-review SHIP** (0 blocking; verified tier-boundary [no instantiate/serialize logic
  leaked], a11y, TS strict, refactor behaviour-preserving; 3 cosmetic nits — 2 folded [`icon: LucideIcon`; dropped a dead
  test spread], 1 left [`as never` test cast]) · **blocking Visual Gate PASS** (`/tmp/vg/s8-gate.mjs`; Brave
  `/notes/1?sample&templates`; 3 presets × L/D: EC-13 2 template rows + 2 Apply + Save-current · EC-22 3 Lucide svg · AA
  **15.84–17.29** · axe 0 · 0 overflow 375/768/1440 [`maxWidth:320` left:24 fit]).
- [x] S9 — Block add-menu / slash-menu (CAP-12/13; EC-14). **RATIFY / consume-verify** — the [[grep-the-capability-before-building-a-codec-primitive]]
  case: the capability palette is **already shipped in `@vida/editor` E4** (`SLASH_MENU_ITEMS` 11 standard + 11 integration)
  and **consumed** by the editable note-page `<VidaEditor>` → **EC-14 met by consumption**; CAP-13 palette-compute (#29) +
  CAP-12 `block_instances` placement (#31) are deferred services with **no `VidaEditorProps` seam** to feed → fe-notes writes
  **no palette UI** (building one = NOT-52 violation). Consuming the full non-restrictive palette on an **inline** surface
  IS CAP-13's inline rule (union, non-restrictive; restrict-half is standalone-only, deferred). **The only apps/web edit =
  a DEV-sample fixture** (`use-note-entity.ts` `?sample` `sampleDoc` gains blockquote/taskList/table) to make the EC-24
  consume-verify deterministic (behind `?sample`, dead-code in prod; no cascade — `note-entity.test` uses its own `content:null`
  literal). **EC-24 (ui-3 editor blocks) formalized** as `docs/specs/fixes/editor-blocks-quote-tasklist/_index.md` (the
  on-branch `@vida/editor` `editor-styles.ts` fix: blockquote tokened left-bar+italic [was unstyled] + taskList checkbox
  alignment) — **lands as a SEPARATE `@vida/editor` ui-3 commit/PR**, NOT bundled. §XXVI ratify-gate (g1 critique SHIP
  [RATIFY adversarially verified: inline-non-restrictive = CAP-13-compliant, not under-delivery]→Approval 1; N1 folded =
  EC-24 seeded via `?sample`, not driven through the suggestion popup) on `sessions/PLAN-s9-block-add-menu.md`. tsc 0 (web
  + editor) · eslint 0 err · **@vida/web 456/456** (sample enrichment, no cascade) · **@vida/editor 226/226** (EC-24
  change green) · **blocking consume-verify Visual Gate PASS** (`/tmp/vg/s9-gate.mjs`; Brave `/notes/1?sample`; EC-14 `/`→
  listbox **23 options** [>11 ⇒ platform blocks] w/ Text/Quote/Table · EC-24 blockquote[bar+italic]/task-list[checkbox+2
  items]/table[borders] render × 3 presets × L/D · EC-22 no emoji · AA **4.94–6.53** warm-dark · axe 0 · 0 overflow
  375/768/1440). **FINAL slice — the unit PR opens here.**

## Parking lot
- **ui-3 editor fix** (EC-24): `@vida/editor` editor-styles.ts — blockquote styling + taskList alignment (DONE in worktree).
  **FORMALIZED (S9)** as `docs/specs/fixes/editor-blocks-quote-tasklist/_index.md`; `@vida/editor` 226/226 green;
  consume-verified in-app (S9 Visual Gate). **Must land as a SEPARATE `@vida/editor` (ui-3) commit/PR, NOT bundled into
  fe-notes' apps/web PR** (the PR close-out splits it).
- **F-S4-1 — ui-3 `[[` suggestion-surface extension (NEW, filed S4):** the editor-side `[[` TRIGGER that detects `[[`
  typed in the editor and mounts `<WikiLinkPicker>` at the caret is a **ui-3 `@vida/editor`** concern [e4-slash-menu.md:31
  "`@`-mentions / entity `[[wiki-link]]` autocomplete — a separate suggestion surface"; interpretation IR-1/DELEGATES] —
  a NEW `@tiptap/suggestion`-based extension (parallel to E4 slash), UNBUILT. S4 shipped the fe-notes-owned picker UI +
  create-on-miss compose + preview-card (demonstrated via the `?picker` DEV-gate). When the ui-3 extension lands it:
  (1) mounts `WikiLinkPicker` at the `[[` caret + feeds it the typed query; (2) on pick, inserts the editor-doc `[[token]]`
  (the inline representation) in addition to fe-notes' `createPageLink`; (3) mounts `PreviewCard` on hover of a `[[link]]`;
  (4) adds the g2 N1 a11y conformance (`aria-activedescendant` + option ids + `Esc` dismiss). Lands as a SEPARATE ui-3 PR.
- **F-S5-1 — ui-3 inline `/summary` block node-view (NEW, filed S5):** the editor `/summary` integration block's REAL
  body is a **ui-3 `@vida/editor`** concern [NOT-52; E5 shipped `dailySummary` as an `IntegrationBlockPlaceholder`; editor
  CLAUDE.md "integration-block REAL bodies → MOD-*/#31"]. S5 shipped the fe-notes-owned `SummaryBlock` render (mounted in
  the journal-overview Summary section). When ui-3/#31 replaces the E5 placeholder node-view, it mounts the SAME
  `SummaryBlock`/`SummaryView` render (consuming `buildDashboard().summary`) inside the editor doc. Lands as a SEPARATE
  ui-3 PR (parallel to F-S4-1). NB: the live journals composition root (registered contributors) is the separate data-plane defer.
- **F-S9-1 — CAP-12/13 execution seams (NEW, filed S9):** the per-surface palette **compute** (CAP-13 offered/allowed
  teeth-split — union-inline/restrict-standalone) → **UI-3 #29**; the `block_instances` standalone-**placement** service
  (CAP-12) → **MOD-notes #31**. A future **`VidaEditor` offered-set prop** is also needed to feed CAP-13 into the slash
  menu (none today). M1 consumes the editor's non-restrictive base palette (E4) inline — exactly CAP-13's inline rule.
  fe-notes authored NO palette UI (NOT-52). Cross-tier defer (service #29/#31 + a future editor prop). The Space-level
  standalone add-menu is SP-29 → `fe-shell-integration-wiring`, NOT fe-notes.
- **F-S8-1 — @vida/core template EXECUTION seams (NEW, filed S8):** the **instantiate-fork** (Apply — XCU-05/11) and the
  **capture serializer** (Save-current-as-template — `captureFromSpace` + authored-vs-accumulated, XCU-02/03/04/07) are
  `@vida/core`/①-tier **first-consumer-pull seams**, NOT built (`foundation/templates/CLAUDE.md`). Per NOT-51 SPLIT these
  are SERVICE-tier, outside fe-notes' ② boundary. S8 shipped the fe-notes-owned picker/save UI + the affordances over
  **injected deferred fns** (demonstrated via the `?templates` DEV-gate; `listTemplates` is the one built method, stubbed in
  M1 for the data-plane reason). When a module first pulls the seams (ADR-019 §3.5 first-consumer-pull), fe-notes' `apply`/
  `saveCurrent` bind to them (zero-sig), AND a real invocation point (a note-page action-menu / collection `+` "New/Save
  template" item) replaces the DEV-gate. This is a CROSS-TIER defer (service, not ui-3) — distinct from F-S4-1/F-S5-1.
  Lands as a separate `@vida/core` change + the fe-notes menu wiring (with the live composition root).

## Log
- 2026-10-10 — front matter: baseline → interpretation → **envision LOCKED (EC-1…24 approved)** → decomposition drafted.
  Worktree `.claude/worktrees/fe-notes-and-pages` off main @ 8392e06, Node 24. Next: Decomposition Gate → S1.
- 2026-10-10 — **S1 ✅** Notes Collection + `/notes` route (committed 57b7479).
- 2026-10-10 — **S2 ✅** Note-page frame (editor-led) + Layout-facet slot. Full §XXVI double-gate (Approval 1 → preflight
  PASSED → IMPL → g2 correctness SHIP + g2 a11y REVISE→folded → blocking Visual Gate PASS → /critique SHIP) on
  `sessions/PLAN-s2-note-page-frame.md`. D-S2-1 resolved by envision-over-seam precedence (borderless VidaEditor, not the
  #7 sheet-on-desk CanvasEditor). Caught+fixed a pre-existing S1 full-suite regression. @vida/web 368/368. NOT committed
  yet (PR opens at S9). Next: **S3 — Backlinks panel** (NOT-24; EC-6) — fills the S2 Backlinks seam.
- 2026-10-10 — **S3 ✅** Backlinks panel ("what links here", merged + grouped by source module). Full §XXVI double-gate
  (g1 critique REVISE→folded → Approval 1 → preflight BLOCKED→folded [G1 purity · G2 testability split] → /critique →
  Approval 2 → IMPL → g2 code-review SHIP → blocking Visual Gate PASS) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-s3-
  backlinks-panel.md`. Pure `backlinks.ts` (merge/group the ① defers to the UI — BR-S4-4) + `use-backlinks.ts` stub +
  `BacklinksView`/`BacklinksPanel` split, wired into both overviews; `BacklinksSeam` removed. Live source-resolution
  deferred with the data plane (D-S3-1, the S1-D2/S2 cause). tsc 0 · eslint 0 · @vida/web 386/386 (+18) · Visual Gate
  PASS (EC-6 · EC-22 · count · AA 4.94–6.03 warm-dark · axe 0). NOT committed yet (PR opens at S9). Next: **S4 — `[[`
  picker + create-on-miss + preview-card** (NOT-19/BSE-12; EC-10/11).
- 2026-10-10 — **S4 ✅** `[[` picker + create-on-miss + preview-card. Full §XXVI double-gate (g1 critique REVISE→folded →
  Approval 1 → preflight PASSED → /critique → Approval 2 → IMPL → g2 code-review SHIP → blocking Visual Gate PASS) on
  `sessions/{PLAN,IMPLEMENTATION-PLAN}-s4-wikilink-picker.md`. **Load-bearing finding doc-resolved (not guessed):** the
  `[[` editor TRIGGER is a ui-3 suggestion surface [e4-slash-menu.md:31] → filed as parking-lot **F-S4-1**, NOT built in
  fe-notes (IR-1/DELEGATES); S4 ships the fe-notes-owned picker UI + the IR-4 two-call compose + preview-card. Victor's
  "check the documentation" steer resolved my AskUserQuestion — the docs settle the scope. Pure `wikilink.ts`
  (`createAndLink` over injected fns) + `use-wikilink-picker.ts` stub + `PickerView`/`WikiLinkPicker` + `PreviewCard` +
  `?picker` DEV mount. tsc 0 · eslint 0 · @vida/web 405/405 (+19) · Visual Gate PASS (EC-10/11/22 · AA 4.52–5.22
  warm-dark · axe 0). NOT committed yet (PR opens at S9). Next: **S5 — `/summary` block + per-section degrade** (NOT-32/34; EC-9).
- 2026-10-11 — **S5 ✅** `/summary` block + per-section degrade. Full §XXVI double-gate (g1 critique REVISE→folded →
  Approval 1 → preflight PASSED → /critique → Approval 2 → IMPL → g2 code-review SHIP → blocking Visual Gate PASS) on
  `sessions/{PLAN,IMPLEMENTATION-PLAN}-s5-summary-block.md`. **Boundary doc-resolved (same class as S4):** engine =
  journals-service `buildDashboard` (per-section degrade is ENGINE-side); UI render = P6 (NOT-32/34); the inline editor
  `/summary` node-view = ui-3/#31 → filed **F-S5-1**. fe-notes renders `SectionData[]` per-section (success→dataPoint
  labels · empty · scoped error — anti-blank held), wired into the journal-overview Summary section (replaced the S2
  SummarySeam). `NoteEntityData += journalDate`. tsc 0 · eslint 0 · @vida/web 413/413 (+8) · g2 SHIP · Visual Gate PASS
  (EC-9 anti-blank · EC-15 · EC-22 · AA 4.94–6.53 warm-dark · axe 0). NOT committed yet (PR opens at S9). Next: **S6 —
  Page metadata + attachments** (NOT-47; EC-7/8).
- 2026-10-11 — **S6 ✅** Page metadata + attachments. Full §XXVI double-gate (g1 REVISE→folded → Approval 1 → preflight
  PASSED → /critique → Approval 2 → IMPL → g2 SHIP → blocking Visual Gate PASS) on
  `sessions/{PLAN,IMPLEMENTATION-PLAN}-s6-metadata-attachments.md`. **First fully fe-notes-owned slice this session** —
  no editor/ui-3 defer, NO F-finding (only the universal data-plane/[E]/file-upload defers). Metadata controls
  (favorite/archive aria-pressed toggles + icon/cover action controls, reflect state via stubbed updatePage) +
  attachments list (getAttachments stub + Add/Remove). `NoteEntityData += icon, cover`. PropertyRows de-duplicated
  (dropped favorite/archived → now MetadataControls, preflight B-pf1). tsc 0 · eslint 0 · @vida/web 431/431 (+18) ·
  g2 SHIP · Visual Gate PASS (EC-7 reflect · EC-8 · cover banner · EC-22 · AA 4.52–6.53 warm-dark · axe 0). NOT committed
  yet (PR opens at S9). Next: **S7 — Search UI (search-unavailable)** (NOT-50; EC-12).
- 2026-10-11 — **S7 ✅** Search UI (search-unavailable). Full §XXVI double-gate (g1 critique REVISE→folded [B1 reuse the
  shipped `useCommandSearch` hook, not a new async hook · B2 render user-facing VOICE copy, not the stub's `(DB-8)` dev
  string · N1 Esc-clear · N2 search≠Filter · N3 flex-column] → Approval 1 → preflight PASSED → /critique [C1 live-swap
  honesty] → Approval 2 → IMPL → g2 code-review SHIP → blocking Visual Gate PASS) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-
  s7-search-ui.md`. **Pure CONSUMER slice, fully fe-notes-owned, NO F-finding** — reuses the already-shipped DB-8 search
  seam end-to-end (`command-bar/{types,search-provider}` + `shell/use-command-search`); ⌘K + notes share ONE async-search
  mechanism; live DB-8 provider drops in by flipping one default binding. The honest `search-unavailable` degrade (calm
  `role="status"`, VOICE copy, never danger) is the only M1 state besides `idle`; the FTS5 engine is the sole defer
  (DB-8/#60/M1.4). tsc 0 · eslint 0 · @vida/web 445/445 (+14) · g2 SHIP · Visual Gate PASS (EC-12 · EC-22 · AA 4.94–6.53
  warm-dark · axe 0 · idle box · collection preserved). NOT committed yet (PR opens at S9). **Deferred nits (M1.1):**
  `ResultList` empty-group guard (M1-unreachable) · a shared `devSampleActive()` helper (now 4th copy across notes seams).
  Next: **S8 — Templates picker/save** (NOT-51; EC-13).
- 2026-10-11 — **S8 ✅** Templates picker/save. Full §XXVI double-gate (g1 critique REVISE→folded [B1 justify the
  DEV-mount via "no dead affordance" + the S6 reflect-state contrast] → Approval 1 → preflight PASSED → /critique → Approval
  2 → IMPL → g2 code-review SHIP → blocking Visual Gate PASS) on `sessions/{PLAN,IMPLEMENTATION-PLAN}-s8-templates.md`. An
  **S4-shaped honest-degraded consumer** over the ADR-009 templates substrate: the picker lists templates (`listTemplates`
  stub + `?sample`) with per-row **Apply** + a **Save current as template** action, over injected DEFERRED @vida/core seams.
  **Tier split (NOT-51):** storage+apply = service-tier (①), picker/save UI = ② (fe-notes); apply (instantiate-fork) +
  capture are UNBUILT @vida/core first-consumer-pull seams (outside the ② boundary) → **filed F-S8-1** (cross-tier, distinct
  from the ui-3 F-S4-1/F-S5-1). DEV-gated (`?templates`) because pure no-op actions would be dead affordances (D-S8-4).
  tsc 0 · eslint 0 · @vida/web 456/456 (+11) · g2 SHIP (2 cosmetic nits folded) · Visual Gate PASS (EC-13 · EC-22 · AA
  15.84–17.29 · axe 0 · 0 overflow). NOT committed yet (PR opens at S9). Next: **S9 — Block add-menu / slash-menu**
  (CAP-12/13; EC-14) — the FINAL slice; **PR opens at S9**.
- 2026-10-11 — **S9 ✅ (RATIFY / consume-verify) — ALL 9 SLICES DONE.** The capability palette is shipped in `@vida/editor`
  E4 + consumed by the note-page editor (EC-14 met); CAP-13 compute (#29) + CAP-12 placement (#31) are deferred services
  with no `VidaEditor` seam → fe-notes authored NO palette UI (NOT-52); building one would re-author E4. Inline-non-restrictive
  consumption IS CAP-13-compliant (adversarially verified at g1). Only apps/web change = a DEV-`?sample` fixture
  (blockquote/taskList/table) for the EC-24 consume-verify. **EC-24 ui-3 fix formalized** (`docs/specs/fixes/editor-blocks-quote-tasklist/`)
  → separate `@vida/editor` commit/PR. §XXVI ratify-gate (g1 SHIP → Approval 1) on `sessions/PLAN-s9-block-add-menu.md`.
  tsc 0 · eslint 0 · @vida/web 456/456 · @vida/editor 226/226 · Visual Gate PASS (EC-14 23-option palette · EC-24 blocks ·
  EC-22 · AA 4.94–6.53 · axe 0 · 0 overflow). **F-S9-1** filed (CAP-12/13 → #29/#31 + a future editor offered-set prop).
  **Next: the FINAL unit PR — split the `@vida/editor` EC-24 fix into a SEPARATE ui-3 commit/PR; commit the fe-notes
  apps/web unit (S2–S9 were uncommitted) + delivery docs; open the fe-notes PR.** (Awaiting Victor's go to commit/PR.)
