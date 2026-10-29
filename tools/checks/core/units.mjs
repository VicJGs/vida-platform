// The doc unit format, defined once: check:docs validates units against it, docs-index
// builds docs/index.json from it, and get_context packs from that index.
import { read, walk } from "./lib.mjs";

export const REQUIRED = ["id", "kind", "module", "status", "supersedes", "summary", "anchors", "tokens"];
// Optional `links: [IDs]`: the unit's direct dependencies. get_context loads them after
// the units an issue links, one level deep; check:docs fails on a link to no active unit.
export const linksOf = (fm) => [fm?.links ?? []].flat();
export const ABSTRACT_MAX = 150;
export const BODY_MAX = 1500;
export const tokens = (text) => Math.ceil(text.length / 4);

// Minimal YAML frontmatter: `key: value`, `key: [a, b]` and `key:` followed by `- item` lines.
// Line endings are normalized first so token counts match across OSes (CRLF checkouts).
export function parse(raw) {
  const text = raw.replace(/\r\n/g, "\n");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const fm = {};
  let list = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && list) { fm[list].push(unquote(item[1])); continue; }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    list = value === "" ? key : null;
    fm[key] = value === "" ? [] : /^\[.*\]$/.test(value)
      ? value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter(Boolean)
      : unquote(value);
  }
  return { fm, body: text.slice(m[0].length), bodyLine: m[0].split("\n").length };
}
export const unquote = (s) => s.replace(/^(["'])(.*)\1$/, "$2");

// Every unit under the docs root. walk() skips archives; templates are shapes, not units.
export function units(cfg) {
  return walk(cfg.docs)
    .filter((p) => p.endsWith(".md") && !p.startsWith(`${cfg.docs}/templates/`))
    .map((path) => ({ path, ...(parse(read(path)) ?? {}) }));
}

// The index: frontmatter of each active unit, its path, and its measured body tokens.
// `links` appears only on units that declare it, so indexes without links stay valid.
export function buildIndex(all) {
  const entries = all
    .filter((u) => u.fm?.id && u.fm.status === "active")
    .map((u) => ({
      id: u.fm.id, kind: u.fm.kind, module: u.fm.module, status: u.fm.status,
      supersedes: [u.fm.supersedes ?? []].flat(), summary: u.fm.summary,
      anchors: [u.fm.anchors ?? []].flat(), ...(linksOf(u.fm).length && { links: linksOf(u.fm) }),
      tokens: tokens(u.body), path: u.path,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { generated: "node tools/checks/core/docs-index.mjs; do not edit", units: entries };
}

export const serialize = (index) => `${JSON.stringify(index, null, 2)}\n`;
