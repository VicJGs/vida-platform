#!/usr/bin/env node
// P6 · Frontend track reorg — deterministic local task-file reshape (backend-replan campaign, ADR-021 §3.6).
// Fail-loud. Node 24. Mirrors p5-reshape.mjs shape, one tier down (the ② UI track).
// Method: PLAN-p6-frontend-track.md (Approval 1 + Approval 2 SHIP, 2026-09-16).
// Data = decomposition-p6.md (24 fe-issues, 222 legs) + §5 edge map. Add-only edges (0 removals).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const T = path.join(ROOT, '.claude', 'tasks');
const die = (m) => { console.error('FAIL: ' + m); process.exit(1); };
const rd = (p) => fs.readFileSync(p, 'utf8');
const wr = (p, s) => fs.writeFileSync(p, s);
const has = (slug) => fs.existsSync(path.join(T, slug + '.md'));
// An edge endpoint is VALID if it resolves to a real tracker entity: an active task file, an archived
// task file (DONE issues live in archive/), or a map issue key. The sync resolves blocker ids from the
// map (tracker_sync.py:529), so archived/done slugs like ui-2-platform-views are legitimate blockers.
const MAP = JSON.parse(rd(path.join(T, '.tracker-map.json')));
const resolvable = (slug) =>
  has(slug) ||
  fs.existsSync(path.join(T, 'archive', slug + '.md')) ||
  Boolean((MAP.issues || {})[slug]);

const MS = {
  m121: 'M1.2.1 — Hub & Foundation · Frontend',
  m122: 'M1.2.2 — Feature Modules · Frontend',
  m123: 'M1.2.3 — Depth & Recovered · Frontend',
};
const PROFILE = 'Add Frontend Component';
const PROJECT = 'M1 — Whole Manual OS';
const SRC = '# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan';
const LABEL_NOTE = '# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).';

// ---- The 24 frontend issues: {milestone, legs, blockedBy, goal} (decomposition-p6.md + PLAN §3/§5) ----
// Per-module fe-issue: blocked by its backend twin (BR-4, consumer-pull). 2 thin cross-cutting: special edges (§5.5).
const MOD_TWINS = [
  // M1.2.1 (mirror M1.1.1 twins)
  ['fe-preferences',        MS.m121, 9,  'preferences'],
  ['fe-sessions',           MS.m121, 5,  'sessions'],
  ['fe-journals',           MS.m121, 8,  'journals'],
  ['fe-notes-and-pages',    MS.m121, 13, 'notes & pages'],
  ['fe-check-ins',          MS.m121, 10, 'check-ins'],
  // M1.2.2 (mirror M1.1.2 twins)
  ['fe-finance',            MS.m122, 29, 'finance'],
  ['fe-gamification',       MS.m122, 7,  'gamification'],
  ['fe-habits',             MS.m122, 8,  'habits'],
  ['fe-knowledge',          MS.m122, 5,  'knowledge'],
  ['fe-books',              MS.m122, 32, 'books'],
  ['fe-learning-education', MS.m122, 6,  'learning / education'],
  ['fe-notifications',      MS.m122, 2,  'notifications'],
  ['fe-projects',           MS.m122, 3,  'projects'],
  ['fe-purposes-and-goals', MS.m122, 2,  'purposes & goals'],
  ['fe-relationships',      MS.m122, 3,  'relationships'],
  ['fe-routines',           MS.m122, 7,  'routines'],
  ['fe-tasks',              MS.m122, 11, 'tasks'],
  // M1.2.3 (mirror M1.1.3 twins)
  ['fe-health-core',        MS.m123, 12, 'health: core'],
  ['fe-health-nutrition',   MS.m123, 2,  'health: nutrition'],
  ['fe-health-training',    MS.m123, 9,  'health: training'],
  ['fe-languages',          MS.m123, 2,  'languages'],
  ['fe-skills',             MS.m123, 18, 'skills'],
];

// The 2 thin cross-cutting VISIBLE issues (BR-5) — no single mod twin (§5.5).
const THIN = {
  'fe-shell-integration-wiring': {
    ms: MS.m121, legs: 11,
    // built M1.0 UI it wires (provenance) + DB-8 for the live-search leg only (GAP-1; live FTS5 defers to M1.4).
    blockedBy: ['ui-2-platform-views', 'ui-3-vida-editor', 'ui-4-app-shell-components', 'ux-2-command-bar-search', 'db-8-fts5-search'],
    goal: 'Thin VISIBLE shell-integration issue (RIDE bucket, 11 legs) — wire the already-built M1.0 UI (⌘K search · export dialog · MD/PDF/DOCX serializers · neural-graph · Spaces add-menu · view degradation) to its finished provider seam, all terminal states rendered. Done-when = seam wired + states correct; the ⌘K search legs (BSE-14/15/16) render `search-unavailable` now — live FTS5 ranked results complete via DB-8/M1.4. Per-slice blocking Visual Gate.',
  },
  'fe-integrations-ai-surfaces': {
    ms: MS.m122, legs: 8,
    blockedBy: ['xs-ai', 'xs-capability', 'xs-egress-guard', 'xs-ingestion'],
    goal: 'Thin VISIBLE cross-module config-face issue (integrations/AI cluster, 8 legs) — the net-new UI faces no single feature module owns: ingestion consent gate · egress audit-trail · import reconcile/review · Preferences integrations page · AI mode-choice · outgoing-context review · AI management page · grant/consent prompt. Rides the finished M1.1.2 twins (XS-ingestion/egress-guard/ai/capability). UI config faces only — no service logic (BR-2). Per-slice blocking Visual Gate.',
  },
};

const deps = (list) => (list.slice().sort().map((s) => '- blocked by `' + s + '`').join('\n')) || '- (none)';

