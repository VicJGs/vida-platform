---
Session — 2026-09-21 — xs-ingestion (complete)
Goal: build the ADR-014 device-mediated ingestion service tier (foundation/ingestion) — XS #44, M1.1.2
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
---

## Accomplished
- Shipped **XS-ingestion #44** (LIF-172 → Done): `packages/core/src/foundation/ingestion/` — the cross-cutting
  device-mediated ingestion-guard service (ADR-014 §3.1–§3.8), 5 slices, 13 legs (XCU-01…05, 09…16), over the
  BUILT capability enforcer #31 + egress guard #43.
  - S1 `classification.ts` — `classifyLayer` (XCU-02) · `buildDisclosure` (XCU-03, the ADR-014:56-60 matrix). Pure.
  - S2 `guard.ts` — `createIngestionGuard`: XCU-01 refuse-not-downgrade · XCU-12 opt-in (enforcer boolean) ·
    IR-2 sensitive→egress #43 · XCU-09 mediator custody · XCU-13 revoke=keep-ingested. Live-store tested.
  - S3 `reconcile.ts` — `autoMatch`/`commitStaged` (XCU-10) · `dedupeFeed` (XCU-11) · in-memory staging port.
  - S4 `public-reference.ts` — `fetchWholeSet` whole-set-never-subset (XCU-04) · `verifyDataset` fail-closed (XCU-05).
  - S5 `registry.ts` — `createIntegrationRegistry` (XCU-14 identity+contract · XCU-15 native upgrade IR-11 · XCU-16 mediator-custody).
- No schema; deny-safe/fail-closed ports; durable stores (`import_staging`, `connection_config`, registry) → M2.
- Full Entity Delivery Flow gate, all doc-grounded: Interpretation Gate SHIP (independent critic) → Decomposition
  Approval 1 → preflight (2 grounding fixes) → Approval 2 → per-slice Verification Gates (S2 live-store) →
  pre-ship /critique SHIP (13/13 legs behavioral, every ZK path fail-closed; 3 NITs + 1 parity fix folded).
- `@vida/core` **1096/1096** (+42), tsc 0, eslint 0, gitleaks clean (Node 24).
- Currency `docs/core/ingestion/current-{spec,business-rules}.md` born (IN-1…IN-13); `foundation/ingestion/CLAUDE.md`
  + `service/_index.md` updated; delivery docs `docs/specs/foundation/xs-ingestion/delivery/*`.
- PR #57 (`127accb`, service) + chore PR #58 (`5057b8b`, close-out) merged to main.

## Decisions Made
- **M1 = engine/decision/registry tier + deny-safe ports, no schema; M2 = durable stores + real reach** — the
  egress-guard #43 shape-class, doc-grounded (`xcut-ingestion-ai.md:5` M2-facing; ADR-014 §5 owed-schema).
- **Opt-in = the enforcer `external_in` boolean** (grant existence IS opt-in) → dropped a manufactured `not_opt_in`.
- **Ingress-carries-egress delegated** to `egressGuard.assertFetchEgress` (#43), never re-implemented.
- **Revoke = stop-future/keep-ingested by construction**; mediator custody = a port (M1 → `mediator_unavailable`).
- Doc-faithfulness fixes at the gates: restored `NormalizationContract.timestamps` (ADR-014:78), dropped an
  invented `'conflict'` status, matched `LeakDisclosure` to the 3-column matrix, `PublicRefDenied` stores `datasetId`.
- Reused egress's `UserInitiationProof` via re-export (two foundation barrels collide on shared type names).

## Open Questions
- U-1…U-4 stay corpus-flagged out-of-scope (native qualification policy · mirror/CDN topology + PIR/OHTTP ·
  PC-4 third-party-shared connectors · concrete M2 `import_staging`/`connection_config`/registry columns).
- Process watch: run outward git actions (push→PR→merge) in the FOREGROUND — a backgrounded chain stalled
  silently this session (the chore commit stayed local until redone manually as PR #58).

## Next Session
First step: next `#`-order head = **#45 `xs-ai`** — now unblocked (both deps built: egress #43 + ingestion #44),
squarely in the saved XS security-service shape-class (XCU-17…27, ADR-015). Alternative: #46 `xs-notifications-delivery`.
Context to reload: `docs/core/decisions/ADR-015-*`, `docs/specs/foundation/backend-intent/parts/xcut-ingestion-ai.md`
(XCU-17…27), `docs/core/ingestion/current-*` + `docs/core/egress/current-*` (the two it rides), and memory
[[xs-security-services-deny-safe-port-build-shape]].
