// check:boundaries — imports run only along allowed directions. Each entry in
// package.json "checks".boundaries forbids imports from `from` to `to` (path regexes);
// the default keeps UI out of db. Runs the repo's own dependency-cruiser with the swc
// parser (npm i -D dependency-cruiser @swc/core): dependency-cruiser 18 cannot use
// TypeScript 7's compiler and, without swc, silently cruises nothing.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config, exists, read, report, root, walk } from "./lib.mjs";

const cfg = config();
// A rule whose `from` matches no file under src forbids nothing.
const files = walk(cfg.src);
const unmatched = cfg.boundaries.filter((b) => !files.some((p) => new RegExp(b.from).test(p)))
  .map((b) => `check:boundaries: rule ${b.name} (from ${b.from}) matches no file under ${cfg.src}/; set "checks".boundaries`);
// Its package.json is not in "exports", so locate it on disk rather than via require.
const pkg = "node_modules/dependency-cruiser/package.json";
if (!exists(pkg)) report("check:boundaries", [...unmatched, "dependency-cruiser is not installed: npm i -D dependency-cruiser"]);
const bin = join(root, "node_modules", "dependency-cruiser", JSON.parse(read(pkg)).bin.depcruise);

const depConfig = {
  forbidden: cfg.boundaries.map((b) => ({
    name: b.name, severity: "error", comment: `${b.from} must not import ${b.to}`,
    from: { path: b.from }, to: { path: b.to },
  })),
  options: {
    parser: "swc",
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    ...(exists("tsconfig.json") ? { tsConfig: { fileName: "tsconfig.json" } } : {}),
  },
};
const file = join(mkdtempSync(join(tmpdir(), "boundaries-")), "depcruise.json");
writeFileSync(file, JSON.stringify(depConfig));

const r = spawnSync(process.execPath, [bin, cfg.src, "--config", file, "--output-type", "err"], { cwd: root, encoding: "utf8" });
const out = `${r.stdout}${r.stderr}`.trim();
const findings = [...unmatched, ...out.split(/\r?\n/).filter((l) => /^\s*error\s/.test(l)).map((l) => l.trim())];
if (r.status !== 0 && !findings.length) findings.push(`dependency-cruiser exited ${r.status}: ${out}`);
const cruised = Number(out.match(/(\d+) modules/)?.[1] ?? 0);
if (!cruised) findings.push(`dependency-cruiser cruised 0 modules under ${cfg.src}/, so nothing was checked: ${out}`);
report(`check:boundaries (${cfg.boundaries.length} rules over ${cfg.src}/)`, findings);
