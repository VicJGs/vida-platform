// ============================================================================
// foundation/notifications — content-minimal wake payload contract (S1)
//
// XCU-08 (content-minimal push payload spec) · XCU-16 (metadata-bound: content-zero).
// Pure + deterministic. The ZK payload CONTRACT ADR-013 owns: a wake push carries
// owner ROUTING metadata only — never content, type, or subject entity.
// ============================================================================

import {
  FORBIDDEN_PAYLOAD_KEYS,
  PayloadNotContentFree,
  type RoutingMeta,
  type WakePayload,
} from './types'

// XCU-08 / XCU-16 — build the content-free wake payload from owner routing metadata.
// Defense-in-depth for the content-zero invariant (IR-3): even though `RoutingMeta`
// is typed to exclude content, a caller may hand an untyped/widened object — so this
// RUNTIME-refuses any forbidden key (title/message/type/entity/…) with a loud
// `PayloadNotContentFree`, never a silent strip. The result carries only whom-to-wake.
// `[FACT: ADR-013 §3.3 L53 (content-minimal), §3.5 L61-65 (never exposed), §3.6 L70]`
export function buildWakePayload(routing: RoutingMeta): WakePayload {
  const seen = routing as unknown as Record<string, unknown>
  for (const key of FORBIDDEN_PAYLOAD_KEYS) {
    if (key in seen && seen[key] !== undefined) throw new PayloadNotContentFree(key)
  }
  if (typeof routing.userId !== 'string' || routing.userId.length === 0) {
    // Routing needs a user to wake — a payload with no routing target is useless,
    // not a ZK breach; fail loud so a mis-built payload never ships silently.
    throw new PayloadNotContentFree('userId(missing routing target)')
  }
  const payload: WakePayload = { kind: 'wake', userId: routing.userId }
  if (routing.targetDeviceIds !== undefined) payload.targetDeviceIds = routing.targetDeviceIds
  return payload
}
