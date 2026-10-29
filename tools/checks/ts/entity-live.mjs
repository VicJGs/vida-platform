// check:entity-live — every service the composition root returns from getServices()
// is live: a route tagged with its entity, a use<Entity> hook imported by a route
// component, and an e2e spec tagged @entity:<key>. Entities in the flags file's
// notLive list are exempt; check:no-stub-nav keeps them out of navigation.
import { config, exists, read, report, resolveImport, stringArray, taggedRoutes, topLevelKeys, walk } from "./lib.mjs";

const cfg = config();
if (!exists(cfg.compositionRoot)) report("check:entity-live", [`${cfg.compositionRoot} not found; set "checks".compositionRoot`]);

// Comments blanked to spaces, offsets kept, so a name in a comment never matches.
const rootSrc = read(cfg.compositionRoot).replace(
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
  (m, str) => str ?? m.replace(/[^\n]/g, " "),
);

// Walks from `i` until `stop(char, depth)` holds, skipping strings; returns that offset.
function scan(src, i, stop) {
  for (let depth = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") { i = src.indexOf(c, i + 1); if (i < 0) break; continue; }
    if ("{([".includes(c)) depth++;
    else if ("})]".includes(c)) depth--;
    if (stop(c, depth, i)) return i;
  }
  return src.length;
}

// The "{" opening the body of function `name` declared in this file, or -1.
function bodyOf(src, name) {
  const m = new RegExp(`\\b(?:function\\s*\\*?\\s*${name}\\b|(?:const|let|var)\\s+${name}\\b[^=]*=\\s*(?:async\\s*)?(?:function\\b)?)\\s*[^(]*\\(`).exec(src);
  if (!m) return -1;
  const params = scan(src, m.index + m[0].length - 1, (c, depth) => depth === 0);
  return src.indexOf("{", params);
}

// What function `name` returns at the top level of its body: an object literal's keys, or,
// for `return compose(...)` / `return await build()`, what the called same-file function returns.
function servicesOf(src, name, seen = new Set()) {
  const open = seen.has(name) ? -1 : bodyOf(src, name);
  seen.add(name);
  if (open < 0) return [];
  const returns = [];
  scan(src, open, (c, depth, i) => {
    if (depth === 1 && src.startsWith("return", i) && !/[\w$]/.test(src[i - 1]) && !/[\w$]/.test(src[i + 6] ?? "")) returns.push(i + 6);
    return depth === 0;
  });
  return returns.flatMap((start) => {
    const literal = /^\s*(?:await\s+)?\(?\s*\{/.exec(src.slice(start));
    if (literal) return topLevelKeys(src, start + literal[0].length - 1);
    const end = scan(src, start, (c, depth) => depth < 0 || (depth === 0 && (c === ";" || c === "\n")));
    return [...src.slice(start, end).matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)].flatMap(([, f]) => servicesOf(src, f, seen));
  });
}

if (bodyOf(rootSrc, "getServices") < 0) report("check:entity-live", [`${cfg.compositionRoot}: no getServices() function`]);
const services = [...new Set(servicesOf(rootSrc, "getServices"))];
if (!services.length) report("check:entity-live", [`${cfg.compositionRoot}: getServices() returns no services; return an object literal, or a call to a function in this file that returns one`]);

const notLive = new Set(exists(cfg.entityFlags) ? stringArray(read(cfg.entityFlags), "notLive") : []);
const routesSrc = exists(cfg.routes) ? read(cfg.routes) : "";
const routed = new Set(taggedRoutes(routesSrc).map((r) => r.entity));

// Route components: JSX elements, `Component: X` and lazy imports, resolved to files.
const imports = new Map();
for (const [, named, def, spec] of routesSrc.matchAll(/import\s+(?:\{([^}]*)\}|(\w+))\s+from\s+["']([^"']+)["']/g)) {
  for (const name of (named ?? def).split(",").map((s) => s.trim().split(/\s+as\s+/).at(-1)).filter(Boolean)) imports.set(name, spec);
}
const used = [...routesSrc.matchAll(/<([A-Z]\w*)|\b[Cc]omponent:\s*([A-Z]\w*)/g)].map(([, a, b]) => imports.get(a ?? b)).filter(Boolean);
const lazy = [...routesSrc.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map(([, s]) => s);
const components = [...new Set([...used, ...lazy])].map((s) => resolveImport(cfg.routes, s)).filter(Boolean).map(read);

const e2e = walk(cfg.e2e).map(read).join("\n");
const hook = (key) => `use${key[0].toUpperCase()}${key.slice(1)}`;

const rows = services.filter((key) => !notLive.has(key)).map((key) => ({
  key,
  route: routed.has(key),
  hook: components.some((c) => new RegExp(`import[^;]*\\b${hook(key)}\\b[^;]*from`).test(c)),
  e2e: new RegExp(`@entity:${key}\\b`).test(e2e),
}));
const findings = rows.filter((r) => !(r.route && r.hook && r.e2e)).map((r) => [
  r.key.padEnd(16),
  r.route ? "route ok" : `no route tagged entity: "${r.key}" in ${cfg.routes}`,
  r.hook ? `${hook(r.key)} ok` : `no route component imports ${hook(r.key)}`,
  r.e2e ? "e2e ok" : `no e2e spec tagged @entity:${r.key} under ${cfg.e2e}/`,
].join(" | "));

report(`check:entity-live (${rows.length} live entities, ${notLive.size} not live)`, findings);
