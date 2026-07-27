<!-- Last updated: 2026-06-07 by /init -->
| Component | Location | Key Props | States Handled | Notes |
|-----------|----------|-----------|----------------|-------|
| *(add rows as components are built)* | | | | |

## DatabaseAdapter + web-adapter (AR-2 · 2026-07-27 · commit e55010f)
Platform-agnostic SQLite seam (`packages/core/src/db/adapter.ts`) + its browser impl (`apps/web/src/db/`).
- **`DatabaseAdapter`** interface: `open` / `migrate` / `createDrizzle` / `exists` / `destroy`. `SqliteDriver` is the
  per-platform raw-SQL surface (async: `exec`/`run`/`query`/`values`/`batch`/`close`).
- **Async** — wa-sqlite's Factory API is async-only, so `DrizzleDb = SqliteRemoteDatabase<schema>` ('async') built via
  `createDrizzleProxy` (drizzle-orm/sqlite-proxy). Encryption OFF in M1.0 (optional `sqlCipher` seam → M3).
- **Web** (`apps/web/src/db/`): `web-driver.ts` (async driver on wa-sqlite `statements()`), `worker.ts` (Web Worker
  host + in-worker proof), `web-adapter.ts` (`AccessHandlePoolVFS`/OPFS). Runs in a Worker (sync OPFS handles are worker-only).
- Tests: `web-adapter.test.ts` (Node contract over better-sqlite3, 6/6). Browser open/persist proof → LIF-103.
