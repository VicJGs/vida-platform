// ============================================================================
// foundation/ai — types (XS-ai #45 · ADR-015 §3.1-3.8 · XCU-17…27)
//
// The cross-cutting AI-application service tier — the one model by which every
// AI-touching module runs a model with OUR SERVER BLIND in both modes (ZK-1).
// Two per-use modes (on-device/agentic = ZK-safe · cloud BYO-key = a disclosed
// plaintext dent); a cloud call IS an egress (rides #43); askModel is mediator-
// injected (the agent never holds the key); the tool-set IS the granted envelope
// (fails closed). Decides / discloses / gates; holds no credential, makes no
// network call, authors NO schema — the durable stores (ai_connections,
// ai_conversations, AI-egress audit) + the real mediator/on-device runtime are M2
// (behind the ports). Spec: docs/specs/foundation/xs-ai/.
//
// This file grows one slice at a time (ingestion precedent). S1 = modes,
// disclosure, provenance.
// ============================================================================

// XCU-18 — the two execution modes, a PER-USE informed choice (not a global
// setting): `on_device` (agentic; no vault content leaves; residual = the
// model-acquisition leak; runtime telemetry-off/no-ambient-network) + `cloud`
// (BYO-key, device→provider direct). Neither routes through our server.
// `[FACT: ADR-015:41-46 (§3.1 table + prose); capability-framework.md:211 (AI1)]`
export const AI_MODES = ['on_device', 'cloud'] as const
export type AiMode = (typeof AI_MODES)[number]

// XCU-20 / XCU-26 — the honest bound per mode, disclosed at the consent gate and
// "never pretended away" (the ADR-013 name-the-observer principle). The service
// COMPUTES it; the P6 UI (XCU-19u) renders it. Mirrors the ingestion
// LeakDisclosure shape verbatim (whoSees / whatLeaks / serverPosture).
// `[FACT: ADR-015:48-51 (§3.2)]`
export interface AiModeDisclosure {
  mode: AiMode
  whoSees: string
  whatLeaks: string
  serverPosture: string
}

// XCU-24 — the `manual | ai | import` authorship triad's `ai` leg. Model-generated
// rows carry `source = 'ai'` so a user always distinguishes what a model wrote
// from what they authored; AI is never an unlabeled source of truth. The literal
// is the canonical provenance value already used across @vida/types (RECORD_SOURCE,
// MEAL_SOURCE, PHYSICAL_ROLE_AUTHORING_SOURCE — each citing ADR-015 §3.6 / AI6).
// `[FACT: ADR-015:64 (§3.6); packages/types/src/learning.ts:189; health.ts:109; nutrition.ts:18]`
export const AI_PROVENANCE = 'ai' as const
export type AiProvenance = typeof AI_PROVENANCE

// Thrown on a mode value outside AI_MODES (fail-loud, parity with
// UnknownIngestionLayer). `[FACT: foundation/ingestion/types.ts UnknownIngestionLayer]`
export class UnknownAiMode extends Error {
  readonly mode: string
  constructor(mode: string) {
    super(`Unknown AI mode: ${mode}`)
    this.name = 'UnknownAiMode'
    this.mode = mode
  }
}

// ─── S2 — askModel core: mediated primitive · cloud=egress+scope-min · AI-egress audit ───
// (XCU-22 / XCU-19 / XCU-27, + the on-device runtime seam XCU-26 consumed by the dispatch)

import type {
  EgressAuditRecord,
  EgressDenyReason,
  EgressSlice,
  EgressTarget,
  UserInitiationProof,
} from '../egress'

// The model's output. Minimal at M1 (a model returns text); the concrete
// response contract is a build-phase / M2 runtime concern (U-1). Never produced
// at M1 — both ports are absent, so askModel always denies before a response.
export interface AiResponse {
  content: string
}

