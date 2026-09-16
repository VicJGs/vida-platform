#!/usr/bin/env node
// P5 · Linear reorg — deterministic local task-file reshape (backend-replan campaign, ADR-021 §5).
// Fail-loud. Node 24. Operates AFTER the 5 `git mv` renames. Idempotent-ish (re-run overwrites the same target).
// Method: PLAN-p5-linear-reorg.md (Approval 1 SHIP). Data = decomposition.md build-deps (blocked-by = build-deps only,
// NOT runtime read-seams). Milestone homes = §4 (first-consumer pull + transitive closure).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const T = path.join(ROOT, '.claude', 'tasks');
const die = (m) => { console.error('FAIL: ' + m); process.exit(1); };
const rd = (p) => fs.readFileSync(p, 'utf8');
const wr = (p, s) => fs.writeFileSync(p, s);
const exists = (slug) => fs.existsSync(path.join(T, slug + '.md'));

const MS = {
  m11: 'M1.1 — Hub & Foundation Modules',
  m12: 'M1.2 — Feature Modules',
  m13: 'M1.3 — Depth & Recovered Modules',
  m20: 'M2.0 — Integrations & Boundary',
};
const SRC = '# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan';

// ---- build-deps (blocked-by) for all 33 issues, by NEW slug (from decomposition.md) ----
const BLOCKED = {
  // XS (11)
  'xs-ai': ['xs-egress-guard', 'xs-ingestion'],
  'xs-backlinks-search-export': [],
  'xs-capability': [],
  'xs-effect-rail': [],
  'xs-egress-guard': [],
  'xs-ingestion': [],
  'xs-measurement-engine': ['xs-effect-rail'],
  'xs-notifications-delivery': [],
  'xs-spaces-tags-links': [],
  'xs-templates': ['xs-capability', 'xs-spaces-tags-links', 'xs-views'],
  'xs-views': [],
  // MOD (22)
  'mod-books': ['mod-journals', 'mod-knowledge', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-ingestion', 'xs-measurement-engine', 'xs-spaces-tags-links'],
  'mod-check-ins': ['mod-journals', 'mod-notes-and-pages', 'xs-effect-rail'],
  'mod-finance': ['mod-journals', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-backlinks-search-export', 'xs-effect-rail', 'xs-egress-guard', 'xs-ingestion', 'xs-measurement-engine', 'xs-notifications-delivery', 'xs-spaces-tags-links'],
  'mod-gamification': ['mod-journals', 'xs-capability', 'xs-effect-rail', 'xs-measurement-engine', 'xs-notifications-delivery', 'xs-views'],
  'mod-habits': ['mod-notes-and-pages', 'xs-effect-rail', 'xs-measurement-engine', 'xs-notifications-delivery', 'xs-spaces-tags-links'],
  'mod-health-core': ['mod-journals', 'mod-knowledge', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-backlinks-search-export', 'xs-effect-rail', 'xs-egress-guard', 'xs-ingestion', 'xs-measurement-engine', 'xs-notifications-delivery', 'xs-spaces-tags-links'],
  'mod-health-nutrition': ['mod-journals', 'mod-sessions', 'xs-ai', 'xs-egress-guard', 'xs-ingestion', 'xs-notifications-delivery', 'xs-spaces-tags-links'],
  'mod-health-training': ['mod-sessions', 'xs-ai', 'xs-capability', 'xs-effect-rail', 'xs-ingestion', 'xs-measurement-engine', 'xs-notifications-delivery'],
  'mod-journals': ['mod-sessions', 'xs-measurement-engine'],
  'mod-knowledge': ['mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-backlinks-search-export', 'xs-capability', 'xs-effect-rail', 'xs-ingestion', 'xs-measurement-engine', 'xs-spaces-tags-links'],
  'mod-languages': ['mod-journals', 'mod-knowledge', 'mod-notes-and-pages', 'mod-sessions', 'xs-ingestion', 'xs-measurement-engine', 'xs-spaces-tags-links', 'xs-templates', 'xs-views'],
  'mod-learning-education': ['mod-journals', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-backlinks-search-export', 'xs-ingestion', 'xs-measurement-engine', 'xs-spaces-tags-links'],
  'mod-notes-and-pages': ['mod-journals', 'xs-spaces-tags-links', 'xs-templates', 'xs-views'],
  'mod-notifications': ['mod-sessions', 'xs-effect-rail', 'xs-notifications-delivery'],
  'mod-preferences': [],
  'mod-projects': ['mod-journals', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-effect-rail', 'xs-ingestion', 'xs-measurement-engine', 'xs-spaces-tags-links'],
  'mod-purposes-and-goals': ['mod-journals', 'mod-notes-and-pages', 'mod-sessions', 'xs-effect-rail', 'xs-measurement-engine', 'xs-spaces-tags-links', 'xs-views'],
  'mod-relationships': ['mod-journals', 'mod-notes-and-pages', 'mod-sessions', 'xs-ingestion', 'xs-notifications-delivery', 'xs-spaces-tags-links', 'xs-views'],
  'mod-routines': ['mod-journals', 'mod-knowledge', 'mod-notes-and-pages', 'mod-sessions', 'xs-effect-rail', 'xs-measurement-engine', 'xs-spaces-tags-links', 'xs-views'],
  'mod-sessions': ['xs-effect-rail', 'xs-measurement-engine'],
  'mod-skills': ['mod-journals', 'mod-knowledge', 'mod-notes-and-pages', 'mod-sessions', 'xs-ai', 'xs-egress-guard', 'xs-ingestion', 'xs-measurement-engine', 'xs-notifications-delivery', 'xs-spaces-tags-links'],
  'mod-tasks': ['mod-notes-and-pages', 'mod-sessions', 'xs-backlinks-search-export', 'xs-effect-rail', 'xs-measurement-engine', 'xs-spaces-tags-links', 'xs-templates', 'xs-views'],
};
const MOD22 = Object.keys(BLOCKED).filter((s) => s.startsWith('mod-')).sort();
if (MOD22.length !== 22) die('expected 22 MOD, got ' + MOD22.length);

const HOME = { // milestone per issue (§4)
  'xs-spaces-tags-links': MS.m11, 'xs-views': MS.m11, 'xs-templates': MS.m11, 'xs-effect-rail': MS.m11,
  'xs-measurement-engine': MS.m11, 'xs-capability': MS.m11,
  'xs-ingestion': MS.m12, 'xs-ai': MS.m12, 'xs-egress-guard': MS.m12, 'xs-backlinks-search-export': MS.m12,
  'xs-notifications-delivery': MS.m12,
  'mod-health-nutrition': MS.m13, 'mod-health-training': MS.m13,
};

const GOAL_NEW = {
  'xs-ai': 'AI application services — model calls, prompt orchestration, structured extraction (XCU-17…27; ADR-014/020).',
  'xs-backlinks-search-export': 'Backlinks + search + export cross-cutting services (XCU-BSE-01…09,25).',
  'xs-capability': 'Capability registry + enforcement services (ADR-010; XCU-07, SP-28/29/32).',
  'xs-effect-rail': 'Effect rail — cross-module effect dispatch (sessions XCU-09/10/22, spaces SP-30).',
  'xs-egress-guard': 'Egress guard — external-out leak enforcement (XCU-06/08; ADR-015).',
  'xs-ingestion': 'Ingestion pipeline — external-in staging + normalize (XCU-01…16; ADR-014).',
  'xs-measurement-engine': 'Measurement engine — measurable + rollup derivation (measurement XCU-01…17, spaces SP-33).',
  'xs-notifications-delivery': 'Notifications delivery — dispatch / schedule / ZK-wake (notifications XCU-01…18).',
  'xs-spaces-tags-links': 'Spaces / tags / entity-links service (XCU-SP-27).',
  'xs-templates': 'Templates engine — session/preset templates (XCU-SP-31, templates XCU-01…13).',
  'xs-views': 'Views engine — saved views / layouts across modules (XCU-SP-34, views XCU-01…22).',
  'mod-health-nutrition': 'Health: Nutrition — meals, plans, nutrition goals (the fuel pillar; health split).',
  'mod-health-training': 'Health: Training — exercises, plans, workout sessions (the exercise pillar; health split).',
};

const deps = (list) => list.slice().sort().map((s) => '- blocked by `' + s + '`').join('\n') || '- (none)';

function newFile(slug) {
  const c = [
    '# Task: ' + slug,
    '# Status: planned',
    '# Profile: Add Backend Component',
    '# Project: M1 — Whole Manual OS',
    '# Milestone: ' + HOME[slug],
    SRC,
    '',
    '## Goal',
    GOAL_NEW[slug],
    '',
    '## Dependencies',
    deps(BLOCKED[slug]),
    '',
  ].join('\n');
  wr(path.join(T, slug + '.md'), c);
}

// rewrite an EXISTING file: set # Task, ensure # Milestone, regenerate ## Dependencies; preserve # Linear/# Status/# Goal.
function reshape(slug, { blockedBy, status, note } = {}) {
  const p = path.join(T, slug + '.md');
  if (!fs.existsSync(p)) die('reshape: missing ' + slug);
  let head = rd(p).split('\n## Dependencies')[0]; // everything before Dependencies (headers + Goal)
  head = head.replace(/^# Task:.*$/m, '# Task: ' + slug);
  if (HOME[slug]) head = head.replace(/^# Milestone:.*$/m, '# Milestone: ' + HOME[slug]);
  if (status) head = head.replace(/^# Status:.*$/m, '# Status: ' + status);
  if (note && !head.includes(note)) {
    head = head.replace(/(^# Source:.*$)/m, '$1\n# Note: ' + note);
  }
  const bl = blockedBy !== undefined ? blockedBy : (BLOCKED[slug] || []);
  wr(p, head.replace(/\n+$/, '') + '\n\n## Dependencies\n' + deps(bl) + '\n');
}

function retire(slug, foldTarget) {
  const p = path.join(T, slug + '.md');
  if (!fs.existsSync(p)) die('retire: missing ' + slug);
  let head = rd(p).split('\n## Dependencies')[0];
  head = head.replace(/^# Status:.*$/m, '# Status: canceled');
  const note = '# Retired: folded into ' + foldTarget + ' (P5 backend-replan, 2026-09-15)';
  if (!head.includes('# Retired:')) head = head.replace(/(^# Source:.*$)/m, '$1\n' + note);
  wr(p, head.replace(/\n+$/, '') + '\n\n## Dependencies\n- (retired — folded into ' + foldTarget + ')\n');
}

// ---------------- EXECUTE ----------------
// 1. CREATE 13
['xs-ai','xs-backlinks-search-export','xs-capability','xs-effect-rail','xs-egress-guard','xs-ingestion',
 'xs-measurement-engine','xs-notifications-delivery','xs-spaces-tags-links','xs-templates','xs-views',
 'mod-health-nutrition','mod-health-training'].forEach((s) => {
  if (exists(s)) die('CREATE: ' + s + ' already exists (unexpected)');
  newFile(s);
});

// 2. RESHAPE 20 (5 renamed already git-mv'd; 15 keep-name). notes-and-pages → planned + reshape note.
reshape('mod-notes-and-pages', { status: 'planned', note: 'reshaped from mod-notes (LIF-131); prior ①/② torn down (eaf64f8); re-planned under P3 decomposition — reports reshape, not Done.' });
['mod-check-ins','mod-learning-education','mod-purposes-and-goals','mod-health-core',
 'mod-books','mod-finance','mod-gamification','mod-habits','mod-journals','mod-knowledge','mod-languages',
 'mod-notifications','mod-preferences','mod-projects','mod-relationships','mod-routines','mod-sessions',
 'mod-skills','mod-tasks'].forEach((s) => reshape(s));

// 3. RETIRE 6
retire('mod-spaces', 'xs-spaces-tags-links');
retire('mod-fiscal-legal', 'mod-finance');
retire('mod-finance-commitments', 'mod-finance');
retire('mod-bucket-list', 'mod-purposes-and-goals');
retire('mod-duties', '(dissolved — ADR-006 worked-example)');
retire('mod-projects-investigations', 'mod-projects');

// 4. PARK 1 (KNO-46)
{
  const slug = 'xmod-cross-module-rules-adr';
  const c = [
    '# Task: ' + slug, '# Status: backlog', '# Profile: Add Backend Component',
    '# Project: M2 — External Integrations & Security Boundary', '# Milestone: ' + MS.m20,
    SRC, '# Note: KNO-46 — undesigned surface, no owning ADR (corpus.md:477); tracked-only backlog, awaits M2+ design pass (Victor-ack P4).',
    '', '## Goal',
    'OS-level cross-module automation/rules surface (KNO-46). No owning ADR; not yet designed. Parked as an explicit M2+ undesigned backlog item so the honestly-homed-but-untargeted intent is tracked, not lost. NOT a P3 re-entry.',
    '', '## Dependencies', '- (none — undesigned)', '',
  ].join('\n');
  wr(path.join(T, slug + '.md'), c);
}

// 5. EDGES — aggregators (g1-N2) → 22 MOD (+ preserved non-MOD deps); hard-2 rename; p3 fan-out (§6.4)
reshape('hard-1-summary-registry', { blockedBy: MOD22 });
reshape('db-10-seed-and-fixtures', { blockedBy: ['db-6-repository-layer','db-7-migrations-runner','db-9-enums-zod', ...MOD22] });
reshape('db-11-adr-002-reconciliation', { blockedBy: ['db-1-schema-primitives', ...MOD22] });
reshape('mig-1-v1-retire', { blockedBy: ['db-1-schema-primitives', ...MOD22] });
reshape('db-5-encryption-boundary-map', { blockedBy: ['ar-3-crypto-vault-keymgmt', ...MOD22] });
reshape('hard-2-rollups', { blockedBy: ['ar-7-capability-registry','mod-gamification','mod-purposes-and-goals'],
  note: 'P5 gate-2 flag: may also need xs-measurement-engine (rollups engine) — deferred to gate-2 decision, not silently added.' });
// §6.4 downstream slug-rename fan-out for out-of-scope M2 consumers
for (const [slug, oldS, newS] of [['p3-3-integrations-health-wearables','mod-health','mod-health-core'],
                                   ['p3-6-calendar-extraction','mod-learning','mod-learning-education']]) {
  const p = path.join(T, slug + '.md');
  if (!fs.existsSync(p)) die('§6.4: missing ' + slug);
  const before = rd(p);
  const after = before.replace(new RegExp('`' + oldS + '`', 'g'), '`' + newS + '`');
  if (after === before) die('§6.4: no `' + oldS + '` reference found in ' + slug);
  wr(p, after);
}

// 6. .tracker-map.json — rename the 5 issue keys (id preserves Linear identity)
{
  const mp = path.join(T, '.tracker-map.json');
  const m = JSON.parse(rd(mp));
  const renames = { 'mod-notes':'mod-notes-and-pages','mod-checkins':'mod-check-ins','mod-learning':'mod-learning-education','mod-purposes':'mod-purposes-and-goals','mod-health':'mod-health-core' };
  for (const [oldK, newK] of Object.entries(renames)) {
    if (!m.issues[oldK]) die('map: missing issue key ' + oldK);
    m.issues[newK] = m.issues[oldK];
    if (m.issues[newK].url) m.issues[newK].url = m.issues[newK].url.replace(oldK, newK);
    delete m.issues[oldK];
  }
  wr(mp, JSON.stringify(m, null, 2) + '\n');
}

// 7. FAIL-LOUD assertions
const active = fs.readdirSync(T).filter((f) => f.endsWith('.md') && (f.startsWith('xs-') || f.startsWith('mod-')))
  .map((f) => f.replace('.md',''));
const activeNonRetired = active.filter((s) => !rd(path.join(T, s + '.md')).includes('# Status: canceled'));
const want = new Set(Object.keys(BLOCKED));
for (const s of want) if (!activeNonRetired.includes(s)) die('missing active issue ' + s);
const extra = activeNonRetired.filter((s) => !want.has(s));
if (extra.length) die('unexpected active non-retired issues: ' + extra.join(', '));
if (activeNonRetired.length !== 33) die('expected 33 active, got ' + activeNonRetired.length + ': ' + activeNonRetired.sort().join(','));
// no dangling old slugs anywhere in blocked-by
const OLD = ['mod-notes','mod-checkins','mod-learning','mod-purposes','mod-health','mod-spaces','mod-fiscal-legal','mod-finance-commitments','mod-bucket-list','mod-duties','mod-projects-investigations'];
for (const f of fs.readdirSync(T).filter((f) => f.endsWith('.md'))) {
  const txt = rd(path.join(T, f));
  for (const o of OLD) {
    const re = new RegExp('blocked by `' + o + '`');
    if (re.test(txt)) die('DANGLING old slug `' + o + '` in blocked-by of ' + f);
  }
}
console.log('OK — 33 active (11 XS + 22 MOD), 6 retired, 1 parked, edges remapped, map keys renamed, 0 dangling old slugs.');
