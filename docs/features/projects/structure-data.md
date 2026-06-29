<!-- Structure & Data — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · project.ts · ADR-001/003 · intake -->

# Structure & Data — Projects  (level: Feature)

## Data model — 3 owned tables (current, authoritative) `[FACT: ADR-002 §5.4 L1532-1625; project.ts]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `projects` | the project | title, description, vision, tags | `scope`/`complexity`/`status`/`priority` CHECKs; `progress` 0-100; hours in **minutes**; idx status; soft-delete |
| `milestones` | milestone (nestable) | title, description | `project_id` **CASCADE**; `parent_milestone_id` self-ref **SET NULL**; `status` CHECK; `progress` 0-100; idx project |
| `project_documents` | secure file vault | name, `encrypted_blob` (BLOB) | `project_id` **CASCADE**; `milestone_id` **SET NULL**; file_type/file_size |

- `progress` on projects + milestones is denormalized 0-100 — a **derived cache** (PJ-3). `[FACT: L1548,1584]`
- `estimated_hours`/`actual_hours` are INTEGER **minutes**. `[FACT: L1552]`
- Structured columns sync **LWW**; document blobs follow the attachment path (large → R2). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / project.ts today) — ADR-002 amendment + ADRs `[INTENT G2,G3,G4,G6,G8]`
- **`deliverables` table (G2):** under a milestone; `measurement_type` ∈ {financial, task_statistic,
  third_party_metric, activity_log, artifact} (G4); status/progress; a **flexible source link** (e.g. to a
  Finance account/asset, a metric, an artifact doc). Its own **design pass** (the measurement taxonomy).
- **Vision/Mission pages (G3):** TipTap `pages` (`entity_type='project'`); `vision` column → one-line summary
  at most; **mission** added.
- **Cross-module links (G8):** `project_contacts(role)` junction (Relationships team/stakeholders with role);
  project↔Finance account link; **project events** (feed the global Calendar).
- **Notes (G10):** add `deliverable` as a `pages`/`entity_links` `entity_type`.
- **Vault/large files (G6):** R2 attachment pipeline for big encrypted blobs (ADR-003).
- **Shared-tags migration (G11):** deprecate inline `projects.tags` → shared scoped tags.

## State management map `[FACT: ADR-001 State; v1 hooks/API.md]`
- **React Query** owns project/milestone/document reads + optimistic writes, the **derived** progress rollups,
  and (⚠) deliverable measurement reads (incl. cross-module Finance/metric pulls). Invalidated up the hierarchy
  on any descendant change.
- **Zustand** owns ephemeral UI: active view (dashboard/timeline/board/Kanban), pinned project, milestone tab
  selection, vault upload state, form drafts.
- Progress + project time are **derived** (PJ-3/PJ-6) — never hand-maintained.

## Page / route map `[INTENT G1,G9; FACT: CLAUDE.md §2]`
- **Projects Dashboard** (all projects) · **Projects Timeline** (+ user-chosen layout: timeline/board/Kanban) ·
  **pinned project**.
- **Project standalone** — milestones (Kanban + tree), document vault, progress, vision/mission pages, linked tasks.
- **Milestone standalone** — timeline widget of components + tabbed views + deliverables/goals info.
- **Deliverable standalone** — ⚠ cross-module aggregation (e.g. linked account balance) + measurement.
- **Project-Task standalone** — Tasks entity, Projects-Universe-scoped UI (via the dedicated Tasks→Projects API).
- Archived = a **view filter** (status ∈ completed/cancelled / soft-deleted), not a new state (G9).

## Dependencies / graph
- **Wave 2 foundation + hub.** In-edges: Tasks (tasks point up via FKs), Purpose (`purpose_projects`), Bucket List
  (`project_id`), Check-in reviews, Journal/Calendar. Out-edges: Tasks (dedicated API), Finance (deliverable
  measurement + account links), Relationships (`project_contacts`), Notes (pages), ⚠ external services + AI.
  `[FACT: module-dependency-graph; project.ts junctions; INTENT G4,G7,G8]`
- No direct cross-module table reads — integration points only (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)
- **Progress** derives bottom-up (Tasks→Deliverable→Milestone→Project), a cache (PJ-3) — never a second truth.
- **Project time** derives from task focus sessions (PJ-6) — no separate ledger.
- **Tasks** are owned by Tasks, read via the dedicated API (PJ-5) — Projects never copies them.
- Enums (`ProjectScope`, `ProjectComplexity`, shared `Status`/`Priority`) — string-literal unions + SQL CHECK +
  Zod, declared once. `[FACT: project.ts L13-15; common]`
- Tags → shared scoped vocabulary (PJ-12), not inline. `[INTENT G11]`

## ADRs / structural decisions
- **ADR-002 §5.4** — 3 tables (authoritative). **ADR-001** — RQ+Zustand, TipTap (vision/mission), R2 docs. **ADR-003** — LWW + attachments.
- ⚠ **Surfaced:** (1) **deliverables table + measurement system** (design pass + ADR-002 amendment); (2) the
  **extension-model principle** → core constitution; (3) **external data ingestion under ZK** + (4) **AI/LLM
  (agentic, on-device) under ZK** — two ADRs. `[INTENT G2,G4,G6, governing principle]`

## Completion checklist
- [x] data model (3 tables + INTENDED deliverables) · [x] dep graph (Wave-2 hub, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
