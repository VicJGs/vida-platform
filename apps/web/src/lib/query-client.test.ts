import { describe, it, expect } from 'vitest'
import { queryClient } from './query-client'

describe('queryClient defaults (BR-RT-5 — local-first)', () => {
  it('uses the documented global defaults', () => {
    const q = queryClient.getDefaultOptions().queries!
    expect(q.staleTime).toBe(30_000)
    expect(q.gcTime).toBe(5 * 60_000)
    expect(q.retry).toBe(1)
    // local-first: no server to re-fetch from (BR-RT-3)
    expect(q.refetchOnWindowFocus).toBe(false)
  })
})
