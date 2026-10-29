// check:one-way-door — a change under a one-way-door path (package.json
// "checks".oneWayDoor) needs the one-way-door label and a linked ADR whose file exists.
//   CI on a pull_request event: the PR's labels and body, read from $GITHUB_EVENT_PATH.
//   Anywhere else (pre-push, push CI, local): a commit trailer `One-Way-Door: ADR-012`
//   on the branch stands for the label and names the ADR.
// Usage: node one-way-door.mjs [--base <ref>]   (default origin/main, else main)
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { config, report, walk } from "./lib.mjs";

const cfg = config();
const git = (...args) => spawnSync("git", args, { encoding: "utf8" });
const arg = process.argv.indexOf("--base");
const base = arg > 0 ? process.argv[arg + 1]
  : ["origin/main", "main"].find((ref) => git("rev-parse", "--verify", "-q", ref).status === 0);
if (!base) report("check:one-way-door", ["no base ref: pass --base <ref>"]);

const lines = (out) => out.split(/\r?\n/).filter(Boolean);
const under = (p, d) => `/${p}`.includes(`/${d}`);
const isDoor = (p) => cfg.oneWayDoor.some((d) => under(p, d));
// A door path that matches no tracked file guards nothing, whatever the diff.
const tracked = lines(git("ls-files").stdout);
const unguarded = cfg.oneWayDoor.filter((d) => !tracked.some((p) => under(p, d)))
  .map((d) => `check:one-way-door: ${d} matches no tracked file; set "checks".oneWayDoor`);
const changed = lines(git("diff", "--name-only", `${base}...HEAD`).stdout);
const doors = changed.filter(isDoor);
if (!doors.length) report(`check:one-way-door (${changed.length} files changed since ${base}, none one-way)`, unguarded);

const adrs = cfg.adrDirs.flatMap((d) => walk(d));
const adrFile = (id) => adrs.find((p) => p.split("/").at(-1).toUpperCase().startsWith(id.toUpperCase()));
const ADR = /\bADR-\d+\b/gi;

let source, labelled, linked;
const event = process.env.GITHUB_EVENT_PATH && existsSync(process.env.GITHUB_EVENT_PATH)
  ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) : null;
if (event?.pull_request) {
  const pr = event.pull_request;
  source = `PR #${pr.number}`;
  labelled = (pr.labels ?? []).some((l) => l.name === cfg.oneWayDoorLabel);
  linked = [...(pr.body ?? "").matchAll(ADR)].map(([m]) => m);
} else {
  source = `commit trailers ${base}..HEAD`;
  const trailers = git("log", "--format=%(trailers:key=One-Way-Door,valueonly)", `${base}..HEAD`).stdout;
  linked = [...trailers.matchAll(ADR)].map(([m]) => m);
  labelled = linked.length > 0;
}

const findings = [...unguarded];
const list = doors.join(", ");
if (!labelled) findings.push(`${list}: one-way-door paths changed without the "${cfg.oneWayDoorLabel}" label (${source})`);
const found = linked.filter(adrFile);
if (!found.length) {
  findings.push(linked.length
    ? `${linked.join(", ")} named in ${source}, but no such ADR file under ${cfg.adrDirs.join(" or ")}`
    : `${list}: no linked ADR in ${source}`);
}
report(`check:one-way-door (${doors.length} one-way files; ADR ${found.join(", ") || "none"})`, findings);
