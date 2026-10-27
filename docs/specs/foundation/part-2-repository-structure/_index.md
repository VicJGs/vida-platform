# Part 2 — Repository Structure (gate-1 PLAN)

**Type:** planning (foundation) — the Part-2 gate-1 forward spec that the master-plan forward-declared. This is the **SPEC (gate 1)**: the target structure + disposition ledger + decisions. The execution steps are the **IMPLEMENTATION-PLAN (gate 2)**, authored after Approval 1.
**Status:** ✅ **COMPLETE — EXIT GATE ACCEPTED (Victor 2026-07-25).** U2 `f63786e` + U3 `e45a081` + housekeeping `56d56c5`; build + typecheck green. Both exit lenses cleared: independent critic = ACCEPT (0 blocking), quality-gate-foundation = PASS. Part 2 closed → Part 3 next.
**Date:** 2026-07-25 · **Task:** build-roadmap-resequence (foundation-realignment campaign) · **Part:** 2 of 3
**Scenario:** Repository Structure (runs under the master-plan Part-2 framing + §XXVI full double-gate).
**Grounded in (No-Guessing inputs):**

- `docs/specs/foundation/current-state-baseline/baseline.md` — the file census (§1 code-facing findings still valid; Part 1 changed only docs).
- The 34 realigned docs (24 contexts + 8 arch docs) — the target structure is **derived** from them, not invented.
- `docs/core/decisions/ADR-016` (storage rebuild from zero — `schema/` layout §3.1) + `ADR-017` (features-first — parks the schema _immediacy_).
- `realignment-master-plan/part-1.3-arch-docs.md §1` — the 14-substrate delta brief (each substrate + owning ADR + capability IDs).
- `docs/core/architecture/data-flow.md:7` (governs `services/` as the business-logic home) + `module-dependency-graph.md §2` (the substrate/module taxonomy) + `platform-strategy.md:36` (package boundaries; `@vida/types` owns the model layer).
- `realignment-master-plan/_index.md` — Part-2 forward-declaration + the umbrella framing.
  **No-Guessing:** every claim is `[FACT: evidence]` / `[DERIVED: from doc]` / `[PROPOSAL: for ADR-018]` / `[ASSUMPTION — confirm at Approval 1]` / `[VERIFY at gate 2]`. Nothing past an `[UNKNOWN]` is guessed.

---

## §0. The one-paragraph thesis

The coded surface is ~99% pre-documentation residue built against the OLD foundation (ADR-001/002/003 + the quarantined v2 guide), incoherent with the ADRs (004–017) that now govern `[FACT: baseline §2, §5]`. Part 2 makes the **repository shape** match the realigned docs: (a) decide the **directory home** for each of the 14 foundation substrates the docs cite but were forbidden to place (the `[home: Part 2]` / `[DEFERRED — Part 2]` markers); (b) **quarantine** the pre-foundation residue reference-only; (c) **unwire** the v1 `schema.ts` monolith so consumers bind to the v2 `schema/` directory; (d) stand up the correctly-shaped **empty skeleton** — `foundation/` (substrate tier) + `services/` (per-module logic, kept per `data-flow.md`), directories + layer-docs, not stub files — so per-feature build lands in the right place. **Structure only — no feature code, no schema tables, no DDL.** The decision is recorded as **ADR-018**.

---

## §1. Scope — what Part 2 IS and is NOT (bounded hard by ADR-017)

**The reshaping finding.** The master-plan's Part-2 line predates the final ADR-017 posture. `[FACT: ADR-017 §1, ADR-016-as-amended]` ADR-017 **parks the schema rebuild's immediacy** — the from-zero `schema/` is authored **per-feature, as each feature is built**, not full-schema-first. Therefore Part 2 is bounded to **structural placement + quarantine + unwire**, NOT table authoring.

