# foundation/ingestion — substrate (ADR-014 §3.1-3.8 · XCU-01…05,09…16)

# Auto-read by Claude when editing this layer.

## What this substrate is

The cross-cutting device-mediated ingestion-guard service — the ONE model by which every module's external data
crosses the vault boundary: parse/encrypt on-device (never server-proxied; a server-plaintext fetch is refused,
not downgraded), three ownership layers (native / public-reference / user-managed) each honestly disclosed,
whole-set public-reference fetch + provenance verify, reconcile-on-import staging, add-only feed dedup, stable
integration-identity + normalization contract, opt-in/revocable grant lifecycle. Server unconditionally blind.

## Owning ADR

ADR-014 §3.1-3.8 (external_in semantics on the ADR-010 envelope; egress XCU-06/08 → foundation/egress #43)

## Capabilities (framework §3)

X1 (device-mediated) · X2 (three layers) · X3 (whole-set fetch) · X5 (external grant semantics, delegated to #31) ·
X7 (mediator custody) · X8 (reconcile/dedup) · X9 (revocation) · X10 (integration-identity + normalization)

## Status

Built by XS-ingestion #44 (2026-09-21). Decides/normalizes/registers over the BUILT CapabilityEnforcer #31 +
EgressGuard #43; holds no credential, makes no network call. **No schema at M1** — durable stores
(`import_staging`, `connection_config`, integration registry) are M2 via the ports.

- `classification.ts` — `classifyLayer` (XCU-02) · `buildDisclosure` (XCU-03, the ADR-014:56-60 matrix). Pure.
- `guard.ts` — `createIngestionGuard(enforcer, egressGuard, ports?)`: `checkIngestion` [pure] /
  `assertIngestionPermitted` (XCU-01 refuse → XCU-12 opt-in → IR-2 sensitive→egress #43) · `revokeIntegration`
  (XCU-13 stop-future/keep-ingested) · `fetchThroughMediator` (XCU-09; M1 no mediator ⇒ mediator_unavailable).
- `reconcile.ts` — `autoMatch` / `commitStaged` (XCU-10; idempotent partition, parse-error fail-loud) ·
  `dedupeFeed` (XCU-11, by (feedId,uid) → isIgnored) · `createInMemoryStagingPort` (import_staging = M2).
- `public-reference.ts` — `createPublicReferenceEngine`: `fetchWholeSet` (XCU-04, subset refused) · `verifyDataset`
  (XCU-05, fail-closed). M1 ports deny-safe (fetch) / fail-closed (verify).
- `registry.ts` — `createIntegrationRegistry` (XCU-14 identity+contract · XCU-15 native-adapter upgrade IR-11 ·
  XCU-16 user-managed connector, mediator-custody required). In-memory; durable rows = M2.
  Typed errors: `IngestionDenied(defId,reason)` · `UnknownIngestionLayer(layer)` · `PublicRefDenied(reason,datasetId?)`
  · `RegistryDenied(integrationId,reason)`. Fail-closed by construction (deny-safe/fail-closed default ports).
  Spec: `docs/specs/foundation/xs-ingestion/`. Currency: `docs/core/ingestion/current-*`.
  Delegated: external_in boolean + in/out union → CapabilityEnforcer #31 · outbound-fetch-as-egress →
  EgressGuard #43 (XCU-08) · the model call → XS-ai #45 / ADR-015 (XCU-17…27) · durable stores + real adapters +
  mirror/CDN + network fetch → M2 · consent/import-review/management UIs → P6 (XCU-03u/10u/16u) · native-set
  qualification policy (U-1) + third-party-shared connectors (U-3, PC-4) → owed/deferred.
  ⚠ `sensitiveModules` are caller-supplied, never inferred (egress BR-17); a public-reference bulk fetch carries
  no sensitive read, so it never reaches the egress path.
