#!/usr/bin/env node
// P6 coverage gate (deterministic, fail-loud, INDEPENDENT of the generator).
// Re-derives the source P6 set from traceability.md and the assignment from traceability-p6.md
// SEPARATELY, then proves: full cover · 0 unhomed · 0 phantom · 0 service · partition closes · 24 issues.
// Node 24. Read-only. Exit 1 on any defect (un-rigged: it does not import the generator's rules).
import { readFileSync } from 'node:fs';

const DIR = 'docs/specs/foundation/backend-intent';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

// --- Source of truth: the 222 P6 legs from traceability.md ---
const src = new Map(); // slug:id -> leg-type
for (const ln of readFileSync(`${DIR}/traceability.md`, 'utf8').split('\n')) {
  if (!ln.startsWith('|')) continue;
  const c = ln.split('|').map((s) => s.trim());
  if (c.length < 6 || c[4] !== 'P6:P6') continue;
  ok(c[1].includes(':'), `source leg not namespaced: ${c[1]}`);
  ok(!src.has(c[1]), `source duplicate key: ${c[1]}`);
  src.set(c[1], c[2]);
}
ok(src.size === 222, `source P6 count = ${src.size}, expected 222`);
// boundary invariant: 0 service legs
const serviceLegs = [...src].filter(([, leg]) => leg === 'service').map(([k]) => k);
ok(serviceLegs.length === 0, `service legs leaked into P6: ${serviceLegs.join(', ')}`);
const legTypes = [...src.values()].reduce((a, l) => ((a[l] = (a[l] || 0) + 1), a), {});

// --- The assignment: traceability-p6.md ---
const asg = new Map();   // slug:id -> {issue, milestone}
const byIssue = new Map();
const MS = new Set(['M1.2.1', 'M1.2.2', 'M1.2.3']);
for (const ln of readFileSync(`${DIR}/traceability-p6.md`, 'utf8').split('\n')) {
  if (!ln.startsWith('|')) continue;
  const c = ln.split('|').map((s) => s.trim());
  if (c.length < 5 || c[1] === 'item-id (slug:id)' || c[1].startsWith('---')) continue;
  const [, id, , issue, ms] = c;
  if (!id.includes(':')) continue;
  ok(!asg.has(id), `assignment duplicate key: ${id}`);
  ok(MS.has(ms), `bad milestone for ${id}: ${ms}`);
  asg.set(id, { issue, milestone: ms });
  byIssue.set(issue, (byIssue.get(issue) || 0) + 1);
}

// --- Coverage identities ---
const unhomed = [...src.keys()].filter((k) => !asg.has(k));
const phantom = [...asg.keys()].filter((k) => !src.has(k));
ok(unhomed.length === 0, `UNHOMED (${unhomed.length}): ${unhomed.slice(0, 8).join(', ')}`);
ok(phantom.length === 0, `PHANTOM not in source (${phantom.length}): ${phantom.slice(0, 8).join(', ')}`);
ok(asg.size === 222, `assignment count = ${asg.size}, expected 222`);
ok(byIssue.size === 24, `issue count = ${byIssue.size}, expected 24`);
const partition = [...byIssue.values()].reduce((a, b) => a + b, 0);
ok(partition === 222, `partition sum = ${partition}, expected 222`);

// --- NOT-24 collision must be preserved (both buckets distinct) ---
ok(src.has('notes-and-pages:NOT-24') && src.has('notifications:NOT-24'),
  `NOT-24 collision guard: both notes-and-pages:NOT-24 and notifications:NOT-24 must exist as distinct legs`);
ok(asg.get('notes-and-pages:NOT-24')?.issue === 'fe-notes-and-pages'
  && asg.get('notifications:NOT-24')?.issue === 'fe-notifications',
  `NOT-24 collision: the two NOT-24 legs must map to different issues`);

// --- Report ---
console.log('=== P6 coverage gate ===');
console.log(`source P6 legs      : ${src.size}`);
console.log(`leg-type breakdown  : ${JSON.stringify(legTypes)} (service must be absent)`);
console.log(`assigned legs       : ${asg.size}`);
console.log(`issues              : ${byIssue.size}`);
console.log(`partition sum       : ${partition}`);
console.log(`unhomed / phantom   : ${unhomed.length} / ${phantom.length}`);
console.log('per-issue counts    :');
for (const [i, n] of [...byIssue].sort()) console.log(`  ${i.padEnd(30)} ${n}`);

if (fails.length) {
  console.error(`\nGATE FAIL (${fails.length}):`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\nGATE PASS ✅ — full cover · 0 unhomed · 0 phantom · 0 service · partition closes · 24 issues.');
