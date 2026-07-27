# Spec: component:ar-2-database-adapter-web
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: src] / [INTERP] / [UNKNOWN].
Session split: the deep Business-Rules/Contract/build-steps live in `sessions/` (gate files), NOT here.

## 1. Identity
AR-2 makes a **targeted change** to the platform-agnostic **`DatabaseAdapter`** (`packages/core/src/db/adapter.ts`
— optional encryption seam) and builds its **web implementation** (`apps/web/src/db/`): a **synchronous** driver
(wa-sqlite sync build + `OPFSCoopSyncVFS`) running in a **Web Worker**, keeping `DrizzleDb` at its `'sync'` kind.
It is the boot-time seam that opens the local SQLite DB and hands the repository a typed Drizzle instance — the
**critical-path root** of M1.0 (6 issues inherit it). `[FACT: docs/roadmap/m1.0-delivery-plan.md §5 AR-2; blocked-by ar-1✅/db-1✅]`

**What it is NOT:** not the repository vault-decoupling (DB-6), not filling migrations (DB-7), not FTS5 (DB-8),
not SQLCipher activation (M3), not the native mobile/desktop adapters (later).

## 2. Acceptance (durable — testable DoD)
- [ ] Web app opens a **fresh** DB (first run) and **reopens** an existing one across reload — **no passphrase**.
- [ ] Round-trip persists: write a row via Drizzle → reopen → read it back (OPFS persistence proven).
- [ ] The encryption **seam** is intact: passing a `sqlCipher` config still routes through configure/verify (M3 path), unit-level.
- [ ] `migrate()` runs on open (empty registry ⇒ no-op at version 0); a failing migration rolls back, version unchanged.
- [ ] `tsc --noEmit` strict green across `@vida/core` + `@vida/web`; adapter unit/integration tests pass.
- [ ] Core barrel exports stay stable (no consumer breakage — currently only `index.ts` re-exports).
- [ ] `[C]` `docs/infrastructure/database-layer/current-*` refreshed; `[L]` layer-doc for `apps/web/src/db/`.

## 3. Contract · 4. Business Rules · 5. Build steps
→ In the session gate files (this is a gated build, session-split):
- **Gate 1 (direction):** [`sessions/PLAN-2026-07-27-ar-2-database-adapter-web.md`](sessions/PLAN-2026-07-27-ar-2-database-adapter-web.md)
- **Gate 2 (build):** `sessions/IMPLEMENTATION-PLAN-2026-07-27-ar-2-database-adapter-web.md` *(written after Approval 1)*

## 6. Open UNKNOWNs
- [DECIDED, Victor 2026-07-27] Encryption deferral = **optional `sqlCipher` config** seam.
- [DECIDED, Victor 2026-07-27] Execution model = **sync driver + Web Worker** (wa-sqlite sync build +
  `OPFSCoopSyncVFS`). `DrizzleDb` stays `'sync'` → `repository.ts` untouched (DB-6 scope fence holds).
- [NOTE] "async Drizzle proxy" is a delivery-plan phrase, **not** an ADR-001 decision — AR-2 deliberately stays sync.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-27 | 2026-07-27-ar-2-database-adapter-web | thin index + Gate-1 PLAN drafted (baseline done; D1 seam decided) |
