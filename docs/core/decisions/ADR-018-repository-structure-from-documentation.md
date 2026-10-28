# ADR-018: The `@vida/core` structure is re-derived from the realigned documentation — a `foundation/` substrate tier + a kept `services/` per-module tier; the v1 `schema.ts` monolith and its migration are quarantined reference-only; `models/` is dissolved into `@vida/types`

**Status:** Accepted
**Date:** 2026-07-25
**Decision Makers:** Victor J.
**Context:** Vida Platform — Part 2 of the foundation-realignment campaign. Part 1 realigned all 34 docs (24 contexts + 8 arch docs) to the ADR-004–017 foundation; those docs **deliberately deferred every code/directory home to "a later structural phase"** (`cross-module-integration.md:8`, `module-dependency-graph.md:13`, `platform-strategy.md:12`). This ADR is that phase. The coded surface is ~99% pre-documentation residue built against the OLD foundation (ADR-001/002/003 + the quarantined v2 guide), incoherent with the ADRs that now govern `[FACT: current-state-baseline/baseline.md §2, §5]`. Basis: `docs/specs/foundation/part-2-repository-structure/_index.md` (the gate-1 PLAN, critique+preflight grounded).
**Tags:** architecture · repository-structure · foundation · process · substrates
**Realizes:** the `[home: Part 2]` markers across the 8 arch docs + the directory-home half of every `[DEFERRED — Part 2]` marker in the 17 Part-1.2 re-runs (their DDL/columns/ADR-002 halves stay build-phase).
**Amends:**

