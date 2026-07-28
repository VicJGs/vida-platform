# Forward-Spec Units — vida-platform

Registry of unit-of-work forward specs (`/documentation-component`). Each row: path · type · status · last-session.

| Unit | Type | Status | Last session |
|------|------|--------|--------------|
| [foundation/db-1-schema-primitives](foundation/db-1-schema-primitives/) | refactor (foundation) | done — committed b234e85, LIF-61 Done | 2026-07-21-db-1-schema-primitives |
| [foundation/storage-master-plan](foundation/storage-master-plan/) | planning (foundation) | gate 1 — PLAN drafted | 2026-07-22-storage-master-plan |
| [foundation/db-2-sync-metadata-columns](foundation/db-2-sync-metadata-columns/) | refactor (foundation) | ⛔ PARKED — superseded by ADR-017 (2026-07-23) | 2026-07-22-db-2-sync-metadata-columns |
| [features/build-roadmap-resequence](features/build-roadmap-resequence/) | feature (LITE plan) | spec-draft — reframed as Part 3 of realignment-master-plan | 2026-07-23-build-roadmap-resequence |
| [foundation/current-state-baseline](foundation/current-state-baseline/) | baseline (analysis) | done — ground truth | 2026-07-23-build-roadmap-resequence |
| [foundation/realignment-master-plan](foundation/realignment-master-plan/) | planning (foundation) | APPROVED gate 1 — executing Part 0 | 2026-07-23-build-roadmap-resequence |
| [foundation/capability-framework.md](foundation/capability-framework.md) | reference (foundation) | RATIFIED 2026-07-23 — Part 0 complete | 2026-07-23-build-roadmap-resequence |
| [foundation/staleness-sweep.md](foundation/staleness-sweep.md) | analysis (foundation) | Part 1.1 COMPLETE — 10 stale / 7 gap / 7 aligned; As-is exemption ratified | 2026-07-23-build-roadmap-resequence |
| [foundation/m1.0-delivery-plan](foundation/m1.0-delivery-plan/) | feature (LITE plan) | done — plan authored + gated (SHIP) + reconciled; → docs/roadmap/m1.0-delivery-plan.md | 2026-07-26-m1.0-delivery-plan |
| [components/ar-2-database-adapter-web](components/ar-2-database-adapter-web/) | component (full double-gate) | done — Rev 3 async; 5/7 DoD (contract); committed e55010f; LIF-73 Done; items 1&2 → LIF-103 | 2026-07-27-ar-2-database-adapter-web |
| [fixes/m1.0-a-spine-dep-reconcile](fixes/m1.0-a-spine-dep-reconcile/) | fix (structural, dep-graph) | done — -a spine reconciled + ADR-critiqued + Linear repaired; committed ef481c1 | 2026-07-27-ar-2-database-adapter-web |
| [fixes/m1.0-dep-graph-validation](fixes/m1.0-dep-graph-validation/) | workflow (plan-integrity) | draft — stub + home; standalone session next | 2026-07-28-m1.0-dep-graph-validation |
| [foundation/db-9-enums-zod](foundation/db-9-enums-zod/) | refactor (foundation) | done — committed a137a44, LIF-106 Done; 81 tuples+validators+parity test, double-gated | 2026-07-28-db-9-enums-zod |
<!-- note: ds-1-token-pipeline spec lives on branch `ds-1-token-pipeline` (parked, out of sequence) — not registered on main. -->

