<!-- service/_index.md — Entity Service Build Flow (Track A) spec set · §5 lens 0.
     The retroactive PROPER SPEC for the built ① NotesService (authored in the recovery — the forward spec never
     made at first). REFERENCES the aspect corpus (identity·structure-data·business-rules·contract·conventions)
     + current-*; never restates. Bookend: authored now, refreshed at track close (§XXIX). Born 2026-08-22. -->

# Notes & Pages — Service Spec Set (Track A · backend)

**Entity:** Notes & Pages (MOD-notes ①, LIF-131, M1.1 hub). **Home:** `packages/core/src/services/notes/`.
**Status:** BUILT + MERGED through a §XXVI double-gate; this set documents it properly, post-hoc.
**Yardstick:** the `../` aspect corpus + `../current-spec.md` + `../current-business-rules.md` + the gated
`../delivery/interpretation.md` (NEEDS/IMPLICIT-RULES). No claim restates those — each lens references them.

## Scope

The connective-hub service over the DB-4 schema. **OWNS** `pages`/`page_links`/`note_attachments` CRUD +
`resolveWikiLink` + `ensureEntityNote` (NP-8) + `entity_tags` READS. **DELEGATES** entity-link/tag WRITES → AR-6
`SpacesService`, entity-link READS → AR-8 `BacklinkResolver` (ADR-018 §3.3 — "rides substrates, does not
re-implement"). **CONSUMES** the DB-6 generic `Repository` (co-transactional `sync_queue` enqueue), `@vida/types`
validators. `[FACT: service.ts:1-24; CLAUDE.md]`

Out of scope (homed elsewhere — do NOT add): `/summary` aggregation ENGINE → MOD-journals ①; field-level `[E]`
→ M3/DB-5 (M1.0 pass-through); FTS5 → DB-8. `[FACT: ../current-spec.md:103-108]`

## The five lenses (§5)

| Lens | File | Covers |
|------|------|--------|
| operations | `operations.md` | the 23-method surface + input types + the typed-error set (backend's "screens") |
| operation-flow | `operation-flow.md` | CRUD lifecycle · idempotence paths · txn boundaries/DP-8 · persistence/schema · ZK/keyless-hash |
| invariants | `invariants.md` | the NP-* rules the service ENFORCES — references `../business-rules.md` |
| contract | `contract.md` | the DX contract: Row returns · validator schemas · `[E]` set · sync · error taxonomy |
| composition | `composition.md` | dependency graph + repository wiring + seams to AR-6/AR-8 |
| slice-map | `slice-map.md` | backend sub-units + per-slice Verification-Gate ledger |

## Traceability spine (operation → flow → invariant → slice → gate)

| Operation group | Flow | Invariant | Delivery slice | Gate |
|-----------------|------|-----------|----------------|------|
| pages CRUD (8) | create/read/update/soft-delete | NP-2 · NP-6 · NP-9 | ① (merged) | Verification (passed at ①) |
| page-links (4) | idempotent junction | NP-5 | ① (merged) | Verification (passed at ①) |
| wiki + seed (2) | LIKE search · deterministic seed | NP-7 · NP-8 · IR-3 | ① (merged) | Verification (passed at ①) |
| attachments (3) | blob CRUD | NP-9 | ① (merged) | Verification (passed at ①) |
| entity-link/tag facades (6) | delegate | NP-6 · ADR-018 §3.3 | ① (merged) | Verification (passed at ①) |
| **boot crypto readiness** | keyless `_sync_hash` NEED | IR-1 · NEED #1 | **S6 `core-vault-init-on-db-open`** | **░Verification Gate░ (owed)** |

The only OPEN backend slice is **S6** (hoist `initVault()` into `@vida/core` DB-open) — `../delivery/slice-map.md`.
Everything else in this set is the retroactive record of the merged ①.
