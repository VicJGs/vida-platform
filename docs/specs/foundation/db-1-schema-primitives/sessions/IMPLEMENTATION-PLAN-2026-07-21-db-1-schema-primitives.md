# IMPLEMENTATION-PLAN — DB-1 · schema primitives (session: 2026-07-21-db-1-schema-primitives · language: TypeScript/English)

> Human Gate 2: read to catch a wrong/missing/destructive step BEFORE code. Self-sufficient build prompt; every step
> cites the PLAN rule it satisfies. No-Guessing / No-Assumptions — all APIs verified against installed drizzle-orm@0.45.1.

## 1. Contexto completo

- The storage layer is being rebuilt from zero (PLAN §1; `docs/infrastructure/storage-rebuild-strategy.md`). DB-1 is
  P0 — the primitives + directory topology, **additive**, no table authored.
- Current state: `packages/core/src/db/schema.ts` = v1 monolith, imported by `[FACT: packages/core/src/index.ts:59]`
  (`export * as schema from './db/schema'`) and `[FACT: packages/core/src/db/adapter.ts:16]` (`import * as schema from './schema'`).
- Existing primitives to mirror: `[FACT: schema.ts:22-29]` `syncColumns` (6 cols) · `[FACT: schema.ts:35-40]` `baseColumns`.
- Durable context (promotion target): `docs/infrastructure/database-layer/current-spec.md` + `current-business-rules.md`.
- Verified APIs (drizzle-orm@0.45.1): `text(name,{enum})` `[FACT: sqlite-core/columns/text.d.ts]` · `integer(name,{mode:'boolean'})`
  `[FACT: integer.d.ts]` · `text(name,{mode:'json'})` `[FACT: text.d.ts]` · `check(name, SQL)` `[FACT: sqlite-core/checks.d.ts]` ·
  `sql.join(chunks, sep)` `[FACT: drizzle-orm/sql/sql.d.ts:165]`.
- Toolchain constraints: `typescript@5.9.3` installed; `tsconfig.base.json` sets `noUnusedLocals: true` (every import
  must be used) + `moduleResolution: "bundler"` (a file resolves before a same-named directory). `[FACT: tsconfig.base.json]`
- **Decision locked (from PLAN §3 [FACT/RISK]):** coexistence, NOT rename — `schema.ts` and consumers are untouched;
  the new `schema/` directory is added beside it. `[FACT: Approval 1, Victor 2026-07-21]`

## 2. Escopo de mudanças

**Files touched (all NEW — additive):**

- `packages/core/src/db/schema/_shared.ts`
- `packages/core/src/db/schema/_registry.ts`
- `packages/core/src/db/schema/index.ts`

**NÃO se faz (out — and why):**
| Not done | Why |
|----------|-----|
| Add `_sync_field_ts` / HLC | DB-2 / LIF-62 |
| Author any table | DB-3 / DB-4 |
| Edit `schema.ts` or its consumers (`index.ts`, `adapter.ts`) | coexistence decision — consumers stay unchanged |
| Re-export the monolith from the new barrel | would reintroduce the `./db/schema` resolution collision |
| Wire encryption / repository / migrations | DB-5 / DB-6-7 |

## 3. Mudanças exatas

### 3.1 — `packages/core/src/db/schema/_shared.ts` (create)

**operation:** add file. **satisfies:** PLAN §3 rules (conventions enforced by reusable helpers; syncColumns = 6).

