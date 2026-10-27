// @vitest-environment jsdom
// preferences-rescope R3 (PLAN-R3 R3-BR-4; IMPL-PLAN-R3 step 8) — the inline <script id="vida-theme-hint"> in index.html
// paints the persisted theme's colours onto <html> BEFORE React (IR-4: no white first frame). Extracted from the real
// index.html and run in jsdom, so the shipped script — not a copy — is what's tested.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_HINT_KEY } from './preferences/theme-hint'

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')
const match = /<script id="vida-theme-hint">([\s\S]*?)<\/script>/.exec(html)
const script = match?.[1] ?? ''
// running the shipped inline script verbatim is the point
const run = () => new Function(script)()
const style = () => document.documentElement.style

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('style')
})

describe('index.html theme-hint script', () => {
  it('exists in <head>, after the process shim and before the module script', () => {
    expect(script).not.toBe('')
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toContain('id="vida-theme-hint"')
    expect(head.indexOf('window.process')).toBeLessThan(head.indexOf('id="vida-theme-hint"'))
  })

  it('reads the same storage key as the app writes (the duplicated string cannot drift)', () => {
    expect(script).toContain(`'${THEME_HINT_KEY}'`)
  })

  it('a valid hint paints background, color and color-scheme', () => {
    localStorage.setItem(THEME_HINT_KEY, JSON.stringify({ scheme: 'dark', bg: '#1A1A19', fg: '#FBFBFA' }))
    run()
    expect(style().backgroundColor).toBe('rgb(26, 26, 25)') // jsdom normalizes hex → rgb
    expect(style().color).toBe('rgb(251, 251, 250)')
    expect(style().colorScheme).toBe('dark')
  })

  it.each([
    ['missing', null],
    ['corrupt JSON', '{nope'],
    ['an object colour (the Variable-stringify bug)', JSON.stringify({ scheme: 'dark', bg: {}, fg: '#FFFFFF' })],
    ['a non-hex colour', JSON.stringify({ scheme: 'dark', bg: 'red', fg: '#FFFFFF' })],
    ['a bad scheme', JSON.stringify({ scheme: 'system', bg: '#000000', fg: '#FFFFFF' })],
  ])('%s → paints nothing and never throws', (_name, raw) => {
    if (raw !== null) localStorage.setItem(THEME_HINT_KEY, raw)
    expect(run).not.toThrow()
    expect(document.documentElement.getAttribute('style') ?? '').toBe('')
  })
})