| Part 2 IS (structural)                                                       | Part 2 is NOT (deferred, and to where)                                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Decide the **directory home** of each substrate (the `[home: Part 2]` calls) | Author any **table / DDL / migration** → build phase, per-feature (ADR-016 §3.5, ADR-017 §1) |
| **Quarantine** pre-foundation code residue reference-only                    | The **ADR-002 §5/§7/§8 schema reconciliation** → DB-11 (ADR-016 §4)                          |
| **Unwire** the v1 `schema.ts` monolith (repoint the barrel to `schema/`)     | Any **feature/screen/engine** code → Phase-1.0 features-first (ADR-017)                      |
| Stand up the **empty correctly-shaped skeleton** (dirs + layer-docs)         | **Encryption / sync / auth** wiring → the hardening pass (ADR-017 §5)                        |
| Author **ADR-018** (retire Phase-0 architecture; re-derive from docs)        | The `19→24` / `~72`-table counts → DB-11 (never asserted here)                               |

**Governing invariant (inherited, inverted):** Part 1's boundary rule was _"cite the conceptual home + ADR, never place the code home."_ **Part 2 is where the code home is placed** — but ONLY the directory home. The DDL/columns/effect-wiring that the `[DEFERRED — Part 2 / build]` markers bundle alongside the directory home **stay deferred to the build phase** (they are `[INTENT — build]` per each re-run's boundary-rule checklist).

---

## §2. Ground-truth summary (from the baseline — the reorg's target list) `[FACT]`

**Scale:** ~105 meaningful `.ts/.tsx`, ~8,459 LOC; **68 (65%) are 0-LOC stubs**; only **3 files / 59 LOC** post-date the foundation (the DB-1 primitives). `[FACT: baseline §1]`

Four structural liabilities Part 2 acts on:

1. **The continuity trap** `[FACT: core/index.ts:59 + schema/index.ts:2-3 + tsconfig.base.json:6]` — `packages/core/src/index.ts:59` does `export * as schema from './db/schema'`, which resolves to the **stale v1 `schema.ts` file** (1,300 LOC, **81 tables** `[FACT: grep -c sqliteTable]`, ADR-016 rates ~60% misaligned), **not** the v2 `schema/` directory (a file beats a same-named dir under `moduleResolution: "bundler"`). **Blast radius — corrected importer taxonomy** `[FACT: corrected grep, matching both `db/schema`and sibling`./schema` + barrel-transitive forms]`: **three binders**, not two —
   - `core/src/index.ts:59` — `export * as schema from './db/schema'` (the barrel; file-beats-dir → binds `schema.ts`).
   - `core/src/db/adapter.ts:16` — `import * as schema from './schema'` (**sibling-relative — ALSO hits the file-beats-dir trap**; my first grep missed it because it matched only the literal `db/schema`. `baseline.md:37` names it: _"consumers (adapter, repository) bind to the stale monolith."_).
   - `apps/web/src/db/web-adapter.ts:29` — `import { schema } from '@vida/core'` (**transitive via the barrel**, not a direct `db/schema` edge; itself **dead — 0 real importers** `[FACT: baseline §1; only a doc-comment self-ref at web-adapter.ts:438]`).

   **Key mechanism `[FACT: verified]`:** none of the three **dereferences a concrete table** — so the rebind to a zero-table namespace compiles. Precisely (N-1 correction): `index.ts:59` is a pure re-export; `adapter.ts:16/:23` uses `schema` only as `typeof schema` (generic); `web-adapter.ts:36` uses `typeof schema` **and** `:342` passes the **whole `{ schema }` namespace object** as a runtime arg to `drizzle(...)` — a namespace value, **not** a table access, so it too survives the rebind (it just resolves to the v2 primitives namespace). The only `schema.<table>` reference anywhere is a **JSDoc `@example` comment** (`repository.ts:210`), not code — so `repository.ts` has no real `schema` import (baseline §37 over-claims it — see N-baseline).

2. **5 core + 9 secondary substrates have zero code home** `[FACT: baseline §2 grep count 0]` — Sessions/Spaces+entity_tags/Capability/Measurability/Economy + Review-engine/Views/Templates/CapSecurity/Notifications/Ingestion/AI/OpenRegistry/EffectRail. The realigned docs cite all 14 (conceptual home + ADR) and left them `[home: Part 2]`.
3. **v1 model/service stubs imply a pre-ADR structure** `[FACT: baseline §1]` — `core/src/models/*.ts` (9 files, 0-LOC) and `core/src/services/*.ts` (9 files, 0-LOC: `journal-service`, `pomodoro-service`, `backlink-service`, …) name a **pre-substrate** module layout. They are empty and misleading.
4. **Legacy is identifiable/quarantinable** `[FACT: baseline §5]` — the v1 `schema.ts` + `migrations/001_initial.ts` (v1 80-table DDL) + the dead `web-adapter.ts`. (The v2 _guide_ `docs/architecture.md` was already quarantined in Part 1.0.)

