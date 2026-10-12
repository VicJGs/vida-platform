# PLAN — S2 · Note-page frame (editor-led) + Layout-facet slot

> fe-notes-and-pages (② unit #27) · slice S2 · Linear LIF-191 · branch `fe-notes-and-pages` (Node 24).
> Per-slice §XXVI double-gate: **this is the Approval-1 artifact** (PLAN → ░g1░ → preflight → IMPL → ░g2░ →
> Approval-2 → blocking Visual Gate). Grounded in `delivery/{slice-map,seam-contract,envision,interpretation}.md`.

## 1. What S2 is (scope line)
The **note entity page**: the editor-led frame a user lands on at `/notes/$id`. It composes the shipped
`EntityView` shell (merged⇄tabbed) with a **borderless editor body** + a net-new **NotionHeader** + the per-type
**Layout-facet slot** (the cross-unit RIDE seam). S2 ships the **`note`** layout in full and a **`journal` stub**;
task/milestone/deliverable overviews **RIDE** from fe-tasks/fe-projects into the same slot later (slice-map D1).

**In scope (S2):** the `/notes/$id` route · the note-entity surface · the EntityView composition (mode + facet
threading + memory) · the borderless editor facet · NotionHeader · the Layout-facet slot + its renderer registry ·
the `note` layout sections (Properties live-ish; Attachments/Backlinks as empty-but-functional seams) · the first
`useEntity`/`EntityModeStore` consumer (stub-disciplined) · tests · the blocking Visual Gate.

**Explicitly OUT (homed to other slices/units — no pull-forward):**
- Backlinks panel content → **S3** (S2 ships the section as an empty-but-functional seam).
- Attachments list/controls → **S6** (same — empty-but-functional seam).
- `/summary` block → **S5** (the journal stub names the section; the live block is S5).
- `[[` picker, search, templates, add-menu → S4/S7/S8/S9.
- task_note/task_group_note/milestone_note/deliverable_note overviews → **RIDE** to fe-tasks/fe-projects (S2 ships
  the slot + the absent-renderer fallback only).
- Live `NotesService` wiring / FTS5 / Yjs content persistence → deferred backend seams (IR-2), honest-stubbed here.

## 2. Composition shape
```
/notes/$id  (lazy route, mounts in app-shell <Outlet/>)
└─ NoteEntitySurface                     apps/web/src/notes/note-entity.tsx
   ├─ useNoteEntity(entityType, entityId)  apps/web/src/notes/use-note-entity.ts  ← first useEntity consumer (STUB-disciplined)
   │     → { source: EntitySource, state }      honest-empty default + ?sample DEV gate (mirrors use-notes-rows)
   └─ EntityView  (@vida/ui, shipped)                         via createEntityAdapter.toEntityProps(source)
        ├─ mode: merged|tabbed  (EntityModeStore — first consumer; per-instance)
        ├─ layout slot   = <NotePageLayout entityType entityId>   ← the Layout-facet SLOT
        │     ├─ NotionHeader (icon · title · cover? · core props)       apps/web/src/notes/notion-header.tsx  [NET-NEW]
        │     └─ overviewFor(entityType):                               apps/web/src/notes/overview-registry.ts [NET-NEW]
        │           note     → NoteOverview (Properties · Attachments⌀ · Backlinks⌀)   [S2]
        │           journal  → JournalOverviewStub (Today / /summary⌀ / Streaks⌀)      [S2 stub]
        │           <other>  → absent renderer ⇒ fe-notes' own note layout (no dead affordance)   [RIDE later]
        └─ editor slot  = <NoteEditorBody state doc onChange>          wraps VidaEditor chrome='bare' (borderless)
              gated by offersEditor(entityType, hasPage)  (schema.isEntityType + page exists)
```
`⌀` = empty-but-functional seam (section renders its own teaching-empty; filled by S3/S5/S6).

## 3. Net-new units (files)
| File | Purpose | Notes |
|------|---------|-------|
| `apps/web/src/notes/note-entity.tsx` | the `/notes/$id` surface; composes `useNoteEntity` → adapter → `EntityView` | pure UI; state-as-prop |
| `apps/web/src/notes/use-note-entity.ts` | **first `useEntity` consumer** — returns `{source, state}` | STUB: honest-empty + `?sample`; live swap = React-Query over `getPage` (zero-sig-change) |
| `apps/web/src/notes/notion-header.tsx` | **NET-NEW** NotionHeader: type-icon (Lucide) · serif title · optional cover · continuous property rows (no boxes) | lives in apps/web (feature composition over UI-1 primitives, not a generic @vida/ui primitive) |
| `apps/web/src/notes/overview-registry.ts` | the Layout-facet slot registry — `registerOverview(type, renderer)` + `overviewFor(type)` | module-level map; `note`+`journal` registered here; absent ⇒ fallback |
| `apps/web/src/notes/note-overview.tsx` | the `note` layout: Properties (live-ish) + Attachments⌀ + Backlinks⌀ sections | md 2-up + full rows (envision round-2b grid rule) |
| `apps/web/src/notes/note-editor-body.tsx` | borderless editor facet: `VidaEditor chrome='bare'` + the 4 terminal states | NOT the desk/sheet CanvasEditor (D-S2-1) |
| `routes.tsx` (edit) | add `/notes/$id` lazy route to the tree | mirrors the `/notes` + `/graph` lazy pattern |
| `*.test.tsx` per unit | jsdom tests | mirror S1 coverage |

Reuses shipped: `EntityView` · `createEntityAdapter`/`offersEditor`/`toEntityProps`/`EntityModeStore`/
`createInMemoryEntityModeStore` · `DashboardView` (tabbed overview grid) · `Card`/`EmptyState` · `VidaEditor` +
`ensureCanvasEditorStyles` + `page-binding` `PageLike`/`toCanvasEditorProps` (data seam) · Lucide icons (EC-22).
**NOT reused:** `Chip`/`ProgressBar`/`EffectRail`/`StageTrack` were greybox-only blocks (envision round-2c), NOT in the
`@vida/ui` barrel — the `note` overview needs none of them (they belong to the RIDE-away task/deliverable overviews).

**Mode-aware layout (preflight finding):** `EntityView` renders the SAME `layout` node in both modes + inserts a
`FacetDivider` in merged. So the surface (which owns `mode`) passes a **mode-aware layout node**:
`layout = mode==='merged' ? <ContinuousNotionLayout> (NotionHeader + inline Eyebrow sections, no boxes — EC-19)
: <DashboardOverview> (DashboardView Card grid — tabbed Overview tab)`. The merged `FacetDivider`'s effect on EC-19
continuity is a Visual-Gate assertion.

## 4. Decisions — all DOC-RESOLVED (grounded before the gate, per the standing "check the docs first" rule)
- **D-S2-1 — editor body = borderless `VidaEditor chrome='bare'` + `ensureCanvasEditorStyles`, NOT the sheet-on-desk
  `CanvasEditor` component. [DOC-RESOLVED by precedence.]** The docs conflict: the reuse-path
  (`interpretation.md:61-63` `[INTERP]` "mount THIS"; `page-binding.ts` `editorNode = <CanvasEditor …>`; canvas-editor
  `slice-map.md:28` sheet-on-desk ~1136) points to `CanvasEditor`, but the **LOCKED, Victor-approved** `envision.md`
  (round-2 §4 "`VidaEditor chrome='bare'` on a borderless 740px measure + `ensureCanvasEditorStyles`, no frame/ring
  box"; §7 "North star = NOTION"; EC-19 continuous; EC-23 borderless) shows a borderless page with **no desk/sheet**
  (Notion has no page-sheet metaphor). **Precedence: aspect/envision intent OUTRANKS the seam-contract/decomposition**
  ([[aspect-docs-outrank-rebuild-decomposition-artifacts]]) → envision governs. Reuse page-binding's `PageLike`/content/
  `onChange` **data** seam; compose the node as bare `VidaEditor`, not `CanvasEditor`. *Consequence: #7's `CanvasEditor`
  component is bypassed for the note page (its binding types are reused). The only point Victor might overrule.*
- **D-S2-2 — data = honest-stub (mirror S1 / D2). [DOC-RESOLVED.]** `use-note-entity` ships the live SIGNATURE but a
  stubbed source: `{state:'empty'}` default + `?sample` DEV gate for the Visual Gate; the live React-Query swap over
  `getPage`/`updatePage` is deferred (no apps/web `NotesService` composition root yet — S1 D2 / interpretation F3).
  `ProviderRead` precedent (`page-binding.ts` "hook deferred to the first consumer"); zero-signature-change swap.
- **D-S2-3 — merged/tabbed memory = the `EntityModeStore` CONVENTION on the in-memory reference store; NO durable
  schema invented. [DOC-RESOLVED.]** `fe-codec-entity-facet` pins O4 (the storage schema) "**design-pass-open**" four
  times (`interpretation.md:211`; `seam-contract.md:86` "CONVENTION only, not a schema"; `slice-map.md:59,81` "**Out:**
  the storage schema"). EC-5 memory is tagged **feel** (live gate). So M1 wires `createInMemoryEntityModeStore`;
  inventing a localStorage/`nav_preferences` schema now would **violate O4's No-Guessing deferral**. Durable persist =
  a later design-pass, zero-sig-change.
- **D-S2-4 — the Layout-facet slot = a module-level renderer registry.** `registerOverview(type, renderer)` +
  `overviewFor(type)`; S2 registers `note` (full) + `journal` (stub). An **absent renderer ⇒ fe-notes' own note layout**
  (empty-but-functional — the fe-shell panel-slot precedent, seam-contract 3a). fe-tasks/fe-projects call
  `registerOverview` for their types later (zero-sig swap). No dead affordance for task/milestone/deliverable now.
- **D-S2-5 — `content` is never patched (CRDT).** `updatePage` is metadata-only by the ① contract; `VidaEditor` owns
  content via its own binding (Yjs seam deferred — IR-3). Any "save" path touches metadata only; the editor's `onChange`
  is the (deferred) content-binding leg. Architecture invariant, not a choice.
- **D-S2-6 — NotionHeader lives in apps/web, not @vida/ui.** It's a feature composition (Notion page chrome) over UI-1
  primitives + Lucide, notes-specific — the house boundary keeps @vida/ui generic. Closest precedents: CanvasView
  masthead + EntityView title-hero (referenced, not imported).

## 5. Envision coverage — S2's EC Visual-Gate MUSTs
| EC | Assertion | Where satisfied |
|----|-----------|-----------------|
| EC-4 | note page LEADS with the Editor facet (default active = editor), borderless notebook, toolbar above | `defaultFacet='editor'`; NoteEditorBody (bare) |
| EC-5 | merged ⇄ tabbed toggle (Overview/Note); per-type default | EntityView mode + EntityModeStore |
| EC-15 | composes across the 6 page-types (editor-led); journal shows /summary | overview-registry: note + journal stub; others fall back |
| EC-18f | note Overview = clean freeform: Properties · Attachments · Backlinks | NoteOverview (Attachments/Backlinks as ⌀ seams) |
| EC-19 | merged = continuous Notion page (header + inline per-type sections → editor), not a boxed property list | NotionHeader → inline sections → bare editor (D-S2-1) |
| EC-23 | borderless editor (chrome-bare, no frame/blue box); focus-ring only on keyboard | `VidaEditor chrome='bare'` |
| EC-22 | every glyph a Lucide icon, theme-tinted (cross-cutting) | all S2 icons |

EC-24 (editor blocks) = the parked ui-3 `@vida/editor` fix; **consume-verified** here (the note editor renders
Quote/Task-list correctly) but lands as a separate `@vida/editor` PR, not in fe-notes' PR.

## 6. Test plan
- `use-note-entity`: honest-empty default · `?sample` populates · state threading.
- `overview-registry`: `note`/`journal` resolve · absent type ⇒ fallback (no throw) · `registerOverview` swap.
- `note-entity`: offersEditor gate (page-able + hasPage ⇒ editor facet; page-less ⇒ layout-only) · merged⇄tabbed
  via the store · `defaultFacet='editor'` · metadata-only update path never touches `content`.
- `notion-header` / `note-overview`: renders icon+title+props · Attachments/Backlinks empty-but-functional sections.
- Reconcile any S1 route test for the new `/notes/$id` entry.
- Gate target: `tsc 0 · eslint 0 · @vida/web green` (Node 24).

## 7. Blocking Visual Gate (real browser, after g2)
Brave driving the real vite app (onboarding→shell→`/notes/$id?sample`), per [[apps-web-visual-gate-drive-real-app]]:
3 presets × light/dark × 375/768/1440 — EC-4/5/15/18f/19/22/23 MUSTs · merged continuity (no desk/box break) ·
borderless editor (no blue frame; focus-ring on keyboard only) · mode toggle live · AA full-matrix incl. warm-dark ·
axe 0 · 0 overflow · console clean. PASS before the gate closes. (PR opens at S9, not here.)

## 8. Risks
- RNW flex-collapse on the merged continuous column (the fe-shell/[[flex1-child-collapses…]] lesson) — assert heights.
- Double-header if D-S2-1 is overruled toward CanvasEditor — would need a chrome-less CanvasEditor variant (extra work).
- EntityView centers at `maxWidth:1136`; the Notion writing measure (~740) must sit WITHIN it without a second cap fight.
