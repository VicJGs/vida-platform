// Shared helpers for the check scripts. A repo copies this folder to tools/checks/
// and runs each script from its root; paths come from package.json "checks".
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const DEFAULTS = {
  src: "src",
  docs: "docs",
  glossary: "docs/glossary.yaml",
  index: "docs/index.json",
  adrDirs: ["docs/decisions", ".adr"],
  ruleId: "RULE-[A-Z]+-\\d+",
  oneWayDoor: ["schema/", "migrations/", "encryption/", "sync/"],
  oneWayDoorLabel: "one-way-door",
};

export const root = process.cwd();

export function config() {
  const pkg = join(root, "package.json");
  const own = existsSync(pkg) ? JSON.parse(readFileSync(pkg, "utf8")).checks ?? {} : {};
  return { ...DEFAULTS, ...own };
}

// Repo-relative paths with forward slashes, skipping dependencies, VCS and archives.
export function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    if (["node_modules", ".git", "archive", "_archive"].includes(name)) return [];
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

export const read = (rel) => readFileSync(join(root, rel), "utf8");
export const exists = (rel) => existsSync(join(root, rel));
export const rel = (abs) => relative(root, abs).replaceAll("\\", "/");

export const TEST_FILE = /(^|\/)(e2e|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
export const CODE_FILE = /\.[cm]?[jt]sx?$/;

// Prints one line per finding and exits 1 if there are any.
export function report(name, findings, notes = []) {
  for (const n of notes) console.log(`note ${n}`);
  for (const f of findings) console.log(`FAIL ${f}`);
  console.log(`${findings.length ? "FAIL" : "ok  "} ${name} (${findings.length} findings)`);
  process.exit(findings.length ? 1 : 0);
}
