// check:entity-live — every service the composition root returns from getServices()
// is live: a route tagged with its entity, a use<Entity> hook imported by a route
// component, and an e2e spec tagged @entity:<key>. Entities in the flags file's
// notLive list are exempt; check:no-stub-nav keeps them out of navigation.
import { config, exists, read, report, resolveImport, stringArray, taggedRoutes, topLevelKeys, walk } from "./lib.mjs";

const cfg = config();
if (!exists(cfg.compositionRoot)) report("check:entity-live", [`${cfg.compositionRoot} not found; set "checks".compositionRoot`]);

const rootSrc = read(cfg.compositionRoot);
const fn = rootSrc.search(/\bgetServices\b[^{]*\{/);
const ret = fn < 0 ? -1 : rootSrc.indexOf("return", fn);
const open = ret < 0 ? -1 : rootSrc.indexOf("{", ret);
if (open < 0) report("check:entity-live", [`${cfg.compositionRoot}: no getServices() returning an object literal`]);
const services = topLevelKeys(rootSrc, open);

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
