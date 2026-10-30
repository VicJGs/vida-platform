// check:rules — every rule ID found in the docs or in a code comment has a test whose
// name carries that ID. The ID format is package.json "checks".ruleId (a regex).
import { CODE_FILE, TEST_FILE, config, read, report, walk } from "./lib.mjs";

const cfg = config();
const id = new RegExp(`\\b${cfg.ruleId}\\b`, "g");
const files = [...new Set([...walk(cfg.src), ...walk(cfg.docs), ...walk("e2e")])];

// Where each rule ID is stated: any docs file, or a comment in non-test code.
const stated = new Map();
const note = (rule, where) => stated.has(rule) || stated.set(rule, where);
for (const path of files.filter((p) => !TEST_FILE.test(p))) {
  const text = read(path);
  const scope = path.startsWith(`${cfg.docs}/`) ? text
    : CODE_FILE.test(path) ? (text.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g) ?? []).join("\n")
    : "";
  for (const [rule] of scope.matchAll(id)) note(rule, path);
}

// Test names: the title string of it(), test() or describe(), modifiers included.
const tested = new Set();
const title = /\b(?:it|test|describe)(?:\.\w+)*\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
for (const path of files.filter((p) => TEST_FILE.test(p) && CODE_FILE.test(p))) {
  for (const [, , name] of read(path).matchAll(title)) for (const [rule] of name.matchAll(id)) tested.add(rule);
}

const findings = [...stated].filter(([rule]) => !tested.has(rule)).map(([rule, where]) => `${rule} (stated in ${where}) has no test named with it`);
if (!stated.size) findings.push(`check:rules: no rule ID matching ${cfg.ruleId} stated in ${cfg.docs}/ or code comments; set "checks".ruleId`);
report(`check:rules (${stated.size} rule IDs, ${tested.size} tested)`, findings);
