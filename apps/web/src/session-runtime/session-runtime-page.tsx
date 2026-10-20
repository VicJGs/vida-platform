// ============================================================================
// SessionRuntimePage — the ROUTED wrapper for `/sessions/$id` (fe-session-runtime #23, S2).
// Thin by design: reads the route param and delegates to the router-free
// `SessionRuntimeSurface` (which holds all logic + is what the Visual Gate mounts). Default
// export for `lazyRouteComponent` (BR-RT-8 route-based code-splitting). The /notes/$id precedent.
// ============================================================================
import { getRouteApi } from '@tanstack/react-router'
import { SessionRuntimeSurface } from './session-runtime-surface'

const routeApi = getRouteApi('/sessions/$id')

export function SessionRuntimePage() {
  const { id } = routeApi.useParams()
  return <SessionRuntimeSurface sessionId={id} />
}

export default SessionRuntimePage
