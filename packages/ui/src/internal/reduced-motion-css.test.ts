// preferences-rescope R4 (LIF-247) — the B12 reduced-motion gate helper + the guard that every gate uses it.
// PLAN-R4 rev 2.1 R4-BR-4 · acceptance 5 · D-R4-4.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MOTION_ATTR, MOTION_FULL, MOTION_REDUCE, reducedMotionCss } from './reduced-motion-css'

describe('reducedMotionCss', () => {
  it('emits the OS @media rule AND the in-app attribute twin, with the same declarations', () => {
    expect(reducedMotionCss(['.a'], 'animation:none')).toBe(
      '@media (prefers-reduced-motion: reduce){.a{animation:none}}' + '[data-vida-motion="reduce"] .a{animation:none}',
    )
  })

  it('prefixes EVERY selector of a list with the attribute (not just the first)', () => {
    expect(reducedMotionCss(['.a', '.b[data-x="1"]'], 'transition:none')).toBe(
      '@media (prefers-reduced-motion: reduce){.a,.b[data-x="1"]{transition:none}}' +
        '[data-vida-motion="reduce"] .a,[data-vida-motion="reduce"] .b[data-x="1"]{transition:none}',
    )
  })

  it('exposes the attribute contract the provider writes', () => {
    expect([MOTION_ATTR, MOTION_REDUCE, MOTION_FULL]).toEqual(['data-vida-motion', 'reduce', 'full'])
  })
})

// D-R4-4: only the helper may emit the media query. A gate hand-written anywhere else (incl. a half-converted module,
// one group through the helper and one by hand) fails here — so the OS query and the in-app preference can't drift.
describe('B12 gate guard', () => {
  const SRC = fileURLToPath(new URL('..', import.meta.url))
  const ALLOW = new Set(['internal/reduced-motion-css.ts', 'hooks/use-reduced-motion.ts'])
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|stories)\./.test(f) && !ALLOW.has(f),
  )

  it('scans the package sources', () => {
    expect(files).toContain('internal/dialog-styles.ts')
  })

  it.each(files)('%s emits reduced motion only through reducedMotionCss', (f) => {
    expect(readFileSync(join(SRC, f), 'utf8')).not.toContain('prefers-reduced-motion')
  })
})
