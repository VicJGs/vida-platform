// check:rules — every rule ID found in the docs or in a code comment has a test whose
// name (an it() or test() title) carries that ID. The ID forms are package.json
// "checks".ruleId (a regex, or a list of one per form); a token written like a rule ID
// ("checks".ruleLike) in a test name in no allowed form fails, so a new form never counts
// for nothing, and a "checks".ruleUnqualified ID in a module's test names is noted. Such
// an ID (BR-5, BR-S4-1) repeats across modules, so a test named with it can't be tied to
// the rule stated: like a describe() title, it proves nothing here, and the ID counts as
// untested until it is qualified with its module. Ledger rows scope proof by module.
// IDs listed in the "checks".rulesBaseline file are known to lack a test; the list only
// shrinks: a listed ID that gains a test fails until its line is removed.
// `--write-baseline` writes the current untested IDs to that file, once, on adoption.
// It also reads the intent ledgers (intent.mjs): each row is reported as tested, partly
// tested or intent only, counting only tests under the module's "checks".intentTests paths,
// and a malformed row, a reused ID, an unknown proof ID or a missing test path fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config, exists, read, report, root } from "./lib.mjs";
import { forms, ledgers, problems, ruleMap, scope, skipped, state } from "./intent.mjs";

const cfg = config();
const intent = ledgers(cfg);
const map = ruleMap(cfg, skipped(intent));
const { stated, tests } = map;
const form = forms(cfg, intent, map);

const unqualified = cfg.ruleUnqualified ? new RegExp(`^(?:${cfg.ruleUnqualified})$`) : null;
const proven = (rule) => tests.has(rule) && !unqualified?.test(rule);
const untested = [...stated].filter(([rule]) => !proven(rule));
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
  ...[...baseline].filter(([rule]) => proven(rule)).map(([rule, line]) => `${cfg.rulesBaseline}:${line}: ${rule} has a test now; remove this line`),
  ...problems(cfg, intent, map),
  ...form.findings,
];
if (!stated.size) findings.push(`check:rules: no rule ID matching ${[cfg.ruleId].flat().join(" | ")} stated in ${cfg.docs}/ or code comments; set "checks".ruleId`);
const baselined = untested.filter(([rule]) => baseline.has(rule)).length;

const rows = intent.flatMap((l) => {
  const scoped = scope(cfg, l, map);
  return l.rows.filter((r) => typeof r.fields.id === "string").map((r) => ({ l, r, s: state(r, scoped) }));
});
const notes = [...rows.map(({ l, r, s }) => `INTENT-${l.module} ${r.fields.id}: ${s}`), ...form.notes];
const count = (s) => rows.filter((x) => x.s === s).length;
const intentPart = intent.length ? `; ${rows.length} intent rows: ${count("tested")} tested, ${count("partly tested")} partly tested, ${count("intent only")} intent only` : "";
const bareTotal = form.notes.length ? `; ${form.notes.length} unqualified rule IDs in module tests` : "";
const tested = [...tests.keys()].filter(proven).length;
report(`check:rules (${stated.size} rule IDs, ${tested} tested, ${baselined} baselined${intentPart}${bareTotal})`, findings, notes);
