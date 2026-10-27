import { describe, it, expect, vi } from 'vitest'
import { deriveNavCommands } from './nav-commands'

describe('deriveNavCommands', () => {
  const commands = deriveNavCommands()

  it('derives exactly 21 nav commands (19 module routes + /calendar + /graph; 3 overlaps deduped)', () => {
    // MODULE_MAP non-null routePaths = 19; GLOBAL_SURFACES add /calendar + /graph; /·/notifications·/settings dedupe.
    expect(commands).toHaveLength(21)
  })

  it('includes the GLOBAL-only routes /calendar and /graph', () => {
    const ids = commands.map((c) => c.id)
    expect(ids).toContain('nav:/calendar')
    expect(ids).toContain('nav:/graph')
  })

  it('dedupes shared routes to a single command (one "/" command)', () => {
    expect(commands.filter((c) => c.id === 'nav:/')).toHaveLength(1)
  })

  it('excludes null-route entries (non-nav / spaces-only) and the command-palette surface', () => {
    const labels = commands.map((c) => c.label)
    expect(labels).not.toContain('Focus') // pomodoro (non-nav, null route)
    expect(labels).not.toContain('Languages') // spaces-only, null route
    expect(commands.every((c) => c.id.startsWith('nav:/'))).toBe(true) // no nav:null
  })

  it('uses the UX-facing routePath, not "/"+key (relationships -> /people)', () => {
    expect(commands.find((c) => c.label === 'Relationships')?.id).toBe('nav:/people')
  })

  it('preserves visibleWhen on conditional commands (gamification)', () => {
    expect(commands.find((c) => c.id === 'nav:/gamification')?.visibleWhen).toBe('feature_gamification')
  })

  it('run() navigates to the command route via the injected context', () => {
    const navigate = vi.fn()
    commands.find((c) => c.id === 'nav:/tasks')?.run({ navigate })
    expect(navigate).toHaveBeenCalledWith('/tasks')
  })

  it('every derived command is the navigation category', () => {
    expect(commands.every((c) => c.category === 'navigation')).toBe(true)
  })
})

// preferences-rescope R5 (PLAN-R5 R5-BR-2/4) — ⌘K's nav commands honor the user's module visibility + names.
describe('deriveNavCommands with nav prefs', () => {
  const prefs = {
    visibility: { tasks: false, preferences: false, journals: false },
    names: { habits: 'Rituals', preferences: 'Nope' },
  }

  it('omits a hidden module and relabels a renamed one; the id (history key) is unchanged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const commands = deriveNavCommands(undefined, undefined, prefs)
    const ids = commands.map((c) => c.id)
    expect(ids).not.toContain('nav:/tasks')
    expect(commands.find((c) => c.id === 'nav:/habits')?.label).toBe('Rituals')
    expect(commands).toHaveLength(20)
    warn.mockRestore()
  })

  it('keeps Settings and Home under a forged false / name (EC-8 read side)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const commands = deriveNavCommands(undefined, undefined, prefs)
    expect(commands.find((c) => c.id === 'nav:/settings')?.label).toBe('Settings')
    expect(commands.find((c) => c.id === 'nav:/')?.label).toBe('Home')
    warn.mockRestore()
  })

  it('no prefs → today’s 21', () => {
    expect(deriveNavCommands(undefined, undefined, undefined)).toHaveLength(21)
  })
})
