// check:docs — the documentation writing rules, per doc unit (every .md under the
// docs root, archive and templates excluded; the format lives in units.mjs), plus a
// current docs/index.json. Rule 6 (structured facts as data) and "agents never browse"
// (rule 10) describe where facts live and how agents read them; no file check can
// prove them, so they stay with the reviewer.
// Usage: node docs.mjs [--base <ref>]
//   --base: fail only on findings absent at the merge base with <ref>, keyed by file and
//   rule, so a repo with a backlog can gate on new findings. Without it, every finding fails.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config, exists, read, report, root, walk } from "./lib.mjs";
import { ABSTRACT_MAX, BODY_MAX, REQUIRED, buildIndex, linksOf, serialize, tokens, unquote, units as load } from "./units.mjs";
import { generate, guard, ledgers, ruleMap, skipped } from "./intent.mjs";

const FORBIDDEN_HEADING = /^#{1,6}\s+(status|steps|next steps|history|changelog|progress|todo)\b/i;

function glossaryTerms(path) {
  if (!exists(path)) return null;
  const terms = new Set();
  for (const line of read(path).split(/\r?\n/)) {
    const m = line.match(/^\s*-?\s*term:\s*(.+)$/) ?? line.match(/^([A-Za-z][\w-]*):/);
    if (m) terms.add(unquote(m[1].trim()));
  }
  return terms;
}

