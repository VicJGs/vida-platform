# Envision — fe-notes-and-pages (② unit #27)

> Entity Delivery Flow §3.75 — vision as a leading contract. The §3.75 trigger test fired (interpretation.md F1:
> multiple user affordances whose UI answer isn't obvious from a shipped surface — the editor-led note page, the
> merged-backlinks shape, the `[[` picker). Greybox = intent-fidelity (layout · composition · affordance · state
> coverage), real `@vida/ui` + `@vida/editor` primitives + fake data, **THROWAWAY** (deleted after the gate).
> **Reviewer = the human (Victor), blocking.** No decomposition until approved.

## Greybox

- Route: `apps/web/src/__envision__/notes-and-pages.tsx` mounted at `/envision/notes` (temp route in `routes.tsx`).
  Driver: `tools/envision-drive-notes.mjs` (Brave via playwright-core; onboard-on-URL → screenshot). **All THREE delete
  after the gate.**
- Screenshots (`/tmp/vg-notes/`, 1440×light unless noted): `light-collection` (List) · `-loading` · `-empty` ·
  `-error` · `-gallery` · `-calendar` · `-graph` (empty/AR-8) · `light-notepage` (editor-led, real VidaEditor bare) ·
  `-notepage-journal` · `-notepage-merged` (metadata + /summary + backlinks) · `light-picker` (candidates + create-on-miss +
  preview-card) · `light-summary` · `light-metadata` · `light-search` · `light-templates` · `light-addmenu` ·
  `dark-notepage` · `dark-collection`.
- Fidelity notes: the note page uses the REAL `VidaEditor` (`chrome='bare'`) — live toolbar + borderless notebook.
  The `/summary`, picker, preview-card, templates, add-menu, metadata, backlinks panels are greybox compositions of
  UI-1 primitives (Card/Button/Input/Menu/EmptyState) — intent-fidelity, not the final components. Known greybox-only
  noise: a `Card padded` prop warning + a 404 favicon (not product issues).

## Anchored checkpoints (PROPOSED — Victor pins/edits the final set + types)

`structural` = greybox-provable → Decomposition coverage + a Visual-Gate MUST. `feel` = deferred to the live per-slice Visual Gate.

