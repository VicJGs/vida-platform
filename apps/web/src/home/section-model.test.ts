// Pure — env node. Locks the Home section-model integrity the Phase-1b renderer relies on.
import { describe, expect, it } from 'vitest'

import { HOME_SECTIONS, type HomeSectionKey, type SectionRenderHint } from './section-model'

const KEYS: readonly HomeSectionKey[] = ['summary', 'agenda', 'entry']
const HINTS: readonly SectionRenderHint[] = ['data-view', 'list', 'editor-seam']

describe('HOME_SECTIONS', () => {
  it('models exactly the three journal sections with unique keys (BR-1)', () => {
    expect(HOME_SECTIONS).toHaveLength(3)
    expect(new Set(HOME_SECTIONS.map((s) => s.key)).size).toBe(3)
    for (const s of HOME_SECTIONS) expect(KEYS).toContain(s.key)
  })
  it('is ordered summary → agenda → entry', () => {
    expect(HOME_SECTIONS.map((s) => s.key)).toEqual(['summary', 'agenda', 'entry'])
  })
  it('places every section in the shell content region (BR-7)', () => {
    for (const s of HOME_SECTIONS) expect(s.region).toBe('content')
  })
  it('names a valid render hint per section; the entry is an editor mount seam', () => {
    for (const s of HOME_SECTIONS) expect(HINTS).toContain(s.renderHint)
    expect(HOME_SECTIONS.find((s) => s.key === 'entry')?.renderHint).toBe('editor-seam')
  })
})
