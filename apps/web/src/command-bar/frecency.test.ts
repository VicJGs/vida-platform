import { describe, it, expect } from 'vitest'
import { rankByFrecency } from './frecency'
import type { Command, CommandHistoryEntry } from './types'

const cmd = (id: string): Command => ({ id, label: id, category: 'action', run: () => {} })

// Fixture rows use the EXACT v1 six-field shape — so these tests double as the v2 MOD-prefs contract assertion.
const hist = (
  command_key: string,
  use_count: number,
  last_used_at: number | null,
  is_pinned: 0 | 1 = 0,
): CommandHistoryEntry => ({
  command_key,
  command_label: command_key,
  command_category: null,
  use_count,
  last_used_at,
  is_pinned,
})

describe('rankByFrecency', () => {
  it('ranks a pinned command above a higher-use non-pinned one', () => {
    const ranked = rankByFrecency([cmd('a'), cmd('b')], [hist('a', 1, 1000, 1), hist('b', 99, 1000, 0)], 1000)
    expect(ranked.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('ranks a more-recent command above an older one at equal use_count', () => {
    const ranked = rankByFrecency([cmd('old'), cmd('new')], [hist('old', 5, 0), hist('new', 5, 900)], 1000)
    expect(ranked.map((c) => c.id)).toEqual(['new', 'old'])
  })

  it('ranks a command with history above one with none', () => {
    const ranked = rankByFrecency([cmd('unused'), cmd('used')], [hist('used', 3, 500)], 1000)
    expect(ranked.map((c) => c.id)).toEqual(['used', 'unused'])
  })

  it('preserves input order when history is empty', () => {
    expect(rankByFrecency([cmd('x'), cmd('y'), cmd('z')], [], 1000).map((c) => c.id)).toEqual(['x', 'y', 'z'])
  })
})
