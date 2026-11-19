// Shared helpers for the check scripts. A repo copies this folder to tools/checks/
// and runs each script from its root; paths come from package.json "checks".
import { existsSync, readdirSync, readFileSync, statSync, writeSync } from "node:fs";
import { join, relative } from "node:path";

export const DEFAULTS = {
  src: "src",
  docs: "docs",
  glossary: "docs/glossary.yaml",
  index: "docs/index.json",
  adrDirs: ["docs/decisions", ".adr"],
  ruleId: "RULE-[A-Z]+-\\d+", // the allowed rule forms: one regex, or a list with one regex per form
  ruleLike: null, // anything written like a rule ID (regex); one in no allowed form fails check:rules. Default: the forms
  ruleUnqualified: null, // rule forms that are one ID repo-wide (regex); check:rules notes them in a module's test names
  rulesBaseline: "tools/checks/rules-baseline.txt",
  budgetBaseline: "tools/checks/budget-baseline.txt",
  intentId: "[A-Z]+-\\d+",
  intentLedger: "docs/modules/<module>/intent.yaml",
  intentTests: {}, // module → test path prefixes; an unlisted module uses <src>/<module>
  intentSubstrates: [], // names a ledger row may list in `uses` besides rows and modules with a ledger
  features: "docs/features",
  intentFeatures: {}, // module → folders under features; an unlisted module uses <module>
  oneWayDoor: ["schema/", "migrations/", "encryption/", "sync/"],
  oneWayDoorLabel: "one-way-door",
  docsTier: ["docs/**", "**/*.md", ".claude/**/*.md", "package.json"], // changed.mjs; package.json = a "checks"-only change
  checksTier: ["tools/checks/**"], // changed.mjs: the gate's own files
  affectedTier: ["apps/*/**", "packages/*/**"], // changed.mjs: workspace packages, run as affected
};

export const root = process.cwd();

export function config() {
  const pkg = join(root, "package.json");
  const own = existsSync(pkg) ? JSON.parse(readFileSync(pkg, "utf8")).checks ?? {} : {};
  return { ...DEFAULTS, ...own };
}

// Repo-relative paths with forward slashes, skipping dependencies, VCS, build output and archives.
export function walk(dir) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    if (["node_modules", ".git", "dist", "build", "archive", "_archive"].includes(name)) return [];
    const rel = `${dir}/${name}`;
    return statSync(join(root, rel)).isDirectory() ? walk(rel) : [rel];
  });
}

// Rule IDs in text. "checks".ruleId lists the allowed forms (one regex or several);
// "checks".ruleLike finds anything written like a rule ID, prefix and all (R4-BR-1,
// BR-4-S5), so a token in no allowed form is reported, never read as the allowed ID
// inside it. A token touching a letter, digit, _ or a further -segment is not cut short.
// N/M names both IDs: BR-S2-1/5 is BR-S2-1 and BR-S2-5.
export function ruleIds(cfg) {
  const forms = [cfg.ruleId].flat();
  const allowed = forms.map((f) => `(?:${f})`).join("|");
  const whole = new RegExp(`^(?:${allowed})$`);
  const token = new RegExp(`(?<![\\w-])(?:${cfg.ruleLike ?? allowed})(?:/\\d+[a-z]?)*(?![\\w]|-\\w)`, "g");
  const expand = (t) => {
    const [base, ...more] = t.split("/");
    return [base, ...more.map((n) => (/\d+[a-z]?$/.test(base) ? base.replace(/\d+[a-z]?$/, n) : `${base}/${n}`))];
  };
  // Every token in the text: its IDs in an allowed form (ids) and the tokens in none (odd).
  const scan = (text) => {
    const ids = [];
    const odd = [];
    for (const [t] of text.matchAll(token)) {
      const each = expand(t);
      if (each.every((id) => whole.test(id))) ids.push(...each);
      else odd.push(t);
    }
    return { ids, odd };
  };
  return { forms, whole, scan, strip: (text) => text.replace(token, " "), shown: forms.join(" | ") };
}

export const read = (rel) => readFileSync(join(root, rel), "utf8");
export const exists = (rel) => existsSync(join(root, rel));
export const rel = (abs) => relative(root, abs).replaceAll("\\", "/");

export const TEST_FILE = /(^|\/)(e2e|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
export const CODE_FILE = /\.[cm]?[jt]sx?$/;

// Prints one line per finding and exits 1 if there are any. Callers rely on it never
// returning, so it exits; and since process.exit() drops stdout writes still queued for a
// pipe, it writes everything synchronously first (a full pipe raises EAGAIN: wait, retry;
// a reader that closed early, as `| head` does, raises EPIPE: stop, nobody is reading).
export function report(name, findings, notes = []) {
  const lines = [...notes.map((n) => `note ${n}`), ...findings.map((f) => `FAIL ${f}`),
    `${findings.length ? "FAIL" : "ok  "} ${name} (${findings.length} findings)`];
  writeAll(`${lines.join("\n")}\n`);
  process.exit(findings.length ? 1 : 0);
}

const pause = new Int32Array(new SharedArrayBuffer(4));
function writeAll(text) {
  const buf = Buffer.from(text);
  for (let at = 0; at < buf.length;) {
    try { at += writeSync(1, buf, at); } catch (e) {
      if (e.code === "EPIPE") return;
      if (e.code !== "EAGAIN") throw e;
      Atomics.wait(pause, 0, 0, 5);
    }
  }
}
