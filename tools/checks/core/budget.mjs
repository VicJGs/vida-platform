// check:budget — the agent instruction files stay inside their token budgets (doc 5,
// Targets; doc 2, 7.1). Standing context is what Claude Code loads at launch: the root
// CLAUDE.md, .claude/CLAUDE.md and every .claude/rules/**/*.md without `paths`
// frontmatter; it stays ≤ 15k tokens, and the root CLAUDE.md alone ≤ 2k. Every other
// CLAUDE.md is a layer file, loaded when Claude works in its folder; each stays ≤ 1k.
// Layer files listed in the "checks".budgetBaseline file (`<path> <tokens>` per line) were
// over budget on adoption: each may not grow past its line, and one back under budget, or
// gone, fails until its line is removed, so the list only shrinks.
// `--write-baseline` writes the current over-budget layer files to that file, once.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config, exists, read, report, root } from "./lib.mjs";
import { tokens } from "./units.mjs";

export const ROOT_MAX = 2000;
export const STANDING_MAX = 15000;
export const LAYER_MAX = 1000;

const cfg = config();
const findings = [];
const notes = [];

const listed = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
if (listed.status !== 0) report("check:budget", [`check:budget needs a git work tree; git ls-files failed: ${listed.stderr.trim()}`]);
const files = listed.stdout.split("\0").filter((f) => f && exists(f)
  && !/(?:^|\/)(?:node_modules|archive|_archive)\//.test(f) && !f.startsWith(".claude/worktrees/"));

// A rule whose frontmatter sets `paths` loads only with matching files, not at launch.
const scoped = (text) => /^paths\s*:/m.test(text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)?.[1] ?? "");
const isRule = (f) => f.startsWith(".claude/rules/") && f.endsWith(".md");
const standing = files.filter((f) => f === "CLAUDE.md" || f === ".claude/CLAUDE.md" || (isRule(f) && !scoped(read(f))));
const layers = files.filter((f) => /(?:^|\/)CLAUDE\.md$/.test(f) && f !== "CLAUDE.md" && f !== ".claude/CLAUDE.md");
const size = new Map([...standing, ...layers].map((f) => [f, tokens(read(f))]));

if (!files.includes("CLAUDE.md")) findings.push("check:budget: no CLAUDE.md at the repo root; standing context has nothing to measure");
else if (size.get("CLAUDE.md") > ROOT_MAX) findings.push(`CLAUDE.md: ~${size.get("CLAUDE.md")} tokens (limit ${ROOT_MAX}); move reference material into doc units`);
const total = standing.reduce((n, f) => n + size.get(f), 0);
if (total > STANDING_MAX) {
  findings.push(`standing context: ~${total} tokens (limit ${STANDING_MAX}): ${standing.map((f) => `${f} ${size.get(f)}`).join(", ")}`);
}

const over = layers.filter((f) => size.get(f) > LAYER_MAX).sort();
if (process.argv.includes("--write-baseline")) {
  mkdirSync(dirname(join(root, cfg.budgetBaseline)), { recursive: true });
  writeFileSync(join(root, cfg.budgetBaseline), over.map((f) => `${f} ${size.get(f)}\n`).join(""));
}

// The baseline: `<path> <tokens>` per line; blank lines are ignored.
const baseline = new Map();
if (exists(cfg.budgetBaseline)) {
  read(cfg.budgetBaseline).split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.trim().match(/^(\S+)\s+(\d+)$/);
    if (m) baseline.set(m[1], { cap: Number(m[2]), line: i + 1 });
    else findings.push(`${cfg.budgetBaseline}:${i + 1}: expected "<path> <tokens>", got "${line.trim()}"`);
  });
}
for (const f of over) {
  const entry = baseline.get(f);
  if (!entry) findings.push(`${f}: ~${size.get(f)} tokens (limit ${LAYER_MAX}); keep layer rules only, move reference material into doc units`);
  else if (size.get(f) > entry.cap) findings.push(`${f}: ~${size.get(f)} tokens, over its baseline ${entry.cap} (${cfg.budgetBaseline}:${entry.line}); shrink it back`);
  else if (size.get(f) < entry.cap) notes.push(`${f} is ~${size.get(f)} tokens; ${cfg.budgetBaseline}:${entry.line} can drop to ${size.get(f)}`);
}
for (const [f, { line }] of baseline) {
  if (!size.has(f)) findings.push(`${cfg.budgetBaseline}:${line}: ${f} is no layer file any more; remove this line`);
  else if (size.get(f) <= LAYER_MAX) findings.push(`${cfg.budgetBaseline}:${line}: ${f} is ~${size.get(f)} tokens, within budget now; remove this line`);
}

report(`check:budget (root ~${size.get("CLAUDE.md") ?? 0}/${ROOT_MAX}, standing ~${total}/${STANDING_MAX} in ${standing.length} files, ${layers.length} layer files, ${over.length} over ${LAYER_MAX}, ${baseline.size} baselined)`, findings, notes);