| EC     | Screen / state                       | Assertion (the vision)                                                                                                                                                | Type              | Slice(s)                  | Gate assertion                |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------- | ----------------------------- |
| EC-1   | Collection · switcher                | Notes Top view offers **List · Gallery · Calendar · Neural** and switches live (per-type view set, surface-map:48)                                                    | structural        | Collection                | Visual-Gate MUST              |
| EC-2   | Collection · states                  | every layout honors the **8-state machine** (loading · empty · error · success)                                                                                       | structural        | Collection                | Visual-Gate MUST              |
| EC-3   | Collection · graph                   | the Neural layout renders note nodes; AR-8 data-prep deferred → an **honest "being prepared" empty**, never a crash                                                   | structural        | Collection(graph)         | Visual-Gate MUST              |
| EC-4   | Note page                            | the note page **LEADS with the Editor facet** (default active = editor), reads as a borderless notebook, toolbar above                                                | structural + feel | Note-page                 | MUST (lead) · live (feel)     |
| EC-5   | Note page · mode                     | user switches **merged ⇄ tabbed** (Overview/Note); the choice is a **per-type default, remembered per instance**                                                      | structural + feel | Note-page                 | MUST (toggle) · live (memory) |
| EC-6   | Note page · backlinks                | **"What links here" merges page + entity links, grouped by source** (the G6 shape — NOT-24)                                                                           | structural        | Backlinks                 | Visual-Gate MUST              |
| EC-7   | Note page · metadata                 | **favorite · archive · icon · cover** controls present + reflect state (NOT-47)                                                                                       | structural        | Metadata                  | Visual-Gate MUST              |
| EC-8   | Note page · attachments              | the page's **attachments** list is present                                                                                                                            | structural        | Note-page                 | Visual-Gate MUST              |
| EC-9   | /summary block                       | renders per-section; a missing source **degrades THAT section only**, never the whole block (NOT-34)                                                                  | structural        | Summary-block             | Visual-Gate MUST              |
| EC-10  | `[[` picker                          | typing shows title-LIKE candidates + an **explicit "+ Create '<text>'"**; create-on-miss is never silent (NOT-19)                                                     | structural        | Picker                    | Visual-Gate MUST              |
| EC-11  | preview-card                         | a link shows a **preview card**; enrichment deferred → renders with available data, no dead card (BSE-12)                                                             | structural        | Picker/Preview            | Visual-Gate MUST              |
| EC-12  | search                               | the search box renders + shows the honest **`search-unavailable`** state (FTS5→DB-8)                                                                                  | structural        | Search                    | Visual-Gate MUST              |
| EC-13  | templates                            | **template picker + apply + save-current-as-template** (live-block layouts, NOT-51)                                                                                   | structural        | Templates                 | Visual-Gate MUST              |
| EC-14  | add-menu                             | the editor offers the **capability palette** (basic + platform blocks) — page/editor surface (CAP-12/13)                                                              | structural        | Add-menu                  | Visual-Gate MUST              |
| EC-15  | page-types                           | the note page composes across the **6 page-types** (editor-led); journal shows `/summary`                                                                             | structural        | Note-page                 | Visual-Gate MUST              |
| EC-16  | all · responsive/dark                | every surface holds **light/dark × 375·768·1440**                                                                                                                     | feel              | (all FE)                  | live Visual Gate              |
| EC-17  | editor/link feel                     | writing feels immediate; slash-menu + linking feel responsive + undoable                                                                                              | feel              | Editor/Picker             | live Visual Gate              |
| EC-18  | note page · per-type Overview        | each page-type has a DISTINCTIVE Overview, not a generic dashboard (below)                                                                                            | structural        | Overview(per type)        | Visual-Gate MUST              |
| EC-18a | journal Overview                     | daily OS dashboard: Today's agenda · Streaks/stats · `/summary` across the OS · Check-in                                                                              | structural        | Overview:journal          | Visual-Gate MUST              |
| EC-18b | task_note Overview                   | work-canvas: status/priority/effort/due chips · **effect rail** · subtask checklist+progress · time                                                                   | structural        | Overview:task_note        | Visual-Gate MUST              |
| EC-18c | task_group_note Overview             | roll-up progress · member-task checklist                                                                                                                              | structural        | Overview:task_group_note  | Visual-Gate MUST              |
| EC-18d | milestone_note Overview              | weighted progress · timeline · deliverables (status) · document vault                                                                                                 | structural        | Overview:milestone_note   | Visual-Gate MUST              |
| EC-18e | deliverable_note Overview            | **measurement axis** (kind+value/bar) · **binding-mode** (derived-pull source) · **staged proof track** (stages + per-stage proof + add-proof gate) · **effect rail** | structural        | Overview:deliverable_note | Visual-Gate MUST              |
| EC-18f | note Overview                        | clean freeform: properties · attachments · backlinks                                                                                                                  | structural        | Overview:note             | Visual-Gate MUST              |
| EC-19  | merged mode is per-type + continuous | merged renders the SAME per-type sections as a continuous Notion page (header + inline eyebrow sections → editor), not a generic property list                        | structural        | Note-page(merged)         | Visual-Gate MUST              |
| EC-20  | effect rail                          | the ADR-004 entity surface (timer · emit-signal · XP) renders on task_note + deliverable_note                                                                         | structural        | Effect-rail               | Visual-Gate MUST              |
| EC-21  | staged proof track                   | deliverable stages with per-stage proof + Add-proof gate                                                                                                              | structural        | Staged-proof              | Visual-Gate MUST              |
| EC-22  | icons, not emojis                    | every glyph is a Lucide icon tinted by a theme token                                                                                                                  | structural        | (all FE)                  | Visual-Gate MUST              |
| EC-23  | borderless editor                    | the note editor is chrome-bare (no frame/blue box); focus-ring only on keyboard focus                                                                                 | structural        | Note-page                 | Visual-Gate MUST              |
| EC-24  | editor blocks (ui-3 dependency)      | Quote (tokened bar + muted) · Task list (checkbox/text aligned) · Table (tokened) render correctly — **homed to `@vida/editor`/ui-3, consumed here**                  | structural        | (ui-3) · consumed         | ui-3 change + consume-verify  |

## Open vision questions for the human (from the greybox)

1. **Merged-mode editor order** — `EntityView` merged renders Layout-then-Editor. A note is editor-led; is tabbed-default-to-Note
   enough, or do we want the **editor first / Layout as a side-panel** in merged for notes? (The greybox shows tabbed-default-to-Note.)
