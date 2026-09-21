// ============================================================================
// foundation/ingestion — types (XS-ingestion #44 · ADR-014 · XCU-01…05,09…16)
//
// The cross-cutting device-mediated ingestion-guard service — the one model by
// which every module's external data crosses the vault boundary: parse/encrypt
// on-device (never server-proxied), three ownership layers each honestly
// disclosed, whole-set public-reference fetch + provenance verify, reconcile-on-
// import staging, add-only feed dedup, stable integration-identity + normalization
// contract, opt-in/revocable grant lifecycle. Decides/normalizes/registers; holds
// no credential, makes no network call. No schema at M1 — durable stores are M2
// (the ports; [E] there, IR-12). Spec: docs/specs/foundation/xs-ingestion/.
// ============================================================================

// ── S1: classification + honest-leak disclosure ─────────────────────────────

// Layer = who OWNS the connector (not the fetch mechanism), and it is temporal —
// a source migrates user-managed → native over time (ADR-014 §3.2, :52). Not a
// flat toggle (X2 anti-signal). `[FACT: ADR-014:44-52; capability-framework.md:196]`
export const INGESTION_LAYERS = ['native', 'public-reference', 'user-managed'] as const
export type IngestionLayer = (typeof INGESTION_LAYERS)[number]

// A source keyed on the stable integration-identity anchor (X10 / ADR-014 §3.8),
// not a raw URL — so a Layer-3→Layer-1 upgrade keeps grant + staged + ingested
// continuity. `normalizationContractId` binds it to the contract both layers emit
// to (XCU-14). `[FACT: ADR-014:78; capability-framework.md:204]`
export interface IngestionSource {
  integrationId: string
  layer: IngestionLayer
  normalizationContractId: string
}

// The who-sees-what payload the SERVICE computes; the P6 UI renders it (XCU-03).
// Mirrors the ADR-014 §3.2 honest-leak matrix columns verbatim (:56-60): who sees
// the data · what leaks & to whom · our-server posture. ZK-1 keeps our relay blind
// to content unconditionally; `serverPosture` still names the public-reference
// Vida-mirror observer ("disclosed, not pretended away", ADR-014:20).
export interface LeakDisclosure {
  layer: IngestionLayer
  whoSees: string
  whatLeaks: string
  serverPosture: string
}

// Fail-loud (constitution §5) for a layer value outside the closed 3-layer set —
// an unclassifiable connector is a bug, not a silent pass.
export class UnknownIngestionLayer extends Error {
  readonly layer: string
  constructor(layer: string) {
    super(`Unknown ingestion layer: '${layer}'`)
    this.name = 'UnknownIngestionLayer'
    this.layer = layer
  }
}

// ── S2: the ingestion guard core (over CapabilityEnforcer #31 + EgressGuard #43) ──
//
// The never-auto-transmit proof reuses the egress canon (a sensitive-read fetch IS
// an egress act — IR-2/XCU-08); re-declaring it would collide in the @vida/core
// barrel and fork the vocabulary. `[FACT: egress/types.ts UserInitiationProof; ADR-014:42]`
export type { UserInitiationProof } from '../egress'
import type { UserInitiationProof } from '../egress'

// The unit the guard adjudicates before a fetch (XCU-01/12; IR-2 for the sensitive path).
export interface IngestionAct {
  defId: string // the initiating capability — its grant is read via the enforcer
  source: IngestionSource
  // The sensitive classes the fetch/parse touches (caller-supplied, never inferred — egress BR-17).
  // Non-empty ⇒ the outbound fetch is an egress act, delegated to the egress guard (IR-2/XCU-08).
  dataScope: { sensitiveModules: string[] }
  // XCU-01 anti-signal: a fetch that could ONLY work by the server reading plaintext — refused,
  // not silently downgraded. `[FACT: ADR-014:40 (§3.1)]`
  requiresServerPlaintext?: boolean
  // Required when the fetch carries a sensitive read (the egress leg is never-auto-transmit).
  userInitiation?: UserInitiationProof
}

export type IngestionDenyReason =
  | 'server_proxy_refused' // XCU-01 — refuse, never downgrade (ADR-014:40)
  | 'external_in_not_granted' // XCU-12 — off by default; enforcer external_in boolean failed (delegated to #31)
  | 'sensitive_egress_unconsented' // IR-2/XCU-08 — a sensitive-read fetch's egress was denied (delegated to #43)
  | 'mediator_unavailable' // XCU-09 — no credential mediator wired (M1 deny-safe default)

// Thrown by the assert* / fetch variants on deny. Carries defId (parity with CapabilityDenied / EgressDenied).
export class IngestionDenied extends Error {
  readonly defId: string
  readonly reason: IngestionDenyReason
  constructor(defId: string, reason: IngestionDenyReason) {
    super(`Ingestion denied: ${defId} (${reason})`)
    this.name = 'IngestionDenied'
    this.defId = defId
    this.reason = reason
  }
}

