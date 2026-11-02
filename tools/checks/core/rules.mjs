// check:rules — every rule ID found in the docs or in a code comment has a test whose
// name carries that ID. The ID format is package.json "checks".ruleId (a regex).
// IDs listed in the "checks".rulesBaseline file are known to lack a test; the list only
// shrinks: a listed ID that gains a test fails until its line is removed.
// `--write-baseline` writes the current untested IDs to that file, once, on adoption.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CODE_FILE, TEST_FILE, config, exists, read, report, root, walk } from "./lib.mjs";

const cfg = config();
const id = new RegExp(`\\b${cfg.ruleId}\\b`, "g");
const repo = walk(".").map((f) => f.slice(2)).filter((f) => !f.startsWith(".claude/worktrees/"));
const under = (dir) => (f) => dir === "." || f.startsWith(`${dir}/`);

// Where each rule ID is stated: any docs file, or a comment in non-test code under src.
const stated = new Map();
const note = (rule, where) => stated.has(rule) || stated.set(rule, where);
for (const path of repo.filter((p) => !TEST_FILE.test(p) && (under(cfg.src)(p) || under(cfg.docs)(p)))) {
  const text = read(path);
  const scope = under(cfg.docs)(path) ? text
    : CODE_FILE.test(path) ? (text.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) ?? []).join("\n")
    : "";
  for (const [rule] of scope.matchAll(id)) note(rule, path);
}

// Test names, from test files anywhere in the repo: the title string of it(), test() or
// describe(), modifiers included.
const tested = new Set();
const title = /\b(?:it|test|describe)(?:\.\w+)*\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
for (const path of repo.filter((p) => TEST_FILE.test(p) && CODE_FILE.test(p))) {
  for (const [, , name] of read(path).matchAll(title)) for (const [rule] of name.matchAll(id)) tested.add(rule);
}

const untested = [...stated].filter(([rule]) => !tested.has(rule));
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
  ...[...baseline].filter(([rule]) => tested.has(rule)).map(([rule, line]) => `${cfg.rulesBaseline}:${line}: ${rule} has a test now; remove this line`),
];
if (!stated.size) findings.push(`check:rules: no rule ID matching ${cfg.ruleId} stated in ${cfg.docs}/ or code comments; set "checks".ruleId`);
const baselined = untested.filter(([rule]) => baseline.has(rule)).length;
report(`check:rules (${stated.size} rule IDs, ${tested.size} tested, ${baselined} baselined)`, findings);
