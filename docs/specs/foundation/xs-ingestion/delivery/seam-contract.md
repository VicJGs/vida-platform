# Seam Contract — XS-ingestion (#44, LIF-172)

> Entity Delivery Flow §2. XS-ingestion has **no frontend twin**; the seam is the **service API that any ingesting
> module + the M2 mediator/connectors + the P6 consent/review/management surfaces consume**. Consumers (all
> later): **MOD-finance `#…`** (CSV/OFX staging), **MOD-health-core/nutrition/training** (wearables/food-DB),
> **MOD-languages / MOD-learning-education** (ICS feed dedup), **MOD-books/skills** — all list XS-ingestion as an
> upstream runtime read-seam `[FACT: decomposition.md:58,61,62,63,66,67,76]` — and **`fe-integrations-ai-surfaces`**
> (P6 consent/import-review/management face `[FACT: reconstructed-structure.md:162]`).

## The consumed surface (stable)

```ts
// ── S1: classification + honest-leak disclosure (pure) ────────────────────────────
type IngestionLayer = 'native' | 'public-reference' | 'user-managed'  // XCU-02 [FACT: ADR-014:44-52]

// A source is keyed on the stable INTEGRATION-IDENTITY anchor (X10), not a raw URL — so a Layer-3→Layer-1
// upgrade keeps grant + staged + ingested continuity. `[FACT: ADR-014:78 (§3.8); capability-framework.md:204]`
interface IngestionSource {
  integrationId: string          // the stable identity anchor (XCU-14)
  layer: IngestionLayer
  normalizationContractId: string
}
classifyLayer(source: IngestionSource): IngestionLayer                 // XCU-02

// The service COMPUTES the who-sees-what payload; the P6 UI RENDERS it. `[FACT: ADR-014:54-60; xcut-ingestion-ai.md:15]`
// Mirrors the §3.2 matrix's three columns verbatim (who sees · what leaks & to whom · our-server posture);
// ZK-1 keeps our relay blind to content, but `serverPosture` still names the public-reference Vida-mirror observer.
interface LeakDisclosure { layer: IngestionLayer; whoSees: string; whatLeaks: string; serverPosture: string }
buildDisclosure(layer: IngestionLayer): LeakDisclosure                 // XCU-03

// ── S2: the ingestion guard core over the enforcer (the egress-twin) ──────────────
interface IngestionAct {
  defId: string                     // initiating cap (grant read via the enforcer)
  source: IngestionSource           // WHO we pull from (integration-identity)
  dataScope: { sensitiveModules: string[] }   // sensitive classes the fetch/parse touches (union input)
  userInitiation?: UserInitiationProof         // opt-in enable is user-initiated (XCU-12); standing refresh exempt
}
type UserInitiationProof = { kind: 'user_action'; at: number }

assertIngestionPermitted(act: IngestionAct): Promise<IngestionDecision>  // throws IngestionDenied on deny
checkIngestion(act: IngestionAct): Promise<IngestionDecision>            // non-throwing variant
revokeIntegration(defId: string): Promise<void>                         // XCU-13 stop-future, keep-ingested

interface IngestionDecision { permitted: boolean; reason?: IngestionDenyReason; disclosure?: LeakDisclosure }
// XCU-12 opt-in is the enforcer's external_in boolean (off by default = no grant) — the grant's existence
// IS the opt-in state (interpretation R-1/ORGANIZATION), so there is NO separate `not_opt_in` reason.
type IngestionDenyReason =
  | 'external_in_not_granted'   // XCU-12 off-by-default + XCU-12 enforcer boolean failed (delegated up to #31)
  | 'server_proxy_refused'      // XCU-01 — a fetch that could only work server-side is refused, not downgraded
  | 'sensitive_egress_unconsented' // the fetch carries a sensitive read → egress gate denied (delegated to #43)
  | 'mediator_unavailable'      // XCU-09 — no credential mediator wired (M1 deny-safe default)

class IngestionDenied extends Error { readonly defId: string; readonly reason: IngestionDenyReason }

// ── S3: reconcile-on-import engine ────────────────────────────────────────────────
// Per-row status (XCU-10). Doc-grounded set only: `parse_error` [FACT: ADR-014:72 "parse error flags per-row"],
// `auto_matched`/`unmatched` [FACT: ADR-014:72 "auto-match … → user reviews/merges"]. The COMPLETE canonical
// vocab is owed to the M2 `import_staging` schema (ADR-002 §5.20, U-4) — not invented here.
type StagedRowStatus = 'auto_matched' | 'unmatched' | 'parse_error'
// `date` (YYYY-MM-DD) + `amountCents` are the match metadata autoMatch compares (conventions); `parsed` is the
// opaque normalized payload (per-source contract, XCU-14); `error` carries the fail-loud per-row parse message.
interface StagedRow {
  sourceRowId: string; date: string; amountCents: number; parsed: unknown
  status: StagedRowStatus; matchId?: string; error?: string
}
interface MatchTolerance { dateDays: number; amountCents: number }
// committed = ids handed to the ADR-004 §3.2.5 idempotent write rail; rejected = parse_error (fail-loud) +
// already-committed (idempotency — the durable idempotent WRITE is the rail's, delegated).
interface CommitResult { committed: string[]; rejected: { sourceRowId: string; reason: 'parse_error' | 'already_committed' }[] }

autoMatch(staged: StagedRow[], existing: MatchCandidate[], tol: MatchTolerance): StagedRow[]  // XCU-10 (pure)
commitStaged(confirmed: StagedRow[], alreadyCommitted?: ReadonlySet<string>): CommitResult    // XCU-10 (pure partition)
dedupeFeed(incoming: FeedEvent[], seen: FeedEvent[]): FeedEvent[]  // XCU-11 — by (feedId, uid) → isIgnored, never delete
createInMemoryStagingPort(): ImportStagingPort  // the M1 default staging store (durable import_staging = M2 · U-4)

// ── S4: public-reference engine (factory over deny-safe/fail-closed ports) ─────────
createPublicReferenceEngine(ports?: { fetch?: DatasetFetchPort; verifier?: DatasetVerifierPort }): PublicReferenceEngine
fetchWholeSet(request: PublicRefFetch): Promise<PublicDataset>  // XCU-04 — whole set; a subset request throws scoped_refresh_refused
verifyDataset(ds: PublicDataset): Promise<void>                // XCU-05 — provenance+signature+version; fails closed

// ── S5: integration registry + connector seams ────────────────────────────────────
// XCU-14 — the contract both layers emit to: field shape · units · timestamps · dedup-key [FACT: ADR-014:78 (§3.8)]
interface NormalizationContract { id: string; fields: FieldSpec[]; units: string; timestamps: string[]; dedupKey: string[] }
interface IntegrationRegistry {
  register(source: IngestionSource, contract: NormalizationContract): void
  get(integrationId: string): { source: IngestionSource; contract: NormalizationContract } | null
  list(): IngestionSource[]                                   // deterministic
  registerNativeAdapter(integrationId: string, adapter: NativeAdapterSeam): void   // XCU-15 (adapters = M2)
  registerUserManagedConnector(def: UserConnectorDef): void   // XCU-16 (connector = sandboxed ADR-010 capability)
}
createIntegrationRegistry(): IntegrationRegistry
```