// XCU-18 — an AI request, discriminated by mode. A `cloud` request MUST carry the
// egress triple (target{kind:'model'} · the scoped slice · the user-initiation
// proof — reused verbatim from the egress guard #43, R-3); an `on_device` request
// carries none (nothing leaves the vault). This IS scope-minimization by
// construction: the tier only ever forwards the caller's slice — it has no vault
// access to over-send from (XCU-19). `[FACT: ADR-015:41-46 (§3.1), :54 (§3.3);
// docs/core/egress/current-spec.md:26-28 (EgressTarget/EgressSlice/UserInitiationProof)]`
export interface AiCloudRequest {
  defId: string
  mode: 'cloud'
  target: EgressTarget
  slice: EgressSlice
  userInitiation: UserInitiationProof
}
export interface AiOnDeviceRequest {
  defId: string
  mode: 'on_device'
}
export type AiRequest = AiCloudRequest | AiOnDeviceRequest

// AI-specific deny reasons; cloud-path egress reasons PROPAGATE verbatim from the
// egress guard (EgressDenyReason) — the AI tier does not restate them (R-4).
export type AiDenyReason =
  | 'on_device_unavailable' // XCU-26 — no on-device runtime wired (M1 deny-safe default)
  | 'model_unavailable' // XCU-22 — no credential mediator wired (M1 deny-safe default)

// A non-throwing model-call decision. `disclosure` is ALWAYS present (the honest
// bound is surfaced whether or not the call is permitted); `audit` on a permitted
// cloud call is the AI-egress record (XCU-27, built by #43, not persisted here — PF-1).
export interface AiDecision {
  permitted: boolean
  reason?: AiDenyReason | EgressDenyReason
  disclosure: AiModeDisclosure
  audit?: EgressAuditRecord
}

// XCU-22 — the mediator injects the BYO-key credential + makes the provider call +
// returns only the response; the agent/capability NEVER sees the key. M1 default =
// ABSENT (deny-safe ⇒ model_unavailable). M2 wires the real mediator (ADR-014 §3.4).
export interface AiMediatorPort {
  call(target: EgressTarget, slice: EgressSlice): Promise<AiResponse>
}

// XCU-26 — the on-device runtime seam: telemetry-off, no-ambient-network, never a
// silent on-device→cloud upgrade; the local model is acquired via the ADR-014
// Layer-2 whole-set/mirror discipline. M1 default = ABSENT (deny-safe ⇒
// on_device_unavailable). M2 wires the real runtime. `[FACT: ADR-015:51 (§3.2)]`
export interface OnDeviceRuntimePort {
  run(req: AiOnDeviceRequest): Promise<AiResponse>
}

export interface AiPorts {
  mediator?: AiMediatorPort
  onDevice?: OnDeviceRuntimePort
}

// Thrown by askModel on deny (parity with EgressDenied/IngestionDenied — carries defId).
export class AiDenied extends Error {
  readonly defId: string
  readonly reason: AiDenyReason | EgressDenyReason
  constructor(defId: string, reason: AiDenyReason | EgressDenyReason) {
    super(`AI call denied: ${defId} (${reason})`)
    this.name = 'AiDenied'
    this.defId = defId
    this.reason = reason
  }
}

export interface AiService {
  /** Non-throwing model-call decision. PURE — enforces consent + scope via the egress
   *  guard's checkEgress (cloud) but never persists (PF-1); on-device never egresses. */
  checkModelCall(req: AiRequest): Promise<AiDecision>
  /** XCU-22 — the mediated primitive. Cloud: asserts+audits egress (#43), then the
   *  mediator injects the key + calls; on-device: runs the local runtime. Deny-safe at M1. */
  askModel(req: AiRequest): Promise<AiResponse>
}

// ─── S3 — agent-as-mediated-actor: tool-set = envelope (fails closed) · injection bounding ───
// (XCU-21 / XCU-23)

import type { CapabilityAction } from '../capability'