2. **Backlinks grouping** — grouped by **source module** (greybox) vs by **link type** (page vs entity) vs flat with per-row type badge?
3. **Which page-types get `/summary`** — journal only (greybox), or any page a user adds the block to?

## Review round 1 — Victor (2026-10-10) → greybox REVISE (not approved)

Vision findings to fix before re-review (the greybox must match these before checkpoints are pinned):

1. **Follow the ESTABLISHED design patterns** — the greybox used ad-hoc `styled(View)` boxes; recompose from the
   shipped codec patterns / primitives (not invented panels).
2. **NO emojis — use icons** (Lucide/the platform icon system) everywhere.
3. **Elements must fit the pattern/layout + design** — the compositions don't match the house pattern yet.
4. **Note page editor: remove the blue surrounding** box/ring on the editor (Notion-clean, borderless).
5. **Per-entity-type Overview** — each page-type (journal/note/task_note/task_group_note/milestone_note/
   deliverable_note) gets a DIFFERENT Overview/Layout facet, not one shared panel.
6. **Merged mode: the Overview must still feel like an editor** — page-properties/overview flow as part of the
   note document (continuous), not a boxed panel stacked above the editor.
7. **North star = NOTION** — use Notion as the standard for the note page (icon + cover + properties + inline
   block editor) and the overall feel.

→ Action: re-ground in the design-standards + icon system + a real Notion-style page composition, then rebuild the
greybox and re-drive for re-review. Checkpoint set + the 3 open questions carry forward to the re-review.

### Round-2 rebuild (done 2026-10-10) — addressing each point

1. **Patterns** → recomposed on shipped primitives: `DashboardView` (per-type Overview), `Card` (collection + panels),
   `EmptyState`, 4pt-grid spacing tokens, semantic color tokens only (grounded: `home/` + `journal-page-region` + quality-bar).
2. **Icons** → all emojis replaced with **Lucide** (`lucide-react`): type icons (StickyNote/CalendarClock/ListChecks/
   FolderKanban/Flag/Package), Star/Archive/Paperclip/Link2/Plus/Search/Hash/etc., tinted via theme CSS vars.
3. **Elements fit the pattern** → Card-based collection tiles; `Card status='warm'` accent for favorites; inline-block
   frame for `/summary` (the journal-page-region precedent).
4. **No blue editor box** → `VidaEditor chrome='bare'` on a borderless writing measure (740px) + `ensureCanvasEditorStyles`;
   no frame/ring box.
5. **Per-entity-type Overview** → `overviewFor(type)` returns DIFFERENT `DashboardView` blocks per type (journal→Today/
   /summary/Streaks · note→Properties/Backlinks/Attachments · task_note→Status/Progress · milestone_note→Progress/
   Deliverables · deliverable_note→Status/Proof/Parent · task_group_note→Roll-up/Tasks).
6. **Merged = continuous Notion page** → merged layout = `NotionProperties` (cover + icon badge + continuous property
   rows, no boxes) flowing into the borderless editor; tabbed = the per-type dashboard Overview + the editor on the Note tab.
7. **Notion north star** → icon + cover + property rows + inline borderless block editor; merged⇄tabbed toggle.

- Re-driven: `/tmp/vg-notes/` — `light-notepage` (borderless editor) · `-note-overview` · `-milestone-overview`
  (per-type) · `-journal-merged` + `-note-merged` (continuous Notion page) · `light-collection` (+states/layouts) ·
  picker · summary · metadata · search · templates · addmenu · dark samples. Console clean except a favicon 404.

### Round-2d (Victor: "merged isn't per-entity like the tabbed Overview")

- Root cause: merged rendered a generic `NotionProperties` for every type; only tabbed was per-type.
- Fix: a single `entitySections(type)` now feeds BOTH — tabbed renders it as the `DashboardView` grid; **merged renders
  the SAME per-type sections as a continuous Notion page** (`NotionHeader` cover+icon+core props, then inline
  `Eyebrow`-labelled sections, no boxes) flowing into the editor. Verified `merged-{task,deliverable,journal,note}`:
  e.g. merged deliverable = MEASUREMENT · BINDING · STAGED PROOF · EFFECT RAIL · BACKLINKS inline → editor.

### Round-2c (Victor: distinctive per-entity layouts + editor blocks)

