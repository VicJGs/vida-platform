// The intent ledger, defined once: intended rules as data, one YAML file per module at
// "checks".intentLedger (default docs/modules/<module>/intent.yaml). check:rules validates
// the rows and reports each one as tested, partly tested or intent only. intent-units.mjs
// writes one unit per row (its ID is the row's, in <ledger dir>/intent/, a folder the
// generator owns) plus the INTENT-<module> map beside the ledger; check:docs fails when
// one is missing, stale or orphaned, and guards rows whose docs/features/<module> aspect
// files are gone.
//
// Proof is scoped: a row counts only tests under its module's paths, "checks".intentTests
// (module → path prefixes; default <src>/<module>), since rule IDs can repeat across modules.
//
// A row: `id` (matches "checks".intentId) · `says` (one line) · `open` (an unresolved
// question; needs `work`) · `uses` (modules or substrates it connects to) · `proof` (built rule IDs,
// matching "checks".ruleId) · `work` (a Linear issue, e.g. LIF-12). There is no status
// field: a row is tested when a test is named with its own ID, or when every proof ID has a
// test named with it, counting only tests under the module's paths.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { CODE_FILE, TEST_FILE, exists, read, root, walk } from "./lib.mjs";
import { tokens, unquote } from "./units.mjs";

export const FIELDS = ["id", "says", "open", "uses", "proof", "work"];
const LISTS = new Set(["uses", "proof"]);
const WORK = /^[A-Z][A-Z0-9]*-\d+$/;
const whole = (pattern) => new RegExp(`^(?:${pattern})$`);

// Every ledger the "checks".intentLedger pattern finds, with the map and row folder generated from it.
export function ledgers(cfg) {
  const [before, after] = cfg.intentLedger.split("<module>");
  const dir = before.replace(/\/$/, "");
  if (after === undefined || !exists(dir)) return [];
  return readdirSync(join(root, dir), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ module: d.name, path: `${before}${d.name}${after}` }))
    .filter((l) => exists(l.path))
    .map((l) => ({ ...l, unit: l.path.replace(/\.ya?ml$/, ".md"), rowDir: `${l.path.replace(/\/[^/]*$/, "")}/intent/`, ...parseLedger(read(l.path)) }))
    .sort((a, b) => (a.module < b.module ? -1 : 1));
}

// The ledger is a top-level list of rows: `- key: value`, then `  key: value`; lists inline
// (`[a, b]`) or as `    - item` lines. Anything else is a problem, reported with its line.
export function parseLedger(text) {
  const rows = [];
  const problems = [];
  let row = null;
  let list = null;
  const set = (key, value, line) => {
    if (key in row.fields) { problems.push({ line, problem: `${key} given twice` }); return null; }
    if (value === "") { row.fields[key] = []; return key; }
    row.fields[key] = /^\[.*\]$/.test(value)
      ? value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean)
      : unquote(value);
    return null;
  };
  text.replace(/\r\n/g, "\n").split("\n").forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim() || /^\s*#/.test(raw)) return;
    let m;
    if ((m = raw.match(/^- +([\w-]+):\s*(.*)$/))) {
      row = { line, fields: {} };
      rows.push(row);
      list = set(m[1], m[2].trim(), line);
    } else if (row && list && (m = raw.match(/^ {2,}- +(.*)$/))) {
      row.fields[list].push(unquote(m[1].trim()));
    } else if (row && (m = raw.match(/^ {2}([\w-]+):\s*(.*)$/))) {
      list = set(m[1], m[2].trim(), line);
    } else {
      problems.push({ line, problem: "not a row line (- key: value, then two-space key: value)" });
    }
  });
  return { rows, problems };
}

