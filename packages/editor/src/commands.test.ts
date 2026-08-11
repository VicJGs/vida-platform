import { describe, expect, it } from 'vitest'
import { INTEGRATION_BLOCK_TYPE, SLASH_COMMAND_CATEGORY } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS, INTEGRATION_BLOCK_COMMAND_COUNT } from './commands'

// BR-E1-4 — E1 owns the enum→command surface. The map must stay in lockstep with INTEGRATION_BLOCK_TYPE, and every
// SlashCommand must populate all 7 required fields (none optional; @vida/types editor.ts:144-155).
describe('INTEGRATION_BLOCK_COMMANDS', () => {
  it('exports exactly one command per INTEGRATION_BLOCK_TYPE (parity, no gap/dup)', () => {
    expect(INTEGRATION_BLOCK_COMMANDS).toHaveLength(INTEGRATION_BLOCK_TYPE.length)
    expect(INTEGRATION_BLOCK_COMMAND_COUNT).toBe(11)

    const covered = INTEGRATION_BLOCK_COMMANDS.map((c) => c.block_type).sort()
    expect(covered).toEqual([...INTEGRATION_BLOCK_TYPE].sort())
  })

  it('has no duplicate block_type, name or shortcut', () => {
    const types = new Set(INTEGRATION_BLOCK_COMMANDS.map((c) => c.block_type))
    const names = new Set(INTEGRATION_BLOCK_COMMANDS.map((c) => c.name))
    const shortcuts = new Set(INTEGRATION_BLOCK_COMMANDS.map((c) => c.shortcut))
    expect(types.size).toBe(INTEGRATION_BLOCK_COMMANDS.length)
    expect(names.size).toBe(INTEGRATION_BLOCK_COMMANDS.length)
    expect(shortcuts.size).toBe(INTEGRATION_BLOCK_COMMANDS.length)
  })

  it('populates all 7 required fields on every command, with a valid category', () => {
    for (const cmd of INTEGRATION_BLOCK_COMMANDS) {
      expect(cmd.name.length).toBeGreaterThan(0)
      expect(cmd.label.length).toBeGreaterThan(0)
      expect(cmd.description.length).toBeGreaterThan(0)
      expect(cmd.icon.length).toBeGreaterThan(0)
      expect(INTEGRATION_BLOCK_TYPE).toContain(cmd.block_type)
      expect(cmd.shortcut.startsWith('/')).toBe(true)
      expect(SLASH_COMMAND_CATEGORY).toContain(cmd.category)
    }
  })
})
