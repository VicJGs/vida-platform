<!-- Business Rules — features/projects · /documentation Phase 2 · sources: ADR-002 §5.4 · project.ts · CLAUDE.md §2 · intake -->

# Business Rules — Projects (level: Feature)

> Inherits the CORE constitution `[[../../core/business-rules]]` — ZK-1/2/3, LF-1/2/3, **+ the extension-model
> principle** (ZK core + guarded opt-in integrations, Victor 2026-06-29). Every rule below complies.

## Invariants (what is ALWAYS / NEVER true)

- **PJ-1 — Encrypted content.** `title`, `description`, `vision`, `tags`, milestone `title`/`description`,
  document `name` + `encrypted_blob` are `[E]` (ZK-1); `scope`/`complexity`/`status`/`priority`/dates/progress/
  `color`/`icon` are plaintext config. `[FACT: ADR-002 §5.4 [E]; project.ts @encrypted]`
- **PJ-2 — Four-level hierarchy (⚠ deliverables INTENDED).** Project > Milestone > **Deliverable** > Task.
  Milestones may **nest** (`parent_milestone_id`, SET NULL); deliverables (new table) sit under a milestone;
  tasks sit under a deliverable/milestone/project via Tasks FKs. `[INTENT G2; FACT: L1579]`
- **PJ-3 — Progress is derived, bottom-up (nullable override).** `projects.progress`/`milestones.progress` (and a
  deliverable's) are a **nullable override slot** (`NULL ⇒ derive`); the module implements **`progress()`
  derived-on-read** (M3) — never a hand-set `NOT NULL DEFAULT 0` counter. Chain: Tasks → Deliverable → Milestone →
  Project. **[INTENT M4]:** DOWN nesting weight = a **per-child column** (default NULL = equal-weight); the UP ladder
  (project → purpose) = **`contributions.contribution_percentage`** — not count-weighting. `[INTENT M3/M4 — ADR-011 §3.4/§3.3; FACT: ADR-002 §5.4 L1574/L1610]`
- **PJ-4 — Deliverables carry `measurement_kind` + `binding_mode` (⚠ INTENDED, needs design pass).** A deliverable
  is an ADR-011 **pursuable**: **`measurement_kind`** (M1) sets the measure shape, **`binding_mode`** (M2) how
  progress binds. The former bespoke backends become (kind × binding × source, resolved via the M5/R7 seam):
  (1) **financial** = `quantitative`+`derived-pull` (linked accounts/assets/investments), (2) **task statistics** =
  `quantitative`+`derived-pull` (per-project counts), (3) **third-party metrics** = `quantitative`+`derived-pull`
  from an **ADR-014** external source (Instagram/YouTube/email/marketing — device-mediated ingestion, ZK-extension),
  (4) **activity logs** = `quantitative`/`rate`+`derived-pull` (calls/outreach), (5) **artifact** = `milestone`+`manual`
  (delivered docs/designs). `[INTENT M1/M2 — ADR-011 §3.1/§3.5; G4]`
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
- **PJ-10 — Cross-module via junctions/integration points.** `project_habits` (**kept** — not in M7's retirement
  list), `bucket_list.project_id` (existing) + **[INTENT M7]: `purpose_projects` retired → the polymorphic weighted
  `contributions`** (ADR-011 §Amends; a project _contributes_ to a purpose/target) + ⚠ INTENDED `project_contacts(role)`,
  project↔account links, project events. Always through documented points, never direct table reads (§6). `[INTENT M7, G8; FACT: project.ts junctions]`
- **PJ-11 — External & AI integrations are opt-in, user-risk, protected.** Third-party metric ingestion (PJ-4.3) is
  **device-mediated (ADR-014 X1)** under an **`external_in_ok` grant (X5)** — never a server-side fetch. AI (agentic)
  offers **`on_device`/`cloud` per-use modes (ADR-015 AI1)**; the agent's tool-set **is** its ADR-010 granted envelope
  with a mediated `askModel(scoped_slice)` (AI4); AI-generated rows carry **`source=ai`** (AI6). The ZK core is
  unchanged; the user opts in and owns the risk; Vida wraps them in protection. `[INTENT governing principle; ADR-014 X1/X5, ADR-015 AI1/AI4/AI6; G4,G6]`
- **PJ-12 — Shared scoped tags; local-first.** Tags via the `entity_tags` primitive (ADR-006 SP1, scoped; not
  inline); every write succeeds locally first, LWW on structured columns. `[INTENT G11; FACT: ADR-006 SP1; LF-2/ADR-003]`

## Validation & edge cases

- Enum CHECKs `[FACT: ADR-002 §5.4]`: `scope`(4), `complexity`(4), `status`(5), `priority`(5); `progress` 0-100.
- `estimated_hours`/`actual_hours` are **minutes** (misleading name) — treat as minutes. `[FACT: L1552]`
- A deliverable with no tasks derives progress from its **measurement backend** (e.g. the linked account/metric),
  not from a non-existent task set (PJ-3/PJ-4). `[INTERP PJ-4]`
- A project's progress recomputes when any descendant changes (PJ-3) — never edited directly. `[INTENT G4]`

## Terminal states (enumerated before build)

| Capability                        | loading               | empty                       | error                                            | success                                              |
| --------------------------------- | --------------------- | --------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Projects dashboard/timeline       | skeleton              | "no projects" + CTA         | typed read error, retry                          | projects in chosen view (timeline/board/Kanban)      |
| Project standalone                | skeleton              | "no milestones yet"         | typed error, retry                               | milestones + docs + progress + vision/mission        |
| Milestone standalone              | skeleton              | "no deliverables/tasks"     | typed error, retry                               | timeline widget + tabs + deliverables                |
| Deliverable standalone (measured) | computing measurement | "no measurement source set" | source/integration error → flag, show last-known | progress from the `binding_mode` source (M5/R7 seam) |
| Progress rollup                   | computing             | "nothing to measure"        | partial child read → flag                        | derived % up the chain                               |
| Document vault                    | loading               | "vault empty"               | decrypt/R2 error → typed, retry                  | encrypted files (inline/R2)                          |
| Project-task (via Tasks API)      | loading               | "no tasks"                  | Tasks API error → flag                           | project-scoped task list                             |
| External metric ingest (⚠)        | fetching device-side  | not connected               | refused if server-plaintext / fetch error → flag | metric pulled, deliverable updated                   |

## Failure behavior (fail loud — constitution §5)

- A failed rollup/measurement shows a flagged partial or last-known value, never a wrong progress as truth.
  `[INTENT G4; FACT §5]`
- A vault decrypt/R2 failure surfaces typed errors; never silently loses or exposes a file. `[INTENT G6; FACT: ZK-1]`
- An external/AI integration that would require the server to see plaintext is **refused** unless the user has
  explicitly opted in (extension model); never a silent downgrade. `[INTENT PJ-11; FACT: ZK-1]`

## ⚠ Flagged delta (spec must not outrun code — constitution §8)

**INTENDED**, not in ADR-002 §5.4 / project.ts today:

- **`deliverables` table + measurement-source design pass (PJ-2/PJ-4)** — the `measurement_kind`×`binding_mode`×source-seam
  DDL. Framework axes named (ADR-011); the taxonomy DDL needs its own design pass.
- **Vision/Mission pages + mission (PJ-7)**; **dedicated Tasks→Projects API (PJ-5)**.
- **project_contacts(role), project↔account, project events (PJ-10)**; **R2 vault for large docs (PJ-8)**.
- **External-metric ingestion + AI (PJ-11)** → **ADR-014** (external ingestion) + **ADR-015** (AI agentic-within),
  framed by the **extension-model principle** (→ core constitution).
- **Shared-tags migration (PJ-12).**
  Live invariants today: PJ-1, PJ-3 (cols), PJ-6, PJ-9 (3 tables), PJ-12 (local-first). Schema additions → ADR-002
  amendment. `[FACT: ADR-002 §5.4; INTENT G1–G11]`

## Completion checklist

- [x] invariants with [FACT/INTENT] · [x] all terminal states enumerated · [x] failure is loud · [x] inherits constitution · [x] spec/code drift flagged