```ts
// Canonical Drizzle primitives for the v2 storage layer (from-zero rebuild · DB-1 / P0).
// Every schema/ table composes these — the six conventions are enforced here, never hand-repeated.
// Conventions: ADR-002 §2 · CLAUDE.md. Sync metadata: ADR-002 §3 · ADR-003.
import { text, integer, check, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// --- column helpers (the six conventions, compiler-enforced) ---
export const uuidPk = () => text('id').primaryKey() // UUIDv7 TEXT, client-generated
export const timestampMs = (name: string) => integer(name) // Unix ms INTEGER
export const money = (name: string) => integer(name) // INTEGER cents
export const calendarDate = (name: string) => text(name) // 'YYYY-MM-DD' TEXT
export const boolInt = (name: string) => integer(name, { mode: 'boolean' }) // 0/1 <-> boolean
export const json = <T>(name: string) => text(name, { mode: 'json' }).$type<T>() // JSON-as-TEXT (stringified)
export const enumText = <T extends readonly [string, ...string[]]>(name: string, values: T) =>
  text(name, { enum: values }) // TS union over TEXT

// --- sync metadata (present on every syncable table) — EXACTLY 6 cols (_sync_field_ts is DB-2's) ---
export const syncColumns = {
  _sync_id: text('_sync_id').notNull().unique(),
  _sync_version: integer('_sync_version').notNull().default(1),
  _sync_device_id: text('_sync_device_id').notNull(),
  _sync_lww_ts: integer('_sync_lww_ts').notNull(),
  _sync_status: text('_sync_status').notNull().default('pending'),
  _sync_hash: text('_sync_hash'),
}

// --- base entity columns (id + timestamps + sync) ---
export const baseColumns = {
  id: uuidPk(),
  created_at: timestampMs('created_at').notNull(),
  updated_at: timestampMs('updated_at').notNull(),
  ...syncColumns,
}

// ⚠ SUPERSEDED (§XXVIII, 2026-07-22): enumCheck REMOVED — DDL is hand-written SQL (ADR-002 §5); a Drizzle
//   check() emits nothing in this pipeline. Enum CHECK now = SQL migration (DB-3/4) + Zod (DB-9); DB-1 keeps
//   only enumText. The `check`, `sql`, and `AnySQLiteColumn` imports are removed too. See §5 revision note.
```

**step verification:** `pnpm --filter @vida/core typecheck` compiles this file with zero errors; `grep -c "text('_sync" _shared.ts` = 4 (the text-typed sync cols) and the sync block has exactly 6 members (no `_sync_field_ts` column).

### 3.2 — `packages/core/src/db/schema/_registry.ts` (create)

**operation:** add file. **satisfies:** PLAN §3 (one registry for `entity_type`); PLAN §5 decision (minimal + extensible seed).

```ts
// Single source of `entity_type` values for polymorphic references (pages · entity_links · entity_tags).
// DB-1 seeds ONLY the foundation set; each domain APPENDS its types as its tables are authored (DB-4).
// A registry-derived CHECK authored in the SQL migration (DB-3/DB-4), sourced from ENTITY_TYPES, keeps
// cross-table entity_type references consistent (ADR-006).
export const ENTITY_TYPES = [
  'page',
  'note',
  'journal',
  'tag',
  'space', // Notes/Pages hub + Spaces foundation (P1)
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const isEntityType = (v: string): v is EntityType => (ENTITY_TYPES as readonly string[]).includes(v)
```

**step verification:** typecheck passes; `ENTITY_TYPES` is `readonly` (`as const`); adding a value is a one-line append.

### 3.3 — `packages/core/src/db/schema/index.ts` (create)

**operation:** add file. **satisfies:** PLAN §2 (barrel = public surface for the new primitives; monolith path untouched).

```ts
// Public surface for the v2 schema primitives. Table modules (DB-3+) are re-exported here as authored.
// The v1 monolith `../schema.ts` keeps its own import path '@vida/core/db/schema' — a file resolves before a
// same-named directory, so existing consumers (index.ts:59, adapter.ts:16) are unaffected. Verified in §6.
export * from './_shared'
export * from './_registry'
```

**step verification:** see §6 resolution-safety check.

## 4. Regras de negócio (técnicas) — PROMOVE → current-business-rules.md

- **[NEW]** The six column conventions are provided as typed helpers in `schema/_shared.ts`; new tables MUST use them.
- **[NEW]** `syncColumns` is defined once, exactly 6 columns; `_sync_field_ts` is deliberately absent (DB-2 seam).
- **[NEW]** `entity_type` values come from `schema/_registry.ts` (`ENTITY_TYPES`), extended per domain; the SQL-migration CHECK (DB-3/4) + Zod (DB-9) enforce it — DB-1 supplies the const + `enumText` union.
- **[FACT]** DB-1 is additive: `schema.ts` and its consumers are byte-for-byte unchanged. `[index.ts:59; adapter.ts:16]`

## 5. Contrato / estrutura — PROMOVE → current-spec.md

Exports (the `schema/` public API): `baseColumns` · `syncColumns` · `uuidPk(name?)` · `timestampMs` · `money` ·
`calendarDate` · `boolInt` · `json<T>` · `enumText` · `ENTITY_TYPES` · `EntityType` · `isEntityType`. No runtime/table
output; TypeScript-only building blocks consumed by DB-3+.

