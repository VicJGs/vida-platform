# Build Unit — DB-6 · Repository layer (LIF-68)

> Forward-spec home (§XXVI.1b). Session split: gate 1 = `sessions/PLAN-<session>-db-6-repository-layer.md`;
> gate 2 = `sessions/IMPLEMENTATION-PLAN-<session>-db-6-repository-layer.md` (authored after Approval 1).
> Durable context (baselined 2026-07-28): `docs/infrastructure/database-layer/current-{spec,business-rules}.md`.

- **Cluster:** M1.0-a1 — Boot & DB spine · **Profile:** Add Backend Component · **Scenario:** default
- **Home:** `packages/core/src/db/repository.ts` (+ new `schema/foundation/sync-queue.ts`)
- **Depends-on:** ar-2 (async `DrizzleDb`) · db-1 (primitives, transitive) — both ✅
- **Intent sources:** ADR-002 §4/§5.1 · ADR-004 §3.4 · ADR-016 §3.2 · ADR-017
- **Doc marks:** B (baseline ✅ done) · F (this spec) · C (currency refresh post-build) · L (layer-docs)

## Sessions

- `sessions/PLAN-2026-07-28-db-6-repository-layer.md` — gate-1 direction (this session).
