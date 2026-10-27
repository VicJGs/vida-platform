// notes-rescope R3 · G6/G8 · IMPL R-2 — the curated page-icon map.
import { describe, expect, it } from 'vitest'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { PAGE_ICONS, pageIconFor } from './page-icons'
import { typeIcon } from './note-chrome'

describe('PAGE_ICONS (curated Lucide set)', () => {
  const names = Object.keys(PAGE_ICONS)
  it('is a curated set of about 48 icons', () => {
    expect(names.length).toBeGreaterThanOrEqual(40)
    expect(names.length).toBeLessThanOrEqual(60)
  })
  it.each(names)('%s is a CURRENT lucide-react icon name (not a deprecated alias)', (name) => {
    const map = dynamicIconImports as Record<string, unknown>
    expect(name in map).toBe(true)
    expect(String(map[name])).toContain(`/icons/${name}.mjs`)
  })
  it('every entry has a human label', () => {
    for (const n of names) expect(PAGE_ICONS[n]?.label.length).toBeGreaterThan(0)
  })
})

describe('pageIconFor', () => {
  it('the chosen icon when it is in the set', () => {
    expect(pageIconFor({ icon: 'book-open', type: 'note' })).toBe(PAGE_ICONS['book-open']?.icon)
  })
  it('the type icon when unset or unknown (a name from a later build)', () => {
    expect(pageIconFor({ icon: null, type: 'task_note' })).toBe(typeIcon('task_note'))
    expect(pageIconFor({ icon: 'not-in-set', type: 'note' })).toBe(typeIcon('note'))
  })
})
