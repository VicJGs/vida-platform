// check:no-stub-nav — routes of entities the flags file marks notLive stay out of
// navigation: the navigation file names neither their path nor their entity.
import { config, exists, read, report, stringArray, taggedRoutes } from "./lib.mjs";

const cfg = config();
const notLive = exists(cfg.entityFlags) ? stringArray(read(cfg.entityFlags), "notLive") : [];
const routes = exists(cfg.routes) ? taggedRoutes(read(cfg.routes)) : [];
const nav = exists(cfg.navigation) ? read(cfg.navigation) : "";
const quoted = (s) => new RegExp(`["'\`]${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`);

const findings = [];
for (const [key, path] of [["entityFlags", cfg.entityFlags], ["navigation", cfg.navigation]]) {
  if (!exists(path)) findings.push(`check:no-stub-nav: ${path} does not exist; set "checks".${key}`);
}
for (const entity of notLive) {
  if (new RegExp(`\\bentity:\\s*["']${entity}["']`).test(nav)) findings.push(`${cfg.navigation} links not-live entity ${entity}`);
  for (const r of routes.filter((x) => x.entity === entity && x.path)) {
    if (quoted(r.path).test(nav)) findings.push(`${cfg.navigation} links ${r.path}, a route of not-live entity ${entity}`);
  }
}
report(`check:no-stub-nav (${notLive.length} not-live entities)`, findings);
