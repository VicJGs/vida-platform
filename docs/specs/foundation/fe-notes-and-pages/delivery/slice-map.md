# Slice Map — fe-notes-and-pages (② frontend unit #27)

> Entity Delivery Flow §2 (Decomposition Gate). **Decide-mode** for the slice breakdown (no frontend slice-map
> existed); **Ratify-mode** for the leg→unit homing (P6 fixed it). All slices are `frontend`. Each closes with a
> blocking per-slice Visual Gate (§5 / ADR-021 §3.5). Envision coverage is plane/unit-aware: every `structural` EC
> maps to a slice HERE **or** is homed (RIDE) to its owning unit. Approved before per-slice work.

## 0. Scope boundary (confirmed by Victor 2026-10-10)
fe-notes-and-pages = the **notes substrate + the note-page frame/slot**. The rich per-entity-type overviews RIDE from
their owning ② units into the frame's Layout-facet slot:
- **journal** overview → `fe-journals` (JOU-*) · **task_note** work-canvas → `fe-tasks` (TAS-*) ·
  **milestone/deliverable** (measurement · staged proof · effect rail) → `fe-projects` (PRO-*).
fe-notes provides the FRAME + the per-type SLOT + the `note` type's own clean layout + all note-native cross-cutting
surfaces. It consumes `@vida/editor` for the editor + its blocks (NOT re-authored — NOT-52).

## 1. The seam this consumes
`createNotesService(deps): NotesService` (the FINISHED ① — `docs/features/notes-and-pages/delivery/seam-contract.md`)
+ the ② consumption seams (React-Query hooks · the Layout-facet slot · deferred backends) → `./seam-contract.md`.

## 2. Slices (ordered; all `frontend`; per-slice blocking Visual Gate)

| Slice | Builds | Legs | EC Visual-Gate MUSTs |
|-------|--------|------|----------------------|
| **S1 — Notes Collection + route** | `apps/web/src/notes/` surface + `/notes` route; `CollectionView` wired (List·Gallery·Calendar·Neural per page-type), note-card + gallery-card renderers, 8-state, Filter/Sort/new-view entry points; Neural via `NeuralGraph` → `empty` terminal (AR-8 deferred) | NOT-48, NOT-49 | EC-1, EC-2, EC-3, EC-22 |
| **S2 — Note-page frame (editor-led) + Layout-facet slot** | the note entity page: `EntityView` (merged/tabbed, `defaultFacet=editor`) + `canvas-editor` (chrome=bare, borderless) + **NotionHeader** + the **per-type Layout-facet SLOT** (renders `note` layout here; mounts the RIDE overview for journal/task/milestone/deliverable); merged = continuous page, tabbed = Overview/Note | NOT-52 (editor/blocks consume) | EC-4, EC-5, EC-15, EC-18f, EC-19, EC-22, EC-23 |
| **S3 — Backlinks panel** | "What links here" from `getBacklinks` — merge `{pageLinks, entityLinks}`, **grouped by source** (the G6 shape) | NOT-24 | EC-6, EC-22 |
| **S4 — `[[` picker + create-on-miss + preview-card** | editor `[[`/slash picker over `resolveWikiLink`; "+ Create '<text>'" = explicit two-call compose (`createPage('note')`→`createPageLink`); link preview-card (unenriched — BSE-12 deferred) | NOT-19, XCU-BSE-12 | EC-10, EC-11, EC-22 |
| **S5 — `/summary` block + per-section degrade** | the `/summary` editor block consuming the MOD-journals engine seam; per-section empty/error degrade (that section only) | NOT-32, NOT-34 | EC-9, EC-22 |
| **S6 — Page metadata + attachments** | favorite/archive/icon/cover controls via `updatePage`; attachments list via `getAttachments`/`addAttachment`/`removeAttachment` | NOT-47 | EC-7, EC-8, EC-22 |
| **S7 — Search UI (degraded)** | search box → `search-unavailable` terminal (FTS5 → DB-8 deferred) | NOT-50 | EC-12, EC-22 |
| **S8 — Templates picker/save** | template list + apply + save-current-as-template (live-block layouts, ADR-009) | NOT-51 | EC-13, EC-22 |
| **S9 — Block add-menu / slash-menu** | the capability palette in the editor (offered/allowed per surface — CAP-13 teeth-split; `block_instances` placement — CAP-12); page/editor surface only (Space-level = `fe-shell-integration-wiring`) | XCU-CAP-12, XCU-CAP-13 | EC-14, EC-22 |

**Σ legs = 13** (NOT-19,24,32,34,47,48,49,50,51,52 + BSE-12 + CAP-12 + CAP-13) → **0 unhomed**.

## 3. Envision coverage — every `structural` EC homed (plane/unit-aware)
| EC | Home |
|----|------|
| EC-1, EC-2, EC-3 | S1 |
| EC-4, EC-5, EC-15, EC-19, EC-23 | S2 |
| EC-18f (note layout) | S2 |
| EC-6 | S3 · EC-10/11 → S4 · EC-9 → S5 · EC-7/EC-8 → S6 · EC-12 → S7 · EC-13 → S8 · EC-14 → S9 |
| EC-22 (icons) | ALL slices (cross-cutting MUST) |
| EC-24 (editor blocks) | **ui-3 `@vida/editor`** change (done: blockquote + taskList CSS) + consume-verify at S2/S9 |
| **RIDE — homed to other ② units** (fe-notes provides the S2 slot; the overview is theirs): | |
| EC-18a (journal overview) | ~~`fe-journals`~~ → **`journals-rescope`** (fe-journals was renamed fe-home and closed without it; Journals is its own module — Victor 2026-10-26; JR-1) |
| EC-18b (task work-canvas), EC-18c (task-group), EC-20 (effect rail) | `fe-tasks` (+ sessions for the rail) |
| EC-18d (milestone), EC-18e (deliverable), EC-21 (staged proof), EC-20 (rail) | `fe-projects` (+ sessions) |
| EC-16, EC-17 (feel) | live per-slice Visual Gate (every FE slice) |

No `structural` EC is dropped: each is a fe-notes slice MUST, or a documented RIDE to its owning unit via the S2 slot.

## 4. Decomposition decisions / flags (for the gate)
- **D1 — the S2 Layout-facet SLOT is the cross-unit seam.** fe-notes ships S2 with the `note` layout + a slot that, by
  `entity_type`, mounts the owning unit's overview (RIDE). M1 ships the `note`/`journal`-stub layout; the task/
  milestone/deliverable overviews arrive with `fe-tasks`/`fe-projects`. The slot is an empty-but-functional seam
  (the fe-shell #14/#15 panel-slot precedent) — S2 ships without them, no dead affordance.
- **D2 — live `NotesService` composition root** (interpretation F3): is the service wired live for apps/web in M1 or
  stubbed? → resolve at S1 PLAN; mirror the CODEC first-consumer-defer + `ProviderRead` precedent.
- **D3 — React-Query key/invalidation scheme** (F4): per-slice `/contract`; prefix-safe invalidation (memory
  [[verify-a-cache-liveness-BR-against-the-runtime-config]]).
- **D4 — ui-3 editor-blocks fix** (EC-24): the `@vida/editor` CSS fix (Quote + Task list) lands as a SEPARATE ui-3
  change, not in fe-notes' PR. fe-notes consume-verifies at S2/S9.

## 5. Per-slice gate ledger
Each slice: PLAN ░g1░ → IMPL ░g2░ → BUILD → blocking **Visual Gate** (real browser · every state × light/dark ×
375·768·1440 · §XIV a11y · the slice's EC MUSTs) → PASS before the next. PR opens at the last slice. No batching.
