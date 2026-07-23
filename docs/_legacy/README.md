# `docs/_legacy/` — Quarantined legacy documentation

**Quarantined:** 2026-07-23, foundation-realignment campaign **Part 1.0** (legacy quarantine + foundation lock).
**Authority:** `docs/specs/foundation/realignment-master-plan/_index.md` (Part 1.0) · grounded in
`docs/specs/foundation/current-state-baseline/baseline.md`.

These files predate the ADR foundation (ADRs 004–017) and are **superseded**. They are moved here — not deleted —
so their history and any residual reference value remain recoverable. **Do not treat anything here as current.**

| File | Status | Superseded by |
|------|--------|---------------|
| `architecture.md` (Multiplatform Guide v2, 2026-03-27) | Contradicts current ADRs on 5 axes | ADR-001 (BLAKE2b, not HKDF) · ADR-003 (LWW/HLC, not Automerge) · ADR-001 (Tamagui, not shadcn/ui; Sigma.js, not D3.js) · the current module/capability model (not "8 modules"). Current architecture = the ADRs + `docs/core/architecture/*` (themselves under realignment in Part 1.3). |
| `sync-protocol.md` | 0-byte empty stub | ADR-003 |
| `encryption.md` | 0-byte empty stub | ADR-001 / ADR-002 (three-layer encryption) |
| `editor-blocks.md` | 0-byte empty stub | ADR-008 (capability block registry) |

**Not quarantined here (deferred to Part 2 — repository structure):** the ~24 other 0-byte doc stubs under
`docs/editor/`, `docs/infrastructure/`, `docs/platform/`, `docs/ui/`, `docs/features/languages/`. Those are empty
scaffolding, not ADR-contradicting legacy; their disposition (keep/fill/remove) is a structural call for Part 2.
