// check:rules — every rule ID found in the docs or in a code comment has a test whose
// name carries that ID. The ID format is package.json "checks".ruleId (a regex).
// IDs listed in the "checks".rulesBaseline file are known to lack a test; the list only
// shrinks: a listed ID that gains a test fails until its line is removed.
// `--write-baseline` writes the current untested IDs to that file, once, on adoption.
// It also reads the intent ledgers (intent.mjs): each row is reported as tested, partly
// tested or intent only, counting only tests under the module's "checks".intentTests paths,
// and a malformed row, a reused ID, an unknown proof ID or a missing test path fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config, exists, read, report, root } from "./lib.mjs";
import { ledgers, problems, ruleMap, scope, skipped, state } from "./intent.mjs";

const cfg = config();
const intent = ledgers(cfg);
const map = ruleMap(cfg, skipped(intent));
const { stated, tests } = map;

const untested = [...stated].filter(([rule]) => !tests.has(rule));
if (process.argv.includes("--write-baseline")) {
  mkdirSync(dirname(join(root, cfg.rulesBaseline)), { recursive: true });
  writeFileSync(join(root, cfg.rulesBaseline), untested.map(([rule]) => `${rule}\n`).sort().join(""));
}

// The baseline: one rule ID per line; blank lines are ignored.
const baseline = new Map();
if (exists(cfg.rulesBaseline)) {
  read(cfg.rulesBaseline).split("\n").forEach((line, i) => line.trim() && baseline.set(line.trim(), i + 1));
}

const findings = [
  ...untested.filter(([rule]) => !baseline.has(rule)).map(([rule, where]) => `${rule} (stated in ${where}) has no test named with it`),
  ...[...baseline].filter(([rule]) => tests.has(rule)).map(([rule, line]) => `${cfg.rulesBaseline}:${line}: ${rule} has a test now; remove this line`),
  ...problems(cfg, intent, map),
];
if (!stated.size) findings.push(`check:rules: no rule ID matching ${cfg.ruleId} stated in ${cfg.docs}/ or code comments; set "checks".ruleId`);
const baselined = untested.filter(([rule]) => baseline.has(rule)).length;

const rows = intent.flatMap((l) => {
  const scoped = scope(cfg, l, map);
  return l.rows.filter((r) => typeof r.fields.id === "string").map((r) => ({ l, r, s: state(r, scoped) }));
});
const notes = rows.map(({ l, r, s }) => `INTENT-${l.module} ${r.fields.id}: ${s}`);
const count = (s) => rows.filter((x) => x.s === s).length;
const intentPart = intent.length ? `; ${rows.length} intent rows: ${count("tested")} tested, ${count("partly tested")} partly tested, ${count("intent only")} intent only` : "";
report(`check:rules (${stated.size} rule IDs, ${tests.size} tested, ${baselined} baselined${intentPart})`, findings, notes);
