// Shared helpers for the TS/React/Drizzle check scripts. A repo copies this folder to
// tools/checks/ and runs each script from its root; paths come from package.json "checks".
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

export const DEFAULTS = {
  src: "src",
  e2e: "e2e",
  compositionRoot: "src/composition-root.ts",
  routes: "src/routes.tsx",
  entityFlags: "src/entity-flags.ts",
  navigation: "src/navigation.ts",
  schema: "src/db/schema",
  boundaries: [{ name: "ui-not-db", from: "^src/(pages|components|ui|routes)", to: "^src/db/" }],
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
  if (!statSync(abs).isDirectory()) return [dir];
  return readdirSync(abs).flatMap((name) => {
    if (["node_modules", ".git", "archive"].includes(name)) return [];
    return walk(`${dir}/${name}`);
  });
}

export const read = (rel) => readFileSync(join(root, rel), "utf8");
export const exists = (rel) => existsSync(join(root, rel));

export const TEST_FILE = /(^|\/)(e2e|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
export const CODE_FILE = /\.[cm]?[jt]sx?$/;

// The property names at the top level of the object literal opening at `start` ("{").
export function topLevelKeys(src, start) {
  const keys = [];
  let depth = 0;
  let expectKey = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (src.startsWith("//", i)) { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (src.startsWith("/*", i)) { i = src.indexOf("*/", i) + 1; if (i < 1) break; continue; }
    if (c === '"' || c === "'" || c === "`") { i = src.indexOf(c, i + 1); if (i < 0) break; expectKey = false; continue; }
    if ("{([".includes(c)) { depth++; expectKey = depth === 1; continue; }
    if ("})]".includes(c)) { if (--depth === 0) break; continue; }
    if (depth !== 1 || /\s/.test(c)) continue;
    if (c === "," || c === ";") { expectKey = true; continue; }
    if (expectKey) {
      const m = src.slice(i).match(/^(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*[:,;}(]/);
      if (m) keys.push(m[1]);
    }
    expectKey = false;
  }
  return keys;
}

// A relative import from `fromFile`, resolved to an existing repo file.
export function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = normalize(join(dirname(fromFile), spec)).replaceAll("\\", "/");
  return ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"].map((ext) => base + ext)
    .find((p) => exists(p) && statSync(join(root, p)).isFile()) ?? null;
}

// String literals in the array assigned to `name` (`name = [...]` or `name: [...]`).
export function stringArray(src, name) {
  const m = src.match(new RegExp(`\\b${name}\\b[^=:\\n]*[=:]\\s*\\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map(([, s]) => s) : [];
}

// Route objects tagged with an entity: `{ path: "/x", entity: "x", ... }`, no nested braces.
export function taggedRoutes(src) {
  return [...src.matchAll(/\{[^{}]*?\bentity:\s*["'](\w+)["'][^{}]*\}/g)].map(([obj, entity]) => ({
    entity, path: obj.match(/\bpath:\s*["']([^"']+)["']/)?.[1] ?? null,
  }));
}

// Prints one line per finding and exits 1 if there are any.
export function report(name, findings, notes = []) {
  for (const n of notes) console.log(`note ${n}`);
  for (const f of findings) console.log(`FAIL ${f}`);
  console.log(`${findings.length ? "FAIL" : "ok  "} ${name} (${findings.length} findings)`);
  process.exit(findings.length ? 1 : 0);
}
