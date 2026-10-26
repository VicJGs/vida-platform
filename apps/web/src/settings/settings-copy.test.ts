// preferences-rescope R3 — every R3 string passes the copy-honesty backstop (no cloud/ZK claim, no dead end).
import { describe, it, expect } from 'vitest'
import { lintCopy } from '../voice/voice-copy'
import { SETTINGS_COPY } from './settings-copy'

describe('SETTINGS_COPY', () => {
  it.each(Object.entries(SETTINGS_COPY))('%s passes lintCopy', (_key, text) => {
    expect(lintCopy(text)).toEqual([])
  })
})
