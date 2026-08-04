#!/usr/bin/env node
// Frontend Visual Gate — stage 3 render for DESIGN TOKENS (docs/specs/foundation/frontend-visual-gate.md).
// Parses the GENERATED packages/ui/src/themes/variables.css, resolves var() chains to literals, categorizes tokens
// by path-prefix, and emits a self-contained preview.html gallery (swatches / type / spacing / radius / shadow) so
// Victor can VISUALLY approve the look — the same code that ships is what he sees (code-first source of truth).
//
// Run:  pnpm preview:tokens   →   open packages/ui/src/themes/preview.html
// Deterministic: tokens sorted by name; no timestamps.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const THEMES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'packages', 'ui', 'src', 'themes')
const CSS = join(THEMES, 'variables.css')
const OUT = join(THEMES, 'preview.html')

// ── parse `--name: value;` from :root ────────────────────────────────────────────────────────────────
const raw = new Map()
for (const line of readFileSync(CSS, 'utf8').split('\n')) {
  const m = line.match(/^\s*--([\w-]+):\s*(.+?);\s*$/)
  if (m) raw.set(m[1], m[2].trim())
}

// resolve var(--x) chains to a literal (cycle-guarded)
function resolve(val, seen = new Set()) {
  const m = val.match(/^var\(--([\w-]+)\)$/)
  if (!m) return val
  if (seen.has(m[1]) || !raw.has(m[1])) return val
  seen.add(m[1])
  return resolve(raw.get(m[1]), seen)
}

const isColor = (v) => /^#([0-9a-f]{3,8})$/i.test(v) || /^(rgb|hsl)a?\(/i.test(v)
const isNumber = (v) => /^-?\d+(\.\d+)?$/.test(v)
const isShadow = (v) => /\d+px|rgba?\(|,/.test(v) && !isColor(v)

// dark overlay → resolve each override to a primitive literal, keyed by css-var name, so the preview toggles REAL dark values
const darkMap = new Map()
try {
  const overlay = JSON.parse(readFileSync(join(THEMES, 'tokens', 'semantic.dark.json'), 'utf8'))
  const walk = (node, path) => {
    if (node && typeof node === 'object' && 'value' in node && typeof node.value === 'string') {
      const prim = node.value.replace(/^\{|\}$/g, '').split('.').join('-')
      darkMap.set(path.join('-'), resolve(`var(--${prim})`))
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) if (k !== '_note') walk(node[k], [...path, k])
    }
  }
  walk(overlay, [])
} catch {
  /* no overlay yet */
}

// ── group tokens by path-prefix (color/space/size/radius/zIndex/font*/shadow/component) ───────────────
const groups = new Map()
for (const [name, val] of [...raw].sort(([a], [b]) => a.localeCompare(b))) {
  const cat = name.split('-')[0]
  if (!groups.has(cat)) groups.set(cat, [])
  groups.get(cat).push({ name, val, resolved: resolve(val) })
}

// ── render one token as a labelled visual sample ──────────────────────────────────────────────────────
function sample({ name, val, resolved }, cat) {
  const chain = val !== resolved ? `<code class="chain">${val} → ${resolved}</code>` : `<code>${resolved}</code>`
  let visual
  if (isColor(resolved)) {
    const dl = darkMap.get(name)
    visual = `<div class="sw" style="background:${resolved}" data-light="${resolved}"${dl ? ` data-dark="${dl}"` : ''}></div>`
  }
  else if (cat === 'radius' && isNumber(resolved)) visual = `<div class="box" style="border-radius:${resolved}px"></div>`
  else if ((cat === 'space' || cat === 'size') && isNumber(resolved)) visual = `<div class="dim" style="width:${resolved}px;height:${resolved}px"></div><span class="px">${resolved}px</span>`
  else if (cat === 'fontSize') visual = `<span style="font-size:${resolved}px;line-height:1.1">Aa ${resolved}</span>`
  else if (cat === 'fontFamily') visual = `<span style="font-family:${resolved};font-size:18px">Aa Vida</span>`
  else if (cat === 'fontWeight') visual = `<span style="font-weight:${resolved};font-size:18px">Aa ${resolved}</span>`
  else if (cat === 'lineHeight') visual = `<span class="mono">× ${resolved}</span>`
  else if (cat === 'letterSpacing') visual = `<span class="mono">${resolved}em</span>`
  // DS-3 motion — animated demos (transform+opacity only, the motion.md §IX safe list; honor reduced-motion via CSS).
  // Keyed on `cat` and placed BEFORE the shadow branch: cubic-bezier values contain commas → isShadow() would else
  // capture out/in/inOut. duration section = same easing, varying speed; easing section = same duration, varying curve.
  else if (cat === 'duration' && isNumber(resolved)) visual = resolved === '0'
    ? `<div class="motion-demo motion-instant"></div><span class="px">0ms · instant (no tween)</span>` // 0 = immediate state change, not a loop (motion.md §IX reduced-motion path)
    : `<div class="motion-demo" style="animation-duration:${resolved}ms"></div><span class="px">${resolved}ms</span>`
  else if (cat === 'easing') visual = `<div class="motion-demo" style="animation-duration:600ms;animation-timing-function:${resolved}"></div>`
  else if (cat === 'shadow' || isShadow(resolved)) visual = `<div class="box" style="box-shadow:${resolved}"></div>`
  else visual = `<span class="mono">${resolved}</span>`
  return `<div class="tok"><div class="vis">${visual}</div><div class="meta"><code class="nm">--${name}</code>${chain}</div></div>`
}

