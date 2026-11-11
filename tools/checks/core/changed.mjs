// changed — classifies the branch for the gate: prints `docs` when every path changed
// since its merge base with the base ref matches the docs allow-list ("checks".docsTier),
// else `code`. A `package.json` entry matches the root package.json only when its change
// sits inside "checks" and leaves "checks".docsTier alone, so a branch cannot widen its
// own tier. Anything else is `code`: hooks, the gate itself (tools/checks/**), unknown
// paths, and an empty or unreadable diff. Renames count both paths.
// Usage: node changed.mjs [--base <ref>]   (default origin/main, else main)
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { config } from "./lib.mjs";

const cfg = config();
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
const arg = process.argv.indexOf("--base");
const base = arg > 0 ? process.argv[arg + 1]
  : ["origin/main", "main"].find((ref) => git("rev-parse", "--verify", "-q", ref).status === 0);

const code = (why) => {
  console.error(`changed: ${why}`);
  console.log("code");
  process.exit(0);
};

// `**/` is any folders (or none), `**` anything, `*` and `?` stay inside one folder.
const glob = (pattern) => new RegExp(`^${pattern.split(/(\*\*\/|\*\*|\*|\?)/).map((part) => (
  { "**/": "(?:.*/)?", "**": ".*", "*": "[^/]*", "?": "[^/]" }[part] ?? part.replace(/[.+^${}()|[\]\\]/g, "\\$&")
)).join("")}$`);

const pkgAt = (rev) => {
  const r = git("show", `${rev}:package.json`);
  if (r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
};
const outsideChecks = (pkg) => {
  const { checks, ...rest } = pkg;
  return { rest, docsTier: checks?.docsTier };
};
const checksOnly = (from, to) => {
  const [a, b] = [pkgAt(from), pkgAt(to)];
  return a !== null && b !== null && isDeepStrictEqual(outsideChecks(a), outsideChecks(b));
};

if (!base) code("no base ref: pass --base <ref>");
const mergeBase = git("merge-base", base, "HEAD");
if (mergeBase.status !== 0) code(`no merge base with ${base}`);
const from = mergeBase.stdout.trim();
const diff = git("diff", "--name-only", "--no-renames", from, "HEAD");
if (diff.status !== 0) code(`git diff failed: ${diff.stderr.trim()}`);
const paths = diff.stdout.split(/\r?\n/).filter(Boolean);
if (!paths.length) code(`nothing changed since ${base}`);

const tier = [cfg.docsTier].flat();
const globs = tier.filter((p) => p !== "package.json").map(glob);
const isDocs = (path) => path === "package.json"
  ? tier.includes("package.json") && checksOnly(from, "HEAD")
  : globs.some((g) => g.test(path));
const outside = paths.filter((p) => !isDocs(p));
if (outside.length) code(`${outside.length} of ${paths.length} paths outside "checks".docsTier: ${outside.slice(0, 5).join(", ")}`);
console.log("docs");