**What already matches the current foundation — KEEP AS-IS** `[FACT: baseline §2 "what DOES match"]`: the 4-app layout (web/desktop/mobile/server); the ADR-017 seam posture (empty sync stubs, empty-passphrase adapter); the DB-1 primitives (`schema/_shared.ts` · `_registry.ts` · `schema/index.ts`); the encryption library behind its off-seam; the table-agnostic `repository.ts` + `runner.ts`; `@vida/types` (~2,600 LOC).

---

## §3. Target repository structure `[DERIVED from the docs + ADR-016 §3.1; PROPOSAL for ADR-018]`

> Every home below traces to an ADR or the substrate brief. Homes marked `[PROPOSAL]` are the ones ADR-018 ratifies; `[FACT]` homes already exist or are ADR-fixed.

### 3.1 Package boundaries — UNCHANGED (already coherent) `[FACT: baseline; REPO.md]`

`@vida/types` · `@vida/core` · `@vida/editor` · `@vida/ui` + apps `web` · `desktop` · `mobile` · `server`. No package is added, removed, or renamed. The reshape is **inside `@vida/core/src`** + the quarantine.

### 3.2 `@vida/core/src/db/schema/` — ADR-fixed layout, skeleton only `[FACT: ADR-016 §3.1]`

```
db/schema/
  _shared.ts      [FACT: exists — DB-1]      primitives / typed helpers
  _registry.ts    [FACT: exists — DB-1]      entity_type registry
  foundation/     [PROPOSAL: create empty]   cross-cutting substrate TABLES (sessions, spaces,
                                             entity_tags, views, measurement, economy, …) — authored
                                             per-feature at build phase (DB-3+), NOT here
  <domain>.ts     [deferred — build phase]   one per structure-data.md; authored per-feature
  index.ts        [FACT: exists — DB-1]      barrel (re-exports table modules as authored)
```

Part 2 creates `foundation/` as an **empty directory with a layer-doc** (`CLAUDE.md`) naming what it will hold + the owning ADRs. It authors **no tables**.

### 3.3 `@vida/core/src/` substrate + module homes `[PROPOSAL for ADR-018]`

The substrates are both tables (§3.2) and **logic/engines**. The engine tier is **0% built** `[FACT: baseline §4]` and is built per-feature (ADR-017). Part 2 decides _where each will live_, standing up **directory homes with layer-docs, not stub files** (the 68 empty stubs are the anti-pattern to remove, not multiply):

