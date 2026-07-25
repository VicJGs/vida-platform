<!-- Conventions — features/projects · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · v1 projects · intake -->

# Conventions — Projects  (level: Feature)

## How to build here
- **Progress is derived, never stored truth.** Roll up bottom-up (Tasks → Deliverable → Milestone → Project);
  recompute on any descendant change; count-weighted to start (PJ-3). Never hand-set a `progress` column. `[INTENT G4]`
- **A deliverable's progress comes from its `measurement_kind` × `binding_mode` (ADR-011).** pick the measure shape
  (`quantitative`/`milestone`/`rate`/`qualitative`, M1) + binding (`manual`/`derived-pull`, M2) per deliverable; a
  `derived-pull` deliverable with no tasks measures from its source via the M5/R7 seam (e.g. a linked account), not a
  phantom task set (PJ-4). The bespoke `measurement_type` enum is retired. `[INTENT M1/M2; G4]`
- **Tasks are reached only through the dedicated Tasks→Projects API.** Never read the tasks table; consume the
  project-scoped task service for lists, counts, and the project-task UI (PJ-5). `[INTENT G7; FACT: TK-9]`
- **Project time = task focus, not a project timer.** Don't add project-level time logging; derive from project-
  tasks' focus/pomodoro sessions (PJ-6). `[INTENT G5]`
- **Vision & Mission are pages, not columns.** Store them as TipTap `pages` (`entity_type='project'`) so they
  guide the user; keep the `vision` column as a one-line summary at most (PJ-7). `[INTENT G3]`
- **Documents are a vault.** Treat `project_documents` as confidential storage: client-encrypt always; small
  files inline, large files via R2 (ciphertext only) (PJ-8). `[INTENT G6; FACT: ADR-003]`
- **Hours are minutes.** `estimated_hours`/`actual_hours` store minutes despite the name (PJ-1). `[FACT: L1552]`
- **Cross-module via junctions/integration points.** habits (`project_habits`, **kept**)/bucket-list/contacts(role)/
  accounts/events — link through documented points, never direct table reads; **purposes via `contributions`** (M7 —
  `purpose_projects` retired) (PJ-10, §6). `[INTENT M7, G8]`
- **Notes via `pages`.** project + milestone + deliverable notes are `pages` rows; never inline (PJ-12/G10).
  `[FACT: ADR-002 L1343]`
- **External & AI are opt-in extensions.** Gate third-party ingestion + AI behind explicit user consent +
  protection; default device-side; never silently send plaintext to a server (PJ-11, extension principle).
  `[INTENT governing principle]`

## Naming & layout
- Enum values (canonical, string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core`, never TS
  `enum`): `scope`(personal/professional/academic/community), `complexity`(simple/moderate/complex/enterprise),
  shared `status`(5)/`priority`(5). `[FACT: project.ts L13-15; ADR-002 §5.4]`
- ⚠ INTENDED: `deliverables.measurement_kind` (M1, ∈ quantitative/milestone/rate/qualitative) +
  `deliverables.binding_mode` (M2, ∈ manual/derived-pull/event-trigger) — replacing the bespoke `measurement_type`
  enum; `project_contacts.role`. `[INTENT M1/M2, G2,G4,G8]`
- Platform-wide: UUIDv7 TEXT PKs, Unix-ms timestamps, booleans `0/1`, JSON as TEXT, dates `YYYY-MM-DD`, time in
  **minutes**, soft delete, `_sync_*`. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`

## Local landmines / "never do"
- **Never** hand-edit a `progress` column, and **never** leave it `NOT NULL DEFAULT 0` — it is a **nullable override
  slot** (`NULL ⇒ derive`), derived via `progress()` on-read (PJ-3, M3). `[INTENT M3]`
- **Never** read the tasks table directly — use the dedicated API (PJ-5). `[FACT: TK-9]`
- **Never** add a separate project timer — time is the task focus ledger (PJ-6). `[INTENT G5]`
- **Never** store vision/mission as plain columns when they should be guiding pages (PJ-7). `[INTENT G3]`
- **Never** put large files inline — route to R2 (PJ-8). `[INTENT G6]`
- **Never** send vault/document plaintext to a server or cloud AI without explicit opt-in (PJ-11, ZK). `[FACT: ZK-1]`
- **Never** reintroduce an inline per-project tag list — shared scoped tags via **`entity_tags`** (SP1/PJ-12). `[INTENT G11]`

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] each claim
