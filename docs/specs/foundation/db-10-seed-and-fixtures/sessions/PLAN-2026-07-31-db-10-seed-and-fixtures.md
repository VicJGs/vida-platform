# PLAN — DB-10 · Dogfood seed vault + fixtures   (session: 2026-07-31-db-10-seed-and-fixtures · language: TypeScript/English)
> ⏸ **PARKED 2026-07-31 — DOGFOOD INPUT, not an active plan.** The db-10 triage escalated STRUCTURAL: db-10 was
> mis-homed to M1.0 and is a symptom of a malformed Project>Milestone>Issue delivery structure. This PLAN is kept
> as rich input to `delivery-structure-reconstruction` (its scope recommendations were corrected there). Do not
> execute it. See `docs/specs/foundation/delivery-structure-reconstruction/`.
> Executive summary (Human Gate 1). Read to approve the DIRECTION. Functional WHAT/WHY — not the technical build
> detail (that is the IMPLEMENTATION-PLAN, authored after Approval 1). No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].

## 1. Contexto & demanda
DB-10 is the **dogfood seed vault** — the DB-spine head computed off db-7 (blockers **DB-6 ✅ DB-7 ✅ DB-9 ✅**
all done). Home `core/src/db/` (seed); DOC spine **B·F·C·L**. `[FACT: docs/roadmap/m1.0-delivery-plan.md:156,249]`
Goal: a realistic single-user vault so downstream surfaces have something to render against, and so tests have
deterministic fixtures — seeded **through the repository layer** so rows are encrypted-seam + sync-queued like real
writes. `[FACT: .claude/tasks/db-10-seed-and-fixtures.md:9-12]`

**The one fact that shapes the whole unit — what exists to seed.** Only the **foundation substrate** tables are
authored; there are **no domain tables** (tasks/projects/habits/finance/contacts/learning…) yet — they stream in
per-feature at M1.1+ (ADR-016 §3.5 / ADR-017). `[FACT: schema/index.ts exports only foundation/{sync-queue,app-state,
sessions,spaces}; roadmap.md:85 "not a single upfront campaign"]` So DB-10 is itself a **streaming seed**, exactly
like DB-3/DB-4: it seeds what exists now (the foundation), and later domain modules append their slice. This is the
documented shape, not a scope choice. `[FACT: roadmap.md:85; delivery-plan §5.1.1 streaming model]`

Seedable surface today:
| Group | Tables | Owning service (the write path) |
|---|---|---|
| Spaces (AR-6) | `tags` · `entity_tags` · `entity_links` · `spaces` · `space_enabled_blocks` | `SpacesService` `[FACT: foundation/spaces/service.ts:63]` |
| Views (AR-7-seam) | `views` | `ViewsService` `[FACT: foundation/views/service.ts]` |
| Sessions (AR-5) | `sessions` · `session_type_registry` · `session_attachments` | `SessionRegistry` (+ direct repo for `sessions`) `[FACT: foundation/sessions/registry.ts:72]` |
| Infra (NOT content) | `app_state` · `sync_queue` | runner / repository internals — not "seeded" |

**Why now:** DB-10 is a ready head; its three blockers are all done and it gives the web SPA (ADR-017 §A — the
dogfood/tester vehicle) real data to render the moment the app shell lands. `[FACT: delivery-plan:249; ADR-017:25]`

## 2. O que muda e por quê
The seed is a new `packages/core/src/db/seed/` module that **composes the existing foundation services** to write a
coherent foundation vault. It does **not** touch the repository, adapter, schema, or migrations — it is a pure
consumer of the already-built substrate.

**IN:**
- **`seedVault(deps)` runner** (`db/seed/seed.ts`) — takes a `DrizzleDb` + `deviceId` (+ the TaggableTypeRegistry the
  SpacesService needs), instantiates the foundation services, and writes the vault by **calling their methods**
  (`createSpace`/`createTag`/`tagEntity`/`createLink`/`createView`/`register`…), plus a **direct**
  `createRepository(db, sessions, …)` for the `sessions` base table (AR-5 shipped no sessions-row service — the
  sanctioned tier-(b) path in BR-DB10-1, still through the repository → sync_queue). Because every service mutation
  already routes through the DB-6 repository → **co-transactional `sync_queue` enqueue**, every seeded row is
  sync-queued and passes the M1.0 empty-`[E]` pass-through seam for free — the task's "like real writes" is satisfied by
  construction, with **zero new persistence code**. `[FACT: spaces/service.ts:69-74 createRepository per table;
  repository.ts:331-336 enqueue; no SessionsService in foundation/sessions/]`