```
core/src/
  db/                 [FACT: keep]      schema/ · adapter.ts · repository.ts · migrations/ · runner.ts
  encryption/         [FACT: keep]      vault · srp · key-management · sharing (off-seam per ADR-017)
  foundation/         [APPROVED: new]  cross-cutting SUBSTRATE tier — one subdir per substrate + the
                        sessions/          two table-less integration layers (Victor Q2: integ→foundation):
                        review/            ADR-004 sessions · ADR-005 review · ADR-006 spaces (+entity_tags,
                        spaces/            open registry) · ADR-007 views · ADR-008+010 capability ·
                        views/             ADR-009 templates · ADR-011 measurement (kind×binding · contributions) ·
                        capability/        ADR-012 economy (currencies · consequence_ledger · rule→effect) ·
                        templates/         ADR-013 notifications-delivery RAIL (ZK 3-tier) ·
                        measurement/       ADR-014 ingestion (device-mediated guard) · ADR-015 ai (two modes) ·
                        economy/           framework §2 effects (R1/R2 effect rail: effect_event_id · UNIQUE ·
                        notifications/         applied_effects ledger — the exactly-once spine sessions/economy/
                        ingestion/             measurement ride; the 14th substrate, B-1)
                        ai/                — makes the platform-wide substrate blast radius visible in the tree
                        effects/           [module-dependency-graph.md:34, 302; part-1.3 §1 row 14].

  substrate accounting (B-1): 14 substrates → 12 dirs + 2 documented merges (CapSecurity #7→capability/;
  OpenRegistry #13→spaces/). notifications↔surface (B-2): foundation/notifications/ = the ADR-013 delivery
  RAIL; services/notifications/ = the peripheral module SURFACE — the same substrate↔surface split the docs
  apply to economy↔gamification. preferences is a doc-"substrate" (ADR-002) homed in services/ per Victor Q2
  (it owns a settings surface) — same pattern.
  services/           [APPROVED: keep] per-MODULE business logic, GOVERNED by data-flow.md:7 ("All service
                        <domain>/          implementations in packages/core/src/services/"). Victor Q2 hubs→modules
                                           land here as module services: notes/ preferences/ journals/ tasks/
                                           habits/ finance/ relationships/ learning/ languages/ projects/ routines/
                                           checkins/ purposes/ bucketlist/ gamification/ notifications/
                                           + platform utilities: export/ search/ analytics/. Empty homes +
                                           layer-docs only (built per-feature, ADR-017).
  (models/  → DISSOLVED — the type/model layer already lives in @vida/types [FACT: types/src populated
              ~2,600 LOC, platform-strategy.md:36]; a core/src/models/ would duplicate it.)
  sync/               [FACT: keep]      resolver · crdt · queue — empty stubs, seam-ready (ADR-017)
  utils/              [FACT: keep]      markdown · graph-data · ics-parser
  index.ts            [FACT: keep]      barrel — the continuity-trap rebind (§4, a consequence of the move)
```

**Rationale (for ADR-018) — the reconciliation Victor confirmed:** the arch model is _"feature modules riding shared foundation substrates"_ `[module-dependency-graph.md:31]`. That maps physically to **`services/` = the modules · `foundation/` = the substrates they ride**. `services/` is KEPT because the architecture already governs it (`data-flow.md:7` fixes it as the business-logic home with a mandated data-flow pattern, `:254/:259`); `foundation/` is added so the substrate tier — _"the widest blast radius in the platform"_ `[module-dependency-graph.md:34]` — is a visible, single-changed home rather than scattered among module services. The pre-ADR `models/` is dissolved (redundant with `@vida/types`). This honors both Victor answers: Q1 (keep `services/`, drop `models/`) + Q2 (integ→`foundation/`, hubs→module `services/`).

### 3.4 Apps — layout kept; disposition of desktop/mobile is the §6 open call

`apps/web` (A — first deliverable, ADR-017), `apps/server` — **keep**. `apps/desktop`, `apps/mobile` — **keep, disposition-tagged** (see §6 decision D2).

---

## §4. Disposition ledger (keep / migrate / quarantine / delete) `[the reorg's authoritative worklist]`

> `MIGRATE` = move to a new home. `QUARANTINE` = move to `_legacy/` reference-only (not deleted — no parity yet). `DELETE` = remove (empty/misleading, safe). Quarantine target `[ASSUMPTION — confirm]`: `packages/core/src/db/_legacy/` for schema, `Old/` at repo root for app-level dead code (mirrors the master-plan "Old/\_legacy" naming + the existing `docs/_legacy/`).

