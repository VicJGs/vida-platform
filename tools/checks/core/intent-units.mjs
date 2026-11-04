// intent-units — writes the units of each intent ledger (intent.mjs): one per row in the
// ledger's intent/ folder, which it owns and clears of removed rows, plus the
// INTENT-<module> map. check:docs fails when one is missing, stale or orphaned; rerun
// docs-index.mjs after this.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, exists, root } from "./lib.mjs";
import { generate, ledgers, ruleMap, skipped } from "./intent.mjs";

const cfg = config();
const all = ledgers(cfg);
const map = ruleMap(cfg, skipped(all));
let count = 0;
for (const l of all) {
  if (exists(l.rowDir)) for (const f of readdirSync(join(root, l.rowDir))) if (f.endsWith(".md")) rmSync(join(root, l.rowDir, f));
  mkdirSync(join(root, l.rowDir), { recursive: true });
  for (const [path, text] of generate(cfg, l, map)) { writeFileSync(join(root, path), text); count++; }
}
console.log(`ok   intent-units (${all.length} ledgers, ${count} units); now run node tools/checks/core/docs-index.mjs`);
