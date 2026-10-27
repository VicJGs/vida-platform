// ============================================================================
// read-error — the read-error RETRY contract + the DEV `?readerror` flag (notes-rescope R1, E-2 / BR-R1-8).
//
// `retryState(query)`: React Query v5 resets a query with NO data to `pending` when it refetches (query-core
// `src/query.ts` fetchState), so a Retry pressed on a failed first read would flip the surface to "loading" — the
// error branch (and the focused Retry button) unmounts. A read is `retrying` when it is fetching, holds no data, and
// has failed before (`errorUpdateCount > 0`); the surface stays on its error branch with a busy button meanwhile.
// A first load (count 0) is never retrying. Stated: a remount within gcTime after a failed read also shows the error
// branch with a busy Retry (the read did fail).
//
// `?readerror` (DEV-only, the `?sample` precedent — NODE_ENV-replaced, eliminated from the prod build): the three
// surface reads throw until the first Retry press clears it for this document load. It exists so the Visual Gate and
// the live smoke can reach the error state on real OPFS.
// ============================================================================

let cleared = false

/** DEV: should this read fail on purpose? (`?readerror` in the URL and not yet cleared by a Retry.) */
export function readErrorArmed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    !cleared &&
    new URLSearchParams(window.location.search).has('readerror')
  )
}

/** DEV: the first Retry press disarms `?readerror` for the rest of this document load. */
export function clearReadError(): void {
  cleared = true
}

/** Throw the DEV read error when armed (first line of a surface query function). */
export function throwIfReadErrorArmed(): void {
  if (readErrorArmed()) throw new Error('DEV ?readerror')
}

interface RetryableQuery {
  isError: boolean
  isFetching: boolean
  data: unknown
  errorUpdateCount: number
  refetch: () => Promise<unknown>
}

/** The retry half of a surface read result. `error` ⇒ render the error branch (it stays up while `retrying`). */
export function retryState(q: RetryableQuery): { error: boolean; retrying: boolean; retry: () => void } {
  const retrying = q.isFetching && q.data === undefined && q.errorUpdateCount > 0
  return {
    error: q.isError || retrying,
    retrying,
    retry: () => {
      clearReadError()
      void q.refetch()
    },
  }
}
