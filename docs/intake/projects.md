# Intake: Projects
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/projects (Wave 2 foundation — Tasks link in; consumed by Purpose, Check-in reviews, Bucket List)
Sources: v2 (ADR-002 §5.4 + @vida/types/project.ts + CLAUDE.md §2) · v1 (life-os src/features/projects + types/projects.ts + API.md) · user intent
Session: 2026-06-28 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 3 tables** `[FACT: ADR-002 §5.4 L1532-1625; project.ts]`:
- `projects`: `title`[E], `description`[E], `vision`[E], `scope`{personal,professional,academic,community}, `complexity`{simple,moderate,complex,enterprise}, `status`{not_started,in_progress,completed,on_hold,cancelled}, `priority`{critical…none}, **`progress` 0-100 (denormalized)**, `start_date`/`target_end_date`/`actual_end_date`, `estimated_hours`/`actual_hours` (**INTEGER minutes** despite name), `tags`[E], `color`, `icon`, soft-delete. `[FACT: L1535-1568]`
- `milestones`: `project_id` (CASCADE), **`parent_milestone_id` self-ref (SET NULL) → nested milestones**, `title`[E], `description`[E], `status`, **`progress` 0-100**, `due_date`, `sort_order`. `[FACT: L1576-1598]`
- `project_documents`: `project_id` (CASCADE), `milestone_id` (SET NULL), `name`[E], `file_type`, `file_size`, **`encrypted_blob` BLOB[E] (file stored locally)**. `[FACT: L1606-1624]`

**Intent (CLAUDE.md §2)** `[FACT: CLAUDE.md §2]`: document storage (encrypted blobs local); **milestone tracker from tasks and deliverables**; **vision statement AND mission statement (in markdown via TipTap)**; **progress tracker based on milestones, tasks, and deliverables (auto-calculated)**; **hierarchy Project > Milestones > Deliverables > Tasks**.

**Cross-cutting:** Tasks link via `task.project_id` + `task.milestone_id` (Tasks-owned) `[FACT: ADR-002 §5.3; CLAUDE.md §3]`; junctions `project_habits`, `purpose_projects` `[FACT: project.ts L248-256]`; `bucket_list_items.project_id` `[FACT: project.ts L228]`; `project` + `milestone` are valid `entity_links` note targets `[FACT: ADR-002 L1343]`.

## B. WHAT v1 DID — life-os projects (legacy)
`[FACT: life-os src/types/projects.ts + features/projects + API.md]`
- **Full feature**: ProjectsPage · ProjectDetailPage · ArchivedProjectsPage. `[FACT: pages]`
- **Milestone Kanban** (MilestoneKanban/KanbanColumn/MilestoneKanbanCard) — board view of milestones. `[FACT: components]`
- **Project-level time tracking** (TimeLogButton/List/Summary, ManualTimeEntry, ProjectTimeReport). `[FACT: components]`
- **Actions** (ActionForm) — v1's sub-items under projects/milestones (≈ deliverables/tasks). `[FACT: components]`
- **Documents** (DocumentUpload/Card/List/Section) — file storage. `[FACT: components]`
- **Purpose links** (PurposeLinkCard/Form/Section) — connect a project to a purpose. `[FACT: components]`
- **Archived projects** as a distinct view. `[FACT: ArchivedProjectsPage]`