export interface IngestionDecision {
  permitted: boolean
  reason?: IngestionDenyReason
  // The honest-leak disclosure surfaced WITH the decision (XCU-03) — the labeled per-integration
  // consent XCU-12 requires; the P6 UI renders it. Present on both permit and deny.
  disclosure?: LeakDisclosure
}

// XCU-09 — the credential-custody seam. The capability NEVER holds the credential: it asks the guard,
// the guard delegates to the OS mediator which injects `connection_config` + makes the call, returning
// only the result. M1 default = ABSENT (deny-safe ⇒ mediator_unavailable). M2 wires the real mediator +
// the `connection_config` store ([E], U-4). `[FACT: ADR-014:68 (§3.4); capability-framework.md:201 (X7)]`
export interface FetchRequest {
  path: string
  params?: Record<string, string>
}
export interface FetchResult {
  ok: true
  data: unknown
}
export interface IngestionMediatorPort {
  fetchFromSource(integrationId: string, request: FetchRequest): Promise<FetchResult>
}

export interface IngestionGuard {
  /** Pure decision (non-throwing). Runs XCU-01 refuse → XCU-12 opt-in → IR-2 sensitive-egress delegation. */
  checkIngestion(act: IngestionAct): Promise<IngestionDecision>
  /** Throwing variant; on the sensitive path persists the egress audit via the egress guard (#43). */
  assertIngestionPermitted(act: IngestionAct): Promise<IngestionDecision>
  /** XCU-13 — halts all FUTURE fetch/import (retire the grant, fail-closed); already-ingested rows untouched. */
  revokeIntegration(defId: string): Promise<void>
  /** XCU-09 — the single mediated fetch path; asserts the guard first, then the mediator injects the credential. */
  fetchThroughMediator(act: IngestionAct, request: FetchRequest): Promise<FetchResult>
}

// ── S3: reconcile-on-import engine (XCU-10 staging/reconcile · XCU-11 feed dedup) ──

// Per-row status. Doc-grounded set only — `parse_error` [FACT: ADR-014:72 "a parse error flags per-row"],
// `auto_matched`/`unmatched` [FACT: ADR-014:72 "auto-match … → user reviews/merges"]. The COMPLETE canonical
// vocab is owed to the M2 `import_staging` schema (ADR-002 §5.20, U-4) — not invented here.
export type StagedRowStatus = 'auto_matched' | 'unmatched' | 'parse_error'

// A parsed-but-uncommitted row + its match metadata (XCU-10 · ADR-014:126). `date` (YYYY-MM-DD) + `amountCents`
// (money in cents) are the match metadata auto-match compares (conventions); `parsed` is the opaque normalized
// payload (per-source normalization contract, XCU-14). A parse failure sets `status:'parse_error'` + `error`
// and is NEVER auto-matched or committed (fail-loud, constitution §5).
export interface StagedRow {
  sourceRowId: string
  date: string
  amountCents: number
  parsed: unknown
  status: StagedRowStatus
  matchId?: string
  error?: string
}

// The tolerances auto-match runs on. `[FACT: ADR-014:72 "auto-match by date±tolerance, amount±tolerance"]`
export interface MatchTolerance {
  dateDays: number
  amountCents: number
}

// An existing ledger entry a staged row may auto-match against (the module owns the entity; we only match).
export interface MatchCandidate {
  id: string
  date: string
  amountCents: number
}

// commitStaged partitions the user-confirmed rows: `committed` = the ids handed to the ADR-004 §3.2.5
// idempotent write rail; `rejected` = parse_error rows (fail-loud) + already-committed rows (idempotency).
export interface CommitResult {
  committed: string[]
  rejected: { sourceRowId: string; reason: 'parse_error' | 'already_committed' }[]
}

// XCU-11 — an add-only feed event, deduped by the natural key `(feedId, uid)`; a duplicate is marked
// `isIgnored`, NEVER deleted. `[FACT: ADR-014:72 "dedup by natural key (feed_id, uid) … mark is_ignored"]`
export interface FeedEvent {
  feedId: string
  uid: string
  isIgnored?: boolean
}

// XCU-10 — the staging store seam (M1 in-memory; M2 = the field-encrypted `import_staging` table, U-4/IR-12).
export interface ImportStagingPort {
  put(batchId: string, rows: StagedRow[]): Promise<void>
  take(batchId: string): Promise<StagedRow[]>
  clear(batchId: string): Promise<void>
}

// ── S4: public-reference engine (XCU-04 whole-set fetch · XCU-05 provenance verify) ──

