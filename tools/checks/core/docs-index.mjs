// docs-index — writes docs/index.json from the frontmatter of every active unit
// (archive and templates excluded). check:docs fails when the file is missing or stale.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, root } from "./lib.mjs";
import { buildIndex, serialize, units } from "./units.mjs";

const cfg = config();
const index = buildIndex(units(cfg));
writeFileSync(join(root, cfg.index), serialize(index));
console.log(`ok   docs-index ${cfg.index} (${index.units.length} units)`);
