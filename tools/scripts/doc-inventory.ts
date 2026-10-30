#!/usr/bin/env node
// Docs reshape 0.2 (LIF-291): one row per tracked .md file, the input to the per-folder keep / distill / archive
// decisions (0.3). Columns: path, bytes, last commit (short hash + date), kind guess. The kind is a path heuristic,
// first rule wins; it is a starting point for review, not a classification anyone relies on.
// Fails when there is nothing to inventory or the clone is shallow; staged, never-committed files show "uncommitted".
// Run:  pnpm docs:inventory   (or node tools/scripts/doc-inventory.ts; Node 22.18+ strips the types)

import { execFileSync } from 'node:child_process'
import { statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'inventory.csv')

const KINDS: Array<[kind: string, test: RegExp]> = [
  ['archive', /^(docs\/_archive|docs\/_legacy|\.claude\/archive)\//],
  ['adr', /^(docs\/core\/decisions|\.adr)\/|\/adr-revisions\//],
  ['agent', /(^|\/)(CLAUDE|AGENTS|SKILL)\.md$|^\.claude\//],
  ['plan', /^docs\/(intake|roadmap|reviews)\/|(^|\/)(IMPL-)?PLAN\.md$|(^|\/)slice-map\.md$/],
  ['spec', /^docs\/specs\//],
  ['rules', /business-rules\.md$/],
  ['feature', /^docs\/(features|modules)\//],
  ['readme', /(^|\/)(README|REPO|CHANGELOG|CONTRIBUTING)\.md$/],
  ['code-doc', /^(apps|packages|tools)\//],
  ['reference', /^docs\//],
]

const git = (...args: string[]) =>
  execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })

const files = git('ls-files', '*.md').split('\n').filter(Boolean)
if (!files.length) {
  console.error('✗ doc inventory: git ls-files found no .md files; nothing was inventoried.')
  process.exit(1)
}
// In a shallow clone the oldest fetched commit names every file, so last commits would be silently wrong.
if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('✗ doc inventory: shallow clone; last commits need full history (CI: fetch-depth: 0).')
  process.exit(1)
}

// One pass over history, newest first: the first commit that names a path is its last commit.
const wanted = new Set(files)
const last = new Map<string, string>()
let commit = ''
for (const line of git('log', '--format=%x01%h %cs', '--name-only', '--', '*.md').split('\n')) {
  if (line.startsWith('\x01')) commit = line.slice(1)
  else if (line && wanted.has(line) && !last.has(line)) last.set(line, commit)
}

const csv = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const rows = files.map((path) => {
  const [hash, date = ''] = (last.get(path) ?? 'uncommitted').split(' ')
  const kind = KINDS.find(([, test]) => test.test(path))?.[0] ?? 'other'
  return [path, statSync(join(ROOT, path)).size, hash, date, kind]
})

writeFileSync(
  OUT,
  [['path', 'bytes', 'last_commit', 'last_commit_date', 'kind_guess'], ...rows]
    .map((r) => r.map(csv).join(','))
    .join('\n') + '\n',
)

const byKind = Object.entries(Object.groupBy(rows, (r) => String(r[4])))
  .map(([k, v]) => `${k} ${v?.length}`)
  .join(', ')
console.log(`✓ doc inventory: ${rows.length} tracked .md file(s) → ${basename(OUT)} (${byKind})`)