### Key v1→v2 deltas (what changed, why it matters)
1. v2 **encrypts** title/description/vision/tags + document blobs `[E]` — ZK upgrade. `[FACT: §5.4 [E]]`
2. v2 **nests milestones** (`parent_milestone_id`) — a milestone tree, not a flat list. `[FACT: L1579]`
3. v2 **has no `deliverables` table** — yet CLAUDE.md §2 names a 4-level hierarchy incl. Deliverables. Tension. `[FACT: §5.4 vs CLAUDE.md §2]`
4. v2 **has `vision` column but no `mission`** — yet §2 promises vision AND mission via TipTap. `[FACT: projects table vs CLAUDE.md §2]`
5. v2 `progress` is denormalized 0-100 on both projects + milestones; §2 says **auto-calculated**. `[FACT: L1548,1584; CLAUDE.md §2]`
6. v2 `estimated_hours`/`actual_hours` are **minutes** (name is misleading). `[FACT: L1552 comment]`

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **Scope / views**: full v1 (assumed). Views: Projects list (+ **archived** view) · Project detail/standalone (milestones **Kanban** + tree, documents, time, vision/mission, progress, linked tasks) · milestone Kanban. Confirm set.
G2 — ⚠ **DELIVERABLES — the hierarchy gap**: §2 says Project > Milestones > **Deliverables** > Tasks, but the schema has only projects + nested milestones + tasks (via FK). Are "deliverables" = (a) the **nested milestone** level (`parent_milestone_id`: milestone → sub-milestone="deliverable"), (b) a **new `deliverables` table**, or (c) just **tasks** (drop the term)? Resolve the 4-level intent against the 2-entity schema.
G3 — ⚠ **Vision + Mission via TipTap**: `projects.vision` is a plain `[E]` column and there's **no `mission`**. Should vision + mission be **TipTap `pages`** (`entity_type='project'`, rich markdown — matches §2 "via TipTap"), with the column dropped/kept as a plain summary? How is mission stored?
G4 — **Progress auto-calculation (formula)**: confirm `projects.progress` + `milestones.progress` are **derived** (cache), auto-calculated from children. From what — child milestone completion, task completion, or both? Weighted how (by count, by status, by estimated_hours)?
G5 — **Time tracking relationship**: `projects.actual_hours` (minutes) — is it the **auto-sum of child tasks' `task_time_logs`** (one ledger, like Tasks TK-5), or **separate project-level logging** (v1 had ProjectTimeReport/ManualTimeEntry)? Resolve vs Tasks' time ledger.
G6 — **Document storage strategy**: `project_documents.encrypted_blob` stores files **inline locally**; for **large files** use the **R2 attachment pipeline** (ADR-003)? Size threshold for inline-vs-R2? Confirm.
G7 — **Project ↔ Tasks integration**: tasks link via `task.project_id`/`milestone_id` (Tasks-owned). Confirm milestones aggregate their tasks for progress (G4) and the detail page reads tasks via the integration point (not direct table reads). `[ties to Tasks TK-9]`
G8 — **Cross-module**: confirm `project_habits` (habits supporting a project), `purpose_projects` (project serves a purpose), `bucket_list.project_id`, and **Check-in reviews read project progress** (Check-ins G7). Any Gamification (project completion XP)?
G9 — **v1 features back?**: milestone **Kanban**, **archived** view (= a filter on status/deleted, or a real archived state?), project-level **manual time entry**. Which return?
G10 — **Notes via pages**: project + milestone notes via `pages` (`entity_type` ∈ project, milestone). Confirm (ties to G3 vision/mission as pages).
G11 — **Tags**: `projects.tags` inline `[E]` → migrate to the **shared scoped** tag system (Tasks/Finance/Relationships precedent)? Confirm.

## Resolution
`[INTENT: Victor, 2026-06-29]` — **IN PROGRESS** (G1–G3 captured; G4–G11 pending). WHOLE only when all answered.