- **Seed data as code constants** (`db/seed/seed-data.ts`) — the vault's content described as plain data, the
  established `SHIPPED_SESSION_TYPES` idiom (SS-4 "seed from code"). `[FACT: sessions/registry.ts:26]` Content =
  Victor's real data shapes: a small set of Spaces (e.g. Health · Learning · Work), each with a root tag + a few nested
  tags, 1–2 saved Views across ≥2 layouts, plus ≥1 `sessions` row and ≥1 user `session_type_registry` type. Grain: a
  **coherent slice that renders**, not an exhaustive catalogue (over-engineering guard — §5-A).
- **Referential wiring by captured return value** — services **return the created row** (with its generated `id`), so a
  child (a View's `space_id`, a `entity_tag`'s `tag_id`) is wired from the parent's returned handle. The seed is
  therefore **structurally deterministic** (same entities/relationships/counts every run) even though `id`/timestamps
  are runtime-generated — those are **repository-managed fields** the caller cannot and must not supply. `[FACT:
  repository.ts:37-52 ManagedFields; services return RowOf<T>]`
- **Idempotency guard** — a `seed_version` key written **last** to the device-local **`app_state`** k/v store (DB-7's
  infra table); `seedVault` no-ops if the marker is already present. `app_state` carries no sync columns, so the marker
  is a **raw kv write** (a tiny `getAppState/setAppState` helper, or `INSERT OR REPLACE`), NOT a repository write —
  device-local infra sits outside the sync path by design (the `setSchemaVersion` precedent). **Honest limit:** only
  junction writes are service-idempotent (BR-14); top-level `createSpace`/`createTag`/`createView` are unconditional
  creates, so a crash *before the marker* leaves a partial vault a re-run would duplicate — acceptable in M1.0
  (dev/first-run-only call site; `resetDev` is recovery). See BR-DB10-3. `[FACT: app-state.ts:18-21 no sync cols;
  spaces/service.ts:195-203 unconditional createSpace; runner.ts:90 resetDev]`
- **Fixtures = the seed applied to a `:memory:` DB in tests** — `db/seed/tests/seed.test.ts` runs the same harness the
  repository tests use (`better-sqlite3` `:memory:` → `createDrizzleProxy` → `migrate(driver)` → `seedVault`) and
  asserts on **structure** (entity counts, relationships, enum validity, one `sync_queue` `create` row per entity) — not
  on literal ids. That IS the "deterministic fixtures" deliverable: fixed content constants ⇒ identical structure every
  run. `[FACT: db/tests/repository.test.ts:14-75 harness]`
- **Export** — `seedVault` (+ its data-shape types) re-exported from the `@vida/core` barrel like the other foundation
  modules; the **call site is dev/first-run-guarded** in the app (§5-C), so it never runs in a production release flow.
- **DOC spine B·F·C·L** — birth the new `seed` context's durable docs (D6: `docs/…/current-spec.md` +
  `current-business-rules.md`); the database-layer docs are already current (no change owed there).

