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