- **Per-entity Overviews redesigned — each type is now tailored, not a generic dashboard** (grounded in surface-map +
  quality-bar + parts/{tasks,projects}.md + home-journal-dashboard):
  - **journal** = daily OS dashboard (Today's agenda · Streaks/stats · `/summary` across the OS · Check-in).
  - **note** = clean freeform (Properties · Attachments · Backlinks).
  - **task_note** = work-canvas (status/priority/effort/due chips · **effect rail** [timer·signal·XP] · subtask checklist + progress bar · time tracking).
  - **task_group_note** = roll-up + member-task checklist.
  - **milestone_note** = weighted progress (% + bar) · timeline · deliverables (status chips) · document vault.
  - **deliverable_note** = the standout: **measurement axis** (kind chip + value/bar) · **binding-mode** (derived-pull source) · **staged proof track** (user stages + per-stage proof + Add-proof gate) · **effect rail**.
  - Grid stays organized (md pairs + full rows); merged mode stays the continuous Notion page.
  - New greybox blocks: `Chip` · `ProgressBar` · `EffectRail` · `StageTrack`.
- **Editor blocks (ui-3 `@vida/editor` — a SEPARATE unit; fix made so Victor can see it, lands as its own ui-3 change):**
  - **Quote** — `editor-styles.ts` had NO `blockquote` rule → bare indent ("nothing happened"). Added a tokened
    left-bar + muted-italic rule. Converts from a plain paragraph (not from inside a list — standard ProseMirror).
  - **Task list** — checkbox/text misalignment fixed: `align-items:flex-start` row + a line-height-matched
    (`inline-flex`, `min-height:1.7em`, `align-items:center`) label centers the box to the first text line; item `<p>` margin zeroed.
  - `@vida/editor` rebuilt; verified in-browser (`ed-blocks-fixed`, `ed-quote-clean`, `ed-slashmenu`).

### Round-2b fix (Victor: "Overview grid/layout de-organized")

- Root cause: the DashboardView blocks mixed `sm`/`md`/`lg` (different `flexGrow`/`flexBasis` weights) with too few
  blocks → lone cells grew oddly + min-widths forced ragged wraps.
- Fix: every per-type Overview now uses ONLY **`md` (even 2-up columns) + `full` (own row)** → each row tiles cleanly
  (e.g. milestone = Progress+Timeline [2-up] · Deliverables [full] · Backlinks [full]; note = Properties+Attachments
  [2-up] · Backlinks [full]). Verified `-milestone-overview` + `-note-overview`.

## Approval

**Greybox + checkpoints APPROVED by Victor on 2026-10-10.** (BLOCKING gate PASSED → Decomposition follows.)
Final checkpoint set = EC-1…EC-24 (EC-1…EC-15 + EC-18…EC-24 `structural` → Decomposition coverage + Visual-Gate MUSTs;
EC-16/EC-17 `feel` → live per-slice Visual Gate; EC-24 homed to `@vida/editor`/ui-3, consumed + verified here).
Throwaway greybox (`apps/web/src/__envision__/notes-and-pages.tsx` + `/envision/notes` route + `tools/envision-drive-notes.mjs`)
DELETED after the gate per §3.75. The `@vida/editor` editor-styles fix (Quote + Task list) to land as a separate ui-3 change.

### Open vision answers (pinned at approval)

- **Merged editor-order** → RESOLVED: merged = continuous Notion page (header + inline per-type sections → editor); tabbed default = editor facet active. EC-19.
- **Backlinks grouping** → grouped by source module (EC-6).
- **`/summary` on which types** → journal (EC-18a); any page may add the `/summary` block via the editor (NOT-32 block).

### Re-pins (Victor, 2026-10-26 — notes-rescope Interpretation Gate)

- **EC-10** → "typing `[[` shows title-matching candidates across **every OS entity that is a page** (pages + registered entity types, grouped by type) + an explicit '+ Create '<text>''; create-on-miss is never silent (NOT-19)." Victor: "the pages mentioned is supposed to be all the entities inside the OS that are pages." A page target writes `page_links`; an entity target writes `entity_links` (cross-module-integration.md:125,144).
- **EC-1** → "Notes Top view offers **List · Gallery · Neural** and switches live" — consequence of the journals ruling (journals left `/notes`; G3 gives `note` no Calendar). `surface-map.md:48` stale on Calendar.
- **EC-18a** → owner re-homed to **journals-rescope** (Journals is its own module; the journal Overview is the Journals surface). Notes keeps the Overview slot.