function feModuleGoal(legs, label) {
  return '② Frontend build (add-frontend-component) for ' + label + ' — the UI/UX tier over the finished ① service '
    + '(`mod-' + '<twin>' + '`), ' + legs + ' UI legs. Consumer-pull: rides its backend twin\'s wave 1:1. '
    + 'Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).';
}

function newFile(slug, { ms, legs, blockedBy, goal }) {
  if (has(slug)) die('CREATE: ' + slug + ' already exists (unexpected — P6 is first frontend projectization)');
  const c = [
    '# Task: ' + slug,
    '# Status: planned',
    '# Profile: ' + PROFILE,
    '# Scenario: default',
    '# Project: ' + PROJECT,
    '# Milestone: ' + ms,
    SRC,
    LABEL_NOTE,
    '',
    '## Goal',
    goal,
    '',
    '## Dependencies',
    deps(blockedBy),
    '',
  ].join('\n');
  wr(path.join(T, slug + '.md'), c);
}

// ---------------- EXECUTE ----------------
const created = [];

// 1. CREATE 22 per-module fe-issues (each ← its mod twin)
for (const [slug, ms, legs, label] of MOD_TWINS) {
  const twin = 'mod-' + slug.slice(3); // fe-<module> → mod-<module>
  if (!has(twin)) die('twin missing for ' + slug + ' → ' + twin);
  newFile(slug, { ms, legs, blockedBy: [twin], goal: feModuleGoal(legs, label).replace('<twin>', slug.slice(3)) });
  created.push(slug);
}

// 2. CREATE 2 thin cross-cutting fe-issues (special edges §5.5)
for (const [slug, spec] of Object.entries(THIN)) {
  newFile(slug, spec);
  created.push(slug);
}

const FE24 = created.slice().sort();
if (FE24.length !== 24) die('expected 24 fe-issues, created ' + FE24.length);

// 3. RESHAPE hard-4-polish — ADD all 24 fe-issues to blocked-by (BR-6; M1 done needs frontend). Add-only: preserve existing.
{
  const p = path.join(T, 'hard-4-polish.md');
  if (!fs.existsSync(p)) die('hard-4-polish.md missing');
  const txt = rd(p);
  const head = txt.split('\n## Dependencies')[0];
  // gather existing blocked-by slugs
  const existing = [];
  for (const line of txt.split('\n')) {
    const mtch = line.match(/blocked by `([^`]+)`/);
    if (mtch) existing.push(mtch[1]);
  }
  const merged = Array.from(new Set([...existing, ...FE24])).sort();
  wr(p, head.replace(/\n+$/, '') + '\n\n## Dependencies\n' + deps(merged) + '\n');
  if (merged.length !== existing.length + 24) {
    // some fe slug already present? (shouldn't be) — fail loud
    die('hard-4 merge unexpected: existing=' + existing.length + ' merged=' + merged.length);
  }
}

// 4. FAIL-LOUD assertions
// 4a. all 24 fe files exist with the right milestone
const wantMs = {};
for (const [slug, ms] of MOD_TWINS) wantMs[slug] = ms;
for (const [slug, spec] of Object.entries(THIN)) wantMs[slug] = spec.ms;
const perMs = { [MS.m121]: 0, [MS.m122]: 0, [MS.m123]: 0 };
for (const slug of FE24) {
  const txt = rd(path.join(T, slug + '.md'));
  const mm = txt.match(/^# Milestone:\s*(.+)$/m);
  if (!mm || mm[1] !== wantMs[slug]) die('milestone mismatch on ' + slug + ': ' + (mm ? mm[1] : 'NONE'));
  if (!/^# Profile:\s*Add Frontend Component$/m.test(txt)) die('profile mismatch on ' + slug);
  perMs[wantMs[slug]]++;
}
if (perMs[MS.m121] !== 6) die('M1.2.1 count ' + perMs[MS.m121] + ' ≠ 6');
if (perMs[MS.m122] !== 13) die('M1.2.2 count ' + perMs[MS.m122] + ' ≠ 13');
if (perMs[MS.m123] !== 5) die('M1.2.3 count ' + perMs[MS.m123] + ' ≠ 5');

// 4b. every blocked-by endpoint resolves to an existing task file (no dangling)
const allEdges = [];
for (const slug of FE24) {
  const txt = rd(path.join(T, slug + '.md'));
  for (const line of txt.split('\n')) {
    const mtch = line.match(/blocked by `([^`]+)`/);
    if (mtch) { allEdges.push([slug, mtch[1]]); if (!resolvable(mtch[1])) die('DANGLING edge ' + slug + ' ← ' + mtch[1]); }
  }
}
// hard-4 edges resolve too
for (const line of rd(path.join(T, 'hard-4-polish.md')).split('\n')) {
  const mtch = line.match(/blocked by `([^`]+)`/);
  if (mtch && !resolvable(mtch[1])) die('DANGLING hard-4 edge ← ' + mtch[1]);
}

// 4c. build-graph acyclicity over the fe layer (fe issues only point DOWN to done/backend/built — no fe←fe cycle)
//     fe issues never block each other, so the fe subgraph is trivially acyclic; assert no fe-slug appears as a fe blocker.
for (const [slug, blk] of allEdges) {
  if (blk.startsWith('fe-')) die('unexpected fe←fe edge ' + slug + ' ← ' + blk + ' (breaks the flat ② layer)');
}

console.log('OK — 24 fe-issues created (M1.2.1=6, M1.2.2=13, M1.2.3=5); hard-4 ← 24 fe (BR-6); 0 dangling; 0 fe←fe cycle.');
console.log('   edges: 22 module fe ← mod twin · fe-shell ← 5 built-UI+DB-8 · fe-integrations ← 4 XS · hard-4 ← all 24.');
