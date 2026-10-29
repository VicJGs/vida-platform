// check:types-derived — no hand-written interface or object type duplicates a Drizzle
// table: one that declares every column of a table is a copy; derive it instead
// (typeof table.$inferSelect).
import { CODE_FILE, TEST_FILE, config, read, report, topLevelKeys, walk } from "./lib.mjs";

const cfg = config();
const TABLE = /export\s+const\s+(\w+)\s*=\s*(?:pg|sqlite|mysql)Table\(\s*["'][^"']+["']\s*,\s*\{/g;
const tables = walk(cfg.schema).filter((p) => CODE_FILE.test(p)).flatMap((path) => {
  const src = read(path);
  return [...src.matchAll(TABLE)].map((m) => ({ name: m[1], path, columns: topLevelKeys(src, m.index + m[0].length - 1) }));
}).filter((t) => t.columns.length >= 2);

const TYPE = /\b(?:interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends[^{]+)?|type\s+(\w+)(?:<[^>]*>)?\s*=)\s*\{/g;
const findings = [];
for (const path of walk(cfg.src).filter((p) => CODE_FILE.test(p) && !TEST_FILE.test(p) && !p.startsWith(`${cfg.schema}/`))) {
  const src = read(path);
  for (const m of src.matchAll(TYPE)) {
    const fields = new Set(topLevelKeys(src, m.index + m[0].length - 1));
    for (const t of tables.filter((x) => x.columns.every((c) => fields.has(c)))) {
      findings.push(`${path}: ${m[1] ?? m[2]} restates every column of ${t.name} (${t.path}); use typeof ${t.name}.$inferSelect`);
    }
  }
}
report(`check:types-derived (${tables.length} tables)`, findings);
