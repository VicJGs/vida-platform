// check:docs — the documentation writing rules, per doc unit (every .md under the
// docs root, archive and templates excluded; the format lives in units.mjs), plus a
// current docs/index.json. Rule 6 (structured facts as data) and "agents never browse"
// (rule 10) describe where facts live and how agents read them; no file check can
// prove them, so they stay with the reviewer.
import { config, exists, read, report } from "./lib.mjs";
import { ABSTRACT_MAX, BODY_MAX, REQUIRED, buildIndex, linksOf, serialize, tokens, unquote, units as load } from "./units.mjs";

const FORBIDDEN_HEADING = /^#{1,6}\s+(status|steps|next steps|history|changelog|progress|todo)\b/i;

function glossaryTerms(path) {
  if (!exists(path)) return null;
  const terms = new Set();
  for (const line of read(path).split(/\r?\n/)) {
    const m = line.match(/^\s*-?\s*term:\s*(.+)$/) ?? line.match(/^([A-Za-z][\w-]*):/);
    if (m) terms.add(unquote(m[1].trim()));
  }
  return terms;
}

// All-caps codes in prose: code, links and IDs (anything ending in -<digits>) removed.
function codes(body) {
  const prose = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/\b[A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*-\d+\b/g, "");
  return [...new Set(prose.match(/\b[A-Z][A-Z0-9]*[A-Z](?:-[A-Z0-9]+)*\b/g) ?? [])];
}

const cfg = config();
const units = load(cfg);
const glossary = glossaryTerms(cfg.glossary);
const findings = [];
const ids = new Map();
if (!units.length) findings.push(`check:docs: no doc units under ${cfg.docs}/; set "checks".docs`);

for (const u of units) {
  if (!u.fm) { findings.push(`${u.path}: rule 2, no frontmatter`); continue; }
  const missing = REQUIRED.filter((k) => !(k in u.fm));
  if (missing.length) findings.push(`${u.path}: rule 2, frontmatter missing ${missing.join(", ")}`);

  if (u.fm.id) {
    if (ids.has(u.fm.id)) findings.push(`${u.path}: rule 1, id ${u.fm.id} also used by ${ids.get(u.fm.id)}`);
    else ids.set(u.fm.id, u.path);
  }

  if ("summary" in u.fm && (typeof u.fm.summary !== "string" || !u.fm.summary)) findings.push(`${u.path}: rule 3, summary must be one non-empty line`);
  const abstract = u.body.replace(/^\s*#[^\n]*\n/, "").trim().split(/\r?\n\s*\r?\n/)[0] ?? "";
  if (tokens(abstract) > ABSTRACT_MAX) findings.push(`${u.path}: rule 3, abstract ~${tokens(abstract)} tokens (limit ${ABSTRACT_MAX})`);
  if (tokens(u.body) > BODY_MAX) findings.push(`${u.path}: rule 3, body ~${tokens(u.body)} tokens (limit ${BODY_MAX}); split the unit`);

  for (const anchor of [u.fm.anchors ?? []].flat()) {
    const [file, symbol] = anchor.split("#");
    if (!exists(file)) findings.push(`${u.path}: rule 4, anchor ${anchor}: ${file} does not exist`);
    else if (symbol && !new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(read(file))) {
      findings.push(`${u.path}: rule 4, anchor ${anchor}: ${symbol} not found in ${file}`);
    }
  }

  if (/^REF-/.test(u.fm.id ?? "") && u.fm.generated !== "true") findings.push(`${u.path}: rule 5, REF-* units are generated; add generated: true`);

  u.body.split(/\r?\n/).forEach((line, i) => {
    if (FORBIDDEN_HEADING.test(line)) findings.push(`${u.path}:${u.bodyLine + i}: rule 7, "${line.trim()}": status, steps and history live in Linear and git`);
  });

  const unknown = codes(u.body).filter((c) => !glossary?.has(c));
  if (unknown.length) findings.push(`${u.path}: rule 9, ${unknown.join(", ")} not in ${cfg.glossary}`);
}

const active = new Set(units.filter((u) => u.fm?.status === "active").map((u) => u.fm.id));
for (const u of units) {
  for (const old of [u.fm?.supersedes ?? []].flat()) {
    if (ids.has(old)) findings.push(`${u.path}: rule 8, supersedes ${old}, which is still active at ${ids.get(old)}; move it to the archive`);
  }
  for (const link of linksOf(u.fm)) {
    if (!active.has(link)) findings.push(`${u.path}: links ${link}, which is ${ids.has(link) ? `not active (${ids.get(link)})` : "no unit"}; link an active unit`);
  }
}

// Rule 10: agents fetch through get_context, which reads only the generated index.
const index = serialize(buildIndex(units));
if (!exists(cfg.index)) findings.push(`${cfg.index}: rule 10, missing; run node tools/checks/core/docs-index.mjs`);
else if (read(cfg.index).replace(/\r\n/g, "\n") !== index) findings.push(`${cfg.index}: rule 10, stale; run node tools/checks/core/docs-index.mjs`);

report(`check:docs ${cfg.docs}/ (${units.length} units)`, findings, ["rule 6 and the fetch-only half of rule 10 are not file-checkable; the reviewer covers them"]);
