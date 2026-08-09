// Pure — env `node`. Locks the first-run predicate + the two-signal contract (the marker, not exists()).
import { describe, expect, it } from 'vitest'

import { FIRST_RUN_BRANCH, FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE, isFirstRun } from './first-run'

describe('isFirstRun', () => {
  it('is true when the marker is absent', () => expect(isFirstRun(undefined)).toBe(true))
  it('is true for empty / non-completion values', () => {
    expect(isFirstRun('')).toBe(true)
    expect(isFirstRun('0')).toBe(true)
  })
  it('is false only for the completion value', () => expect(isFirstRun(FIRST_RUN_COMPLETE_VALUE)).toBe(false))
})

describe('FIRST_RUN_BRANCH', () => {
  it('keys on the device-local first-run marker, not exists()', () => {
    expect(FIRST_RUN_BRANCH.signalKey).toBe(FIRST_RUN_COMPLETE_KEY)
  })
})