// XCU-21 — a tool an agent may invoke IS a capability action: a binding (an
// entity write, rides the ADR-004 §3.2.5 guarded-write rail), an effect, media, or
// an external in/out. The agent's callable tool-set is EXACTLY its granted envelope
// — so a tool check is an envelope check, delegated verbatim to the enforcer #31.
// `[FACT: ADR-015:56 (§3.4); foundation/capability/types.ts CapabilityAction]`
export type AiTool = CapabilityAction

// XCU-23 — untrusted-origin ingested content (an OCR page, an ICS event, a scraped
// syllabus, a public rule-pack) carries PROVENANCE into the prompt, so the agent
// knows which context is untrusted. `[FACT: ADR-015:60 (§3.4b); ADR-014 untrusted-ingestion]`
export const PROMPT_ORIGINS = ['trusted', 'untrusted'] as const
export type PromptOrigin = (typeof PROMPT_ORIGINS)[number]

export interface PromptSegment {
  content: string
  origin: PromptOrigin
}

// The bounded prompt — segments with provenance + a flag marking any untrusted
// content present (the injection surface the downstream call must treat with care).
export interface BoundedPromptInput {
  segments: PromptSegment[]
  hasUntrusted: boolean
}

export interface AiAgentGate {
  /** XCU-21 — assert a tool ∈ the granted envelope; throws CapabilityDenied (the
   *  enforcer's fail-closed error) for any tool outside it. No ambient authority. */
  assertToolPermitted(defId: string, tool: AiTool): Promise<void>
  /** Non-throwing variant (parity with the enforcer/egress check* pattern). */
  checkTool(defId: string, tool: AiTool): Promise<boolean>
  /** XCU-23 — carry origin provenance into the prompt. The other two injection
   *  mechanisms are COMPOSED, not restated here: an injected tool-call still hits
   *  assertToolPermitted (S3) and an agent-composed egress still hits the S2 egress
   *  gate (never-auto-transmit) — injection can misword the model, not exfiltrate. */
  boundPromptInput(segments: PromptSegment[]): BoundedPromptInput
}

// ─── S4 — ai_connections config registry (XCU-25) ───

// A per-provider AI connection config. It carries NO key: the BYO-key credential is
// mediator-custodied (never in agent/sandbox reach — XCU-25/IR-6), so the in-reach
// config only names the custody, never holds the secret. `provider` is OPEN (the
// user brings their own — Claude/ChatGPT/…). `requestedNoTrain` = no-train/zero-
// retention REQUESTED where offered, disclosed as requested-not-guaranteed (IR-4).
// `[FACT: ADR-015:114 (§5 ADD ai_connections: mode·provider·encrypted_key[L2/L3,
// mediator custody]·default_scope·requested_no_train), :62 (§3.5); capability-framework.md:212 (AI2)]`
export interface AiConnection {
  integrationId: string
  mode: AiMode
  provider: string
  defaultScope: string
  requestedNoTrain: boolean
  keyCustody: 'mediator'
}

export type AiConnectionDenyReason =
  | 'key_not_mediated' // XCU-25 — a config whose key is not mediator-custodied is refused (fail-closed)

// The durable ai_connections STORE port — M2 wires it ([E] + mediator key custody).
// M1 default = an in-memory map inside the registry. `[FACT: ADR-015:114; ADR-002 §L2]`
export interface AiConnectionStorePort {
  put(connection: AiConnection): void
  get(integrationId: string): AiConnection | null
  list(): AiConnection[]
}

export interface AiConnectionRegistry {
  register(connection: AiConnection): AiConnection
  get(integrationId: string): AiConnection | null
  list(): AiConnection[]
}

// Thrown on a refused connection registration (parity with RegistryDenied — carries the id).
export class AiConnectionDenied extends Error {
  readonly integrationId: string
  readonly reason: AiConnectionDenyReason
  constructor(integrationId: string, reason: AiConnectionDenyReason) {
    super(`AI connection refused: ${integrationId} (${reason})`)
    this.name = 'AiConnectionDenied'
    this.integrationId = integrationId
    this.reason = reason
  }
}
