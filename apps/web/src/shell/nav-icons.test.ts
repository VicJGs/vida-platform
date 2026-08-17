import { describe, expect, it } from 'vitest'
import { MODULE_MAP, GLOBAL_SURFACES } from '../nav/module-map'
import { FALLBACK_ICON, navIcon } from './nav-icons'

describe('navIcon (S2-BR-h)', () => {
  it('maps every dock module to a real (non-fallback) glyph', () => {
    for (const entry of MODULE_MAP.filter((m) => m.placement === 'dock')) {
      expect(navIcon(entry.key), `dock module "${entry.key}" needs an icon`).not.toBe(FALLBACK_ICON)
    }
  })

  it('maps every global surface to a real (non-fallback) glyph', () => {
    for (const surface of GLOBAL_SURFACES) {
      expect(navIcon(surface.key), `global surface "${surface.key}" needs an icon`).not.toBe(FALLBACK_ICON)
    }
  })

  it('degrades an unmapped key to the fallback (never throws)', () => {
    expect(navIcon('does-not-exist')).toBe(FALLBACK_ICON)
  })
})
