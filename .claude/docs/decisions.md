<!-- Last updated: 2026-08-02 by /session-end -->
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| 2026-08-02 | ux/nav | primary navigation axis | **co-primary dual-axis** — module dock (content home) + Spaces bar (cross-cutting overlays) | reconciles ADR-006/007 (Spaces overlays) + intake SP1 (Spaces first-class axis); Victor's call | costly (amends ADR-007:88; owed to Spaces ADR) |
| 2026-08-02 | ux/nav | UX-1 deliverable grain | design doc (`information-architecture.md`) + declarative code artifact (`apps/web/src/nav/module-map.ts`) | dual home reconstructed:72; "design/spec issue" is dep-graph sense, not doc-only | yes |
| 2026-08-02 | ux/nav | nav-map home | `apps/web/src/nav/` (per-app), NOT a shared package | platform-strategy §5 (routing is platform-specific); web-first; M4 revisit if consumer appears | yes |
| 2026-08-02 | ux/nav | Routines placement | **dock** (own cockpit), not inside Sessions | routines/identity.md:5-8 (active counterpart to Calendar; "Not a session engine"); harvest misread corrected by Victor audit | yes |
| 2026-08-02 | ux/nav | Check-ins / Gamification placement | Check-ins = secondary (Journal flow); Gamification = conditional dock (`feature_gamification`) | check-ins/identity.md:25 (Journal-surfaced); gamification/identity.md:8 (opt-in) | yes |
| 2026-06-27 | habits | streak semantics | consecutive scheduled occurrences, no grace; counters derive from ledger | one source of truth; cache never lies | yes |
| 2026-06-27 | finance | account balance source of truth | ledger-derived (opening_balance + Σ transactions) | balances can't drift; import-friendly | costly |
| 2026-06-28 | relationships | neural graph edges | contact↔network membership only, no contact↔contact table | matches Victor's model; less schema | yes |
| 2026-06-29 | constitution | extension-model principle | ZK core + guarded OPT-IN integrations; user owns the risk | resolves every external-data/AI tension at once | no (principle) |
| 2026-06-29 | projects | deliverables | dedicated table + multi-type measurement (financial/stats/3rd-party/logs/artifacts) | real 4-level hierarchy; deep progress picture | costly |
| 2026-06-30 | scope | v1 audit — dropped modules | KEEP all: Health, Duties, Skills(separated), Finance→Commitments, Projects→Investigations → Wave R | intent must be tracked, not silently cut | yes |
| 2026-07-01 | process | Routines re-sequenced to Wave 4; Learning split into 5 sub-contexts | document dependencies first; one context per pass | orchestrator needs its modules; token discipline | yes |
| 2026-07-02 | learning | Education hierarchy reframe | 8 levels: Institution/Self-taught→Program→Curriculum→Degree→Term→Subject→Module→Topic (optional depth) | flat courses ≠ envisioned academic structure | costly |
| 2026-07-03 | learning | grading + progress | grading_systems builder (weighted components, modality); progress = Projects measurement pattern FORGED separately | matches real professor practice; no cross-module data mixing | yes |
| 2026-06-07 | setup | toolkit initialized on existing repo | Generic Coding Session | wire up toolkit without regenerating existing CLAUDE.md | yes |
| 2026-06-07 | setup | rename Claude.md → CLAUDE.md | git mv | cross-platform memory loading (case-sensitive CI) | yes |
| 2026-06-08 | build | declare cross-package imports as deps | `@vida/types: workspace:*` in core | tsc --noEmit resolves bare specifiers via node_modules, not tsconfig references | yes |
| 2026-06-08 | core | unlockVault return value | return `keyChain.vault_key` not `_vaultKey` | avoid null-widening of module-level mutable across call boundary | yes |
| 2026-08-01 | delivery-structure | tracker hierarchy model | Initiative=Vida · Project=build-tier (M1–M4) · Milestone=slice · Issue=sprint (ADR-016) | fixes the db-10 STRUCTURAL failure; matches Linear entities + tracker mechanism | costly |
| 2026-08-01 | delivery-structure | db-10 (dogfood seed) dependency | → M1.4, blocked-by ALL 26 modules | the "needs the whole OS" dep was unencoded → false-ready head; now impossible by construction | yes |
| 2026-08-01 | delivery-structure | reconstruction = re-organize, not re-tier | preserve every LIF id + slug; only re-home Project/Milestone; modules become first-class issues | tracker identity is the foundation; no churn/rename | no |

