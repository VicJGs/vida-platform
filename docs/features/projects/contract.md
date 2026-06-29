<!-- Contract — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · project.ts · v1 API.md · intake -->

# Contract — Projects  (level: Feature)

> **Status:** types exist (`@vida/types/project.ts`: Project/Milestone/ProjectDocument) but `@vida/core`
> `models/project.ts` is an **empty placeholder (0 lines)** — no service. The `deliverables` table, measurement
> system, vision/mission pages, project_contacts(role), and external/AI integrations have **no schema/code** yet.
> Signatures below are the **designed interface**; ⚠ INTENDED items depend on the ADR-002 amendment + ADRs.
> `[FACT: project.ts present; core model 0 lines; ADR-002 §5.4]`

## Exposed surface (via `@vida/core`)
- **Project CRUD & queries** (`Project` `[FACT: project.ts L57-81]`): `createProject` · `updateProject` ·
  `softDeleteProject` (cascades, PJ-9) · `listProjects(filter)` (dashboard/timeline; archived = status filter, G9)
  · `pinProject(id)` (G1)
- **Milestones** (`Milestone` `[FACT: L83-96]`): `createMilestone` (nestable via `parent_milestone_id`) ·
  `getMilestoneTree(projectId)` · `getMilestoneProgress(id)` (rollup, PJ-3)
- **⚠ Deliverables (INTENDED, G2/G4):** `createDeliverable(milestoneId, {measurement_type, source})` ·
  `getDeliverableProgress(id)` → derived from its measurement backend (financial/stats/metric/log/artifact) ·
  `linkDeliverableSource(id, entityRef)` (e.g. a Finance account)
- **Progress (derived, PJ-3):** `getProjectProgress(id)` → bottom-up rollup (Tasks→Deliverable→Milestone→Project)
- **Documents / vault** (`ProjectDocument` `[FACT: L98-107]`): `addDocument` (inline ≤threshold, else R2, PJ-8) ·
  `getDocument` · `listDocuments(projectId)`
- **⚠ Vision/Mission pages (INTENDED, G3):** `getProjectPage(id, 'vision'|'mission')` → TipTap `pages` row

## What it consumes (outside dependencies)
- **Tasks — dedicated Projects API (PJ-5, G7):** a project-scoped task service (project-task list, progress
  counts, the project-task standalone UI). Never direct task-table reads. `[INTENT G7; FACT: Tasks TK-9]`
- **Finance (PJ-4.1/G8):** deliverable financial measurement + project↔account links read account/asset/
  investment values via the Finance contract. `[INTENT G8; FACT: Finance contract]`
- **Relationships (G8):** `project_contacts(role)` — team/stakeholders with roles, via the Relationships contract.
- **Notes & Pages:** project/milestone/deliverable notes + vision/mission pages (`entity_type` ∈ project,
  milestone, ⚠ deliverable). `[FACT: ADR-002 L1343; INTENT G10]`
- **⚠ External services + AI (PJ-11, opt-in):** third-party metric ingestion (device-side) + agentic on-device AI
  over vault docs — gated on the two ADRs + the extension-model principle. `[INTENT G4,G6]`

## Fed by (parent-module links — read via integration points, §6)
- **Wave-2 foundation** — Projects is *fed by* Tasks (tasks point up via `project_id`/`milestone_id`) and is a
  hub many modules point at. `[FACT: ADR-002 §5.3; module-dependency-graph]`

## Consumed by
- **Purpose & Goals** → `purpose_projects` (a project serves a purpose). `[FACT: project.ts L248]`
- **Bucket List** → `bucket_list_items.project_id`. `[FACT: project.ts L228]`
- **Check-in reviews** → read project progress in weekly/monthly/yearly reviews (Check-ins G7). `[INTENT]`
- **Journal `/summary` + global Calendar** → project events + due milestones. `[INTENT G8]`
- **Gamification** → project-completion XP (⚠ INTENDED). `[INTENT G8]`

## Contract error cases
- `getDeliverableProgress` when its measurement source is unreachable → last-known + typed flag (PJ-4). `[INTENT G4]`
- `addDocument` over the inline threshold → routed to R2; R2 failure → typed `AttachmentSyncError`, kept local (PJ-8). `[INTENT G6]`
- External-metric ingest requiring server plaintext → refused unless opted-in (`IntegrationConsentRequired`, PJ-11). `[INTENT]`
- Reading tasks other than via the Tasks→Projects API → not allowed (PJ-5). `[FACT: TK-9]`

## Completion checklist
- [x] exposed + consumed + fed-by + consumed-by · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT/INTENT] each claim · [x] not-yet-coded + INTENDED flagged
