// @vitest-environment jsdom
// preferences-rescope R4 (LIF-247) — the B12 reduced-motion gate helper + the guard that every gate uses it.
// PLAN-R4 rev 2.1 R4-BR-4 · acceptance 5 · D-R4-4.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MOTION_ATTR, MOTION_FULL, MOTION_REDUCE, reducedMotionCss } from './reduced-motion-css'

describe('reducedMotionCss', () => {
  it('emits the OS @media rule AND the in-app attribute twin, with the same declarations (DSG-12)', () => {
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
  const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
  const ALLOW = new Set(['internal/reduced-motion-css.ts', 'hooks/use-reduced-motion.ts'])
  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|stories)\./.test(f) && !ALLOW.has(f),
  )

  it('scans the package sources (B12, DSG-12)', () => {
    expect(files).toContain('internal/dialog-styles.ts')
  })

  it('DSG-12 every injected animation moves transform, opacity or clip-path only, and its module ships the reduced-motion path', async () => {
    const MOVABLE = new Set(['transform', 'opacity', 'clip-path', 'transform-origin', 'none'])
    // top-level comma split, so cubic-bezier(0, 0, 0.3, 1) stays one part
    const parts = (v: string) => v.split(/,(?![^(]*\))/).map((x) => x.trim())
    const modules = readdirSync(join(SRC, 'internal')).filter((f) => /^[\w-]+\.ts$/.test(f) && !f.endsWith('.test.ts'))
    let animated = 0
    for (const f of modules) {
      const mod = (await import(`./${f.replace(/\.ts$/, '')}`)) as Record<string, unknown>
      for (const [name, ensure] of Object.entries(mod)) {
        if (!/^ensure\w*Styles$/.test(name) || typeof ensure !== 'function') continue
        document.head.innerHTML = ''
        ensure()
        const css = [...document.head.querySelectorAll('style')].map((el) => el.textContent ?? '').join('\n')
        const transitions = [...css.matchAll(/transition(?:-property)?\s*:\s*([^;}]+)/g)].flatMap((m) => parts(m[1]))
        const keyframes = [...css.matchAll(/@keyframes[^{]+\{((?:[^{}]*\{[^{}]*\})*)[^{}]*\}/g)].flatMap((m) =>
          [...m[1].matchAll(/([\w-]+)\s*:/g)].map((x) => x[1]),
        )
        for (const t of transitions) expect(MOVABLE.has(t.split(/\s+/)[0]), `${f}: transition ${t}`).toBe(true)
        for (const p of keyframes) expect(MOVABLE.has(p), `${f}: @keyframes animates ${p}`).toBe(true)
        if (transitions.some((t) => !t.startsWith('none')) || keyframes.length) {
          animated++
          expect(css, `${f} animates with no reduced-motion path`).toContain('prefers-reduced-motion: reduce')
          expect(css, `${f} has no in-app reduce twin`).toContain('[data-vida-motion="reduce"]')
        }
      }
    }
    expect(animated).toBeGreaterThan(5)
  })

  it.each(files)('%s emits reduced motion only through reducedMotionCss', (f) => {
    expect(readFileSync(join(SRC, f), 'utf8')).not.toContain('prefers-reduced-motion')
  })
})