## documentation-blueprint — completed 2026-07-19

The foundational documentation effort for vida-platform. Built a discovery-driven **Levels × Aspects** framework, then documented the entire platform against it and locked the architecture in ADRs.

**Delivered:**
- **21 documented contexts** (19 modules + sub-contexts), each as the canonical 5 aspect docs (`identity · business-rules · contract · structure-data · conventions`) under `docs/features/`.
- **15 ADRs, all Accepted** (`docs/core/decisions/ADR-001…015`) — this session added ADR-011 (Universal Measurability), ADR-012 (Points Economy & Consequence Engine), ADR-013 (ZK Notification Delivery), ADR-014 (External Data Ingestion under ZK), ADR-015 (AI/LLM under ZK). ADR-014/015 are the two standing EX-2 ZK-integration ADRs — closing that constitution loop.
- **The constitution** (`docs/core/business-rules.md`) and **the owed-tables ledger** (ADR-002 §5.20 — the single scoped input for the build phase: all ADR tables + the 21-module target schema).

**Key decisions / patterns established:**
- Feature docs describe **intent**; ADRs decide **cross-cutting mechanism** — the discipline that kept the modules coherent.
- **Every gated ADR ran an independent adversarial critique.** It caught a ZK-honesty overclaim in **five consecutive ADRs** (011–015) plus a prompt-injection security hole — the gate is load-bearing on this project.
- Doc-only throughout: **`packages/` diff = 0** across the entire task. The build phase (schema consolidation from §5.20) is the next stone.

## Build Roadmap — completed 2026-07-20
Set the whole platform's **buildable deliverables** as a phased, clustered dependency map (`docs/roadmap.md`), then projectized it into Linear (initiative `vida-platform`).

**Delivered:**
- **`docs/roadmap.md`** — 3 phases (1 Local dogfood · 2 Venues+release · 3 Personality), the 5-layer Structural Foundation (① Database · ② Architecture · ③ Design System · ④ UI · ⑤ UX), a tiered dependency map, Phase-1 module sub-slices (1a–1d), the integration register (6 defined / 16 undefined-by-design), and sequencing rules.
- **35 Phase-1.0 issues in Linear** (LIF-61…95) · 5 Projects · 14 milestones · corrected acyclic blocks-graph. Enhanced the toolkit tracker first (milestones + project descriptions).
- **Reusable scenario** `project-foundation/scenarios/build-roadmap.md` (crystallized from this task).

**Key decisions / patterns established:**
- **Database Layer leads.** Technical track (DB→AR) is the critical path; the shorter experience track (UX→DS→UI) blocks on Architecture — a single-track bottleneck, not balanced parity.
- **Single-user localhost web needs NO server + NO sync** — sync/SRP/relay/mobile/desktop defer wholesale to Phase 2; Phase 1 only scaffolds `_sync_*`/`sync_queue` (write, never flush). Caveat: the HLC *encoding* is F10-coupled, so DB-2 carries a deferred decision, not a free one.
- **Gate the roadmap AND its dependency graph before the outward push.** The Step-7 foundation gate (run late, after the Linear push) found a BLOCKER **dependency inversion** (AR-2 adapter declared below the DB-6 repository it sits above) that forced a Linear re-sync — an independent adversarial critic caught it by cross-checking every edge against the code, not the roadmap prose. The scenario now encodes gate-before-push.
- **The tracker's relation sync is add-only** — it can't prune a removed/inverted edge, so an inversion would create a Linear cycle. Filed as a §XXVI toolkit follow-up (needs `issueRelationDelete` + diff-reconcile).
- Planning-only: **`packages/` diff = 0**. The build phase (Phase-1.0 ① Database Layer, DB-1) is the next stone.

