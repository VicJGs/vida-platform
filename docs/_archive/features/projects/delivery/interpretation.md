<!-- Interpretation Layer — features/projects · Entity Delivery Flow Step 1 (add-backend-component / Default)
     Makes the implicit explicit before decomposing. Every claim [FACT: path:line] / [INTENT: src] / [INTERP].
     Ground truth: the 5 aspect docs, schema/projects.ts (DB-4 roster), db-4-projects/_index.md, the Part-1.2 rerun,
     foundation/measurement, and the learning-education service precedent. Authored for mod-projects #54 (LIF-135). -->

# Interpretation — Projects ① backend (M1.1.2 head #54)

> **What this build IS.** The `@vida/core` **service code home** over the 4 DB-4 tables (`projects`,
> `milestones`, `deliverables`, `project_documents`). The schema + measurement DDL are **already shipped**
> (DB-4 group #5); the Part-1.2 rerun's `[DEFERRED — build]` was the _code home_, which is this session.
> `[FACT: schema/projects.ts header; reruns/projects.md "boundary held … code homes [DEFERRED — build]"]`
> **What it is NOT.** Not schema authoring (DB-4 did it), not a frontend surface (② `fe-projects`, P6),
> not the owner of tasks / purpose-rollup / contacts / habits (partner domains — see DEPENDENCIES).

## DEPENDENCIES — what must exist before a line is written

### Substrate (BUILT, composed — not re-implemented)

- **`foundation/measurement`** — `normalize`/`rollup`/`resolveProgress` + `assertAcyclic` DAG guard + the
  (empty) measurement-source read seam. The engine for PJ-3 derived progress. Imported directly (pure, no
  table) — NOT a deny-safe port. `[FACT: foundation/measurement/index.ts; .../engine.ts]`
- **`SpacesService`** — the `entity_tags`/`entity_links` **WRITE** surface (tags PJ-12; deliverable
  source-link PJ-4/M5; note links). REQUIRED, not deny-safe (the knowledge-S2 / learning-S9 "spaces
  required" precedent). `[FACT: learning-education/types.ts:118-120; conventions.md:8-11]`
- **`NotesService`** — `pages` reads/writes for vision/mission/notes (`entity_type` ∈
  project·milestone·deliverable). REQUIRED (vision/mission ARE pages, PJ-7/G3). `[FACT: contract.md:33-35; conventions.md:34]`
- **Repository** (`@vida/core`) — `createRepository(db, table, {deviceId, softDelete, encryptedFields:[]})`.
  M1.0 `encryptedFields:[]` (the `[E]` title/description/vision/name/blob pass through; real field
  encryption = M3, BR-DB6-3). `[FACT: schema header "registers an EMPTY [E] set in M1.0"; learning service.ts:308]`

### Partner domains (NOT owned here — reached via seam/port, never a direct table read, §6)

- **Tasks** (`services/tasks`, **NOT built**, #65) — tasks point UP via their own FKs; Projects consumes a
  **dedicated Tasks→Projects read port** (counts/progress/focus-time) for the leaf of the rollup + project
  time (PJ-6). Deny-safe: absent ⇒ no task leaf. `[FACT: contract.md:28-30; business-rules.md PJ-5/PJ-6; schema header]`
- **Finance** (`services/finance`, BUILT #47) — a `derived-pull` financial deliverable reads an account/
  asset/investment value via a **deny-safe finance-source port** (no composition root wires services at M1).
  `[FACT: contract.md:31-32; PJ-4.1]`
- **Purpose** — the UP ladder (project → purpose) is `contributions.contribution_percentage`, **owned by
  Purpose**. Projects only must NOT retire/duplicate it. `purpose_projects` is retired (M7). `[FACT: structure-data.md:60-63; reruns M7]`
- **Relationships / Habits / events** — `project_contacts(role)`, `project_habits` (kept), project events
  are **partner-domain-owned**; NOT tables here. `[FACT: db-4-projects/_index.md boundary table; schema header]`
- **Effect rail / registry** (BUILT) — deny-safe emit-only fan-out on completion (DORMANT at M1: no handler/
  named consumer). `[FACT: learning-education/types.ts:137-139]`
- **R2 attachment pipeline** (ADR-003, **M2**) — deny-safe `attachment?` port; absent ⇒ store INLINE
  (`encrypted_blob`). `[FACT: contract.md:48; PJ-8; learning types.ts:131]`
- **External ingestion (ADR-014) / AI (ADR-015)** — opt-in, device-mediated, deny-safe M2-facing ports;
  refuse server-plaintext unless opted-in. `[FACT: business-rules.md PJ-11; contract.md:38-41]`

## NEEDS — the implicit backend preconditions (document-first surfacing)

- **Persistence / schema binding.** 4 repos. `project_documents` has **NO `deleted_at`** → `softDelete:false`
  (hard-deletes with the project via app-layer cascade, the PJ-8 vault pattern); the other 3 →
  `softDelete:true`. `[FACT: schema/projects.ts projectDocuments "...baseColumns … NO deleted_at"; learning service.ts vault note]`
- **No-FK integrity is the app layer's job.** All cross-table refs are plain TEXT (BR-DB3-1). The service
  MUST enforce: project delete → cascade milestones + deliverables + documents; milestone delete → SET NULL
  document/sub-milestone links + reparent/cascade deliverables (PJ-9). `[FACT: db-4-projects/_index.md PJ-9; schema header]`
- **`Repository.findWhere` skips the soft-delete filter** → any `findWhere` over a soft-delete table must add
  `isNull(deleted_at)` explicitly. `[FACT: learning service.ts:1259 "findWhere skips the soft-delete filter"; memory]`
- **`Repository.create()` returns the INPUT row, not DB defaults** → omitted NN-default columns (status,
  measurement_kind) come back as written; backfill in the service create input. `[FACT: known pattern — sessions/habits precedent]`
- **Progress is a NULLABLE override slot, derived-on-read.** NEVER write `NOT NULL DEFAULT 0`; `NULL ⇒ derive`
  via `progress()`. The stored column is a manual override only. `[FACT: schema projects.ts progress comment; PJ-3; ADR-011 §3.2]`
- **Concurrency / txn.** Cascade deletes + the co-transactional `sync_queue` writes follow the
  `createInTx` precedent for multi-row atomic ops (xs-views `cloneView` / repository `createInTx`). `[FACT: ADR-003; Repository.createInTx]`
- **ZK preconditions.** `[E]` fields (title/description/vision/milestone+deliverable title/description/doc
  name+blob) are the M3 target; M1.0 set = `[]`. Vault/doc plaintext NEVER leaves the device (PJ-8/PJ-11).
  `[FACT: PJ-1; schema header; business-rules.md PJ-11]`
- **Row ≠ `@vida/types` interface.** `@vida/types` `Project` still has `tags:string[]` + `progress:number`
  (NN) and has no `Deliverable` — the reconcile is **DB-11 (mirror-only)**. The service returns **Row/view
  types**, not the stale interface (no `$inferSelect`↔interface assertion exists → compiles). `[FACT: types/project.ts:62-85; schema header "@vida/types interface reconcile … → DB-11"]`

## ORGANIZATION — where code lands (precedent: `services/learning-education`)

- Home: `packages/core/src/services/projects/{service,types,journal,index}.ts` + `__tests__/` (dir stub +
  `CLAUDE.md` exist). `[FACT: services/projects/ listing]`
- Factory `createProjectsService(deps: ProjectsServiceDeps)` returning an object literal; **intra-service
  calls hoist to closures, NOT `this.`** (factory-object shape breaks on destructure); validating methods are
  **async** (reject, not sync throw). `[FACT: memory factory-service-no-this; learning service.ts:287]`
- `journal.ts`: `createProjectsJournalContribution(svc)` + `registerProjectsJournal(registry, svc)` →
  `svc.getDayProjectsDigest(date)` feeds `/summary` PULL. `[FACT: learning-education/journal.ts:26-55]`
- Validators already exist at `packages/core/src/validators/project.ts` — extend, don't duplicate. `[FACT: find result]`
- Barrel-collision guard: rename shared type/port names that collide at the flat `@vida/core` barrel
  (the `HabitDateRange`/`EducationFileBlob` precedent). `[FACT: learning types.ts:141-145; memory]`

## IMPLICIT RULES (made explicit)

1. **`pinProject` / active-view / pinned-project are Zustand EPHEMERAL (frontend), NOT a backend op.** The
   state map puts pinned project + active view in Zustand; there is no `pinned`/`is_pinned` column in the
   schema. ⇒ **OUT of ① scope** (homes to ② `fe-projects`). `[FACT: structure-data.md:46-49 "Zustand owns … pinned project"; schema has no pin column]` `[INTERP]`
2. **`measurement_kind`/`binding_mode` live on `deliverables` ONLY.** Projects/milestones are **pure
   bottom-up rollups** with an implicit `milestone` kind — never a stored column. A project "measured by $"
   expresses that as a _financial deliverable under it_. `[FACT: db-4-projects/_index.md PJ-4; structure-data.md:21]`
3. **Investigation = a `deliverable` (`measurement_kind='milestone'` + `binding_mode='manual'`), NO
   `investigations` table.** Exploration content lives in a Knowledge Lab (linked via `entity_links`). `[FACT: identity.md "Not the owner of a research/investigation entity"; reruns C3]`
4. **A `derived-pull` deliverable with no tasks measures from its bound source** (the M5/R7 seam), not a
   phantom task set; unreachable source ⇒ last-known + typed flag (never a wrong progress as truth). `[FACT: business-rules.md PJ-4 edge; conventions.md:14-16]`
5. **Deliverables omit `status`/`due_date` by design** (measurement carries state) — a recorded asymmetry vs
   milestones, not a gap. `[FACT: db-4-projects/_index.md §3c]`
6. **Fail loud.** Partial rollup/measurement ⇒ flagged partial/last-known; vault decrypt/R2 error ⇒ typed;
   server-plaintext external/AI ⇒ refused unless opted-in. `[FACT: business-rules.md "Failure behavior"]`

## Step 1.5 — Envision Gate: **N/A**

Pure-backend entity — renders no surface a user forms a mental model of (`entity-delivery-flow.md §3.75`).
Any user-visible affordance surfaces in ② `fe-projects` (P6), which wires it under the Envision Gate there.
Stated, not silently skipped.