// All-caps codes in prose: code, links and IDs (a "checks".ruleId match, which may carry
// a letter suffix like BR-KN-S2-8b, or anything ending in -<digits>) removed.
function codes(body, ruleId) {
  const prose = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(ruleId, "")
    .replace(/\b[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+\b/g, "");
  return [...new Set(prose.match(/\b[A-Z][A-Z0-9]*[A-Z](?:-[A-Z0-9]+)*\b/g) ?? [])];
}

const cfg = config();
const units = load(cfg);
const glossary = glossaryTerms(cfg.glossary);
const ruleId = new RegExp(`\\b(?:${cfg.ruleId})\\b`, "g");
const findings = [];
const ids = new Map();
if (!units.length) findings.push(`check:docs: no doc units under ${cfg.docs}/; set "checks".docs`);

for (const u of units) {
  if (!u.fm) { findings.push(`${u.path}: rule 2, no frontmatter`); continue; }
  const missing = REQUIRED.filter((k) => !(k in u.fm));
  if (missing.length) findings.push(`${u.path}: rule 2, frontmatter missing ${missing.join(", ")}`);

  if (u.fm.id) {
    if (ids.has(u.fm.id)) findings.push(`${u.path}: rule 1, id ${u.fm.id} also used by ${ids.get(u.fm.id)}`);
    else ids.set(u.fm.id, u.path);
  }

  if ("summary" in u.fm && (typeof u.fm.summary !== "string" || !u.fm.summary)) findings.push(`${u.path}: rule 3, summary must be one non-empty line`);
  const abstract = u.body.replace(/^\s*#[^\n]*\n/, "").trim().split(/\r?\n\s*\r?\n/)[0] ?? "";
  if (tokens(abstract) > ABSTRACT_MAX) findings.push(`${u.path}: rule 3, abstract ~${tokens(abstract)} tokens (limit ${ABSTRACT_MAX})`);
  if (tokens(u.body) > BODY_MAX) findings.push(`${u.path}: rule 3, body ~${tokens(u.body)} tokens (limit ${BODY_MAX}); split the unit`);

  for (const anchor of [u.fm.anchors ?? []].flat()) {
    const [file, symbol] = anchor.split("#");
    if (!exists(file)) findings.push(`${u.path}: rule 4, anchor ${anchor}: ${file} does not exist`);
    else if (symbol && !new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(read(file))) {
      findings.push(`${u.path}: rule 4, anchor ${anchor}: ${symbol} not found in ${file}`);
    }
  }

  if (/^REF-/.test(u.fm.id ?? "") && u.fm.generated !== "true") findings.push(`${u.path}: rule 5, REF-* units are generated; add generated: true`);

  u.body.split(/\r?\n/).forEach((line, i) => {
    if (FORBIDDEN_HEADING.test(line)) findings.push(`${u.path}:${u.bodyLine + i}: rule 7, "${line.trim()}": status, steps and history live in Linear and git`);
  });

  const unknown = codes(u.body, ruleId).filter((c) => !glossary?.has(c));
  if (unknown.length) findings.push(`${u.path}: rule 9, ${unknown.join(", ")} not in ${cfg.glossary}`);
}

const active = new Set(units.filter((u) => u.fm?.status === "active").map((u) => u.fm.id));
for (const u of units) {
  for (const old of [u.fm?.supersedes ?? []].flat()) {
    if (ids.has(old)) findings.push(`${u.path}: rule 8, supersedes ${old}, which is still active at ${ids.get(old)}; move it to the archive`);
  }
  for (const link of linksOf(u.fm)) {
    if (!active.has(link)) findings.push(`${u.path}: links ${link}, which is ${ids.has(link) ? `not active (${ids.get(link)})` : "no unit"}; link an active unit`);
  }
}

// Rule 10: the archive is denied to agents, so a live doc that names a path in it sends
// the agent to a dead end. Two archives, each holding what moved out of its parent with
// paths preserved: docs/_archive (docs/x/y.md becomes docs/_archive/x/y.md) and
// .claude/archive (.claude/x/z.md). Flags a path through either
// archive, a path to something moved there, and a partial or bare .md name (parts/x.md,
// x.md) that only an archived file ends with. Scans every tracked or new text file
// outside the archives (code comments and layer CLAUDE.md files send agents there too),
// except "checks".archiveAllow: [{ path, why }], a file or folder/ whose archive
// references stay on purpose. Each entry is printed with its count; one that matches
// nothing fails, so the list cannot rot.
const ARCHIVES = [[cfg.docs, `${cfg.docs}/_archive`], [".claude", ".claude/archive"]]
  .filter(([, dir]) => exists(dir))
  .map(([parent, dir]) => ({ parent, dir, files: readdirSync(`${root}/${dir}`, { recursive: true }) }));
const archiveFiles = ARCHIVES.flatMap(({ files }) => files.map((f) => `/${String(f).replaceAll("\\", "/")}`));
// Worktrees hold stale copies of the tree; they are not live docs.
const liveMd = walk(".").map((f) => f.slice(2)).filter((f) => f.endsWith(".md") && !f.startsWith(".claude/worktrees/")).map((f) => `/${f}`);
const endsIn = (files, tail) => files.some((f) => f.endsWith(tail));
const PATH = /(?<![\w/.-])(?:\.{1,2}\/)*[\w.-]+(?:\/[\w.-]+)*\/?/g;
const intoArchive = (path, inDocs) => {
  if (/(?:^|\/)(?:_archive|\.claude\/archive)(?:\/|$)/.test(path)) return true;
  const rel = path.replace(/^(?:\.{1,2}\/)+/, "");
  if (rel.endsWith(".md") && endsIn(archiveFiles, `/${rel}`) && !endsIn(liveMd, `/${rel}`)) return true;
  return ARCHIVES.some(({ parent, dir }) => {
    // Under the parent: docs/x/..., or ../x/... and ./x/... from inside the docs root (in
    // code, ../x is an import); a bare `reviews/merges` is prose.
    const under = rel.startsWith(`${parent}/`) ? rel.slice(parent.length + 1) : parent === cfg.docs && inDocs && rel !== path ? rel : null;
    if (!under || exists(`${parent}/${under}`)) return false;
    // Moved there, or under a folder that moved there whole (a file since renamed or gone).
    const first = under.split("/")[0];
    return exists(`${dir}/${under}`) || (first !== under.replace(/\/$/, "") && exists(`${dir}/${first}`) && !exists(`${parent}/${first}`));
  });
};

const allow = [cfg.archiveAllow ?? []].flat().map((a) => ({ ...a, refs: 0 }));
const allowed = (path) => allow.find((a) => (a.path.endsWith("/") ? path.startsWith(a.path) : path === a.path));
const scanned = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
if (scanned.status !== 0) findings.push(`check:docs: rule 10 needs a git work tree; git ls-files failed: ${scanned.stderr.trim()}`);
const scanPaths = scanned.status === 0
  ? scanned.stdout.split("\0").filter((f) => f && exists(f) && !/(?:^|\/)(?:node_modules|archive|_archive)\//.test(f) && !f.startsWith(".claude/worktrees/"))
  : [];
for (const path of scanPaths) {
  const text = read(path);
  if (text.includes("\0")) continue;
  const inDocs = path.startsWith(`${cfg.docs}/`);
  text.split(/\r?\n/).forEach((line, i) => {
    for (const ref of new Set((line.match(PATH) ?? []).map((m) => m.replace(/\.+$/, "")))) {
      if (!intoArchive(ref, inDocs)) continue;
      const entry = allowed(path);
      if (entry) entry.refs++;
      else findings.push(`${path}:${i + 1}: rule 10, ${ref} is in the archive; link the ADR or Linear doc that holds it, or drop it (history lives in git)`);
    }
  });
}
for (const a of allow) {
  if (!a.path || !a.why) findings.push(`check:docs: "checks".archiveAllow entry ${JSON.stringify({ path: a.path, why: a.why })} needs a path and a why`);
  else if (!a.refs) findings.push(`check:docs: "checks".archiveAllow ${a.path} has no archive references left; remove the entry`);
}
const allowNotes = allow.filter((a) => a.refs).map((a) => `rule 10 allowlisted ${a.path} (${a.refs} archive references): ${a.why}`);

// Rule 5 for intent: every unit generated from a ledger (one per row, plus the
// INTENT-<module> map) exists and is current, no intent unit lacks its ledger row, and the
// archive guard holds (intent.mjs).
const intent = ledgers(cfg);
const intentUnit = (u) => /^intent(-row)?$/.test(u.fm?.kind ?? "") || /^INTENT-/.test(u.fm?.id ?? "") || intent.some((l) => u.path.startsWith(l.rowDir));
if (intent.length || units.some(intentUnit)) {
  const map = ruleMap(cfg, skipped(intent));
  const expected = new Map(intent.flatMap((l) => [...generate(cfg, l, map)]));
  const run = "run node tools/checks/core/intent-units.mjs";
  for (const [path, text] of expected) {
    const id = text.match(/^id: (.+)$/m)[1];
    if (!exists(path)) findings.push(`${path}: rule 5, ${id} missing; ${run}`);
    else if (read(path).replace(/\r\n/g, "\n") !== text) findings.push(`${path}: rule 5, ${id} stale; ${run}`);
  }
  for (const u of units.filter((u) => intentUnit(u) && !expected.has(u.path))) {
    findings.push(`${u.path}: rule 5, ${u.fm?.id ?? "this unit"} is generated from no ledger row (${cfg.intentLedger}); ${run}`);
  }
  findings.push(...guard(cfg, intent, units, map));
}

// Rule 10: agents fetch through get_context, which reads only the generated index.
const index = serialize(buildIndex(units));
if (!exists(cfg.index)) findings.push(`${cfg.index}: rule 10, missing; run node tools/checks/core/docs-index.mjs`);
else if (read(cfg.index).replace(/\r\n/g, "\n") !== index) findings.push(`${cfg.index}: rule 10, stale; run node tools/checks/core/docs-index.mjs`);

// --base: this same script runs on a detached worktree at the merge base; a finding whose
// file and rule (or, without a rule number, whose whole text) also fails there is old.
const name = `check:docs ${cfg.docs}/ (${units.length} units)`;
const notes = ["rule 6 and the fetch-only half of rule 10 are not file-checkable; the reviewer covers them", ...allowNotes];
const baseArg = process.argv.indexOf("--base");
if (baseArg > 0) {
  const ref = process.argv[baseArg + 1] ?? "";
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const mergeBase = git("merge-base", ref, "HEAD");
  if (mergeBase.status !== 0) report(name, [`check:docs: --base ${ref}: no merge base with HEAD`]);
  const sha = mergeBase.stdout.trim();
  const dir = join(mkdtempSync(join(tmpdir(), "check-docs-base-")), "base");
  const added = git("worktree", "add", "-q", "--detach", dir, sha);
  if (added.status !== 0) report(name, [`check:docs: --base ${ref}: git worktree add failed: ${added.stderr.trim()}`]);
  let run;
  try {
    run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: dir, encoding: "utf8" });
  } finally {
    git("worktree", "remove", "--force", dir);
    rmSync(dir, { recursive: true, force: true });
  }
  if (run.status !== 0 && run.status !== 1) report(name, [`check:docs: --base ${ref}: the check failed to run at ${sha.slice(0, 7)}: ${run.stderr.trim()}`]);
  const key = (f) => {
    const m = f.match(/^([^:\s]+)(?::\d+)?: (rule \d+)?/);
    return m ? `${m[1]} ${m[2] ?? f.slice(m[0].length)}` : f;
  };
  // The last line is the summary, not a finding.
  const old = new Set(run.stdout.trim().split(/\r?\n/).slice(0, -1).filter((l) => l.startsWith("FAIL ")).map((l) => key(l.slice(5))));
  const fresh = findings.filter((f) => !old.has(key(f)));
  notes.push(`--base ${ref}: ${findings.length - fresh.length} findings also fail at ${sha.slice(0, 7)} (by file and rule); only new ones count`);
  report(`${name} new since ${ref}`, fresh, notes);
}
report(name, findings, notes);