## The PORTS (the M2 seam — M1 default adapter, M2 real store/reach)

```ts
// Credential custody (XCU-09): the mediator holds connection_config, injects it, makes the call, returns the
// result. The capability NEVER sees the token. `[FACT: ADR-014:68; capability-framework.md:201]`
interface IngestionMediatorPort {
  fetchFromSource(integrationId: string, request: FetchRequest): Promise<FetchResult>  // U-4: connection_config store = M2
}
interface ImportStagingPort {   // U-4: import_staging table = M2; M1 in-memory (createInMemoryStagingPort)
  put(batchId: string, rows: StagedRow[]): Promise<void>; take(batchId: string): Promise<StagedRow[]>; clear(batchId: string): Promise<void>
}
interface DatasetFetchPort   { fetchWhole(datasetId: string): Promise<PublicDataset> }        // U-2: mirror/CDN = M2
interface DatasetVerifierPort{ verify(ds: PublicDataset): Promise<boolean> }                  // signature verify

// Factory (mirrors createEgressGuard / createCapabilityEnforcer). M1 default ports: mediator = deny-safe
// (mediator_unavailable), staging = in-memory, fetch = deny-safe (refused), verifier = fail-closed. M2 swaps real
// adapters — no signature change.
createIngestionGuard(
  enforcer: CapabilityEnforcer,
  egressGuard: EgressGuard,
  ports?: { mediator?: IngestionMediatorPort; staging?: ImportStagingPort;
            fetch?: DatasetFetchPort; verifier?: DatasetVerifierPort },
): IngestionGuard
```

