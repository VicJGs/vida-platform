# `Old/` — quarantined pre-foundation app residue (reference-only)

Dead code from before the ADR-004–017 foundation, kept for reference. Outside every `tsconfig` root — not compiled, not imported.

- `web-adapter.ts` — the v1 wa-sqlite/OPFS `DatabaseAdapter` (~473 LOC of real OPFS work), but **dead** (0 importers). ADR-017 §1 rebuilds the web adapter path at feature-build; preserved as a reference seed.

Quarantined in Part 2 (ADR-018). See `docs/specs/foundation/current-state-baseline/baseline.md`.
