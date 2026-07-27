# Session: 2026-07-27 — ar-2-database-adapter-web

Task started. Goal: rebuild the platform-agnostic DatabaseAdapter (core/src/db/adapter.ts) + build the web
implementation (apps/web/src/db/, wa-sqlite/OPFS async Drizzle proxy). Critical-path root of M1.0.

Context: pivoted here after the DS-1 detour was parked (branch ds-1-token-pipeline, out of sequence).
Profile: Add Backend Component (Default). FULL double-gate. DOC spine B(refresh database-layer)·F·C·L.

Baseline (Step 0/1) findings — all FACT:
- adapter.ts is LIVE, SQLCipher-first residue (open() requires passphrase) — contradicts M1.0 (encryption→M3).
- repository.ts is LIVE, requires getVaultKey() per write — DB-6's decoupling job, NOT AR-2.
- migrations/runner.ts is CLEAN (ADR-017/018-aligned, empty registry).
- apps/web/src/db/ EMPTY — the web-adapter is the new code.
- Blast radius LOW: adapter exported from core barrel but no app/package consumes it yet.

Decisions: D1 encryption deferral = optional sqlCipher config seam (Victor). D2 rebuild adapter.ts in place.
D3 scope fence (no repository.ts / runner.ts edits). D4 add wa-sqlite + OPFS + Vite WASM wiring.

Gate 1 PLAN drafted: docs/specs/components/ar-2-database-adapter-web/sessions/PLAN-2026-07-27-*.md
Next: adversarial critique → preflight → Approval 1 → IMPLEMENTATION-PLAN (gate 2).
Key gate-2 fork flagged: async wa-sqlite vs sync SqliteDriver → Drizzle async proxy.

── WRAP 2026-07-27 (BANKED before Approval 2) ────────────────────────────────
Gate 1 (PLAN): critique returned REVISE — the async/sync fork was falsely deferred; PLAN claimed 3 incompatible
things. Resolved via Victor's decision: SYNC driver + Web Worker (AccessHandlePoolVFS), DrizzleDb stays 'sync',
repository.ts untouched (DB-6 fence). Fixed the fabricated "async Drizzle proxy = ADR-001" cite (it's a roadmap
phrase). Re-critique → SHIP. Preflight PASSED. **Approval 1 ✅ (Victor).**

Gate 2 (IMPLEMENTATION-PLAN Rev 2): drafted 8 build steps C1–C8. Critique inspected node_modules and caught 3
build-stoppers vs the INSTALLED libs: B1 VFS is `AccessHandlePoolVFS` not `OPFSCoopSyncVFS` (context7 named a
version that isn't installed); B2 `mapResultRow` missing from utils.d.ts (use local re-impl); B3 reference driver
is `sql-js/session.js` (positional arrays), not expo-sqlite. Plus N1 deps already declared (prereq=pnpm install),
N2 schema barrel has 0 tables (tests need a fixture), N3 test via better-sqlite3 Node stand-in + browser smoke.
All fixed in Rev 2. NOT re-critiqued (fixes were direct applications of the critic's node_modules-verified findings).

Verified CORRECT by critique: C1/C2 targets, DrizzleDb 'sync', repository.ts compiles unedited, C6 Drizzle
sqlite-core internal classes ARE exported/constructible, getSchemaVersion missing-table safe.

STATE: both plan gates' artifacts persist in sessions/. Nothing implemented. Nothing committed (planning docs
uncommitted on main). Panel: #2 ar-2 in_progress, #1 ds-1 pending(parked).

RESUME NEXT SESSION:
  1. Read IMPLEMENTATION-PLAN-2026-07-27-*.md Rev 2 (C1–C8) + PLAN + task Decisions table.
  2. (Optional) re-critique Rev 2 for extra C6 assurance.
  3. Approval 2 → implement C1→C8 in order. Checkpoint after C1/C2: `pnpm --filter @vida/core typecheck` green,
     repository.ts UNEDITED. C6 = the risk ([VERIFY]-first vs installed drizzle-orm@0.45.1 .d.ts).
  4. Then quality-gate-engineering + verification → [C] refresh database-layer current-* + [L] layer-doc → commit docs WITH code.

── COMPLETE 2026-07-27 (LIF-73 → Done · commit e55010f) ──────────────────────
**DIRECTION CORRECTED sync→async, then BUILT + shipped.** On resume, a build-time [VERIFY] of the installed
wa-sqlite@1.0.0 found its Factory API is ASYNC-ONLY (sqlite-api.js:742-750) → a sync driver is IMPOSSIBLE over
wa-sqlite. Halted (§XXIV/§XXVIII), re-read the docs: the delivery plan always specified "async Drizzle proxy"
(m1.0-delivery-plan.md:100) — the Rev-1/2 SYNC choice was the drift, built on a false premise. Victor confirmed
the correction. Re-planned Rev 3 (PLAN + IMPL-PLAN), re-gated: independent critique caught 3 build-stoppers
pre-code (get-shape flat-row vs mapGetResult; missed runner.ts consumer; test must drive the real proxy) — all
fixed + source-verified. Approval 2 ✅.

The correction made the build SIMPLER: Rev-2's C6 (hand-rolled custom Drizzle sync session, "the one real risk")
+ the B2 mapResultRow gap both DELETED — the official drizzle-orm/sqlite-proxy owns mapResultRow.

BUILT: A1–A5 (adapter async; DrizzleDb=SqliteRemoteDatabase 'async'; createDrizzleProxy; async migration runner +
cipher/connection helpers), R1 (repository.ts 11 sites async), R2 (runner.ts async), W1–W5 (vite config;
web-driver.ts on wa-sqlite statements(); worker.ts host+proof; web-adapter.ts over AccessHandlePoolVFS;
wa-sqlite-vendor.d.ts shim; Node contract test over better-sqlite3). Checkpoint (core tsc green, 3-file async flip)
→ full typecheck 10/10 → AR-2 tests 6/6 → lint clean. Independent post-impl critique: SHIP (0 blocking; NIT-1
update-race guard + NIT-4 layer-doc applied). Currency §XXIX: database-layer current-* + apps/web/src/db/CLAUDE.md.

COMPLETENESS AUDIT vs _index.md §2: 5/7 DoD met (contract). Items 1&2 (browser open/reopen + OPFS persistence) are
code-complete but need a real-browser test (FileSystemSyncAccessHandle is worker-only; Node test uses :memory:) →
created LIF-103 (qa-1-e2e-harness-opfs, blocked-by ar-2) to carry them. §6 repo-CRUD → DB-6 (needs vault unlock).

Committed straight to main (ground-zero, Victor's call): e55010f (24 files, code + docs together, §XXIX). Gitleaks clean.
UNBLOCKS: db-6 (next head), db-7, ar-5, ar-6, ar-8, ar-9. FOLLOW-ON: LIF-103.
