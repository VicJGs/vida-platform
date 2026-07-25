# Part 2 — IMPLEMENTATION-PLAN (gate 2)

**Type:** implementation spec (foundation) — the executable build steps for Part 2. Gate-1 SPEC = `_index.md` (Approved 1, Victor 2026-07-25). Decision record = `ADR-018`.
**Status:** ✅ **IMPLEMENTED (Approved 2, Victor 2026-07-25).** U2 = commit `f63786e`, U3 = commit `e45a081`. Acceptance met: `pnpm build` 8/8 + `pnpm typecheck` 10/10 exit 0; 12 foundation/ + 19 services/ dirs with layer-docs; 0 tables authored; 0 consumers resolve to v1. Awaiting Part-2 exit gate.
**Date:** 2026-07-25 · **Units:** U2 (quarantine + unwire + delete) · U3 (skeleton + verify). U1 = ADR-018 (authored).
**No-Guessing:** every source path + consumer verified against the live tree (`grep` confirmed: nothing imports `models/`/`services/`; barrel re-exports only encryption/db surfaces; web-adapter dead).
**Reversibility:** all moves are `git mv`; all edits are content reverts. U2 is one commit, U3 another — either revertable atomically.

---

## Pre-flight state (verified 2026-07-25)

- Barrel `core/src/index.ts` re-exports only: `encryption/{vault,key-management,srp}`, `db/schema` (row 1), `db/adapter`, `db/migrations/runner` (row 2b), `db/repository`. **No `models/`/`services/` re-export** → stub deletion is safe.
- `git ls-files` tracks `schema.ts`, `001_initial.ts`, `web-adapter.ts` → clean `git mv`.
- `moduleResolution: "bundler"` (`tsconfig.base.json:6`) → moving `schema.ts` rebinds `./db/schema` + `./schema` to the `schema/` dir.

---

## U2 — Quarantine + unwire + delete  *(one commit)*

> Order matters: create targets → move → edit the runner → delete stubs → the barrel/adapter rebind is automatic.

**S1. Create quarantine homes.**
```
mkdir -p packages/core/src/db/_legacy
mkdir -p Old
```
Add `Old/README.md` + `db/_legacy/README.md` (one line each: "Reference-only pre-foundation residue — see ADR-018 / baseline.md. Not imported; deleted at parity.").

**S2. Quarantine the v1 schema monolith** (ledger row 1 — this IS the schema unwire).
```
git mv packages/core/src/db/schema.ts packages/core/src/db/_legacy/schema.v1.ts
```
Effect: `index.ts:59` (`./db/schema`) + `adapter.ts:16` (`./schema`) now resolve to the `schema/` **directory** (zero-table namespace).

**S3. Quarantine the v1 migration** (ledger row 2).
```
git mv packages/core/src/db/migrations/001_initial.ts packages/core/src/db/_legacy/001_initial.v1.ts
```
`migrations/` keeps `runner.ts` + `.gitkeep`.

**S4. Unwire the migration runner** (ledger row 2b — REQUIRED, build-breaking if skipped). Edit `packages/core/src/db/migrations/runner.ts`:
- Delete line 18: `import m001 from './001_initial'`
- Change lines 20–22 to: `const ALL_MIGRATIONS: Migration[] = []`
- Leave `migrate`/`currentVersion`/`LATEST_VERSION`/`needsMigration`/`listMigrations` unchanged (they already guard the empty case — `:48` `length > 0 ? … : 0`).