> **§XXVIII post-review revision (2026-07-22):** `enumCheck` **removed** — architecture review found DDL is
> hand-written SQL migrations (ADR-002 §5), so a Drizzle `check()` helper emits nothing. Enum CHECK now = SQL
> migration (DB-3/4) + Zod (DB-9) + `enumText` union. Also: `json` → `text(name).$type<T>()` (drop `mode:'json'`,
> per ADR-002 §2.5 + encryption path); `uuidPk(name='id')` parametrized. Verified: core/web/server tsc green.

## 6. Aceitação & verificação

- [ ] **Correctness:** `packages/core/src/db/schema/{_shared,_registry,index}.ts` exist and export the §5 surface.
      `ls` + `grep -c "export" _shared.ts` ≥ 9 (12 exports across `_shared` + `_registry`).
- [ ] **Boundary:** `syncColumns` has exactly 6 members; the `_sync_field_ts` **column** is absent —
      `grep -rc "_sync_field_ts:" schema/` = 0 (colon = column-key form; a raw match hits the explanatory comment).
- [ ] **No table:** `grep -rc "sqliteTable(" schema/` = 0.
- [ ] **Non-regression (the critical check):** `./db/schema` must still resolve to the monolith `schema.ts`, not the
      new directory — guaranteed by `moduleResolution: "bundler"` (a file resolves before a same-named directory) and
      verified empirically (a member existing only in the directory → TS2339; only-in-file → compiles). Prove it with
      a green `tsc --noEmit` on the packages that consume `schema` as a **real type**: **`@vida/core` + `@vida/web` +
      `@vida/server`**. Run the package scripts directly to bypass turbo's `dependsOn: ["^build"]`:
      `pnpm --filter @vida/core exec tsc --noEmit` (same for `@vida/web`, `@vida/server`). A mis-resolution surfaces
      LOUDLY as a type error in consumers that destructure tables via `typeof schema` (e.g.
      `apps/web/src/db/web-adapter.ts:36` `SqliteRemoteDatabase<typeof schema>`; the repository generics) — not silently.
      NOTE: `@vida/mobile` / `@vida/desktop` `typecheck` are stubs (`echo 'not configured yet'`) — they prove nothing
      and are **excluded** from this check. `[FACT: apps/mobile/package.json, apps/desktop/package.json]`
- [ ] **Conventions documented:** each helper carries a doc-comment naming its convention (ADR-002 §2 / CLAUDE.md).
- [ ] **Lint/format:** `pnpm --filter @vida/core lint` clean.

## 7. Gates cleared

- /critique (PLAN, gate 1): REVISE → 3 items fixed · 2026-07-21
- /preflight (PLAN, gate 1): PASSED · 2026-07-21
- Aprovação 1 (direção): Victor · 2026-07-21
- /critique (this IMPLEMENTATION-PLAN, gate 2): REVISE → 1 BLOCKER (unused `SQL` import vs noUnusedLocals) + 2 MAJOR (safety-net justification; vacuous mobile/desktop filters) + 2 MINOR — all fixed · 2026-07-21
- /preflight (this IMPLEMENTATION-PLAN, gate 2): PASSED · 2026-07-21
- Aprovação 2 (liberado p/ implementar): Victor · 2026-07-21
- IMPLEMENTED + VERIFIED: 3 files created; `tsc --noEmit` green on core/web/server (non-regression proven); syncColumns=6, sqliteTable=0 · 2026-07-21
- Review battery: /critique SHIP · quality-gate PASS · /preflight COMPLETE · code-review ISSUES (enumCheck-emits-nothing) · 2026-07-22
- §XXVIII post-review revision: removed `enumCheck` (DDL is hand-written SQL per ADR-002 §5, not drizzle-kit); `json`→plain text; `uuidPk(name?)`. Re-verified green. DDL-generation fork logged in storage-rebuild-strategy.md → ADR-016 open decisions · 2026-07-22

## 8. Rollback / risco

- **Rollback:** `rm -r packages/core/src/db/schema/` — nothing else changed, so removal fully reverts.
- **Riskiest step:** 3.3 (the barrel) — the only step that could interact with existing consumers via the
  `./db/schema` resolution. Checkpoint: the §6 per-app typecheck. If any app resolves the directory over the file,
  the fallback is to rename the monolith to `schema-legacy.ts` + repoint the 2 imports (the "explicit legacy path"
  option from PLAN §3) — a §XXVIII deviation, gated before applying.
