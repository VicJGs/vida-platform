// changed — classifies the branch for the gate by the paths changed since its merge base
// with the base ref, printing the first tier whose allow-lists cover every path:
//   docs      "checks".docsTier                          → the fast checks
//   checks    + "checks".checksTier (the gate's own files) → the fast checks; no test can
//             fail on a change to a check, and the checks themselves still run
//   affected  + "checks".affectedTier (workspace packages) → the fast checks, then the
//             package tasks of the changed packages and their dependents
//   code      anything else → the full gate: hooks, root configs and the lockfile (a
//             task runner may not count them as any package's input), unknown paths, and
//             an empty or unreadable diff.
// A `package.json` entry matches the root package.json only when its change sits inside
// "checks" and leaves the three tier lists alone, so a branch cannot widen its own tier.
// Renames count both paths.
// --visual asks another question, whether the slice runs the visual gate: `visual` when a
// changed path matches "checks".visualPaths and not "checks".visualIgnore (tests, stories),
// else `none`. The changed paths go to stderr, so the gate knows which screens to shoot.
// Like the tiers it fails safe: no base, an unreadable diff or a branch that edits either
// list reports `visual`; an empty diff reports `none`.
// Usage: node changed.mjs [--base <ref>] [--visual]   (default origin/main, else main)
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { config } from "./lib.mjs";

const cfg = config();
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
const arg = process.argv.indexOf("--base");
const visual = process.argv.includes("--visual");
const base = arg > 0 ? process.argv[arg + 1]
  : ["origin/main", "main"].find((ref) => git("rev-parse", "--verify", "-q", ref).status === 0);

const code = (why) => {
  console.error(`changed: ${why}`);
  console.log(visual ? "visual" : "code");
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
  return { rest, docsTier: checks?.docsTier, checksTier: checks?.checksTier, affectedTier: checks?.affectedTier };
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
if (!paths.length && !visual) code(`nothing changed since ${base}`);

const covers = (list) => {
  const tier = [list ?? []].flat();
  const globs = tier.filter((p) => p !== "package.json").map(glob);
  return (path) => path === "package.json"
    ? tier.includes("package.json") && checksOnly(from, "HEAD")
    : globs.some((g) => g.test(path));
};
if (visual) {
  const lists = (pkg) => [pkg?.checks?.visualPaths, pkg?.checks?.visualIgnore];
  if (!isDeepStrictEqual(lists(pkgAt(from)), lists(pkgAt("HEAD")))) code(`"checks".visualPaths or visualIgnore changed`);
  const [shown, ignored] = [covers(cfg.visualPaths), covers(cfg.visualIgnore)];
  const screens = paths.filter((p) => shown(p) && !ignored(p));
  console.error(screens.length
    ? `changed: ${screens.length} of ${paths.length} paths are visual: ${screens.join(", ")}`
    : `changed: none of ${paths.length} paths match "checks".visualPaths outside visualIgnore`);
  console.log(screens.length ? "visual" : "none");
  process.exit(0);
}
const tiers = [["docs", cfg.docsTier], ["checks", cfg.checksTier], ["affected", cfg.affectedTier]];
const lists = [];
for (const [name, list] of tiers) {
  lists.push(covers(list));
  if (paths.every((p) => lists.some((inTier) => inTier(p)))) {
    console.log(name);
    process.exit(0);
  }
}
const outside = paths.filter((p) => !lists.some((inTier) => inTier(p)));
code(`${outside.length} of ${paths.length} paths outside "checks".docsTier, checksTier and affectedTier: ${outside.slice(0, 5).join(", ")}`);
