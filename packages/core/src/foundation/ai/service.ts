// ============================================================================
// foundation/ai — the AI-application service: askModel core (S2 · XCU-22/19/27/26)
//
// The model-call primitive over the BUILT CapabilityEnforcer #31 + EgressGuard #43.
// A CLOUD call IS an egress (XCU-19 → the §3.3 guard XCU-06): it rides
// egressGuard.assertEgressPermitted (per-target consent + union-of-consents +
// never-auto-transmit + the AI-egress audit XCU-27), THEN the mediator injects the
// BYO-key credential + calls the provider (XCU-22) — the agent NEVER sees the key.
// An ON-DEVICE call egresses NOTHING (ZK-safe) — it runs the local runtime (XCU-26).
// Every askModel re-hits the egress gate (IR-8: no silent on-device→cloud upgrade).
// Decides/routes; holds no credential, makes no network call at M1 (both ports are
// deny-safe). Factory-of-closures (no `this` — enforcer/egress precedent).
// ============================================================================

import { EgressDenied, type EgressGuard } from '../egress'
import { buildAiDisclosure, resolveMode } from './modes'
import { AiDenied, type AiDecision, type AiPorts, type AiRequest, type AiResponse, type AiService } from './types'

// NB: no `enforcer` param — unlike the ingestion twin, the AI service never consults
// the enforcer directly: the cloud path delegates the whole gate (external_out +
// sensitive union) to `egressGuard`, which already holds the enforcer (#31); the
// on-device path needs no capability check (nothing leaves the vault); and the agent
// tool-set gate is the SEPARATE `createAiAgentGate(enforcer)` (S3). The enforcer
// dependency belongs to egress, not re-passed here.
export function createAiService(egressGuard: EgressGuard, ports?: AiPorts): AiService {
  // M1 defaults: BOTH ports ABSENT (deny-safe) — no credential mediator, no on-device
  // runtime, so no model call and no network happen at M1 (R-1/R-2). M2 wires them.
  const mediator = ports?.mediator ?? null
  const onDevice = ports?.onDevice ?? null

  // Pure decision (PF-1): enforces consent + scope via the egress guard but NEVER
  // persists a "what-left" row for a call that never happened. The honest disclosure
  // is ALWAYS attached (permitted or not). resolveMode throws UnknownAiMode on a
  // garbage mode — a bug that PROPAGATES, not a policy deny (enforcer/ingestion precedent).
  async function checkModelCall(req: AiRequest): Promise<AiDecision> {
    const mode = resolveMode(req.mode)
    const disclosure = buildAiDisclosure(mode)
    // On-device: nothing leaves the vault → no egress gate (INV-1/IR-2). Permit; the
    // local runtime availability is decided at askModel time.
    if (req.mode === 'on_device') {
      return { permitted: true, disclosure }
    }
    // Cloud: the call IS an egress (XCU-19 → XCU-06). Delegate the whole gate to #43 —
    // per-target consent + union-of-consents + never-auto-transmit — over a model target.
    const eg = await egressGuard.checkEgress({
      defId: req.defId,
      target: req.target,
      slice: req.slice,
      userInitiation: req.userInitiation,
    })
    if (!eg.permitted) return { permitted: false, reason: eg.reason, disclosure }
    // On permit, surface the egress record as the AI-egress audit (XCU-27) — not persisted here (PF-1).
    return { permitted: true, disclosure, audit: eg.audit }
  }

  // XCU-22 — the mediated primitive. Order mirrors the ingestion mediator path: the
  // egress gate is ASSERTED first (a denied call never reaches a credential; the
  // AI-egress audit records exactly the permitted-and-attempted call, XCU-27), THEN
  // the mediator injects the key + calls. M1: no mediator ⇒ model_unavailable
  // (deny-safe) — so no network call happens at M1.
  async function askModel(req: AiRequest): Promise<AiResponse> {
    resolveMode(req.mode) // fail-loud on a garbage mode (propagates)
    // On-device (XCU-26): egresses nothing; run the local runtime. M1: absent ⇒ deny-safe.
    if (req.mode === 'on_device') {
      if (!onDevice) throw new AiDenied(req.defId, 'on_device_unavailable')
      return onDevice.run(req)
    }
    // Cloud: re-hit the egress gate every call (IR-8, no silent upgrade). assertEgress
    // persists the AI-egress audit via #43; a deny propagates the egress reason verbatim (R-4).
    try {
      await egressGuard.assertEgressPermitted({
        defId: req.defId,
        target: req.target,
        slice: req.slice,
        userInitiation: req.userInitiation,
      })
    } catch (e) {
      if (e instanceof EgressDenied) throw new AiDenied(req.defId, e.reason)
      throw e
    }
    if (!mediator) throw new AiDenied(req.defId, 'model_unavailable')
    return mediator.call(req.target, req.slice)
  }

  return { checkModelCall, askModel }
}
