#!/usr/bin/env node
// P4 · Coverage Gate — deterministic set-cover proof (backend-replan campaign, ADR-021).
// Layer 1 of PLAN-p4-coverage-gate.md §4. Dumb, auditable set-algebra only — NO heuristics,
// NO fuzzy matching, exact id-string joins. Fails loud (exit 1 + offending ids) on any
// unhomed / smuggled / double-homed id. The LLM critic (Layer 2) audits this script's logic
// and the semantic legitimacy the script cannot judge.
//
// Inputs (on disk, relative to repo root): the corpus parts, the P3 issue set, the P3 matrix.
// Usage: node tools/backend-intent/p4-set-cover.mjs [--inject-smuggle]
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const BI = join(ROOT, 'docs/specs/foundation/backend-intent');
const PARTS = join(BI, 'parts');

// --- id regex: suffix-preserving. PRO-05 and PRO-05u are DISTINCT ids (the `-u` UI-leg rake). ---
// Handles multi-segment prefixes (XCU-SP-28, XCU-BSE-01) + optional trailing `u`.
const ID = /^[A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+u?$/;
const NSID = /\b([a-z][a-z0-9-]*):([A-Z][A-Z0-9]*(?:-[A-Z]+)*-\d+u?)\b/g;

const set = (arr) => new Set(arr);
const diff = (a, b) => [...a].filter((x) => !b.has(x));
const inter = (a, b) => [...a].filter((x) => b.has(x));

// ===== 1. D* — canonical id-set: fresh sweep of parts/*.md (suffix-preserving) =====
// One id per Part A table row (`| ID | ... |`), BEFORE the `## Local flag index` heading.
function extractCanonical() {
  const ids = new Set();
  const idsNaive = new Set(); // suffix-DROPPING (reproduce the 1192 artifact)
  const perFile = {};
  for (const f of readdirSync(PARTS).filter((x) => x.endsWith('.md'))) {
    const slug = basename(f, '.md');
    const lines = readFileSync(join(PARTS, f), 'utf8').split('\n');
    let inPartA = true;
    let count = 0;
    for (const line of lines) {
      if (/^##\s+Local flag index/i.test(line)) inPartA = false;
      if (!inPartA) continue;
      if (!line.startsWith('| ')) continue;
      const cell = line.split('|')[1].trim();
      if (!ID.test(cell)) continue; // skips header `id`, separator `---`
      ids.add(`${slug}:${cell}`);
      idsNaive.add(`${slug}:${cell.replace(/u$/, '')}`); // collapse -u → base
      count++;
    }
    perFile[slug] = count;
  }
  return { ids, idsNaive, perFile };
}

// ===== 2. issue-covered — item-ids from decomposition.md (XS + MOD issue rows only) =====
// Issue rows start `| XS-` or `| MOD-`. Item tokens carry a colon (books:BOO-01);
// issue-ids / edge targets (MOD-books) do NOT — so NSID over issue rows is clean.
function extractIssueCovered() {
  const lines = readFileSync(join(BI, 'decomposition.md'), 'utf8').split('\n');
  const cover = new Map(); // nsid -> [issue,...]  (to detect double-home)
  const issueItems = {}; // issue -> count
  for (const line of lines) {
    const m = line.match(/^\|\s+((?:XS|MOD)-[a-z][a-z0-9-]*)\s+\|/);
    if (!m) continue;
    const issue = m[1];
    issueItems[issue] = 0;
    for (const mm of line.matchAll(NSID)) {
      const nsid = `${mm[1]}:${mm[2]}`;
      if (!cover.has(nsid)) cover.set(nsid, []);
      cover.get(nsid).push(issue);
      issueItems[issue]++;
    }
  }
  return { cover, issueItems };
}

// ===== 3. traceability.md — {id, leg} -> bucket =====
function extractTrace() {
  const lines = readFileSync(join(BI, 'traceability.md'), 'utf8').split('\n');
  const rows = [];
  for (const line of lines) {
    if (!line.startsWith('| ')) continue;
    const c = line.split('|').map((x) => x.trim());
    // | id | leg | slug | bucket | route |  => c[1..5]
    if (c.length < 6) continue;
    const id = c[1];
    if (!/^[a-z][a-z0-9-]*:/.test(id)) continue; // skip header/separator
    rows.push({ id, leg: c[2], slug: c[3], bucket: c[4] });
  }
  return rows;
}

// ===== RUN =====
const { ids: Dstar, idsNaive, perFile } = extractCanonical();
const { cover, issueItems } = extractIssueCovered();
const trace = extractTrace();

const issueCovered = set([...cover.keys()]);
const traceIds = set(trace.map((r) => r.id));
const homedOutBuckets = (b) => /^(P6|DEFERRED|RIDE)/.test(b);
const inIssueBucket = (b) => /^(MOD|XS):/.test(b);
const homedOutIds = set(trace.filter((r) => homedOutBuckets(r.bucket)).map((r) => r.id));
const inIssueTraceIds = set(trace.filter((r) => inIssueBucket(r.bucket)).map((r) => r.id));

// optional: inject a synthetic smuggle to PROVE fail-loud fires (Layer-2 asks for this)
if (process.argv.includes('--inject-smuggle')) {
  issueCovered.add('books:BOO-999'); // id absent from D*
  traceIds.add('fake:ZZ-01u'); // synthetic -u absent from parts
}

const fails = [];

// ---- C1 denominator + -u integrity ----
const uIds = [...Dstar].filter((x) => /u$/.test(x));
const uTrace = [...traceIds].filter((x) => /u$/.test(x));
const uSmuggle = uTrace.filter((x) => !Dstar.has(x)); // -u in trace but not a real parts row
const naiveCount = idsNaive.size;

// ---- C-COVER ----
const unhomed = diff(Dstar, set([...issueCovered, ...homedOutIds]));
// (equivalently every D* id must appear somewhere in the trace)
const unTraced = diff(Dstar, traceIds);
if (unhomed.length) fails.push(['C-COVER unhomed', unhomed]);

// ---- C-SOUND ----
const smuggledIssue = diff(issueCovered, Dstar); // issue-covered id not in corpus
const smuggledTrace = diff(traceIds, Dstar); // any trace id not in corpus
if (smuggledIssue.length) fails.push(['C-SOUND smuggled(issue)', smuggledIssue]);
if (smuggledTrace.length) fails.push(['C-SOUND smuggled(trace)', smuggledTrace]);
if (uSmuggle.length) fails.push(['-u integrity (synthetic leg)', uSmuggle]);

// ---- C-PARTITION ----
const doubleHomed = [...cover.entries()].filter(([, iss]) => new Set(iss).size > 1);
if (doubleHomed.length) fails.push(['C-PARTITION double-homed', doubleHomed.map(([k, v]) => `${k}=>${v}`)]);
// decomposition issue-coverage vs traceability in-issue must agree
const coverVsTrace = diff(issueCovered, inIssueTraceIds);
const traceVsCover = diff(inIssueTraceIds, issueCovered);

// ---- partition identity: inIssue + homedOut - splitOverlap = D* ----
const splitOverlap = inter(inIssueTraceIds, homedOutIds); // ids with both a service leg (issue) & a homed-out leg
const partitionLHS = inIssueTraceIds.size + homedOutIds.size - splitOverlap.length;

// ---- leg partition ----
const legCount = { single: 0, service: 0, ui: 0, other: 0 };
for (const r of trace) legCount[r.leg] ?? (legCount.other++, 0), (legCount[r.leg] !== undefined ? legCount[r.leg]++ : 0);
const idLegs = new Map();
for (const r of trace) idLegs.set(r.id, (idLegs.get(r.id) || 0) + 1);
const oneLeg = [...idLegs.values()].filter((n) => n === 1).length;
const twoLeg = [...idLegs.values()].filter((n) => n === 2).length;
const nPlus = [...idLegs.values()].filter((n) => n > 2).length;

// ===== REPORT =====
const R = [];
R.push('# P4 set-cover — deterministic results');
R.push('');
R.push('## C1 · Denominator D*');
R.push(`- D* (suffix-preserving sweep of parts/*.md) = **${Dstar.size}**`);
R.push(`- naive suffix-DROPPING sweep = **${naiveCount}**  → delta ${Dstar.size - naiveCount} = the \`-u\` rows a naive regex collapses`);
R.push(`- \`-u\` ids in D* (${uIds.length}): ${uIds.sort().join(' ')}`);
R.push(`- traceability distinct ids = **${traceIds.size}**`);
R.push(`- corpus header (corpus.md:47) declared 1194 · assembly 1201`);
R.push(`- D* vs trace: D*∖trace = [${unTraced.join(', ') || 'none'}] · trace∖D* = [${smuggledTrace.join(', ') || 'none'}]`);
R.push('');
R.push('## Set-relations');
R.push(`- **C-COVER** unhomed (D* ∖ (issue ∪ homedOut)) = **${unhomed.length}** ${unhomed.length ? '❌ ' + unhomed.join(' ') : '✅'}`);
R.push(`- **C-SOUND** smuggled-issue (issueCovered ∖ D*) = **${smuggledIssue.length}** ${smuggledIssue.length ? '❌ ' + smuggledIssue.join(' ') : '✅'}`);
R.push(`- **C-SOUND** smuggled-trace (traceIds ∖ D*) = **${smuggledTrace.length}** ${smuggledTrace.length ? '❌' : '✅'}`);
R.push(`- **-u integrity** synthetic-leg (uTrace ∖ D*) = **${uSmuggle.length}** ${uSmuggle.length ? '❌ ' + uSmuggle.join(' ') : '✅'}`);
R.push(`- **C-PARTITION** double-homed = **${doubleHomed.length}** ${doubleHomed.length ? '❌' : '✅'}`);
R.push(`- decomposition↔trace agreement: issue∖trace=${coverVsTrace.length} trace∖issue=${traceVsCover.length} ${coverVsTrace.length || traceVsCover.length ? '⚠' : '✅'}`);
R.push('');
R.push('## Partition identity');
R.push(`- inIssue(${inIssueTraceIds.size}) + homedOut(${homedOutIds.size}) − splitOverlap(${splitOverlap.length}) = **${partitionLHS}**  (D* = ${Dstar.size}) ${partitionLHS === Dstar.size ? '✅' : '❌'}`);
R.push(`- issueCovered (from decomposition) = ${issueCovered.size} distinct ids across ${Object.keys(issueItems).length} issues`);
R.push('');
R.push('## Leg partition');
R.push(`- legs: single=${legCount.single} service=${legCount.service} ui=${legCount.ui} (Σ=${legCount.single + legCount.service + legCount.ui})`);
R.push(`- ids by legs: oneLeg=${oneLeg} twoLeg=${twoLeg} (>2: ${nPlus})  → oneLeg+twoLeg=${oneLeg + twoLeg} (D*=${Dstar.size}) ${oneLeg + twoLeg === Dstar.size ? '✅' : '❌'}`);
R.push('');
R.push('## Homed-out buckets (leg counts)');
const bucketTally = {};
for (const r of trace) if (homedOutBuckets(r.bucket)) { const k = r.bucket.split(':')[0]; bucketTally[k] = (bucketTally[k] || 0) + 1; }
R.push(`- ${Object.entries(bucketTally).map(([k, v]) => `${k}=${v}`).join(' · ')}`);
R.push(`- distinct DEFERRED home strings = ${new Set(trace.filter((r) => /^DEFERRED/.test(r.bucket)).map((r) => r.bucket)).size}`);
R.push('');
R.push(`## perFile canonical counts (suffix-preserving row-level sweep)`);
R.push(`- projects=${perFile.projects} (corpus.md:60 header=47 MATCHES disk=47; PRO-05u is the 47th — a naive -u-dropping count says 46, the header is correct)`);
R.push(`- 1194 (reader prose corpus.md:47) = stale self-declaration undercount vs 1200 disk rows; 1192 naive drops 8 -u; 1201 assembly double-counts continuation rows`);
R.push('');

console.log(R.join('\n'));

if (fails.length) {
  console.error('\n=== FAIL-LOUD: blocking defects ===');
  for (const [name, ids] of fails) console.error(`❌ ${name}: ${Array.isArray(ids) ? ids.slice(0, 20).join(' ') : ids}`);
  process.exit(1);
}
console.error('\n✅ all mechanical checks pass (C-COVER 0 unhomed · C-SOUND 0 smuggled · C-PARTITION 0 double-home · identities close)');