const sections = [...groups.entries()]
  .map(([cat, toks]) => `<section><h2>${cat} <span class="cnt">${toks.length}</span></h2>
    <div class="grid">${toks.map((t) => sample(t, cat)).join('')}</div></section>`)
  .join('\n')

// DS-4 — composed theme surface: a mock UI card rendered from the RESOLVED semantic theme values, LIGHT next to
// DARK (the throwaway <Theme>-swap demo — proves the config's dark theme reads as a coherent surface, not a token grid).
const semLight = (n) => resolve(raw.get(n) ?? '')
const semDark = (n) => darkMap.get(n) ?? semLight(n)
const dim = (n, fb) => resolve(raw.get(n) ?? String(fb))
function surfaceCard(mode, get) {
  const bg = get('color-surface-primary'), bg2 = get('color-surface-secondary'), text = get('color-text-primary')
  const muted = get('color-text-muted'), brand = get('color-brand-emphasis'), border = get('color-border-default')
  const rad = dim('radius-control', 8), pad = dim('space-inset-default', 12)
  return `<div class="surface" style="background:${bg};color:${text};border:1px solid ${border};border-radius:${rad}px;padding:${pad}px">
    <span class="surface-label" style="border:1px solid ${border};color:${muted}">${mode}</span>
    <div style="font-size:20px;font-weight:600;margin:8px 0 6px">Vida — ${mode} surface</div>
    <div>Primary text on the surface.</div>
    <div style="color:${muted};margin-bottom:12px">Muted secondary text.</div>
    <button style="background:${brand};color:#fff;border:none;border-radius:${rad}px;padding:8px 16px;font:inherit;cursor:default">Brand button</button>
    <div style="background:${bg2};border:1px solid ${border};border-radius:${rad}px;padding:${pad}px;margin-top:12px">Secondary panel</div>
  </div>`
}
const themeSurfaces = `<section><h2>DS-4 — Theme surface <span class="cnt">light ｜ dark (resolved from the config)</span></h2>
  <div class="surfaces">${surfaceCard('light', semLight)}${surfaceCard('dark', semDark)}</div></section>`

const total = raw.size
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Vida — Token Preview (Frontend Visual Gate)</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font:14px/1.5 system-ui,sans-serif; background:#fff; color:#111; transition:.15s; }
  body.dark { background:#111827; color:#f3f4f6; }
  header { position:sticky; top:0; padding:16px 24px; background:inherit; border-bottom:1px solid #8883; display:flex; gap:16px; align-items:center; }
  h1 { font-size:16px; margin:0; }
  .sub { color:#8888; font-size:12px; }
  .warn { margin-left:auto; font-size:12px; color:#b45309; }
  button { font:inherit; padding:6px 12px; border:1px solid #8886; border-radius:6px; background:transparent; color:inherit; cursor:pointer; }
  section { padding:16px 24px; border-bottom:1px solid #8882; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:#8899; margin:0 0 12px; }
  .cnt { color:#8886; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; }
  .tok { border:1px solid #8883; border-radius:8px; padding:10px; display:flex; gap:10px; align-items:center; }
  .vis { flex:0 0 56px; display:flex; align-items:center; justify-content:center; height:56px; }
  .sw { width:48px; height:48px; border-radius:8px; border:1px solid #8884; }
  .box { width:48px; height:48px; background:#6366F1; }
  .dim { background:#6366F133; border:1px solid #6366F1; }
  .px { font-size:10px; color:#8899; margin-left:4px; }
  /* DS-3 motion demos — animate transform + opacity ONLY (motion.md §IX safe list) */
  @keyframes vida-move { from { transform:translateX(0); opacity:.35; } to { transform:translateX(28px); opacity:1; } }
  .motion-demo { width:20px; height:20px; border-radius:6px; background:#6366F1; animation:vida-move 400ms ease-in-out infinite alternate; }
  /* instant (0ms) = immediate, no tween — static at destination, never loops (that frantic flicker is what 0ms "animated" looks like) */
  .motion-instant { animation:none; transform:translateX(28px); opacity:1; }
  @media (prefers-reduced-motion: reduce) { .motion-demo { animation:none; transform:translateX(28px); opacity:1; } }
  /* DS-4 composed theme surfaces (light | dark, side by side) */
  .surfaces { display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:720px; }
  .surface { position:relative; }
  .surface-label { position:absolute; top:8px; right:8px; font-size:10px; text-transform:uppercase; letter-spacing:.05em; padding:2px 6px; border-radius:4px; }
  .meta { min-width:0; }
  .nm { display:block; font-size:11px; font-weight:600; word-break:break-all; }
  code { font-family:ui-monospace,monospace; font-size:11px; color:#8899; }
  .chain { color:#8896; }
</style></head>
<body>
<header>
  <h1>Vida Token Preview</h1>
  <span class="sub">${total} tokens · Frontend Visual Gate stage 3 · GENERATED from variables.css + semantic.dark.json</span>
  <span class="warn">${darkMap.size} dark overrides — toggle swaps semantic swatches to real dark values (design.md §XI parallel design)</span>
  <button id="toggle">Toggle light / dark</button>
</header>
${themeSurfaces}
${sections}
<script>
  document.getElementById('toggle').addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark')
    for (const el of document.querySelectorAll('.sw[data-dark]')) el.style.background = dark ? el.dataset.dark : el.dataset.light
  })
</script>
</body></html>
`

writeFileSync(OUT, html)
console.log(`✓ token preview → ${OUT.replace(`${join(THEMES, '..', '..', '..')}/`, '')} (${total} tokens, ${groups.size} categories)`)
