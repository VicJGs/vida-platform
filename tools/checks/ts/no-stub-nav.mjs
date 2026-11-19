// check:no-stub-nav — navigation links only routes that exist: every route path the
// navigation file names (as `<navPath>: "/..."`; "checks".navPath, default path) is a path
// the routes file registers. A dead link renders the not-found page, a stub shown as a feature.
import { config, exists, read, report } from "./lib.mjs";

const cfg = config();
const missing = [["routes", cfg.routes], ["navigation", cfg.navigation]]
  .filter(([, path]) => !exists(path))
  .map(([key, path]) => `check:no-stub-nav: ${path} does not exist; set "checks".${key}`);
if (missing.length) report("check:no-stub-nav", missing);

const paths = (src, key) => [...src.matchAll(new RegExp(`\\b${key}:\\s*["'\`](/[^"'\`]*)["'\`]`, "g"))].map(([, p]) => p);
const registered = new Set(paths(read(cfg.routes), "path"));
const linked = [...new Set(paths(read(cfg.navigation), cfg.navPath))];
if (!linked.length) {
  report("check:no-stub-nav", [`check:no-stub-nav: ${cfg.navigation} names no route path as ${cfg.navPath}: "/..."; set "checks".navPath`]);
}
const findings = linked.filter((p) => !registered.has(p)).map((p) => `${cfg.navigation} links ${p}, which ${cfg.routes} does not register`);
report(`check:no-stub-nav (${linked.length} nav links, ${linked.length - findings.length} registered)`, findings);
