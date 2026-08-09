import { describe, it, expect } from 'vitest'
import { stubSearchProvider, emptyQueryOutcome } from './search-provider'

describe('stubSearchProvider (the DB-8 seam)', () => {
  it('resolves search-unavailable for any query — loud, not a silent blank', async () => {
    const outcome = await stubSearchProvider.search('anything')
    expect(outcome.status).toBe('search-unavailable')
    expect(outcome.message).toBeTruthy()
  })

  it('never throws (even on empty query)', async () => {
    await expect(stubSearchProvider.search('')).resolves.toBeDefined()
  })

  it('emptyQueryOutcome is idle', () => {
    expect(emptyQueryOutcome().status).toBe('idle')
  })
})