- **The master-plan Part-2 line** — reconciles it with ADR-017: Part 2 does **structural placement + quarantine + unwire only**; it does **not** author schema tables (that is per-feature, ADR-016 §3.5 / ADR-017 §1).
  **Consistent with (does NOT amend):** ADR-002 (§5/§7/§8 schema reconciliation stays **DB-11**'s), ADR-016 (§3.1 `schema/` layout honored), ADR-017 (features-first; encryption/sync/auth deferred), `data-flow.md` (which governs `services/` — retained here, not contradicted).
  **Inherits:** the No-Guessing Principle; the DB-1 primitives (`schema/_shared.ts` · `_registry.ts`).

---

## 1. Summary

`@vida/core/src` is reshaped to match the realigned docs' model — _"feature modules riding shared foundation substrates"_ (`module-dependency-graph.md:31`) — mapped physically as:

- **`foundation/`** (new) — the **cross-cutting substrate tier**: one subdir per substrate + the two table-less integration layers. **14 substrates → 12 dirs + 2 documented merges.**
- **`services/`** (kept) — the **per-module business-logic tier**, retained because `data-flow.md:7` already governs it as the service home with a mandated data-flow pattern.
- **`db/` · `encryption/` · `sync/` · `utils/`** (kept as-is) — the already-current spine (ADR-017 seam posture).
- **`models/`** (dissolved) — the type/model layer already lives in `@vida/types` (~2,600 LOC); a `core/src/models/` would duplicate it.

Plus two **unwires**: the v1 `schema.ts` monolith (81 tables, ~60% stale) is quarantined reference-only so consumers bind the v2 `schema/` directory; the v1 migration `001_initial.ts` is quarantined and `runner.ts`'s registry emptied. **Structure only — no feature code, no schema tables, no DDL.**

## 2. Context — what triggered this

- **The docs deferred code homes to this phase, four times explicitly.** `[FACT: cross-module-integration.md:8 "Service code homes are re-derived by the structural phase, not fixed here — ADR-016"; module-dependency-graph.md:13; platform-strategy.md:12; part-1.3 §2.1]`
- **The architecture is incoherent with the current ADRs.** The 5 core + 9 secondary substrates the ADRs mandate have **zero code home** (grep count 0); the code + pre-realignment arch docs described the pre-ADR "17 flat modules" world. `[FACT: baseline §2]`
- **The continuity trap.** `core/index.ts:59` (`export * as schema from './db/schema'`) and `adapter.ts:16` (`import * as schema from './schema'`) both resolve to the **stale v1 `schema.ts` file**, not the v2 `schema/` directory (a file beats a same-named dir under `moduleResolution: "bundler"`). `[FACT: tsconfig.base.json:6; schema/index.ts:2-3]`
- **ADR-017 bounds the scope.** The from-zero `schema/` is authored **per-feature**, not full-schema-first — so Part 2 places homes and unwires, but authors no tables. `[FACT: ADR-017 §1]`

## 3. Decision

**3.1 `foundation/` — the substrate tier (new).** One subdir per substrate; the two table-less integration layers (Ingestion, AI) live here too (they are cross-cutting, not owned by a module):

`sessions/` (ADR-004) · `review/` (ADR-005) · `spaces/` (ADR-006 — incl. `entity_tags` + the open taggable-type registry, **merge #13**) · `views/` (ADR-007) · `capability/` (ADR-008 **+ ADR-010** authoring-security, **merge #7**) · `templates/` (ADR-009) · `measurement/` (ADR-011) · `economy/` (ADR-012) · `notifications/` (ADR-013 — the ZK 3-tier delivery **rail**) · `ingestion/` (ADR-014) · `ai/` (ADR-015) · `effects/` (framework §2 R1/R2 — the `effect_event_id`/`applied_effects` exactly-once rail sessions/economy/measurement ride).

**Substrate accounting:** 14 substrates → **12 dirs + 2 merges** (CapSecurity #7 → `capability/`; OpenRegistry #13 → `spaces/`). Making the substrate tier a single, visible home is the point: these carry _"the widest blast radius in the platform"_ (`module-dependency-graph.md:34, 302`) — changed once, not duplicated per module.

**3.2 `services/` — the per-module tier (kept).** Per-module business logic, one subdir per module, following the `data-flow.md` service-method pattern: `notes/ preferences/ journals/ tasks/ habits/ finance/ relationships/ learning/ languages/ projects/ routines/ checkins/ purposes/ bucketlist/ gamification/ notifications/` + platform utilities `export/ search/ analytics/`. Retained (not replaced by a new name) because `data-flow.md:7` already **governs** `packages/core/src/services/` as the business-logic home.

**3.3 The substrate↔surface split.** Where a substrate has both a shared engine and a user-facing module, it gets **both** homes: `foundation/notifications/` (the ADR-013 delivery rail) + `services/notifications/` (the peripheral module surface); this mirrors `foundation/economy/` (the ADR-012 engine) ↔ `services/gamification/` (its surface). `preferences` is a doc-"substrate" (ADR-002) homed in `services/` (it owns a settings surface) — same pattern.

**3.4 `models/` dissolved.** The per-domain type + Zod layer lives in `@vida/types` (`platform-strategy.md:36`, populated ~2,600 LOC). The empty `core/src/models/*.ts` (9 files, 0-LOC) are deleted; no `core/src/models/` tier.

**3.5 The two unwires.** (a) `schema.ts` → `db/_legacy/schema.v1.ts` (reference-only until parity, ADR-016 §3.1); moving it auto-rebinds both binders to the v2 `schema/` directory — a **zero-table** namespace (severs the v1 81-table surface). Survivable: all binders use `schema` as a `typeof`/namespace value, never a table dereference. (b) `001_initial.ts` → `db/_legacy/`; `runner.ts`'s `ALL_MIGRATIONS` emptied (it stays live — the migration seam is kept, repopulated per-feature).

**3.6 Skeleton depth.** Directory homes carry a **layer-doc `CLAUDE.md`** (what lives there + owning ADR), **not** empty `.ts` stub files — the deliberate reversal of the pre-ADR 68-stub anti-pattern.

## 4. Consequences

- **The substrate tier is now visible and single-homed** — a change to a substrate contract has one home, not N module copies.
- **`services/` is preserved** — no churn to the `data-flow.md` service pattern; per-feature builds land in the documented home.
- **Consumers bind the v2 `schema/`** — the v1 monolith no longer shadows it; the table surface is 0 until per-feature authoring fills it (ADR-016).
- **`runner.ts` runs against an empty registry** — `migrate()` is a no-op until the first per-feature migration is authored; the API stays stable.
- **No feature/table/DDL is authored** — those remain the build phase's (ADR-016 §3.5) and DB-11's (ADR-002 §5/§7/§8).
- **Reversible** — the quarantines are `git mv`; the `runner.ts`/barrel edits are content reverts.

## 5. Alternatives considered

- **`substrates/` + `features/` naming** — same shape, different labels. Not chosen: `foundation/` matches the docs' "foundation substrate" term + the existing `schema/foundation/`; `services/` is already governed by `data-flow.md`.
- **Flat `services/` + `models/` (v1 style), re-homed** — Victor's initial lean. Rejected on the architecture check: a flat `services/` scatters substrate engines among module services and hides the substrate distinction (the arch spine); and `models/` duplicates `@vida/types`. The reconciliation keeps `services/` (the sound half) and adds `foundation/` (the missing tier).
- **`foundation/` + `modules/`** (drop `services/`) — the first draft. Rejected: it discards `data-flow.md`'s governed `services/` home for no gain.
- **Author the v2 tables now** — rejected: ADR-017 makes schema authoring per-feature; Part 2 is structure only.
