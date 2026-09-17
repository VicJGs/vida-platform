# Slice Map — XS-capability (#31, LIF-169)

> Entity Delivery Flow §2 Decomposition output. **Ratify mode** (§8): P3 fixed the 4 legs
> `[FACT: decomposition.md:42]`; this records the slices + per-slice Verification-Gate ledger.
> All slices tagged **backend** (XS substrate, **no frontend twin** — `[FACT: reconstructed-structure.md:89]`).
> Envision Gate: **N/A** (pure backend, renders no user surface — §3.75 one-question test = No).

## Slices (build order)

| # | Slice | Plane | Legs | Depends on | Verification Gate (blocking) |
|---|-------|-------|------|------------|------------------------------|
| S1 | **Enforcement decision core + grant reads** — `checkAction` / `assertPermitted` + `getGrant` / `isEnvelopeCurrent` (grant **reads**) + `canonicalEnvelopeHash` + `SENSITIVE_MODULE_CLASSES` + typed deny taxonomy; fail-closed. Shipped-def bypass. | backend | XCU-SP-32, XCU-07 | AR-7 registry + `capability_grants` | Vitest: allow/deny per action type · INV-5 union-consent · INV-1 fail-closed on every missing input · shipped bypass · typed-error assertions · **live-store smoke** (real grant row → decision) |
| S2 | **Grant lifecycle (writes)** — `grant` (compute `granted_envelope_hash`) / `revoke` (fail-closed next call). Reuses S1's hash fn + `getGrant`/`isEnvelopeCurrent`. | backend | XCU-07 (revocable/re-consent), XCU-SP-32 | S1 (hash fn + reads + taxonomy) | Vitest: grant persists + enqueues sync · revoke → next `assertPermitted` denies · envelope edit → `isEnvelopeCurrent`=false → fail closed · **live-store smoke** on real Repository write (encrypt/persist seam) |
| S3 | **Offered-set resolver** — `resolveOfferedSet(spaceId, surface)`: `inline`=union, `standalone`=restrict to `space_enabled_blocks`. | backend | XCU-SP-29 | AR-7 registry + `space_enabled_blocks` | Vitest: inline union (non-restrictive) · standalone restricts to palette · empty palette → base only · **live-store smoke** on a real Space with enabled blocks |

## Why this order
- **S1 first** — it owns the canonical envelope-hash function + the deny taxonomy that S2's `isEnvelopeCurrent`
  reuses; the decision core has no dependency on grant *lifecycle*, only on reading a grant row.
- **S2 next** — grant/revoke/re-grant close the XCU-07 revocability + IR-2/IR-3 loop on top of S1's hash + taxonomy.
- **S3 last** — independent of S1/S2 (reads registry + Spaces, not grants); ordered last so the enforcement spine
  lands first for the modules that block on it.

## Coverage check (Ratify — the fixed split covers every leg)
XCU-SP-28 → S1/S3 (ratified registry accessors) · XCU-SP-29 → S3 · XCU-07 → S1+S2 · XCU-SP-32 → S1+S2.
**0 legs unhomed.** No `structural` ECs (Envision N/A) → no Visual-Gate MUSTs to map.

## Explicitly out of scope (delegated — see interpretation ORGANIZATION)
Execution sandbox + resource limits + authoring DSL/UI → `#116 CAP-authoring`. Effect firing → `#32`. Egress
mediation/audit → `#43`. Idempotency/no-double-count write path → ADR-004 §3.2.5. UI add-menu/consent UX → P6.
