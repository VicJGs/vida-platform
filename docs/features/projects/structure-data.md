<!-- Structure & Data — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · project.ts · ADR-001/003 · intake -->

# Structure & Data — Projects (level: Feature)

## Data model — 3 owned tables (current, authoritative) `[FACT: ADR-002 §5.4 L1532-1625; project.ts]`

| Table               | Purpose              | `[E]` fields                     | Key constraints                                                                                                      |
| ------------------- | -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `projects`          | the project          | title, description, vision, tags | `scope`/`complexity`/`status`/`priority` CHECKs; `progress` 0-100; hours in **minutes**; idx status; soft-delete     |
| `milestones`        | milestone (nestable) | title, description               | `project_id` **CASCADE**; `parent_milestone_id` self-ref **SET NULL**; `status` CHECK; `progress` 0-100; idx project |
| `project_documents` | secure file vault    | name, `encrypted_blob` (BLOB)    | `project_id` **CASCADE**; `milestone_id` **SET NULL**; file_type/file_size                                           |

- `progress` on projects + milestones is currently `0-100 **NOT NULL**` (As-is FACT). **[INTENT M3 — ADR-011 §3.4/§3.2]:**
  reframe to a **nullable override slot** (`NULL ⇒ derive`) — the module implements **`progress()` derived-on-read**;
  the stored column is only a manual override, never `NOT NULL DEFAULT 0` (which cannot express "unmeasured"). `[FACT: ADR-002 §5.4 L1574 (projects) / L1610 (milestones)]`
- `estimated_hours`/`actual_hours` are INTEGER **minutes**. `[FACT: L1552]`
- Structured columns sync **LWW**; document blobs follow the attachment path (large → R2). `[FACT: ADR-003]`

### ⚠ INTENDED additions (NOT in ADR-002 / project.ts today) — ADR-002 amendment + ADRs `[INTENT G2,G3,G4,G6,G8]`

- **`deliverables` table (G2):** under a milestone; an ADR-011 **pursuable**. Carries **`measurement_kind`** CHECK
  ∈ `quantitative·milestone·rate·qualitative` (M1) + **`binding_mode`** CHECK ∈ `manual·derived-pull·event-trigger`
  (M2, distinct from provenance `source`); nullable `progress()` (M3). The bespoke `measurement_type` enum is
  **retired**: its 5 legacy values map to (kind × binding × source) — e.g. **artifact** = `milestone`+`manual`;
  **financial/task_statistic/activity_log** = `quantitative`+`derived-pull` from an internal source; **third_party_metric**
  = `quantitative`+`derived-pull` from an **ADR-014** external source. The source (a Finance account/asset, a metric,
  an artifact doc) is bound via the **measurement-source seam (M5/R7)**. The exact source-binding **design pass** (the
  measurement taxonomy DDL) is `[DEFERRED — build phase]`. `[INTENT M1/M2/M3 — ADR-011 §3.1/§3.5/§3.4/§3.6; G4]`
- **Vision/Mission pages (G3):** TipTap `pages` (`entity_type='project'`); `vision` column → one-line summary
  at most; **mission** added.
- **Cross-module links (G8):** `project_contacts(role)` junction (Relationships team/stakeholders with role);
  project↔Finance account link; **project events** (feed the global Calendar).
- **Notes (G10):** add `deliverable` as a `pages`/`entity_links` `entity_type`.
- **Investigations (Wave R, 2026-07-15) — RESOLVED BY COMPOSITION, no new entity.** A research/investigation is a
  **`deliverable` with `measurement_kind='milestone'` + `binding_mode='manual'`** (an artifact deliverable — research/analysis output) whose **exploration workspace is a
  Knowledge Lab investigation**, linked via `entity_links`. Execution/tracking = the deliverable (progress rolls up
  normally); open-ended exploration content (question → sources → findings → synthesis) = **Knowledge**. **No
  `investigations` table.** `[INTENT: Victor 2026-07-15]`
- **Vault/large files (G6):** R2 attachment pipeline for big encrypted blobs (ADR-003).
- **Shared-tags migration (G11):** deprecate inline `projects.tags` → the `entity_tags` primitive (ADR-006 SP1, scoped).

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

- **Wave 2 foundation + hub.** In-edges: Tasks (tasks point up via FKs), **Purpose** (As-is FACT `purpose_projects`
  junction, project.ts L248 — **[INTENT M7]: retired → the polymorphic weighted `contributions` primitive**, ADR-011
  §Amends; a project _contributes_ to a purpose/target), `project_habits` (**kept** — not in M7's retirement list),
  Bucket List (`project_id`), Check-in reviews, Journal/Calendar. Out-edges: Tasks (dedicated API), Finance (deliverable
  measurement source via the M5/R7 seam + account links), Relationships (`project_contacts`), Notes (pages), ⚠ external
  ingestion (**ADR-014**) + agentic AI (**ADR-015**). `[FACT: module-dependency-graph; project.ts junctions; INTENT M7, G4,G7,G8]`
- No direct cross-module table reads — integration points only (§6). `[FACT: core §6]`

## Single source of truth (constitution §3)

- **Progress** derives bottom-up (Tasks→Deliverable→Milestone→Project) via `progress()` on-read (M3) — never a second
  truth. **[INTENT M4 — ADR-011 §3.3]:** the DOWN nesting weight is a **per-child column** (default NULL = equal-weight);
  the UP ladder (project → purpose) is weighted by **`contributions.contribution_percentage`** — not count-weighting.
- **Project time** derives from task focus sessions (PJ-6) — no separate ledger.
- **Tasks** are owned by Tasks, read via the dedicated API (PJ-5) — Projects never copies them.
- Enums (`ProjectScope`, `ProjectComplexity`, shared `Status`/`Priority`) — string-literal unions + SQL CHECK +
  Zod, declared once. `[FACT: project.ts L13-15; common]`
- Tags → the `entity_tags` primitive (ADR-006 SP1, scoped; PJ-12), not inline. `[INTENT G11]`

## ADRs / structural decisions

- **ADR-002 §5.4** — 3 tables (authoritative). **ADR-001** — RQ+Zustand, TipTap (vision/mission), R2 docs. **ADR-003** — LWW + attachments.
- **ADR-011** (universal measurability) — `measurement_kind`/`binding_mode`/nullable `progress()`/weighted rollup/
  `contributions` (M1–M7). **ADR-014** (external ingestion) — `third_party_metric` device-mediated (X1) under
  `external_in_ok` (X5). **ADR-015** (AI) — agentic on-device/cloud (AI1/AI4), `source=ai` (AI6). All three now
  **RATIFIED** (were "surfaced candidates" pre-realignment). `[INTENT: ADR-011/014/015]`
- ⚠ **Still owed at build:** (1) the **deliverables table + measurement-source design pass** + the **ADR-002 amendment**
  (the INTENDED tables); (2) the **extension-model principle** → core constitution. `[INTENT G2,G4,G6, governing principle]`

## Completion checklist

- [x] data model (3 tables + INTENDED deliverables) · [x] dep graph (Wave-2 hub, within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTENT/INTERP] each claim
