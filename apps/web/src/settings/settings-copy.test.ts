// preferences-rescope R3 — every R3 string passes the copy-honesty backstop (no cloud/ZK claim, no dead end).
// R5 — entries may be functions of a label (the ⌘K pin announcements); they're linted with a sample label.
import { describe, it, expect } from 'vitest'
import { lintCopy } from '../voice/voice-copy'
import { SETTINGS_COPY } from './settings-copy'

const asText = (entry: string | ((label: string) => string)) =>
  typeof entry === 'function' ? entry('Go to Tasks') : entry

describe('SETTINGS_COPY', () => {
  it.each(Object.entries(SETTINGS_COPY))('%s passes lintCopy', (_key, entry) => {
    expect(lintCopy(asText(entry))).toEqual([])
  })

  it('R5 ⌘K copy: announcements name the command; the hint is a full sentence naming the key', () => {
    expect(SETTINGS_COPY.cmdPinned('Finance')).toBe('Pinned Finance')
    expect(SETTINGS_COPY.cmdUnpinned('Finance')).toBe('Unpinned Finance')
    expect(SETTINGS_COPY.cmdPinFailed('Finance')).toMatch(/^Couldn’t pin Finance/)
    expect(SETTINGS_COPY.cmdUnpinFailed('Finance')).toMatch(/^Couldn’t unpin Finance/)
    expect(SETTINGS_COPY.cmdPinnedSuffix).toBe(', pinned')
    expect(SETTINGS_COPY.cmdHintMac).toMatch(/^⌥P pins the highlighted command/)
    expect(SETTINGS_COPY.cmdHintOther).toMatch(/^Alt\+P pins the highlighted command/)
  })
})
