// ============================================================================
// foundation/ingestion — the ingestion guard core (S2 · XCU-01/09/12/13)
//
// The device-mediated ingestion gate over the BUILT CapabilityEnforcer #31 +
// EgressGuard #43. `external_in_ok=true` (decided by #31) is NECESSARY but NOT
// sufficient: on top of it this service refuses a server-plaintext fetch (XCU-01),
// routes a sensitive-read fetch through the egress guard (IR-2/XCU-08 → #43),
// custodies credentials via the mediator (XCU-09), and revokes stop-future/keep-
// ingested (XCU-13). Decides/routes; holds no credential, makes no network call at
// M1 (the mediator port is deny-safe). Factory-of-closures (no `this`).
// ============================================================================

import type { CapabilityEnforcer } from '../capability'
import { EgressDenied, type EgressGuard, type EgressTarget } from '../egress'
import { buildDisclosure, classifyLayer } from './classification'
import {
  IngestionDenied,
  type FetchRequest,
  type FetchResult,
  type IngestionAct,
  type IngestionDecision,
  type IngestionGuard,
  type IngestionMediatorPort,
  type IngestionSource,
} from './types'

export function createIngestionGuard(
  enforcer: CapabilityEnforcer,
  egressGuard: EgressGuard,
  ports?: { mediator?: IngestionMediatorPort },
): IngestionGuard {
  // M1 default: NO mediator (deny-safe) — any live fetch is refused until M2 wires the OS mediator that
  // holds `connection_config` (XCU-09). The capability never gets a credential because there is none here.
  const mediator = ports?.mediator ?? null

  // A sensitive-read fetch is an egress act; map the source to an egress target. A public-reference bulk
  // fetch carries no sensitive read (whole public dataset), so it never reaches this path — only native
  // (source-direct push) and user-managed (webhook) do. `[FACT: ADR-014:58-60 layer matrix]`
  function egressTargetFor(source: IngestionSource): EgressTarget {
    return {
      integrationId: source.integrationId,
      kind: source.layer === 'user-managed' ? 'webhook' : 'external_system',
      label: source.integrationId,
    }
  }

  // Pure decision. Order is load-bearing; each guard fails closed.
  async function checkIngestion(act: IngestionAct): Promise<IngestionDecision> {
    const disclosure = buildDisclosure(classifyLayer(act.source))
    // 1 — XCU-01 refuse-not-downgrade: a server-plaintext-only fetch is refused, never silently downgraded.
    if (act.requiresServerPlaintext) {
      return { permitted: false, reason: 'server_proxy_refused', disclosure }
    }
    // 2 — XCU-12 opt-in / off-by-default: the grant IS the opt-in. Delegated to #31's external_in boolean;
    //     an unresolvable def throws CapabilityNotFound here and PROPAGATES — a bug, not a policy deny.
    const ext = await enforcer.checkAction(act.defId, {
      type: 'external_in',
      source: act.source.integrationId,
    })
    if (!ext.allowed) return { permitted: false, reason: 'external_in_not_granted', disclosure }
    // 3 — IR-2/XCU-08 ingress-carries-egress: a fetch carrying a sensitive read is an egress act, delegated
    //     to the egress guard #31→#43 (never re-implemented here). Never-auto-transmit ⇒ user-initiation
    //     required; its absence is exactly the egress deny, surfaced as sensitive_egress_unconsented.
    if (act.dataScope.sensitiveModules.length > 0) {
      if (!act.userInitiation) {
        return { permitted: false, reason: 'sensitive_egress_unconsented', disclosure }
      }
      const eg = await egressGuard.checkEgress({
        defId: act.defId,
        target: egressTargetFor(act.source),
        slice: {
          summary: `ingestion fetch: ${act.source.integrationId}`,
          sensitiveModules: act.dataScope.sensitiveModules,
        },
        userInitiation: act.userInitiation,
      })
      if (!eg.permitted) return { permitted: false, reason: 'sensitive_egress_unconsented', disclosure }
    }
    // 4 — permit: the decision carries the honest-leak disclosure (labeled consent, XCU-12/XCU-03).
    return { permitted: true, disclosure }
  }

  async function assertIngestionPermitted(act: IngestionAct): Promise<IngestionDecision> {
    const decision = await checkIngestion(act)
    if (!decision.permitted) {
      throw new IngestionDenied(act.defId, decision.reason ?? 'external_in_not_granted')
    }
    // On the sensitive path, persist the egress audit via the egress ASSERT variant (#43) — the trail holds
    // exactly the sensitive-read fetches asserted-and-permitted ("a fetch is an outbound request").
    if (act.dataScope.sensitiveModules.length > 0 && act.userInitiation) {
      try {
        await egressGuard.assertFetchEgress({
          defId: act.defId,
          source: egressTargetFor(act.source),
          fetchParams: `ingestion fetch: ${act.source.integrationId}`,
          slice: {
            summary: `ingestion fetch: ${act.source.integrationId}`,
            sensitiveModules: act.dataScope.sensitiveModules,
          },
          userInitiation: act.userInitiation,
        })
      } catch (e) {
        if (e instanceof EgressDenied) throw new IngestionDenied(act.defId, 'sensitive_egress_unconsented')
        throw e
      }
    }
    return decision
  }

  // XCU-13 — revoke halts all FUTURE fetch/import: the enforcer retires the grant (fail-closed thereafter).
  // Already-ingested rows are NEVER touched (keep-ingested, by construction — this reaches only the grant,
  // never a data row). `[FACT: ADR-014:70 (§3.4)]`
  async function revokeIntegration(defId: string): Promise<void> {
    await enforcer.revoke(defId)
  }

  // XCU-09 — the single mediated fetch path. The act must pass the guard first (a denied ingestion never
  // reaches a credential), THEN the mediator injects `connection_config` + makes the call. M1: no mediator
  // ⇒ mediator_unavailable (deny-safe), so no network call happens at M1.
  async function fetchThroughMediator(act: IngestionAct, request: FetchRequest): Promise<FetchResult> {
    await assertIngestionPermitted(act)
    if (!mediator) throw new IngestionDenied(act.defId, 'mediator_unavailable')
    return mediator.fetchFromSource(act.source.integrationId, request)
  }

  return { checkIngestion, assertIngestionPermitted, revokeIntegration, fetchThroughMediator }
}
