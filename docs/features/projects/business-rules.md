<!-- Business Rules — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · project.ts · CLAUDE.md §2 · intake -->

# Business Rules — Projects  (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, **+ the extension-model
> principle** (ZK core + guarded opt-in integrations, Victor 2026-06-29). Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **PJ-1 — Encrypted content.** `title`, `description`, `vision`, `tags`, milestone `title`/`description`,
  document `name` + `encrypted_blob` are `[E]` (ZK-1); `scope`/`complexity`/`status`/`priority`/dates/progress/
  `color`/`icon` are plaintext config. `[FACT: ADR-002 §5.4 [E]; project.ts @encrypted]`
- **PJ-2 — Four-level hierarchy (⚠ deliverables INTENDED).** Project > Milestone > **Deliverable** > Task.
  Milestones may **nest** (`parent_milestone_id`, SET NULL); deliverables (new table) sit under a milestone;
  tasks sit under a deliverable/milestone/project via Tasks FKs. `[INTENT G2; FACT: L1579]`
- **PJ-3 — Progress is derived, bottom-up (cache).** `projects.progress`/`milestones.progress` (and a
  deliverable's) are **auto-calculated** rollups — never hand-set. Chain: Tasks → Deliverable → Milestone →
  Project. Count-weighted to start; effort-weighted later (⚠). `[INTENT G4; FACT: L1548,1584]`
- **PJ-4 — Deliverables are multi-type measured (⚠ INTENDED, needs design pass).** A deliverable's achievement
  derives from one of several **measurement backends**: (1) **financial** (linked accounts/assets/investments),
  (2) **task statistics** (per-project counts), (3) **third-party metrics** (Instagram/YouTube/email/marketing —
  external ingestion, ZK-extension), (4) **activity logs** (calls/outreach, in-task + external), (5) **artifact**
  (delivered docs/designs). `[INTENT G4]`
- **PJ-5 — Tasks belong to Tasks; reached via a dedicated API.** Projects never reads the tasks table directly;
  it consumes a **dedicated Tasks→Projects service** for project-scoped tasks (PJ-3 rollups + the project-task
  standalone UI). `[INTENT G7; FACT: Tasks TK-9, §6]`
- **PJ-6 — Project time derives from task focus only.** No project-level timer; project time (if shown) =
  sum of focus/pomodoro sessions on its project-tasks (Tasks' one ledger). `[INTENT G5]`
- **PJ-7 — Vision & Mission are TipTap pages.** Both are rich `pages` (`entity_type='project'`) that guide the
  user, not plain columns; the legacy `vision` column is a one-line summary at most (⚠ INTENDED). `[INTENT G3]`
- **PJ-8 — Documents are a secure vault.** `project_documents` stores confidential/legal/knowledge files,
  client-encrypted; small files inline (`encrypted_blob`), **large files via the R2 attachment pipeline** (still
  ciphertext-only — server never sees plaintext). `[INTENT G6; FACT: ADR-003 attachments]`
- **PJ-9 — Cascade & integrity.** Deleting a project cascades milestones + project_documents; deleting a
  milestone SET NULLs document/sub-milestone links (and, ⚠, reparents/cascades deliverables — design-pass). Soft
  delete hides. `[FACT: L1578,1579,1608-1609; INTENT G2]`
- **PJ-10 — Cross-module via junctions/integration points.** `project_habits`, `purpose_projects`,
  `bucket_list.project_id` (existing) + ⚠ INTENDED `project_contacts(role)`, project↔account links, project
  events. Always through documented points, never direct table reads (§6). `[INTENT G8; FACT: project.ts junctions]`
- **PJ-11 — External & AI integrations are opt-in, user-risk, protected.** Third-party metric ingestion (PJ-4.3)
  and AI (agentic/on-device preferred) are extension components: the ZK core is unchanged; the user opts in and
  owns the risk; Vida wraps them in protection. `[INTENT governing principle; G4,G6]`
- **PJ-12 — Shared scoped tags; local-first.** Tags via the shared scoped vocabulary (not inline); every write
  succeeds locally first, LWW on structured columns. `[INTENT G11; FACT: LF-2/ADR-003]`

## Validation & edge cases
- Enum CHECKs `[FACT: ADR-002 §5.4]`: `scope`(4), `complexity`(4), `status`(5), `priority`(5); `progress` 0-100.
- `estimated_hours`/`actual_hours` are **minutes** (misleading name) — treat as minutes. `[FACT: L1552]`
- A deliverable with no tasks derives progress from its **measurement backend** (e.g. the linked account/metric),
  not from a non-existent task set (PJ-3/PJ-4). `[INTERP PJ-4]`
- A project's progress recomputes when any descendant changes (PJ-3) — never edited directly. `[INTENT G4]`

## Terminal states (enumerated before build)
| Capability | loading | empty | error | success |
|---|---|---|---|---|
| Projects dashboard/timeline | skeleton | "no projects" + CTA | typed read error, retry | projects in chosen view (timeline/board/Kanban) |
| Project standalone | skeleton | "no milestones yet" | typed error, retry | milestones + docs + progress + vision/mission |
| Milestone standalone | skeleton | "no deliverables/tasks" | typed error, retry | timeline widget + tabs + deliverables |
| Deliverable standalone (multi-type) | computing measurement | "no measurement source set" | source/integration error → flag, show last-known | progress from financial/stats/metric/log/artifact |
| Progress rollup | computing | "nothing to measure" | partial child read → flag | derived % up the chain |
| Document vault | loading | "vault empty" | decrypt/R2 error → typed, retry | encrypted files (inline/R2) |
| Project-task (via Tasks API) | loading | "no tasks" | Tasks API error → flag | project-scoped task list |
| External metric ingest (⚠) | fetching device-side | not connected | refused if server-plaintext / fetch error → flag | metric pulled, deliverable updated |

## Failure behavior (fail loud — constitution §5)
- A failed rollup/measurement shows a flagged partial or last-known value, never a wrong progress as truth.
  `[INTENT G4; FACT §5]`
- A vault decrypt/R2 failure surfaces typed errors; never silently loses or exposes a file. `[INTENT G6; FACT: ZK-1]`
- An external/AI integration that would require the server to see plaintext is **refused** unless the user has
  explicitly opted in (extension model); never a silent downgrade. `[INTENT PJ-11; FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)
**INTENDED**, not in ADR-002 §5.4 / project.ts today:
- **`deliverables` table + multi-type measurement system (PJ-2/PJ-4)** — needs its own design pass.
- **Vision/Mission pages + mission (PJ-7)**; **dedicated Tasks→Projects API (PJ-5)**.
- **project_contacts(role), project↔account, project events (PJ-10)**; **R2 vault for large docs (PJ-8)**.
- **External-metric ingestion + AI (PJ-11)** → candidate ADRs (external ingestion · AI agentic-within), framed by
  the **extension-model principle** (→ core constitution).
- **Shared-tags migration (PJ-12).**
Live invariants today: PJ-1, PJ-3 (cols), PJ-6, PJ-9 (3 tables), PJ-12 (local-first). Schema additions → ADR-002
amendment. `[FACT: ADR-002 §5.4; INTENT G1–G11]`

## Completion checklist
- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