// A bundled/mirrored public dataset — fetched WHOLE, queried from a local copy. Carries the provenance +
// version + integrity signature XCU-05 verifies. `[FACT: ADR-014:48,129 (§3.2/§5)]`
export interface PublicDataset {
  datasetId: string
  version: string
  provenance: string // who serves it (a named observer — the source or the Vida mirror)
  signature: string // integrity signature verified before the dataset is trusted
  payload: unknown // the whole-set data (queried locally, never per-item from the source)
}

// XCU-04 — a public-reference fetch request. `subset` MUST be absent/empty: a scoped refresh re-leaks the
// *category* the user cared about (ADR-014:48), so it is refused, not honoured.
export interface PublicRefFetch {
  datasetId: string
  subset?: string[]
}

export type PublicRefDenyReason =
  | 'scoped_refresh_refused' // XCU-04 — a subset request re-leaks the category
  | 'fetch_unavailable' // M1 deny-safe: no dataset source/mirror wired (U-2 — mirror/CDN is M2)
  | 'unverified_dataset' // XCU-05 — provenance/signature/version failed; a poisoned/unsigned dataset is rejected

export class PublicRefDenied extends Error {
  readonly reason: PublicRefDenyReason
  readonly datasetId?: string
  constructor(reason: PublicRefDenyReason, datasetId?: string) {
    super(`Public-reference denied${datasetId ? ` for '${datasetId}'` : ''} (${reason})`)
    this.name = 'PublicRefDenied'
    this.reason = reason
    this.datasetId = datasetId
  }
}

// The M2 seams: the whole-set fetcher (mirror/CDN, U-2) + the signature verifier. M1 defaults are deny-safe
// (fetch refused) / fail-closed (verify false).
export interface DatasetFetchPort {
  fetchWhole(datasetId: string): Promise<PublicDataset>
}
export interface DatasetVerifierPort {
  verify(ds: PublicDataset): Promise<boolean>
}

export interface PublicReferenceEngine {
  /** XCU-04 + XCU-05 — fetch the WHOLE set (refuse a subset), then verify provenance/signature before trust. */
  fetchWholeSet(request: PublicRefFetch): Promise<PublicDataset>
  /** XCU-05 — provenance/signature/version verify, standalone; throws PublicRefDenied('unverified_dataset'). */
  verifyDataset(ds: PublicDataset): Promise<void>
}

// ── S5: integration registry + connector seams (XCU-14 identity/contract · XCU-15 native · XCU-16 user-managed) ──

// XCU-14 — the per-source normalization contract both layers emit to: field shape · units · timestamps ·
// dedup-key. Load-bearing for the upgrade path (IR-11). `[FACT: ADR-014:78 (§3.8)]`
export interface FieldSpec {
  name: string
  type: string
}
export interface NormalizationContract {
  id: string
  fields: FieldSpec[]
  units: string
  timestamps: string[]
  dedupKey: string[]
}

// XCU-15 — a curated first-party native adapter (opaque here; the real source-direct connector is M2 · U-1,
// and its qualification policy is an owed decision · U-1). It attaches to an existing integration-identity.
export interface NativeAdapterSeam {
  integrationId: string
}

// XCU-16 — a user-managed connector def. It is a sandboxed ADR-010 capability whose credentials are
// mediator-custodied (never held by the connector, XCU-09); a def declaring non-mediated custody is refused.
export interface UserConnectorDef {
  integrationId: string
  contract: NormalizationContract
  credentialCustody: 'mediator'
}

export type RegistryDenyReason =
  | 'duplicate_identity' // an integration-identity may be registered once
  | 'unknown_integration' // a native adapter must attach to an existing integration-identity
  | 'credential_not_mediated' // XCU-16/09 — a connector must not hold its own credential

export class RegistryDenied extends Error {
  readonly integrationId: string
  readonly reason: RegistryDenyReason
  constructor(integrationId: string, reason: RegistryDenyReason) {
    super(`Integration registry denied: ${integrationId} (${reason})`)
    this.name = 'RegistryDenied'
    this.integrationId = integrationId
    this.reason = reason
  }
}

export interface IntegrationRegistry {
  register(source: IngestionSource, contract: NormalizationContract): void
  get(integrationId: string): { source: IngestionSource; contract: NormalizationContract } | null
  list(): IngestionSource[]
  /** XCU-15 — attach a native adapter to an existing identity → Layer-3→Layer-1 upgrade, same contract (IR-11). */
  registerNativeAdapter(integrationId: string, adapter: NativeAdapterSeam): void
  /** XCU-16 — register a mediator-custodied user-managed connector; non-mediated custody is refused. */
  registerUserManagedConnector(def: UserConnectorDef): void
}