## Contract invariants the consumer can rely on
- **Device-mediated, never server-proxied; refuse-not-downgrade**: a fetch that could only work server-side is
  denied `server_proxy_refused`, never silently downgraded. `[FACT: ADR-014:40; capability-framework.md:195 (X1)]`.
- **Necessary-but-not-sufficient boolean**: `external_in_ok=true` (decided by `#31`) is required first, then the
  opt-in/mediator rails run on top; a blanket "allow external" never satisfies ingestion. `[FACT: ADR-014:66,74]`.
- **Ingress can carry egress**: an ingestion act whose `dataScope.sensitiveModules` is non-empty routes its
  outbound fetch through `egressGuard.assertFetchEgress` (union-of-consents) — not re-implemented here.
  `[FACT: ADR-014:42; capability-framework.md:200 (X6)]`.
- **Opt-in, revocable, fail-closed; no integration is ever a precondition**: off by default; the manual core works
  without any of them; revoke halts future fetch, keeps already-ingested rows. `[FACT: ADR-014:70,74; X9]`.
- **The mediator holds the token; the sandbox never sees it**: the ingestion path requests "fetch from source X";
  the mediator injects the credential. `[FACT: ADR-014:68; capability-framework.md:201 (X7)]`.
- **Fetch the whole set, never the subset**: `fetchWholeSet` refuses a scoped/subset refresh (the category
  re-leaks). `[FACT: ADR-014:48; capability-framework.md:197 (X3)]`.
- **Reconcile via staging; user is final authority; parse errors fail loud; commit is idempotent**: nothing is
  committed unconfirmed; a parse error flags per-row. `[FACT: ADR-014:72; ADR-004 §3.2.5]`.
- **Add-only feeds dedup, never delete**: dedup by `(feed_id, uid)`, mark `is_ignored`. `[FACT: ADR-014:72; X8]`.
- **Layers are tiers of one normalized contract**: a Layer-3→Layer-1 upgrade keeps the same integration-identity +
  normalization contract, else it is a documented data migration. `[FACT: ADR-014:78; capability-framework.md:204 (X10)]`.
- **Stores are sensitive → `[E]` at M2**: `connection_config` + `import_staging` rows describe vault-bound data;
  the M2 adapters field-encrypt (L2/L3); the M1 in-memory ports never touch disk. `[FACT: ADR-014:9; ADR-002 L2]`.

## Seams this contract does NOT cross (delegated)
`external_in` boolean + in/out union across action checks (`CapabilityEnforcer #31`) · **outbound-fetch-as-egress**
(URL/params consent + audit) (`EgressGuard #43`, XCU-08) · the **model call** (XS-ai `#45` / ADR-015, XCU-17…27) ·
the **durable stores + real native adapters + public mirror/CDN + actual network fetch** (M2 port adapters,
U-1/U-2/U-4) · all **consent/import-review/management UIs** (P6, XCU-03u/10u/16u) · the **native-set qualification
policy** (U-1) + **third-party-shared connectors** (U-3, PC-4). This service **decides + normalizes + registers**;
at M1 it holds no credential, makes no network call, and persists to no real store.