**OUT** — boundary discipline:
- **Domain-module seed content** (tasks/finance/habits/contacts/learning/…) → **deferred to each module's own gate**
  (streaming; the tables don't exist). DB-10 ships the foundation slice only. `[FACT: ADR-016 §3.5; roadmap.md:85]`
- **A per-feature seed *registry*** (a plug-in system so domains self-register their seed slice) → **NOT built now**
  (§5-E). One contributor (foundation) needs no registry; introduce it when the second (first domain) lands — YAGNI.
- **Field encryption of seeded content** → M1.0 pass-through (empty `[E]`); flips at M3. `[FACT: ADR-017:20]`
- **The sync reader/flush** that consumes the seeded `sync_queue` rows → AR-9 / M4. DB-10 is a producer only. `[FACT: db-6 current-business-rules BR-DB6 note]`
- **Literal-id / snapshot determinism** → not a requirement; managed fields are runtime-generated by design (§5-B).

## 3. Regras de negócio relevantes (funcional)
Keep (do not regress):
- **[FACT]** Every persisted mutation flows through the repository → one co-transactional `sync_queue` row; both commit
  or both roll back. `[FACT: repository.ts:331-336; db-6 current-business-rules BR-DB6-1]`
- **[FACT]** M1.0 pass-through: empty `[E]` set, vault key fetched lazily, so a **locked vault** (the M1.0 default) never
  throws on a seed write. `[FACT: repository.ts:243-245; BR-DB6-3]`
- **[FACT]** `id`/`created_at`/`updated_at`/`_sync_*` are repository-managed — callers never supply them. `[FACT: repository.ts:37-52]`
- **[FACT]** Enum columns take only canonical values (`SCHEDULING_MODE`/`SESSION_STATUS` on `sessions`, `VIEW_LAYOUT` on
  `views`) — the DB-9 tuples, enforced by SQL CHECK + Zod. `[FACT: types/session.ts:48,53; types/view.ts:17; delivery-plan:249]`
- **[FACT]** `session_type_registry`: only `is_user_type=1` rows persist; shipped defs stay in-memory (SS-4). A seeded
  user type must pass the envelope check (declared effects ⊆ own permission envelope ⊆ shipped envelope). `[FACT: sessions/registry.ts:84-105]`

Owed by DB-10 (this unit establishes):
- **[OWED] BR-DB10-1 — compose services where a service exists; otherwise the sanctioned through-repo path.** The seed
  is a consumer, not a persistence author. Three tiers, in priority order: **(a)** where a foundation service exists
  (`SpacesService`, `ViewsService`, `SessionRegistry`) the seed calls its methods — inheriting idempotency (BR-14),
  resolve-then-soft-delete (BR-15), cycle guards, and the co-transactional `sync_queue` enqueue automatically; **(b)**
  the `sessions` base table has **no writer** (AR-5 shipped only the registry, not a sessions-row service — `[FACT: no
  SessionsService in foundation/sessions/; only registry.ts]`), so the seed calls `createRepository(db, sessions,
  {deviceId, encryptedFields: [], softDelete: true})` directly — this is **still** the through-repo → sync_queue path,
  not an ad-hoc insert; **(c)** the `app_state` seed marker is **device-local infra outside the sync/repository path by
  design** (no `baseColumns`/`syncColumns`, so the generic repository cannot manage it — mirrors `setSchemaVersion`'s
  raw write, adapter.ts) → written via a small `getAppState/setAppState(key)` helper (or raw `INSERT OR REPLACE`). The
  seed authors **no domain-table SQL**. `[FACT: app-state.ts:18-21 no sync cols; adapter.ts setSchemaVersion precedent]`
- **[OWED] BR-DB10-2 — structural determinism.** Fixed content constants ⇒ identical entities/relationships/counts on
  every run; `id`/timestamps vary (managed). Fixtures assert on **topology** (counts AND relational wiring — e.g. each
  seeded View's `space_id` ∈ seeded Space ids), not on literal values.
- **[OWED] BR-DB10-3 — idempotent on clean re-run; crash-window disclosed.** A second `seedVault` on a cleanly-seeded
  DB is a no-op (the `app_state` `seed_version` marker, written **last**). **Honest limit:** top-level entities are NOT
  idempotent in the services (only junctions are — `[FACT: spaces/service.ts createSpace/createTag unconditional
  create]`), so a crash *mid-seed, before the marker* leaves a partial vault that a re-run would duplicate. This is
  **acceptable in M1.0** because the call site is dev/first-run-only and `resetDev` (rebuild-from-zero) is the recovery
  path. Gate-2 MAY harden to fully-atomic by wrapping the seed in one outer `db.transaction` — **iff** the async
  sqlite-proxy supports the nested `db.transaction` the repository already opens per write (verify at gate 2; do not
  double-wrap). `[FACT: runner.ts:90 resetDev; repository.ts per-write db.transaction]`
- **[OWED] BR-DB10-4 — every seeded enum value is canonical (BR-DB10 relies on DB-9).** Verified against the Zod
  validators in the seed test (parse-success on every seeded enum column).
- **[OWED] BR-DB10-5 — additive & inert to the substrate.** DB-10 adds no table, no migration, no schema/adapter/
  repository change; `pnpm typecheck` stays green with zero edits to the foundation layer.

## 4. Aceitação (funcional)
- [ ] `seedVault(db, deviceId, registry)` populates the foundation vault: ≥2 Spaces (each with a root `tag` + ≥1 nested
      tag + ≥1 `entity_tag`), ≥1 `entity_link` **between real seeded entities** (`entity_type: 'space'|'tag'` — the only
      non-dangling foundation targets; `page_id` is a synthetic placeholder since `pages` is M1.1), ≥2 `views` spanning
      ≥2 `VIEW_LAYOUT` values, ≥1 `sessions` row, ≥1 user `session_type_registry` type. `[maps BR-DB10-1]`
- [ ] **Relational assertion (topology, not just cardinality):** each seeded View's `space_id` ∈ the seeded Space ids;
      each `entity_tag.tag_id` ∈ the seeded tag ids — catches a wiring bug that preserves counts. `[maps BR-DB10-2]`
- [ ] After a seed, `sync_queue` holds exactly one `operation='create'` row per seeded entity (proves the through-repo
      path — including the direct-repo `sessions` write). `[maps BR-DB10-1]`
- [ ] Every seeded enum column parse-succeeds against its DB-9 Zod validator; a deliberate bad value would fail. `[maps BR-DB10-4]`
- [ ] Re-running `seedVault` on a cleanly-seeded DB changes no counts (marker no-op). Crash-window duplication is a
      disclosed M1.0 limit, not a test target. `[maps BR-DB10-3]`
- [ ] Seed test: `:memory:` → `migrate` → `seedVault` → structural assertions above; `@vida/core` suite green;
      `pnpm typecheck` 10/10 with **no** edits to repository/adapter/schema/migrations. `[maps BR-DB10-2, BR-DB10-5]`
- [ ] `seedVault` (+ data-shape types) exported from `@vida/core`; call-site guard documented (§5-C).
- [ ] §XXIX Currency: new `seed` context docs born (D6); database-layer docs confirmed current; committed WITH the code.

## 5. Questões em aberto / decisões pendentes
- **[DECISION — Approval 1] (A) Seed content depth.** **Recommend: a coherent, minimal-realistic slice** — ~3 Spaces
  mirroring real use (e.g. Health · Learning · Work), each with a root tag + 2–3 nested tags, 1–2 views, and one seeded
  `sessions`/user-type pair. Enough to render every foundation surface, not an exhaustive catalogue. Alternative: a
  richer vault — deferred; more data now buys nothing until domain modules render it. `[INTERP: over-engineering guard —
  global CLAUDE.md "simplest solution for the stage"]`
- **[DECISION — Approval 1] (B) Determinism model.** **Recommend: structural determinism** (fixed constants; runtime
  managed ids/timestamps; fixtures assert on structure). Literal-id/snapshot determinism is **not** pursued — it would
  require overriding repository-managed fields, violating BR (repository.ts:37-52). Confirm no snapshot-id requirement exists.
- **[DECISION — Approval 1] (C) Idempotency + guard mechanism.** **Recommend: `app_state` `seed_version` marker + a
  dev/first-run-guarded call site** (mirrors `resetDev`'s dev-only posture — `import.meta.env.DEV` at the app boundary).
  The seed *function* is barrel-exported (harmless — writes only well-formed data); the *decision to run it* is guarded.
  Alternative: not barrel-exported, path-import only (stricter, but tests already path-import). `[FACT: runner.ts:90-104 resetDev posture]`
- **[DECISION — Approval 1] (E) Extensibility now vs later.** **Recommend: a flat, well-factored `foundationSeed` now;
  NO plug-in registry yet.** A registry with one contributor is speculative generality; introduce it when the first
  domain seed lands (it will be an additive refactor, not a rewrite). Alternative: build the registry now — rejected as
  over-engineering for the current stage. `[INTERP: streaming model does not require the registry to pre-exist]`
- **[RESOLVED by the critique — no longer open] (D) Service surfaces.** The critique confirmed `ViewsService.createView(input:
  CreateViewInput): Promise<ViewRow>` exists with a known signature (`{space_id?, name, layout, filter?, grouping?, sort?}`),
  and that **no** `sessions`-row service exists → the seed uses the tier-(b) direct-repo path (BR-DB10-1). Nothing left to
  defer here except the trivial file split (`seed.ts` / `seed-data.ts` / `tests/seed.test.ts`), a gate-2 build detail.
  `[FACT: views/service.ts:16-30; no SessionsService in foundation/sessions/]`

## 6. Aprovação 1 (direção) — ⏳ PENDING
Awaiting Victor. Recommended locked decisions: **(A) minimal-realistic slice · (B) structural determinism · (C)
app_state marker + dev-guarded call site, barrel-exported fn · (E) flat foundationSeed, no registry yet.** On approval:
author the IMPLEMENTATION-PLAN → `/preflight` → 2nd `/critique` → Approval 2 → implement.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-31 | 2026-07-31-db-10-seed-and-fixtures | initial PLAN (gate 1) — direction + §5 decisions for Approval 1 |
| 2026-07-31 | 2026-07-31-db-10-seed-and-fixtures | REVISE after independent /critique (3 MUST-FIX): BR-DB10-1 reworded to a 3-tier rule (service → direct-repo for `sessions` (no writer) → raw kv for `app_state` marker), resolving the "never raw inserts" contradiction; BR-DB10-3 crash-window disclosed honestly (was overclaimed as unconditional no-duplication); app_state marker corrected to a raw non-repository write. SHOULD-FIX: §5-D collapsed (Views signature IS known); acceptance gained a relational/topology assertion + real-entity link target. |
