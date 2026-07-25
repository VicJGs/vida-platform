# `db/_legacy/` — pre-foundation schema residue (reference-only)

These files predate the ADR-004–017 foundation and are kept **reference-only**. Do **not** import them.

- `schema.v1.ts` — the v1 monolith (81 tables, ~60% misaligned with the documented v2 target). Superseded by the per-table `../schema/` directory authored per-feature (ADR-016). Deleted at parity (DB-6/7).
- `001_initial.v1.ts` — the v1 80-table DDL migration. Migrations are now authored per-feature (ADR-017 §1); `../migrations/runner.ts` runs an empty registry until the first is authored.

Quarantined in Part 2 (ADR-018). See `docs/specs/foundation/current-state-baseline/baseline.md`.
