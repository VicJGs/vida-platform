# Fix: m1.0-a-spine-dep-reconcile
Type: structural (planning/dependency graph) · Date: 2026-07-27
No-Guessing: every corrected edge traces to an ADR.

## Findings (symptoms)
The M1.0 `-a` spine dependency graph was inconsistent across three artifacts — the delivery-plan §5 `Depends-on`
table, the task-file/Linear `blocked-by` edges, and the layer/ADR contracts. Concretely:
- `DB-6 ← db-4` and `DB-7 ← db-4` — spurious (repo + runner are generic/table-agnostic).
- `AR-5/6/7 ← ar-2 only` — under-specified (missing the real DB-6 + DB-9 deps).
- §4 critical-path drew `DB-9` after DB-6 (it's parallel off DB-1) and chained `DB-6→DB-7` (they're siblings).
- `sync_queue` + `app_state` (ADR-002 §5.1 system-local tables) had **no build owner**; DB-6 and AR-9 **both**
  claimed the `sync_queue` write (latent DB-6↔AR-9 cycle).

## Root cause
**No single source of truth for the dependency graph.** Two independent derivations (delivery-plan §5 from ADR
logic; task-file/Linear from the earlier build-roadmap) coexisted, and §5.1's rule "Linear always wins" *resolved
conflicts by fiat instead of per-edge validation* — canonizing an incomplete/incorrect graph. The symptoms are all
instances of that one cause.

## Facets / verification
- ADR-004 §3.4 + §3.2.5-B2: the `sync_queue` enqueue is **co-transactional** with the entity write → belongs to the
  repository (DB-6), producer side. AR-9 = reader/flush engine stub, activates M4 (ADR-017 §5).
- ADR-016 §3.1/§3.2 + ADR-018 §3.1/§3.5b: DDL = per-feature migrations (no `001_initial` bootstrap; deleted); no
  `schema/system.ts` — system tables live as `schema/foundation/` fragments. `app_state` = DB-7's schema-version
  store (ADR-002 §9.1). System tables skip `baseColumns`/`syncColumns` (ADR-002:151 not-synced).
- ADR-018 §3.1: `applied_effects` (also not-synced) is homed in `foundation/effects/` and stays in the DB-3 stream —
  "not-synced" is a property, not a shared home. Three not-synced tables, three homes.
- Independent ADR-critique verdict: REVISE → corrected `schema/system.ts`, the `001_initial` bootstrap, and the
  `DB-6 ← DB-7` edge (all rejected); D-B (DB-6 owns write) upheld and strengthened by ADR-004.

## Corrected graph (all edges ADR-traced, acyclic)
```
DB-9 ← db-1                         DB-3 ← db-1 (incl. applied_effects → foundation/effects)
DB-7 ← ar-2 (authors app_state fragment)     DB-6 ← ar-2 (authors sync_queue fragment + co-tx enqueue)
AR-5 ← DB-6, DB-9    AR-6 ← DB-6, DB-9    AR-7 ← AR-5, DB-6, DB-9    AR-9 ← DB-6 (flush stub only)
```

## Files changed
- Task files: db-6, db-7 (drop db-4; goal rescopes), ar-5, ar-6 (← DB-6+DB-9), ar-7 (+DB-6+DB-9), ar-9 (← DB-6; write→DB-6).
- Delivery plan: §4 path, §5.1 rule (retired "Linear wins"), line 118 (AR-9 row).
- Linear: additions via `--sync`; manual deletions listed in the session summary (tracker is add-only).

## Prevention
Retired the "Linear always wins" rule → per-edge derivation from layer/ADR contracts, written identically to all
three sources. `/toolkit` dep-graph checks should validate task-file ## Dependencies against this record.