**S5. Quarantine the dead web-adapter** (ledger row 4 — barrel-transitive, done here so U3's typecheck sees the final consumer set, B3).
```
git mv apps/web/src/db/web-adapter.ts Old/web-adapter.ts
```
(Verified: 0 real importers.)

**S6. Delete the pre-ADR stubs** (ledger rows 5, 6 — verified nothing imports them).
```
git rm packages/core/src/models/*.ts          # 9 × 0-LOC → models/ dir dissolves
git rm packages/core/src/services/*.ts         # 9 × 0-LOC v1 files (services/ dir re-stood-up in U3)
```

**S7. U2 verify (before commit).**
- `grep -rn "from '\./001_initial'\|from './db/schema'\|import \* as schema from './schema'" packages/core/src` → the only `schema` hits resolve to the dir; `001_initial` → 0.
- `pnpm --filter @vida/core typecheck` → green (the fast check; full build in U3).
- Commit: `refactor(core): quarantine v1 schema+migration, unwire runner, drop pre-ADR stubs (Part 2 U2, ADR-018)`.

---

## U3 — Skeleton + verify  *(one commit)*

**S8. Stand up `foundation/` (12 dirs + layer-docs).** For each: `sessions review spaces views capability templates measurement economy notifications ingestion ai effects` — create `packages/core/src/foundation/<name>/CLAUDE.md` containing: what the substrate is, its **owning ADR**, its capability IDs, and the merge note where applicable (`capability/` ← ADR-008+010; `spaces/` ← ADR-006 + open registry). No `.ts` files (D4 — layer-docs, not stubs).

**S9. Stand up `services/` (per-module dirs + layer-docs).** For each module: `notes preferences journals tasks habits finance relationships learning languages projects routines checkins purposes bucketlist gamification notifications export search analytics` — create `packages/core/src/services/<name>/CLAUDE.md` (module purpose + the `data-flow.md` pattern link + owning ADR/context). Document the `notifications` substrate↔surface split in both `foundation/notifications/` and `services/notifications/` layer-docs (B-2).

**S10. Refresh the stale layer-doc** (N-4). `packages/core/src/db/CLAUDE.md`:
- Line 13/20: replace "Conventions (encoded in schema.ts)" / "schema.ts: all ~60 tables; edit here…" with the v2 model: tables live in `schema/<domain>.ts` (authored per-feature, ADR-016; 81-table v1 monolith quarantined to `_legacy/`, ADR-018).

**S11. (Optional) Explicit barrel import** (row 3). `index.ts:59` → `export * as schema from './db/schema/index'` for reader clarity. Skip if the automatic rebind reads clearly.

**S12. U3 verify — the acceptance gate.**
- `pnpm typecheck` → green (the `typeof schema` generics + `{ schema }` runtime arg compile against the zero-table namespace; `runner.ts` compiles with `ALL_MIGRATIONS = []`).
- `pnpm build` → green (turbo `^build` chain: core → web/server).
- Grep guards: no new `sqliteTable`/`CREATE TABLE` in `foundation/`/`services/` (scope guard); zero consumers resolve to `schema.v1.ts` (match `db/schema`, `./schema`, barrel-transitive; ignore `repository.ts:210` JSDoc).
- All 14 substrates have a home (12 dirs + 2 merges); every `foundation/`/`services/` dir has a `CLAUDE.md`.
- Commit: `feat(core): stand up foundation/ + services/ substrate skeleton from docs (Part 2 U3, ADR-018)`.

**S13. `dist/` hygiene** (gate-2 note 2). `packages/core/dist/` is git-tracked and holds a stale `dist/db/schema.{js,d.ts}`. It's excluded from compilation (source is authoritative) so it does **not** affect the build, but to avoid a misleading grep hit, regenerate it via the U3 `pnpm build` and commit the refreshed `dist/` alongside — or confirm `dist/` should be gitignored (separate hygiene call, non-blocking).

---

## §4 Acceptance (from `_index.md` §8) — mechanical checks

| Criterion | Check |
|-----------|-------|
| 14 substrates homed (12 dirs + 2 merges) | `ls packages/core/src/foundation/` = 12; `capability/` + `spaces/` layer-docs note the merges |
| Barrel + adapter bind v2 `schema/` | grep 3 forms → 0 hits on `schema.v1`; `pnpm typecheck` green |
| v1 quarantined reference-only | `schema.v1.ts` + `001_initial.v1.ts` in `db/_legacy/`; `web-adapter.ts` in `Old/` |
| runner empty-registry compiles | `ALL_MIGRATIONS = []`; `migrate`/`LATEST_VERSION` still export |
| no pre-ADR stubs | `models/` gone; `services/*.ts` v1 files gone (dir has per-module `CLAUDE.md`s) |
| typecheck + build green | `pnpm typecheck && pnpm build` |
| zero feature code / tables / DDL | grep `sqliteTable`/`CREATE TABLE` in new dirs → 0 |
| ADR-018 accepted; master-plan updated | ADR status Accepted; `_index.md` Part-2 line + Change Log flipped |

---

## On divergence (§XXVIII)
Any step that can't run as written (a hidden importer surfaces, typecheck fails unexpectedly) → **STOP**, run `victor:triage`, critique the revised step, re-approve before proceeding. Update this file + the task Build Steps + Route History. Do not patch forward.
