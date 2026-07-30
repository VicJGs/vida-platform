// ============================================================================
// React Query client — AR-4 (LIF-75). The sole cache for all local-SQLite reads
// (BR-RT-1/3). Module-scope singleton so React 19 StrictMode's dev double-invoke
// cannot spawn duplicate clients (R5).
//
// Global defaults are the documented "high volatility" baseline; per-query
// overrides follow the volatility table (performance-strategy.md §5).
//   - staleTime 30s · gcTime 5m · retry 1
//   - refetchOnWindowFocus FALSE — local-first: there is no server to re-fetch
//     from (the sync server is a ZK blob relay, not a data source). BR-RT-3.
// ============================================================================

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — high-volatility default
      gcTime: 5 * 60_000, // 5m
      retry: 1, // local DB — failures are rare
      refetchOnWindowFocus: false, // local-first — no remote to re-fetch from
    },
  },
})