// Where each rule ID is stated (docs, or comments in non-test code under src), and the test
// files whose test names carry each rule ID (tests) or intent ID (named), repo-wide. The
// ledgers and their generated units link rules but do not state them, so they are skipped.
export function ruleMap(cfg, skip = () => false) {
  const id = new RegExp(`\\b${cfg.ruleId}\\b`, "g");
  const intentId = new RegExp(`\\b${cfg.intentId}\\b`, "g");
  const repo = walk(".").map((f) => f.slice(2)).filter((f) => !f.startsWith(".claude/worktrees/") && !skip(f));
  const under = (dir) => (f) => dir === "." || f.startsWith(`${dir}/`);
  const stated = new Map();
  for (const path of repo.filter((p) => !TEST_FILE.test(p) && (under(cfg.src)(p) || under(cfg.docs)(p)))) {
    const text = read(path);
    const scope = under(cfg.docs)(path) ? text
      : CODE_FILE.test(path) ? (text.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) ?? []).join("\n")
      : "";
    for (const [rule] of scope.matchAll(id)) stated.has(rule) || stated.set(rule, path);
  }
  // Test names: the title string of it(), test() or describe(), modifiers included.
  const tests = new Map();
  const named = new Map();
  const note = (m, key, path) => m.set(key, (m.get(key) ?? new Set()).add(path));
  const title = /\b(?:it|test|describe)(?:\.\w+)*\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  for (const path of repo.filter((p) => TEST_FILE.test(p) && CODE_FILE.test(p))) {
    for (const [, , name] of read(path).matchAll(title)) {
      for (const [rule] of name.matchAll(id)) note(tests, rule, path);
      for (const [row] of name.matchAll(intentId)) note(named, row, path);
    }
  }
  return { stated, tests, named };
}

// A module's test paths: "checks".intentTests[module], default <src>/<module>.
const testPaths = (cfg, module) => [cfg.intentTests?.[module] ?? `${cfg.src}/${module}`].flat().map((p) => p.replace(/\/$/, ""));

// The ruleMap() result cut down to the test files under the ledger module's test paths.
export function scope(cfg, ledger, { tests, named }) {
  const paths = testPaths(cfg, ledger.module);
  const inside = (f) => paths.some((p) => p === "." || f === p || f.startsWith(`${p}/`));
  const keep = (m) => new Map([...m].map(([id, files]) => [id, new Set([...files].filter(inside))]).filter(([, files]) => files.size));
  return { paths, tests: keep(tests), named: keep(named) };
}

export const skipped = (all) => (f) => all.some((l) => f === l.path || f === l.unit || f.startsWith(l.rowDir));

// A row's state from its module's scoped tests (scope()).
export function state(row, { tests, named }) {
  if (named.has(row.fields.id)) return "tested";
  const proof = [row.fields.proof ?? []].flat();
  const done = proof.filter((p) => tests.has(p)).length;
  return !proof.length || !done ? "intent only" : done === proof.length ? "tested" : "partly tested";
}

// Malformed rows, unknown proof IDs, IDs used twice and missing test paths, across all
// ledgers. A proof ID is known when stated or tested anywhere; only its state is scoped.
export function problems(cfg, all, { stated, tests }) {
  const intentId = whole(cfg.intentId);
  const ruleId = whole(cfg.ruleId);
  const seen = new Map();
  const out = [];
  for (const l of all) {
    for (const p of l.problems) out.push(`${l.path}:${p.line}: ${p.problem}`);
    for (const p of testPaths(cfg, l.module)) {
      if (!exists(p)) out.push(`${l.path}: test path ${p} of ${l.module} does not exist; set "checks".intentTests.${l.module} to the paths that hold its tests`);
    }
    for (const { line, fields } of l.rows) {
      const at = `${l.path}:${line}`;
      const unknown = Object.keys(fields).filter((k) => !FIELDS.includes(k));
      if (unknown.length) out.push(`${at}: unknown key ${unknown.join(", ")}; a row has ${FIELDS.join(", ")}`);
      if (typeof fields.id !== "string" || !intentId.test(fields.id)) out.push(`${at}: id ${JSON.stringify(fields.id ?? null)} does not match "checks".intentId ${cfg.intentId}`);
      else if (seen.has(fields.id)) out.push(`${at}: id ${fields.id} also used at ${seen.get(fields.id)}`);
      else seen.set(fields.id, at);
      if (typeof fields.says !== "string" || !fields.says) out.push(`${at}: says must be one non-empty line`);
      for (const key of ["open", "work"]) if (key in fields && (typeof fields[key] !== "string" || !fields[key])) out.push(`${at}: ${key} must be one non-empty value`);
      if (fields.open && !fields.work) out.push(`${at}: open needs a work link, the issue that settles it`);
      if (typeof fields.work === "string" && fields.work && !WORK.test(fields.work)) out.push(`${at}: work ${fields.work} is not an issue key like LIF-12`);
      for (const key of LISTS) if (key in fields && !Array.isArray(fields[key])) out.push(`${at}: ${key} must be a list`);
      for (const p of Array.isArray(fields.proof) ? fields.proof : []) {
        if (!ruleId.test(p)) out.push(`${at}: proof ${p} does not match "checks".ruleId ${cfg.ruleId}`);
        else if (!stated.has(p) && !tests.has(p)) out.push(`${at}: proof ${p} is no known rule (stated nowhere, no test named with it)`);
      }
    }
  }
  return out;
}