## DB-1 schema primitives (LIF-61) — completed 2026-07-22
- Rebuild storage FROM ZERO: v1 `schema.ts` is ~60% stale vs the documented v2 target (retire ~22 · missing ~90-110 · divergent ~9 · carry ~40); no deployed data → zero migration cost.
- DB-1 = P0 primitives only: `schema/` dir + `_shared.ts` (baseColumns, syncColumns[6], typed helpers, `enumText`) + `_registry.ts` (entity_type) + barrel. Additive — v1 monolith stays reference-only.
- **DDL model:** hand-written SQL migrations (ADR-002 §5) + Zod (DB-9); Drizzle is the query-only type mirror (no drizzle-kit). The Drizzle `enumCheck` helper was removed as architecturally wrong. The dual-authoring-vs-drizzle-kit fork is logged for ADR-016.
- Boundaries held: `_sync_field_ts` deferred to DB-2; no table authored. Campaign uses per-table gating (each table = its own Per-Step Build Gate).
- Verified: tsc green on core/web/server; committed b234e85 on `feat/db-1-schema-primitives`.

## storage-master-plan (ADR-016 + master ledger) — completed 2026-07-22
- **ADR-016** ratifies the from-zero storage rebuild: fresh `schema/` authored per-table from the docs; DDL = hand-written SQL migrations, Drizzle query-only, **no drizzle-kit** (fork A; B's revisit trigger — before DB-3 at volume — preserved); three-part enum model (SQL CHECK + Zod + `enumText`); per-table build gate. Realizes ADR-002 §5.20; resolves ADR-001's migration-gen silence.
- **storage-build-plan.md** = the master table ledger: ~130-150 tables, disk-keyed (24 structure-data docs, NOT §5.20's stale 19) + §5.20 Stream-i, FK-ordered across phases P0→P-final, ✓/⏳/↔, with the DB-2…DB-11→phase map, per-table spec template, row-state lifecycle, count reconciliation.
- Governs the campaign; every table = its own Per-Step Build Gate, ordered by FK-deps. Next executable: DB-2 (P0.5 sync cols) then P1 (Notes/Tags/Spaces hub).

## build-roadmap-resequence (foundation-realignment campaign) — completed 2026-07-25

The `build-roadmap-resequence` task was reframed into a 3-part **foundation-realignment campaign** and completed end-to-end, each part double-gated with an independent adversarial critic + a domain quality-gate + Victor acceptance.

- **Part 1 — Documentation realignment.** All 34 docs (24 context + 8 arch) realigned to ADRs 004–017; capability-framework authored; 34/34 aligned, corpus-wide zero forward-stale.
- **Part 2 — Repository structure → ADR-018.** Re-derived `@vida/core` from the realigned docs: `foundation/` substrate tier (12 dirs incl `effects/`) + kept `services/` per-module tier (governed by `data-flow.md`); `models/` dissolved into `@vida/types`; v1 `schema.ts` monolith + `001_initial.ts` quarantined to `db/_legacy/` and unwired (`runner.ts` registry emptied); dead `web-adapter.ts` → `Old/`. Structure only (ADR-017); build 8/8 + typecheck 10/10 green.
- **Part 3 — Build roadmap resequence → ADR-019.** Rewrote `docs/roadmap.md` features-first as **M1→M4**: M1 whole-OS-manual + internally-integrated (unencrypted) → M2 external integrations + security boundary (co-built, against the seam) → M3 whole-OS encryption pass (release gate) → M4 venues/multi-device. Schema per-feature (ADR-016); encryption/sync/auth deferred; old Phase-3 integrations pulled to M2, old Phase-2 venues → M4. Every deliverable re-mapped via a per-deliverable ledger (none dropped). **Key verified decision:** integrations precede encryption-at-rest (M2 before M3) is ZK-safe because ZK-1 is server-blindness (L3/sync = M4); encryption gates release.

**RP = Real Product** (resolved). **Follow-on:** `linear-projectize` (U3) — its own gated task to re-scope LIF-61…95 onto the M1→M4 clusters. Commits: Part 2 f63786e/e45a081/56d56c5; Part 3 257bd6f/994f2b9; merges 90550fa/d453301. Linear LIF-96 Done.

## linear-projectize (U3) — completed 2026-07-26

Re-projectized Linear from the old substrate-first five-layer structure (①–⑤, LIF-61…95) onto the features-first **M1→M4** roadmap (ADR-019).
- **Created Projects:** M1.0 Boot & Connective Base (+5 milestones), M1.4 Internal-Integration Hardening, M2 External Integrations & Security Boundary, M3 Whole-OS Encryption & Security Pass, M4 Venues / Multi-Device (+milestones).
- **Re-homed 33 existing issues** to final M-homes by existing LIF id (no duplication): 30 boot/foundation → M1.0; DB-5/AR-3 → M3; DB-11 → M1.4.
- **Created split/head issues** (decision: separate issues): ar-9b-sync-activate (LIF-98, M4), db-8b-blind-index (LIF-99, M3), provider-selection (LIF-100, M2 head), ux-5b-vault-unlock (LIF-101, M3).
- **Old ①–⑤ emptied** (0 issues) → the 5 empty Linear Projects should be archived in the UI (tracker_sync creates/updates but does not delete Projects).
- **Net-new module/integration/venue issues remain create-at-gate** (roadmap rule — created as each M-phase begins, not up front).
- **Gotchas recorded:** Linear Project description cap = 255 chars (multi-byte → / ① inflate byte-count); `--approve-cluster` from a dry-run short-circuits later syncs → use `--sync --allow-new-clusters`. Linear LIF-97 Done.

## m1.0-delivery-plan (Milestone Delivery Planning) — completed 2026-07-26
- **current-* doc home** = per-context level-home (`docs/core|infrastructure|ui|editor|features`), NOT a new `docs/modules/` tree — aspect docs + current-* share one home (I2 rule).
- **DOC spine per issue** = the real 3-level hierarchy (`/document-context` baseline+currency · `/documentation-component` forward · `/layer-docs`), woven into §XXVI/§XXVII — "document in the proper way AS you build", enforced not aspirational.
- **DB-3/DB-4 = streaming issues** (schema lands per-substrate/per-module, ADR-016 §3.5), tracked but not one-shot builds.
- **Dependency graph authority:** the tracker's gated blocked-by OUTRANKS a fresh plan derivation — but can carry stale pre-resequencing edges; reconcile against the sequencing ADR. Fixed 2 stale edges (DB-6←DB-5 crossed M1.0→M3 violating ADR-017; AR-9←DB-2 parked) on BOTH sides (add-only sync would else re-add).
- **New toolkit scenario:** `project-foundation/scenarios/milestone-delivery-planning.md` (crystallized from build-roadmap.md) — the repeatable manual for every later milestone's delivery planning.
- Not a Linear issue (strategy meta-task). Artifact: `docs/roadmap/m1.0-delivery-plan.md`.

## AR-2 DatabaseAdapter + web-adapter — completed 2026-07-27
- **Async driver over wa-sqlite** (reversed an initial sync plan). wa-sqlite@1.0.0's Factory API is async-only, so a
  sync driver is impossible; adopted the delivery plan's "async Drizzle proxy" (`drizzle-orm/sqlite-proxy`).
  `DrizzleDb` is `'async'`; `repository.ts` + `migrations/runner.ts` async-propagated. No new ADR — ADR-001 (wa-sqlite)
  governs and never required sync.
- **Optional `sqlCipher` config seam** — the DB opens plain in M1.0; passing a config activates SQLCipher at M3. A
  config change, not a code change.
- **Repository encrypt/decrypt seam stays DB-6** — AR-2 only async-propagated the consumer to keep the build green.
- **Items 1&2 (browser open/persist) verification deferred to LIF-103** (Playwright + OPFS/worker harness), a net-new
  shared-infra dependency surfaced by the completeness audit; AR-2 closed on contract (5/7 DoD).

## m1.0-dep-graph-validation (LIF-105) — completed 2026-07-28
- **Graph edges are build-order blockers, not runtime feeds.** A ready-frontier needs "B must exist before A is
  built"; the delivery-plan §5 had conflated feeds/implements (esp. the UX design track). New rule in §5.1.1.
- **db-8 ← db-4, db-7 (not db-6).** FTS5 tables are DDL via the runner; the db-6 populate path is gated on a
  vault-unlock that is M3 → an illegal M1.0←M3 edge (same class as the retired DB-6←DB-5 and the ux-5←ar-3 below).
- **ux-5 ← ux-1 (ar-3 removed).** An M1.0 design issue cannot be build-blocked by M3 crypto; vault-unlock impl is
  carved to ux-5b/M3.
- **UX track (ux-2..6) blockers are design-time (ux-1/ux-3), not the downstream shell/services they feed.**
- **db-10 ← +db-9** (seed needs canonical enums); **ds-4 ← +ds-3** (Tamagui animations config); **ar-8 ← ar-6**
  (owns entity_links; ar-2 transitive).
- **Streaming loop model:** db-3/db-4 are schema-slices folded into each consumer's gate, never standalone ready heads.
- **Method:** census → per-edge derivation → independent adversarial ADR-critique (caught db-8←db-6) → write
  identically to task files + Linear (7 mutations) + §5; --verify clean (47 live). Reversible: yes (edges).

## AR-5 Sessions base — completed 2026-07-28 (commit f045ac1, merged 4956c81; LIF-107)
- **Grain = Option 1 (structure + contract types + thin registry).** AR-5 ships the `sessions` spine +
  integration-contract STRUCTURE (session_type_registry, session_attachments) + 5 canonical enums + a thin
  SessionRegistry. The effect-firing rail, lifecycle-transition engine, and scheduler DEFER to AR-7/later.
- **AR-5/AR-7 effect-rail boundary (not a fork).** plan §5:120-122 + §5.1.1 (build-order≠runtime-feed) +
  ADR-004 §3.2.5 ("owner"=spec-owner) already fix it: AR-5 = contract surface + effect-catalogue vocabulary;
  AR-7 (← AR-5) = the firing rail. "ridden by sessions" is a runtime feed, not a build edge.
- **EFFECT_TYPE = 12 members** (ADR-004 §3.2.2 base 8 + ADR-012 amendment 4: grant_currency/lock_currency/
  move_money/surface_notification). award_xp retained (ADR-012 generalizes, does not retire it).
- **sub_type/purpose OPEN (no SQL CHECK), registry-validated** — a hard CHECK breaks SS-5 user-extensibility;
  status/scheduling_mode/level are FIXED SQL CHECKs; EFFECT_TYPE is Zod-validated (JSON, no CHECK).
- **session_type_registry uses id PK + sub_type UNIQUE** (not sub_type PK) so the db-6 generic Repository
  (id-keyed) drives persistence; user types enqueue to sync_queue; shipped types are in-memory (SS-4).
- **BR-4 containment = effects ⊆ allowed_effects ⊆ shipped envelope** (post-impl critique fix).
- Method: full §XXVI double-gate + 3 independent critiques (each caught a real defect); typecheck 10/10,
  core 110/110. Reversible: yes (additive migration 002).

## AR-6 Spaces substrate — completed 2026-07-29
- Scope is mechanical (capability-framework §3): SP1–SP7 (ADR-006) + V1–V5 (ADR-007) — not a "grain" choice.
- entity_links shape = decided `(page_id, entity_type, entity_id, context)` (cross-module-integration §3.2 + security-model), page-anchored, open target registry, no FK; NOT source-polymorphic (a retracted invention).
- Types placement follows the built-substrate convention (AR-5): @vida/types = enum vocab only; row types = schema $inferSelect; service types in core/foundation.
- M1.0 = empty-[E] pass-through (ADR-017:20); [E] marks are the M3 target.
- Junctions idempotent (findWhere-before-insert) + resolve-then-soft-delete; tag/space nesting cycle-guarded.
- Deferred by the docs (not chosen): capability registry/block_instances→AR-7; effect rail→AR-7; backlink resolver→AR-8; predicate-DSL/layout/resolution-surface→build-time; page_tags retirement→N&P (M1.1).

## DB-7 migrations runner + app_state — completed 2026-07-29
- Reconcile+extend (NOT from-zero): the runner + engine (runMigrations/get/setSchemaVersion) already existed with migrations 001/002/003 live. db-7 authored the ONE missing piece.
- Closed a latent bug: getSchemaVersion swallows the missing table (→0), but setSchemaVersion INSIDE the loop INSERTs into app_state (adapter.ts:231) — no production migration created it, so migrate() threw at real web boot (worker.ts:23); masked only by 4 test fixtures.
- app_state = documented infra (ADR-002 §5.0 `key TEXT PK, value TEXT NOT NULL`; §9.1 schema_version). NOT an architectural decision — Victor corrected a manufactured "option A/B" fork; the docs already decide. See memory read-architecture-before-implementing.
- Bootstrap is pre-loop (ensureInfra, idempotent CREATE IF NOT EXISTS) not a versioned migration — it is the version store, so it can't be version-gated. Mechanically forced, not a choice.
- Home = schema/foundation/app-state.ts (DB-6 sync_queue precedent), NOT the build-plan's stale schema/infra.ts → ledger amended.
- Forward-only preserved (no down(); inherited divergence from ADR-002 §9.2, rationale ADR-016:17 — reconcile at DB-11).
- resetDev dev-only (import.meta.env.DEV read type-safely, fails closed; not barrel-exported).
- Method: full §XXVI double-gate + 3 independent critiques (all SHIP; gate-1 caught a 4th fixture + BR-5 mechanism). typecheck 10/10, @vida/core 131/131, @vida/web 6/6. Reversible: yes (additive). commit d7aa1e0, LIF-69 Done.

## AR-4 State/Routing/Forms — completed 2026-07-30 (LIF-75)
- **ADR-020: Zustand store placement = per-app React hooks** (`apps/web/src/stores/`), NOT vanilla-in-`packages/core`. Resolves the long-deferred ADR-001:286; revisit at M4 if a cross-platform store consumer appears.
- **Code homes** = the architecture docs (`stores/`·`hooks/`·`routes.tsx`·`App.tsx`·`lib/`·`db/`), over the delivery-plan §149 `{stores,router,forms}` shorthand.
- **Routing** = code-based central `routes.tsx` + `lazyRouteComponent` code-split (not file-based; not per-module self-registration).
- **Grain** = mechanism + one reference per plane; per-module hooks/stores/forms land in each module's later wave.
- **D5 main↔worker binding** = a main-thread `SqliteDriver` proxy (`db/client.ts`) over the worker postMessage RPC — the app-facing binding AR-2 assigned to AR-4. `values`/`batch` (Drizzle path) are a declared deferred seam.
- **Library APIs verified (context7)**: TanStack Form v1 takes a Zod schema directly (Standard Schema; no adapter pkg); Router uses `lazyRouteComponent`.
