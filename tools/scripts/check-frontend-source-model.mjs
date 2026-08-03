#!/usr/bin/env node
// Enforces the frontend source-of-truth inheritance rule
// (docs/specs/foundation/frontend-source-of-truth.md, Step 5): every DS-3/4/5 + UI-* frontend spec MUST open with a
// "## 0. Source model" pointer, so it cannot silently drift from the code-first / Figma-later direction. Fail-loud —
// mirrors DS-1's B2 "enforce by construction, not by review convention" doctrine (token-pipeline B2).
//
// Scope: ds-2…ds-5 + ui-* spec dirs (ds-2 is the positive control — it already carries §0). UX specs are NOT
// mechanically gated (they don't define token/component source, and ux-1 predates the direction).
// Run:  pnpm check:frontend-source-model   (or node tools/scripts/check-frontend-source-model.mjs)

import { readdirSync, readFileSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SPECS = join(ROOT, 'docs', 'specs')
const GOVERNED = /^(ds-[2-5]|ui-)/ // units that must inherit the source model
const HEADING = /^##\s*0\.\s*Source model/m // the required §0 heading

const indexes = readdirSync(SPECS, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile() && e.name === '_index.md')
  .map((e) => join(e.parentPath ?? e.path, e.name))
  .filter((p) => GOVERNED.test(basename(dirname(p))))

const offenders = indexes.filter((p) => !HEADING.test(readFileSync(p, 'utf8')))

if (offenders.length) {
  console.error(`✗ frontend source-of-truth: ${offenders.length} spec(s) missing a "## 0. Source model" pointer:`)
  for (const p of offenders) console.error(`  - ${p.replace(`${ROOT}/`, '')}`)
  console.error('  Fix: open each with a §0 pointer to docs/specs/foundation/frontend-source-of-truth.md')
  process.exit(1)
}
console.log(`✓ frontend source-of-truth: ${indexes.length} governed spec(s) carry §0.`)