// The generated units of one ledger, as path → text: one per row with a valid, first-used
// ID, anchored to the ledger and the tests that prove it, plus the INTENT-<module> map.
// A ledger edit or a new proof test changes them, so check:docs flags them until rerun.
export function generate(cfg, ledger, found) {
  const scoped = scope(cfg, ledger, found);
  const { tests, named } = scoped;
  const intentId = whole(cfg.intentId);
  const seen = new Set();
  const rows = ledger.rows.filter(({ fields }) => typeof fields.id === "string" && intentId.test(fields.id) && !seen.has(fields.id) && seen.add(fields.id));
  const out = new Map();
  const by = { tested: [], "partly tested": [], "intent only": [] };
  const list = (v) => [v ?? []].flat().join(", ");
  for (const { fields } of rows) {
    const s = state({ fields }, scoped);
    by[s].push(fields.id);
    const proof = [fields.proof ?? []].flat();
    const shown = [...proof.map((p) => `${p} (${tests.has(p) ? "tested" : "no test"})`), ...(named.has(fields.id) ? [`${fields.id} (tested by name)`] : [])];
    const details = [
      shown.length ? `- Proof: ${shown.join(", ")}` : null,
      list(fields.uses) ? `- Uses: ${list(fields.uses)}` : null,
      fields.work ? `- Work: ${fields.work}` : null,
      fields.open ? `- Open: ${fields.open}` : null,
    ].filter(Boolean);
    const body = [
      `# ${fields.id} (${s})`, "", fields.says ?? "", "",
      ...(details.length ? [...details, ""] : []),
      `Generated from \`${ledger.path}\`; edit the ledger, never this unit.`, "",
    ].join("\n");
    const anchors = [ledger.path, ...proof.flatMap((p) => [...(tests.get(p) ?? [])]), ...(named.get(fields.id) ?? [])];
    out.set(`${ledger.rowDir}${fields.id}.md`, unit({ id: fields.id, kind: "intent-row", module: ledger.module, summary: fields.says ?? "", anchors }, body));
  }
  const map = [
    `# Intended rules: ${ledger.module}`, "",
    `Generated from \`${ledger.path}\`; edit the ledger, never this unit. Each row is its own unit, fetched by its row key. A row is tested when a test under ${scoped.paths.map((p) => `\`${p}\``).join(", ")} is named with its row key, or with each of its proof rules.`, "",
    ...Object.entries(by).map(([s, ids]) => `- ${s[0].toUpperCase()}${s.slice(1)}: ${ids.join(", ") || "none"}`), "",
  ].join("\n");
  const summary = `Intended rules of ${ledger.module}: ${rows.length} rows, ${by.tested.length} tested, ${by["partly tested"].length} partly tested, ${by["intent only"].length} intent only.`;
  out.set(ledger.unit, unit({ id: `INTENT-${ledger.module}`, kind: "intent", module: ledger.module, summary, anchors: [ledger.path] }, map));
  return out;
}

const unit = ({ id, kind, module, summary, anchors }, body) => [
  "---", `id: ${id}`, `kind: ${kind}`, `module: ${module}`, "status: active", "supersedes: []",
  `summary: "${summary}"`, `anchors: [${[...new Set(anchors)].sort().join(", ")}]`, `tokens: ${tokens(body)}`, "generated: true", "---", body,
].join("\n");

// The archive guard: once docs/features/<module> is gone, a row must be tested, named in
// the module's MOD or FLOW units, or linked to work; otherwise its intent is lost.
export function guard(cfg, all, units, found) {
  const out = [];
  for (const l of all) {
    if (exists(`${cfg.features}/${l.module}`)) continue;
    const mentions = units
      .filter((u) => u.fm?.status === "active" && (u.fm.id === `MOD-${l.module}` || u.fm.id?.startsWith(`FLOW-${l.module}-`)))
      .map((u) => u.body).join("\n");
    const scoped = scope(cfg, l, found);
    for (const { line, fields } of l.rows) {
      if (typeof fields.id !== "string" || fields.work || state({ fields }, scoped) === "tested") continue;
      if (new RegExp(`\\b${fields.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(mentions)) continue;
      out.push(`${l.path}:${line}: archive guard, ${fields.id} has no tested proof, no mention in MOD-${l.module} or FLOW-${l.module}-*, and no work link, and ${cfg.features}/${l.module} is gone; add one`);
    }
  }
  return out;
}
