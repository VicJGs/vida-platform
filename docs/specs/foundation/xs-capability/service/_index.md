# XS-capability — Service Spec Set (Track A · Entity Delivery Flow §4)

> Backend "Entity Service Build Flow" for `foundation/capability` enforcement (#31, LIF-169).
> References the durable aspects — does not restate them: `docs/core/capability/current-spec.md` +
> `current-business-rules.md` (AR-7 registry). Owning ADRs: ADR-010 (envelope) + ADR-008 (registry) +
> ADR-014 (external semantics). Split: `[FACT: decomposition.md:42]` (Ratify mode).

## Service scope
Add the **envelope-enforcement service tier** over AR-7's `capability_grants` structure: an enforcement decision
core, a grant lifecycle service, and an offered-set resolver. Pure platform-agnostic decision logic — **no
user-code execution** (sandbox = `#116`), **no effect firing** (rail = `#32`), **no egress mediation** (`#43`).

## Traceability (operation → flow → invariant → slice → gate)

| Operation | Flow (operation-flow.md) | Invariant (invariants.md) | Slice | Gate |
|-----------|--------------------------|---------------------------|-------|------|
| `checkAction` / `assertPermitted` | Decision path (read grant → match action → fail-closed) | INV-1..5 | S1 | Verification |
| envelope-hash (`canonicalEnvelopeHash`) | Hash-at-grant + delta-check | INV-6 (IR-3) | S1 | Verification |
| `grant` | Persist envelope + hash → Repository → sync_queue | INV-6, INV-7 | S2 | Verification |
| `revoke` | Soft-delete grant → fail-closed next call | INV-7 | S2 | Verification |
| `isEnvelopeCurrent` | Compare current declared hash vs stored | INV-6 | S2 | Verification |
| `resolveOfferedSet` | inline=union / standalone=restrict palette | INV-8 | S3 | Verification |

## Lenses
- `operations.md` — the operation surface (signatures + typed error set).
- `operation-flow.md` — decision + grant lifecycle + resolver flows; txn boundaries; data-flow.
- `invariants.md` — the rules this service ENFORCES (references current-business-rules BR-* + ADR-010).
- `contract.md` — the DX contract consumers feel (return shapes, error taxonomy, ZK/sync posture).
- `composition.md` — dependency graph + repository wiring + seams.
- Slices + per-slice Verification-Gate ledger: `../delivery/slice-map.md`.

## Backend-only nuances (§4)
- **Persistence & schema binding** — grants persist via the generic Repository (co-transactional `sync_queue`);
  `capability_grants` is syncable; no new table/column (XCU-07 "no new column/table").
- **Concurrency & transactions** — `grant` is a single Repository `create`/`softDelete`; no multi-row txn needed
  (re-grant = revoke-then-grant, each atomic). Enforcement reads are point lookups.
- **Security / zero-knowledge** — envelope fields are plaintext metadata (queryable); the enforcer never needs the
  vault key; ZK-1 holds regardless (INV-4). Media/egress *decisions* here, media *encryption* + egress *mediation*
  elsewhere.
