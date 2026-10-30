# foundation/ingestion — Current Spec

> Durable contract for the device-mediated ingestion-guard service (XS-ingestion #44). Owning ADR: ADR-014
> §3.1–§3.8. Kept current with `packages/core/src/foundation/ingestion/`.

## What it is

The cross-cutting device-mediated ingestion service — the ONE model by which every module's external data
crosses the vault boundary. `external_in_ok=true` (decided by the CapabilityEnforcer #31) is NECESSARY but NOT
sufficient: on top of it this service refuses a server-plaintext fetch, classifies each connector into one of
three honestly-disclosed layers, routes a sensitive-read fetch through the egress guard #43, custodies
credentials via a mediator, reconciles merge-imports through staging, dedups add-only feeds, registers a
stable integration-identity + normalization contract, and runs the opt-in/revocable grant lifecycle. It
DECIDES / NORMALIZES / REGISTERS; it holds no credential, makes no network call, and authors **no schema** —
the durable stores (`import_staging`, `connection_config`, the integration registry) are M2 (behind the ports).
Legs XCU-01…05, 09…16 (13; ADR-014).

## Surface (`packages/core/src/foundation/ingestion/`)

- **S1 `classification.ts` (pure):** `classifyLayer(source) → IngestionLayer` (XCU-02, not a flat toggle) ·
  `buildDisclosure(layer) → LeakDisclosure` (XCU-03, the ADR-014:56-60 honest-leak matrix verbatim). Throw
  `UnknownIngestionLayer` on a value outside `native | public-reference | user-managed`.
- **S2 `guard.ts` — `createIngestionGuard(enforcer, egressGuard, ports?): IngestionGuard`** (factory-of-closures;
  `ports = { mediator?: IngestionMediatorPort }`):
  - `checkIngestion(act) → IngestionDecision` — **pure**, non-throwing. Order (load-bearing, fail-closed):
    1 XCU-01 `requiresServerPlaintext` → `server_proxy_refused` · 2 XCU-12 opt-in via `enforcer.checkAction
{external_in}` → `external_in_not_granted` · 3 IR-2 sensitive-read (`dataScope.sensitiveModules.length>0`)
    routes to `egressGuard.checkEgress` → `sensitive_egress_unconsented` (missing user-initiation = the same deny)
    · 4 permit + the honest-leak `disclosure`.
  - `assertIngestionPermitted(act)` — throws `IngestionDenied(defId, reason)`; on the sensitive path persists the
    egress audit once via `egressGuard.assertFetchEgress` (#43).
  - `revokeIntegration(defId)` — XCU-13: `enforcer.revoke` halts future; touches only the grant (keep-ingested).
  - `fetchThroughMediator(act, request)` — XCU-09: asserts the guard first, then the mediator injects the
    credential; M1 has no mediator → `mediator_unavailable` (deny-safe, no network call).
- **S3 `reconcile.ts` (pure + in-memory port):** `autoMatch(rows, existing, tol)` (XCU-10, date±/amount±
  tolerance) · `commitStaged(confirmed, alreadyCommitted?) → CommitResult` (XCU-10, idempotent partition;
  parse_error fail-loud) · `dedupeFeed(incoming, seen)` (XCU-11, by `(feedId, uid)` → `isIgnored`, never delete)
  · `createInMemoryStagingPort()` (the M1 staging store; durable `import_staging` = M2).
- **S4 `public-reference.ts` — `createPublicReferenceEngine(ports?): PublicReferenceEngine`:** `fetchWholeSet(request)`
  (XCU-04, whole-set; a `subset` request throws `scoped_refresh_refused`; M1 fetch port deny-safe →
  `fetch_unavailable`) · `verifyDataset(ds)` (XCU-05, provenance/signature/version; M1 verifier fail-closed →
  `unverified_dataset`).
- **S5 `registry.ts` — `createIntegrationRegistry(): IntegrationRegistry`:** `register` / `get` / `list`
  (deterministic) · `registerNativeAdapter` (XCU-15, upgrades an existing identity to `native`, same contract —
  IR-11) · `registerUserManagedConnector` (XCU-16, requires `credentialCustody:'mediator'`, else
  `credential_not_mediated`). In-memory; durable rows = M2.
- **Typed errors** (each carries context, parity with `EgressDenied`/`CapabilityDenied`): `IngestionDenied(defId,
reason)` · `UnknownIngestionLayer(layer)` · `PublicRefDenied(reason, datasetId?)` · `RegistryDenied(integrationId,
reason)`.

## Delegated (not owned here)

`external_in` boolean + in/out union across action checks → CapabilityEnforcer #31 · outbound-fetch-as-egress
(URL/params consent + audit) → EgressGuard #43 (XCU-08) · the model call → XS-ai #45 / ADR-015 (XCU-17…27) ·
durable stores (`import_staging`, `connection_config`, integration registry) + real native adapters + public
mirror/CDN + actual network fetch → M2 · all consent/import-review/management UIs → P6 (XCU-03u/10u/16u) ·
native-set qualification policy (U-1) + third-party-shared connectors (U-3, PC-4) → owed-decision / deferred.

## Tests

`foundation/ingestion/__tests__/` (42): `classification` (9, pure) · `guard` (11, **live-store** on real
`capability_grants` via `createCapabilityEnforcer` + the built egress guard: opt-in, off-by-default,
refuse-not-downgrade, sensitive→egress permit/deny, revoke keep-ingested, mediator custody) · `reconcile` (10,
auto-match tolerance, idempotent commit, parse-error fail-loud, feed dedup, staging round-trip) ·
`public-reference` (5, subset refusal, deny-safe fetch, fail-closed verify) · `registry` (7, identity/contract,
IR-11 upgrade, custody refusal, deterministic list).
