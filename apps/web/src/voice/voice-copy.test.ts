// Pure — env `node`. Locks the copy-honesty backstop: flags overclaims + dead-ends, passes honest + staged copy.
import { describe, expect, it } from 'vitest'
import { VOICE, lintCopy } from './voice-copy'

describe('VOICE', () => {
  it('declares the voice tone + sentence case', () => {
    expect(VOICE.tone).toContain('honest')
    expect(VOICE.case).toBe('sentence')
  })
})

describe('lintCopy — zk-sync-claim', () => {
  it('flags a zero-knowledge / cloud-sync overclaim', () => {
    expect(lintCopy('Your data is zero-knowledge encrypted.')[0]?.rule).toBe('zk-sync-claim')
    expect(lintCopy('Everything is synced to the cloud.')[0]?.rule).toBe('zk-sync-claim')
    expect(lintCopy('End-to-end protected across devices.')[0]?.rule).toBe('zk-sync-claim')
  })

  it('does NOT flag honest staged copy that mentions encryption as a future', () => {
    // bare "encrypt" is deliberately not flagged — the m1/m3 contract governs staged claims, not this backstop.
    expect(lintCopy('Encryption arrives at M3.')).toEqual([])
  })

  it('passes honest M1 local-first copy', () => {
    expect(lintCopy('Saved on this device')).toEqual([])
    expect(lintCopy('On your device, encrypted at rest. Nothing leaves without you.')).toEqual([])
  })
})

describe('lintCopy — dead-end', () => {
  it('flags a blank dead-end', () => {
    expect(lintCopy('No data available')[0]?.rule).toBe('dead-end')
    expect(lintCopy('Nothing to show.')[0]?.rule).toBe('dead-end')
  })

  it('passes a teaching empty line', () => {
    expect(lintCopy('Your Finance is a clean page. Import a statement to start.')).toEqual([])
  })
})

describe('lintCopy — returns every match', () => {
  it('reports multiple violations in one string', () => {
    const issues = lintCopy('No data available. Synced to the cloud, zero-knowledge.')
    const rules = issues.map((i) => i.rule).sort()
    expect(rules).toEqual(['dead-end', 'zk-sync-claim', 'zk-sync-claim'])
  })
})