- **G1 — Views (rich + flexible).** `[INTENT]`
  - **Projects Dashboard** — all projects' dashboards.
  - **Projects Timeline** — all projects in timeline view; the user **chooses the layout** (timeline / boards /
    Kanban / etc. — a view-flexibility like Tasks' view-builder).
  - **Pinned project** — a specific project shown in timeline (or the user's chosen view).
  - **Milestone standalone page** — a **timeline widget** showcasing its components, **tabbed** with other
    user-chosen views, plus info on its **deliverables, goals, etc.**
  - **Project-Task standalone page** — a Task, but a **special "project task" case** with distinct UI/UX scoped
    to the Projects module (Tasks-owned data, project-scoped presentation).
  - **Deliverable standalone page** — ⚠ **cross-module aggregation surface**: connects info it needs (e.g.
    **an account balance from Finance**, and other related data) — a deliverable can reference/surface data
    from across the OS.
- **G2 — Dedicated `deliverables` table.** `[INTENT]` New table between milestones and tasks → hierarchy
  Project > Milestone > **Deliverable** > Task is real (not nested-milestones). ⚠ → ADR-002 amendment. Deliverable
  carries status/progress + a **flexible cross-module link** mechanism (to account/other entities, per G1).
- **G3 — Vision + Mission as TipTap pages (recommendation kept).** `[INTENT]` Both are important guiding info —
  written AND meant to help/guide the user — so they become **TipTap `pages`** (`entity_type='project'`); plain
  `vision` column dropped/kept as a one-line summary; mission added. ⚠ → ADR-002 amendment.

- **G4 — Progress is a DYNAMIC, MULTI-TYPE deliverable measurement system (⚠ big INTENDED, needs design pass).**
  `[INTENT]` Tasks stay **binary**; but a **deliverable's achievement is measured across several backends**, giving
  a deep big-picture of project development:
  1. **Financial** — accounts/assets/investments related to the project (Finance integration).
  2. **Task-derived statistics** — personalized per-project counts/results from tasks.
  3. **Third-party service metrics** — Instagram, YouTube, email outreach, marketing campaigns, etc. ⚠ **external
     data ingestion → ZK tension (see below).**
  4. **Activity logs** — manual task changes + outside logs (calls, cold outreach, organic).
  5. **Solid artifacts** — designs, portfolios, documents, analyses, research (delivered / not).
  ⇒ a deliverable has a **measurement type** determining how its progress derives; project/milestone progress
  rolls up from deliverables + tasks. **Large enough to need its own mini-design pass** (the deliverable
  measurement taxonomy). Documented as intent + taxonomy now, not fully specced.
- **G5 — No separate project time; derived from task focus sessions.** `[INTENT]` Project time (if shown) derives
  from **focus sessions on project-tasks** (the Tasks time ledger). No project-level timer for now; **task focus
  (pomodoro) is maintained**. (One ledger, as recommended.)
- **G6 — Documents = structured project knowledge, AI-context-ready (⚠ ZK tension).** `[INTENT]` Project documents
  are templates, legal info, structured knowledge — explicitly intended to be usable by **LLMs / AI integrations**
  to boost the user's productivity/efficiency/decisions. ⚠ **AI/LLM use = sending plaintext OUT** → conflicts with
  ZK (Preferences already dropped AI fields for ZK) → **candidate ADR "AI/LLM integration under zero-knowledge"**
  (on-device model = safe; cloud model = opt-in documented dent). Storage = hybrid inline/R2 by size (unobjected
  recommendation). The AI integration itself is ⚠ INTENDED + DEFERRED.
- **G7 — Project-tasks via a DEDICATED Tasks→Projects API.** `[INTENT]` A "project task" is an entity **inside
  Tasks** but with a different structure/scope usable only by Projects. Tasks exposes a **dedicated
  Projects-facing service/API** (a project-tasks sub-contract) that Projects consumes — the specific Tasks
  capability surfaced just for Projects, through one integration point (not direct table reads). Backs the
  project-task special UI/UX (G1).

### ⚠ CONSTITUTIONAL — external integrations (generalize the Finance ADR) + AI egress (new ADR)
- **Candidate ADR (generalized): "External data ingestion under zero-knowledge"** — now covers banks (Finance) +
  social/marketing metrics (Projects deliverables, G4.3). Same rule: device-side fetch = ZK-safe; aggregator =
  documented dent; server-proxy = breaks ZK.
- **Candidate ADR (new): "AI/LLM integration under zero-knowledge"** — documents-as-LLM-context (G6) + any AI
  feature. On-device model = ZK-safe; cloud model = opt-in plaintext disclosure.
Both: ⚠ INTENDED + TENTATIVE until decided; the verified-real Projects surface is manual entry + local docs.

- **G8 — Cross-module links: all + three additions.** `[INTENT]` Confirmed: `project_habits`, `purpose_projects`,
  `bucket_list.project_id`, Check-in reviews read progress, deliverable→Finance links, Gamification XP (⚠).
  **Additions:** (a) **project ↔ Finance accounts** (link a project to specific accounts); (b) **project ↔
  Relationships contacts WITH ROLES** (project team/stakeholders — a new `project_contacts` junction carrying a
  `role`, e.g. client/collaborator/stakeholder); (c) **project events** (events related to a specific project →
  feed the global Calendar). ⚠ new junctions/table → ADR-002 amendment.
- **G9 — Views are user-personalized.** `[INTENT]` Kanban + archived-as-filter confirmed, but the view choice
  (timeline/board/Kanban/archived) is **left to the user** (personalization theme — no forced default).
- **G10 — Notes via pages CONFIRMED + project-scoped Task standalone.** `[INTENT]` project + milestone +
  deliverable get `pages` notes (add `deliverable` entity_type). Don't forget the **project-scoped Task
  standalone page** — a Tasks entity with a Projects-Universe-specific structure/UI (G1/G7).
- **G11 — Tags → shared scoped system. CONFIRMED.** `[INTENT]`

### ⚠⚠ GOVERNING PRINCIPLE (Victor, 2026-06-29) — the "extension model" (→ core constitution + both ADRs)
Adding features/components/integrations **does not change Vida's goal: a zero-knowledge system.** External
integrations (bank/social/marketing ingestion, AI) are **opt-in components** where **the user owns the risk of
his own choices**; Vida provides **a tough layer of protection** around them. So the architecture is a
**ZK core + a guarded, opt-in extension layer** — not a compromise of ZK. This unifies the earlier piecemeal
calls (Finance "user owns storage security" G3, derived-aggregate opt-in). → **Flag for the CORE constitution as
a named principle**, and it is the frame for: ADR "external data ingestion under ZK" + ADR "AI/LLM integration
under ZK".

### Refinements to earlier gaps
- **G6 reframed:** project documents are **primarily a secure VAULT** — protect confidential/legal/important
  project info (templates, knowledge), **large files included** (resolves the videos/large-file concern → R2
  pipeline for big encrypted blobs). The AI/LLM angle is **secondary**.
- **G4/G6 AI = "agentic and within"** = **on-device agentic AI** (the ZK-safe path) — sets the preferred
  direction for the AI ADR.

## Status: intake WHOLE (2026-06-29). All G1–G11 resolved. Major INTENDED surface: deliverables table +
multi-type measurement system (needs design pass), project_contacts(role)/project-accounts/project-events links,
vision+mission pages, dedicated Tasks→Projects API, vault documents (R2). Governing extension-model principle →
constitution + 2 ADRs. NOT documented as shipped.

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-28 | documentation-blueprint | intake harvested (v2 ADR-002 §5.4 3 tables + project.ts + CLAUDE.md §2; v1 life-os projects full feature: Kanban, time logging, actions, purpose links, docs); gap map G1–G11. ⚠ Headline gaps: deliverables/hierarchy (no table), vision+mission via TipTap (no mission col), progress auto-calc formula, project-vs-task time ledger. |
| 2026-06-29 | documentation-blueprint | G1–G11 resolved; intake WHOLE. Dedicated deliverables table (G2) w/ multi-type measurement system (financial/statistics/3rd-party/logs/artifacts — needs design pass, G4); vision+mission TipTap pages (G3); project time from task focus only (G5); documents = secure VAULT incl large files via R2 (G6); dedicated Tasks→Projects API for project-tasks (G7); +project_contacts(role)/project-accounts/project-events links (G8); user-personalized views (G9); deliverable notes (G10); shared scoped tags (G11). GOVERNING PRINCIPLE: ZK core + guarded opt-in extension layer (user owns integration risk) → constitution + 2 ADRs (external ingestion, AI agentic-within). |