| #   | Path                                                                                    |  LOC | Disposition                                                           | Why / cite                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------- | ---: | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `core/src/db/schema.ts`                                                                 | 1300 | **QUARANTINE → `db/_legacy/schema.v1.ts`**                            | v1 monolith (81 tables), ~60% stale, reference-only until parity `[ADR-016 §3.1]`. **This move IS the unwire (B2):** removing the file removes the file-beats-dir shadow, so **both** `./db/schema` (index.ts:59) **and** `./schema` (adapter.ts:16) auto-rebind to the v2 `schema/` **directory** — a namespace that exports the DB-1 primitives and **zero tables**. The repoint therefore **intentionally severs the v1 table surface** (81 tables → 0); it is not a like-for-like rebind. Survivable because the 3 binders use `schema` only as `typeof schema` in a Drizzle generic, never dereferencing a table (`adapter.ts:23`, `web-adapter.ts:36`; only ref is the comment `repository.ts:210`).                                       |
| 2   | `core/src/db/migrations/001_initial.ts`                                                 | 1281 | **QUARANTINE → `db/_legacy/`**                                        | v1 80-table DDL; migrations are per-feature now `[ADR-017 §1]`. Runner keeps its `migrations/` dir (empty + `.gitkeep`). ⚠ **paired with row 2b** — see below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2b  | `core/src/db/migrations/runner.ts:18,20`                                                |   60 | **EDIT (the migration unwire) — REQUIRED, build-breaking if skipped** | `runner.ts:18` does a **runtime** `import m001 from './001_initial'` used in `const ALL_MIGRATIONS = [m001]` (`:20`); it is **barrel-exported** (`index.ts:83-88`) → a **4th consumer** of the row-2 file, and **not** `typeof`-only `[FACT: preflight B-1]`. Moving row 2 without this edit fails `tsc --build` and cascades to web/server (`turbo dependsOn ["^build"]`). **Fix in U2:** remove the `m001` import; set `ALL_MIGRATIONS: Migration[] = []`. `LATEST_VERSION` (`:48` guards `length>0`→`0`) and `needsMigration` (`:53`) already handle the empty registry. **`runner.ts` stays live** (the migration seam kept, ADR-017), repopulated per-feature. This is the migration-surface unwire, parallel to the schema unwire (row 1). |
| 3   | `core/src/index.ts:59` (+ `adapter.ts:16`)                                              |    — | **CONSEQUENCE of row 1 — verify, optional explicit edit**             | The barrel + adapter rebind **automatically** when `schema.ts` is moved (row 1) — no content edit is strictly required. `[PROPOSAL]` optionally make `index.ts:59` an explicit `from './db/schema/index'` for reader clarity. `[VERIFY at gate 2]` `pnpm typecheck`: `DrizzleDb`/`WebDrizzleDb` (`typeof schema` generics) must still compile against the **empty-table** namespace.                                                                                                                                                                                                                                                                                                                                                             |
| 4   | `apps/web/src/db/web-adapter.ts`                                                        |  472 | **QUARANTINE → `Old/`**                                               | real wa-sqlite/OPFS adapter, **dead — 0 real importers** `[FACT: baseline §1; comment-only self-ref at :438]`. **Barrel-transitive consumer** (`from '@vida/core'`, not a direct `db/schema` edge) → it rides on row 1's rebind, so **sequence its quarantine with/before the move** (U2 before U3) to keep the gate-2 typecheck against the final consumer set. ADR-017 §1 rebuilds the web adapter at feature-build; preserved for reference (~473 LOC real OPFS work). `[ASSUMPTION — confirm: quarantine vs keep-as-seed]`                                                                                                                                                                                                                   |
| 5   | `core/src/models/*.ts` (9)                                                              |    0 | **DELETE (dir dissolves)**                                            | the model/type layer lives in `@vida/types` (`types/src` populated ~2,600 LOC) `[FACT: platform-strategy.md:36]`; the empty `core/src/models/` would duplicate it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 6   | `core/src/services/*.ts` (9)                                                            |    0 | **DELETE the v1 files; KEEP + re-home the `services/` dir**           | the 9 empty pre-ADR files (`journal-service`, `pomodoro-service`, …) are removed, but `services/` **stays** as the per-module business-logic home `[FACT: data-flow.md:7 governs it]` — repopulated per-domain per-feature (ADR-017). Substrate engines go to `foundation/` (§3.3), not `services/`.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7   | `core/src/db/schema/{_shared,_registry,index}.ts`                                       |   59 | **KEEP**                                                              | DB-1 primitives, the doc-derived beachhead `[FACT]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8   | `core/src/{encryption,sync,utils}/`                                                     |    — | **KEEP**                                                              | seam-ready per ADR-017; sync stubs stay empty by design.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 9   | `core/src/db/{adapter,repository}.ts`                                                   |  711 | **KEEP**                                                              | already-current spine `[FACT: baseline §4]`. Nuance (B1): `adapter.ts:16` DOES `import * as schema from './schema'` but uses it only as `typeof schema` (generic) → rebinds via row 1, no edit. `repository.ts` has no schema import (only the `:210` JSDoc `@example`, a false-positive to ignore at the gate-2 grep — N1). _(Corrected: the migration runner is `db/migrations/runner.ts` — row 2b — NOT `db/runner.ts`; the prior "771 LOC / db/runner.ts" conflated them, which is what hid B-1.)_                                                                                                                                                                                                                                           |
| 10  | `core/src/db/tests/repository.test.ts` (0) · `encryption/__tests__/{srp,vault}.test.ts` |    — | **KEEP**                                                              | test files; no schema import (verified).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | `apps/{web,server}` shells + `packages/{types,editor,ui}/src`                           |    — | **KEEP**                                                              | layout coherent (§3.1). `packages/editor` (~20 files) + `packages/ui` (~7) are real, kept as-is. 0-LOC app stubs (`web/src/app/*`, `server/src/routes/{auth,billing,sync}.ts`) → `[VERIFY at gate 2]` delete-if-empty vs keep-as-scaffold (per D2, mechanical).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 12  | `apps/{desktop,mobile}`                                                                 |    — | **KEEP (tag)**                                                        | see D2. `mobile/app/**` 0-LOC route stubs tagged `[Phase-2]`, not deleted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Ledger completeness (corrected per preflight N-2):** every censused dir + the previously-unlisted items (`db/tests/`, `encryption/__tests__/`, the migration `runner.ts` → row 2b, server/mobile route stubs, `editor`/`ui` bodies) are now dispositioned. Per-file resolution of the 0-LOC app stubs (row 11) is deferred to gate 2 (mechanical, low-risk).

---

## §5. Decisions surfaced → ADR-018 `[R2: never bury a decision in prose]`

**ADR-018 — "Retire the Phase-0 architecture; re-derive the `@vida/core` structure from the realigned documentation."** Records:

- The **`foundation/` (substrate tier) + `services/` (per-module business logic) + kept `db/`·`encryption/`·`sync/`·`utils/`** layout (§3.3), with each substrate's directory home + owning ADR. `services/` is retained per `data-flow.md:7`; `models/` is dissolved (redundant with `@vida/types`); integration layers (ingestion, ai) live under `foundation/` (Victor Q2).
- The continuity-trap rebind (§4 row 1/3) and the v1 quarantine (rows 1, 2, 4).
- **Amends:** the master-plan Part-2 line (schema authoring is per-feature, not Part 2 — reconciled with ADR-017). **Does NOT amend:** ADR-002 (§5/§7/§8 stay DB-11's), ADR-016 (§3.1 layout honored). **Consistent with:** `data-flow.md` (`services/` governance) — no arch doc is contradicted.
- **Realizes:** the `[home: Part 2]` markers across the 8 arch docs + the `[DEFERRED — Part 2]` directory-home half of the 17 re-runs.

`[VERIFY]` ADR-018 is authored **inside Part 2** (after Approval 1, at the structure-decision gate) — not in this PLAN.

---

## §6. Decisions `[D1/D2 RESOLVED by Victor 2026-07-25; D3–D5 confirm at Approval 2]`

- **D1 — `core/src` layout** (§3.3). ✅ **RESOLVED:** `foundation/` (substrate tier + ingestion/ai) + `services/` (per-module logic, kept per `data-flow.md`) + kept `db`/`encryption`/`sync`/`utils`; `models/` dissolved into `@vida/types`. Grounded in `data-flow.md:7` + `module-dependency-graph.md:31` + Victor's Q1/Q2 answers.
- **D2 — desktop/mobile scaffold disposition** (baseline §6 `[UNKNOWN]`). ✅ **RESOLVED (Q2 framing):** ADR-017: web (A) → desktop (D) graduation; mobile is Phase-2. **keep `desktop`** (graduation target, status note), **keep `mobile`** tagged `[Phase-2 — pre-ADR-017 scaffold, not current-build]`. Neither deleted.
- **D3 — quarantine locations** (§4). `[ASSUMPTION]` `db/_legacy/` (schema) + `Old/` (app dead code). Confirm the naming/location at Approval 2.
- **D4 — skeleton depth.** `[PROPOSAL]` directory homes carry a **layer-doc `CLAUDE.md`** (what lives here + owning ADR), **not** empty `.ts` stubs (the anti-68-stubs stance). Confirm at Approval 2.
- **D5 — unit decomposition** (§7). `[PROPOSAL]` 3 units vs one merged. Confirm at Approval 2.

---

## §7. Unit decomposition + per-unit gates `[PROPOSAL: D5]`

Part 2 = **3 gated units**, each a §XXVI full double-gate (or a merged single gate if you prefer — D5). Ordered by dependency:

1. **U1 — Target structure + ADR-018** (decision unit): ratify §3 + author ADR-018. Gate: PLAN(this) → critique → **Approval 1** → ADR-018 → critique → **Approval 2**.
2. **U2 — Quarantine + unwire + delete** (ledger rows 1, 2, **2b**, 4, 5, 6): `mkdir db/_legacy/` + `Old/` (N-3); `git mv` v1 `schema.ts`/`001_initial.ts` → `db/_legacy/`, dead `web-adapter.ts` → `Old/`; **edit `runner.ts` (row 2b) — remove the `m001` import, empty `ALL_MIGRATIONS` (REQUIRED, else `tsc` breaks)**; delete the empty pre-ADR `models/`+`services/*.ts` stubs. **This unit performs both unwires** — schema (moving `schema.ts` auto-rebinds the binders, B2) and migrations (row 2b). Quarantine `web-adapter.ts` **within this unit** (before U3's typecheck) so the gate runs against the final consumer set (B3).
3. **U3 — Skeleton + verify** (rows 3, 7–12): stand up `foundation/` (12 dirs incl `effects/`) + `services/` dirs + per-home layer-docs (D4); **refresh the stale `db/CLAUDE.md:20`** ("~60 tables in schema.ts" → points at the quarantined file; correct to the `schema/` dir + 81-table note, N-4); `[VERIFY]` `pnpm typecheck`/`build` green against the empty-table namespace (B2) + empty migration registry (2b); optional explicit-import edit (row 3).

**Exit gate (Part 2 close):** `victor:quality-gate-foundation` + an independent adversarial critic over the reorg + `pnpm typecheck`/`build` green + Victor acceptance → Part 2 closes → Part 3 (build roadmap).

---

## §8. Acceptance — definition of Part-2-done

- [ ] All **14 substrates** have a **directory home** — 12 dirs (incl `effects/`) + 2 documented merges (CapSecurity→capability, OpenRegistry→spaces) — each with a layer-doc citing its owning ADR (§3.3). notifications has both foundation (rail) + services (surface) homes, documented (B-2).
- [ ] `core/index.ts` **and** `adapter.ts` bind the v2 `schema/` directory; **zero** consumers resolve to `schema.v1.ts` — gate-2 grep matches **all three forms**: `db/schema`, sibling `./schema`, and barrel-transitive `from '@vida/core'` (N5 — the corrected grep that avoids the B1 miss); ignore the `repository.ts:210` JSDoc false-positive (N1).
- [ ] `runner.ts` compiles with an empty `ALL_MIGRATIONS`; `001_initial` is no longer imported (row 2b); `migrate()`/`LATEST_VERSION`/`needsMigration` still export cleanly.
- [ ] The v1 monolith + v1 DDL + dead web-adapter are in `_legacy/`/`Old/` (reference-only, not deleted).
- [ ] No empty pre-ADR stub files remain in `core/src` (`models/` dir dissolved; the 9 empty `services/*.ts` v1 files removed, `services/` dir retained per `data-flow.md`).
- [ ] `pnpm typecheck` + `pnpm build` green.
- [ ] **Zero feature code / schema tables / DDL authored** (scope guard — grep: no new tables in `schema/`).
- [ ] ADR-018 accepted; the master-plan `_index.md` Part-2 line + Change Log updated.
- [ ] Every `[home: Part 2]` / directory-home `[DEFERRED — Part 2]` marker is now resolved (points at a real home).

---

## §9. Risks

- **R1 — the unwire breaks a hidden consumer.** _Materialized once already_ — the preflight found a **4th consumer** (`runner.ts` runtime `import m001`, row 2b) the 3-binder grep missed; now specced. Mitigate: corrected grep = 3 **schema** binders (all namespace-value/`typeof`, never a table deref) + the migration runner handled explicitly (2b); `[VERIFY at gate 2]` full `pnpm typecheck`/`build`. Reversibility: quarantines (rows 1,2,4) are `git mv` (clean revert); the row-2b + optional row-3 edits are content reverts.
- **R2 — Part 2 silently authors schema/DDL** (the scope leak, inverse of Part 1's R5). Mitigate: §1 scope table + §8 grep guard; ADR-016/017 keep table authoring per-feature.
- **R3 — over-scaffolding** (re-creating the 68-stub anti-pattern). Mitigate: D4 — layer-docs, not stub files.
- **R4 — desktop/mobile deleted as "leftover" when they're intended targets.** Mitigate: D2 keeps both, tags rather than removes.
- **R5 — `foundation/` engine homes pre-empt a build-phase design.** Mitigate: Part 2 creates _empty_ homes + layer-docs only; the engine's internal shape is a build-phase gate.

---

## §10. Out of scope (deferred, with owner)

- Authoring any schema table / DDL / migration → build phase, per-feature (ADR-016 §3.5).
- ADR-002 §5/§7/§8 reconciliation + the 19→24 count → **DB-11** (ADR-016 §4).
- Any feature/screen/engine body → Phase-1.0 features-first (ADR-017).
- Encryption/sync/auth wiring → hardening pass (ADR-017 §5).
- Part 3 (build roadmap resequence) → after Part 2 exits.

---

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-25 | Initial gate-1 DRAFT authored from baseline + realigned docs + ADR-016/017 + part-1.3 §1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-07-25 | **Critique gate + preflight (2 independent subagents) → folded + re-verified.** CRITIQUE=REVISE: B-1 the 14th substrate (effect rail) had no home → added `foundation/effects/` + fixed the "14 homes" count to "14→12 dirs+2 merges"; B-2 `notifications` double-placed → documented the substrate(rail)↔surface split (mirrors economy↔gamification). PREFLIGHT=BLOCKED: **B-1 build-breaker** — `runner.ts:18` runtime-imports the quarantined `001_initial.ts` (4th consumer, barrel-exported) → added ledger **row 2b** (empty `ALL_MIGRATIONS`) to U2; N-1 `web-adapter.ts:342` passes `{schema}` as a runtime value not `typeof`-only → wording corrected (still survivable); N-2 ledger completeness (added `db/tests`, `encryption/__tests__`, runner row, server/mobile stubs; fixed the `db/runner.ts` conflation that hid B-1); N-3 `mkdir _legacy/Old` as a U2 step; N-4 refresh stale `db/CLAUDE.md:20`. All verified against the real files. |
| 2026-07-25 | **Structure reconciled + confirmed by Victor.** Q1/Q2 answers + an architecture check (`data-flow.md:7` governs `services/`; `@vida/types` owns the model layer) resolved the layout to **`foundation/` (substrate tier + ingestion/ai) + `services/` (per-module logic, kept) + kept db/encryption/sync/utils**, `models/` dissolved. §0/§3.3/§4(rows 5,6)/§5/§6(D1,D2)/§7(U3)/§8 updated. About to run critique + preflight.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-25 | **Independent adversarial critique → REVISE → folded → SHIP-ready.** B1 (importer taxonomy was FALSE — `adapter.ts:16 import * as schema from './schema'` was missed by a grep that matched only literal `db/schema`; **3 binders**, not 2; baseline §37 names it). B2 (the repoint **severs** the v1 81-table surface → empty-table namespace; survivable because all binders are `typeof schema` generic-only). B3 (web-adapter binds transitively via the barrel → sequence U2 before U3). N1–N5 folded (repository.ts:210 = JSDoc false-positive; corrected gate grep; git-mv vs edit reversibility; single-`_legacy` convention noted at D3). **N-baseline:** `baseline.md:37` over-claims `repository` as a monolith binder (it has no schema import, only a comment) and omits `adapter` — a one-line baseline correction is owed (non-blocking; ground-truth artifact). Awaiting Approval 1.                                                        |
