# Spec: feature:xs-ingestion
Status: implemented      <!-- draft → approved → implemented -->
Implemented: 2026-09-21 — `packages/core/src/foundation/ingestion/` (5 slices, 13 legs). Durable contract +
invariants now live in `docs/core/ingestion/current-{spec,business-rules}.md`; the decomposition is
`../delivery/{interpretation,slice-map,seam-contract}.md`. @vida/core 1096/1096, tsc 0, eslint 0.
Source-repo: packages/core/src/foundation/ingestion
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-09-20-xs-ingestion

<!--
  FORWARD spec — written via the Entity Delivery Flow PLAN step (/documentation-component) as Steps 1–2
  clear. §2–§6 below are the template [FILL IN] prompts; the real content is authored per-slice from the
  approved slice-map. Governed by the No-Guessing Principle.
-->

## 1. Identity
The cross-cutting **device-mediated ingestion service tier** (`foundation/ingestion`) enforcing ADR-014
zero-knowledge external-data ingestion. [FACT: ADR-014 §3.1–§3.8; capability-framework.md:191–204 X1–X11;
decomposition.md:45 → XCU-01…05, 09…16 (13 legs)]

It is: the on-device pipeline (fetch → parse/normalize → encrypt → vault rows that sync as opaque blobs),
three-layer connector classification (native / public-reference / user-managed), public-reference
bulk-fetch + provenance verification, staging/reconcile + add-only feed dedup, stable integration-identity
+ per-source normalization contract, and grant lifecycle (opt-in; revoke = stop-future / keep-ingested).

It is NOT: the egress guard (XCU-06/08 → egress-guard-service #43), grant/envelope enforcement itself
(XCU-07 → capability #31), the AI/cloud-call layer (XCU-17…27 → XS-ai #45), or any UI consent surface
(the `*u` legs → P6 frontend). It ships **no durable schema** in M1 — `import_staging`,
`connection_config`, the integration registry are M2 (per the xs-egress-guard precedent). [INTERP: from
ADR-014 §5 build-phase markers + xs-egress-guard "no schema / deny-safe ports / [E] future boundary"]

## 2. Business Rules
[FILL IN — authored at the Interpretation + Decomposition gates from ADR-014 §3/§5 + capability-framework
X1–X11. Enumerate invariants (server never a fetch proxy; server-plaintext fetch refused-not-downgraded;
union-of-consents on any fetch carrying a sensitive read; opt-in default; fail-closed revoke), per-leg
terminal states, and fail-loud behavior.]

## 3. Contract
[FILL IN — the service API each first consumer (MOD-finance staging, MOD-learning ICS dedup, Health/Books)
consumes; delegated to seam-contract.md at the Decomposition Gate.]

## 4. Acceptance
- [ ] [FILL IN — testable DoD per slice, from the slice-map]

## 5. Implementation Prompt
[FILL IN — per-slice ordered build sequence, authored once each slice spec §5 is approved. CITE §1–§4.]

## 6. Open UNKNOWNs / Decisions Needed
- [UNKNOWN: needs Interpretation + Decomposition gates] the per-leg M1 build boundary — which of the 13
  XCU legs build now as pure service seams vs first-consumer-pull seams (ground in ADR-014 §5 markers +
  the xs-egress-guard precedent).

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-09-20 | 2026-09-20-xs-ingestion | initial draft (stub — activated with the task) |
