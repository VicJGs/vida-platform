# Spec: feature:ui-4-app-shell-components / S5 — Integration

Status: implemented <!-- draft → approved → implemented --> (Approval 1+2 ✅; gate-1 REVISE→fixed · preflight MEASURED · gate-2 SHIP no-drift; built + green, pending Visual Gate + PR)
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X]. Inherits the umbrella §2 BR-1..7.
Sessions: 2026-08-17-ui-4-app-shell-components-6

<!--
  FORWARD spec — written BEFORE S5 code. §1–§4 are the DESCRIPTION; §5 is the executable PROMPT that cites them.
  S5 is the LAST UI-4 unit: it composes/verifies S1–S4 as a whole, delivers the BR-7 `/graph` lazy-split, runs the
  whole-shell regression, and closes Currency (§XXIX). On S5 SHIP+merge → LIF-89 → Done.
-->

## 1. Identity

The **integration tile** — the last of the UI-4 `-c` wave. S1–S4 each shipped + merged their own slice of the
shell (scaffold · nav chrome · command-bar · onboarding); S5 does NOT add a new rendered surface. It:

1. **Verifies the composition** — S1–S4 are already wired on `main` (App.tsx provider tree + routes.tsx
   `RootComponent` + AppShell regions + command-bar + first-run branch). S5 proves they hold together as one
   shell with a full-`<App/>` integration test, and closes any residual wiring gap the baseline surfaces.
2. **Delivers BR-7** — the `/graph` route is `lazyRouteComponent`-split so sigma/graphology never enter the
   initial bundle. [FACT: baseline B-C:107-108 · performance-strategy.md §6]
3. **Runs the whole-shell regression** at 375/768/1440/1920 + the Visual Gate (both themes).
4. **Closes Currency (§XXIX)** — refreshes the shell context's durable docs + the shell layer-doc.

- [FACT: _index.md:82] S5 row: "compose S1–S4 in `App.tsx`/routes · `/graph` lazy-split · whole-shell manual
  regression · Currency + layer-doc | integration (no new render)".
- [FACT: baseline §2] every seam UI-4 must wire (D5 media · router inject · first-run branch · search provider ·
  store extend · breakpoint read) is already CONFIRMED wired by S1–S4 (see §3.1 verification matrix).

**What it is NOT** — [INTERP] not a new component (no rendered surface → no NEW Visual-Gate subject beyond the
whole-shell pass) · not the graph MODULE (owner: notes, M1.1+ — S5 ships only the lazy route + an empty-state
placeholder page) · not a `packages/ui` change (BR-1; the barrel is measured, not edited — see §2 BR-7-S5).

## 2. Business Rules (S5 refinements of the umbrella BR-1..7)

- [FACT: umbrella BR-1] **BR-1-S5 · Compose, don't rebuild; the only `packages/ui` write is the metadata
  barrel-defect fix.** S5 adds NO new `@vida/ui` component — it composes the existing `NeuralGraph` view, not
  redraws it. The sole `packages/ui` write is `"sideEffects": false` in `package.json` (DF-S5-1 / BR-7-S5) — a
  build-metadata field to fix the measured tree-shaking defect, not a component. All other S5 code is `apps/web/src`.
- [FACT: umbrella BR-4 + state-conventions.md] **BR-4-S5 · Degrade, never crash.** The `/graph` route has no
  graph-data source in M1.0 (AR-8 graph-prep is a seam) → it renders `NeuralGraph` in its `empty` terminal state
  (`state="empty"`, `nodes=[]`, `edges=[]`), never a throw or blank. [FACT: neural-graph.tsx:148,154-158 — the
  view already renders loading/error/empty; `empty` is a real state, not an error.]
- [FACT: performance-strategy.md §6 · umbrella BR-7 · MEASURED 2026-08-17] **BR-7-S5 · Sigma leaves the initial
  bundle — two levers, both required.** The `/graph` route is `lazyRouteComponent(() => import('./app/graph'))`
  (mirrors `/notes`, routes.tsx:53-57) — the lazy IMPORTER. But a lazy importer alone is **provably insufficient**:
  **[FACT: gate-1 build measurement]** sigma/graphology are in the initial chunk `dist/assets/index-*.js` (~584 KB)
  **today, before any `/graph` route exists** — because `App.tsx:7` eagerly imports `UIProvider`/`ToastProvider`
  from the `@vida/ui` barrel, the barrel (`index.ts:46`) statically re-exports `NeuralGraph`, and
  `packages/ui/package.json` has **no `sideEffects` field** so Rollup cannot tree-shake the unused `NeuralGraph`
  out. You cannot remove an EAGER importer by adding a LAZY one. → The second lever is required: add
  **`"sideEffects": false`** to `packages/ui/package.json` (safe — [FACT] `@vida/ui` imports no CSS at module
  level, verified 2026-08-17). Then Rollup drops `NeuralGraph`+sigma from the static graph (apps/web never
  statically imports `NeuralGraph`), and the lazy `/graph` import re-introduces them in a `graph-*` chunk.
  Acceptance is the MEASURED **gzipped** build (§XIII "measured, not estimated"; performance-strategy §6 budgets
  are gzipped): sigma in a `graph-*` chunk, out of the initial chunk (target < 80 KB init / < 50 KB graph lazy).
  → **DF-S5-1 (flagged, resolved — see §6):** this second lever is a SECOND `packages/ui` edit, which the literal
  umbrella BR-1 ("the ONLY `packages/ui` write is the media object") forbids. Reconciliation: BR-1's stated
  rationale fences new `@vida/ui` **components** ("No new `@vida/ui` component; rule-of-three unmet") — the "only
  media edit" was the only edit FORESEEN at the S1 baseline, before this barrel↔sigma coupling was measured. A
  `sideEffects` metadata field is not a component; it is a **barrel-defect fix in the producing package** — the
  established precedent ([[first-runtime-consumer-surfaces-latent-barrel-defects]]: "fix barrel defects in the
  producing package; the app hits it too"). And performance-strategy §6 — the authority on bundling — mandates
  "heavy libraries dynamically imported only when needed," which REQUIRES tree-shakeability. So §6 governs the
  mechanism and BR-1's fence is REFINED (components, not build-metadata), not broken. This is presented as a
  flagged defect at Approval 1, not slipped in silently (§XXVIII discipline).
- [FACT: umbrella BR-2/BR-3/BR-5/BR-6] **BR-{2,3,5,6}-S5 · Inherited unchanged.** The whole-shell regression
  re-verifies token-only values, data-driven reflow, the focus/motion contract, and the M1.0 boundary across the
  integrated shell — S5 introduces no new value, breakpoint, overlay, or crypto element.

## 3. Contract

### 3.1 Verification matrix — S1–S4 wiring on `main` (what S5 CONFIRMS, not re-wires)

| Seam (baseline §2)                           | Wired by | Evidence                                              | S5 action                                                           |
| -------------------------------------------- | -------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| D5 `media` config                            | S1       | `packages/ui` `media` object + `media-parity.test.ts` | assert parity still green                                           |
| Router inject → `CommandRunContext.navigate` | S3       | `command-bar.tsx` injects `useShellNavigate`          | integration test: ⌘K → run nav command → route changes              |
| App.tsx first-run branch                     | S4       | `App.tsx:70-81` branch on `firstRun.status`           | integration test: completed marker → app at `/`; unset → onboarding |
| Search provider `search-unavailable`         | S3       | `use-command-search.ts` + `search-provider.ts`        | integration test: non-empty query → loud `search-unavailable`       |
| `app-shell-ui-store` `isMobileNavOpen`       | S1/S2    | store field + `use-nav-drawer.ts`                     | regression: mobile drawer open/close/Esc/inert                      |
| Breakpoint read `useMedia()`                 | S1       | `app-shell.tsx:48-55`                                 | regression: dock reflow drawer→rail→sidebar at the 4 widths         |

If any row is NOT green on `main`, S5 closes it under the same gate (per §XXVIII if it diverges from this matrix).

### 3.2 New files (all `apps/web/src`)

- `app/graph/index.tsx` — [NEW] the lazy `/graph` route component. Default export (consumed by
  `lazyRouteComponent`, the `app/notes/index.tsx` precedent). Renders `<NeuralGraph nodes={[]} edges={[]}
state="empty" />`. Header comment states WHY it is a dynamic-import boundary (BR-7-S5). No data fetch (M1.0 seam).
- `App.integration.test.tsx` — [NEW] the full-`<App/>` composition test, driving the S1–S4 seams end-to-end per
  §3.1. **Reuses the existing `App.test.tsx` stubbing precedent** [FACT: App.test.tsx:7-9] — `vi.mock('./db/boot',
…)` (so no worker loads, `ensureDbReady` resolves) + `vi.mock('./onboarding/first-run-repo', …)` (`read`/`write`
  control the first-run branch deterministically: `read→true` reaches the app+shell; `read→false` reaches
  onboarding). A NEW file (not an edit of `App.test.tsx`) so the S4 branch assertions there are preserved, not
  merged-over. `// @vitest-environment jsdom`. ⚠ heavy (Tamagui cold-compile) — if it tips the 5s default under
  machine load, use a one-off `--testTimeout`, NO config change (the S3/S4 load-noise lesson — task Notes).

### 3.3 Edited files

- `routes.tsx` — add `graphRoute` = `createRoute({ path:'/graph', component: lazyRouteComponent(() =>
import('./app/graph')) })`; add to `rootRoute.addChildren([...])`. Mirror the `notesRoute` shape exactly
  (routes.tsx:53-59). No other route added (per-module routes are M1.1+ waves; nav to them degrades to
  `NotFoundComponent`, BR-4).
- `packages/ui/package.json` — [BARREL-DEFECT FIX, DF-S5-1] add `"sideEffects": false` (top-level field). The ONLY
  `packages/ui` write; a metadata field, not a component (BR-1-S5). Verify no module in the barrel graph relies on
  an import side-effect (confirmed: no module-level CSS import, 2026-08-17). This is what makes the lazy split
  actually sever sigma from the initial chunk (BR-7-S5).

### 3.4 A11y / states (whole-shell, §XIV — re-verified, not newly introduced)

Landmarks (`nav`/`header`/`main`) present once each; ⌘K focus-into + Esc-return; onboarding focus→h1, no-Esc;
mobile drawer focus-trap/inert; `/graph` empty state announced via `NeuralGraph`'s `role=status` Message. No new
ARIA surface — S5 asserts the integrated whole matches the per-unit contracts.

## 4. Acceptance (S5 DoD)

- [ ] Full-`<App/>` integration test proves the S1–S4 seams compose (§3.1 matrix rows exercised end-to-end, DB +
      first-run stubbed per the `App.test.tsx` precedent)
- [ ] `/graph` route added, `lazyRouteComponent`-split; renders `NeuralGraph` empty state, never 404/throw (BR-4-S5)
- [ ] `"sideEffects": false` added to `packages/ui/package.json` (DF-S5-1); no barrel module relies on an import
      side-effect (verified)
- [ ] **MEASURED (gzipped) — the BR-7 acceptance, proven at preflight (§5b):** sigma/graphology are ABSENT from the
      initial chunk and PRESENT in a distinct lazy `graph-*` chunk **< 50 KB gzipped** (performance-strategy §6 Graph
      budget). ⚠ SCOPE HONESTY: the § 6 "Initial < 80 KB" line is NOT an S5 acceptance — after both levers the
      initial chunk is ~154 KB gzipped (React + Tamagui + router + shell), and closing that gap needs a separate
      **framework-chunk split** (manualChunks), a distinct perf-hardening concern homed OUTSIDE S5 (see §6). S5 owns
      only BR-7 = "sigma never enters the initial bundle," which is met + measured.
- [ ] `apps/web` green: typecheck · full test suite · lint 0-err · `pnpm build` succeeds; `@vida/ui` green after the
      metadata edit (typecheck · tests · build — a `sideEffects` field changes no runtime behavior, only bundling)
- [ ] Whole-shell manual regression at **375/768/1440/1920** (dock reflow · global bar · Spaces seam · command bar ·
      onboarding branch · `/graph`) — Visual Gate SHIP, both themes
- [ ] Currency (§XXIX): `apps/web/src/shell/CLAUDE.md` extended to cover S4 (onboarding, renders outside shell) + S5
      (`/graph` route); `shell-layout.md` touched ONLY if a region/reflow rule changed (S5 changes none → confirm
      "current", scope any edit to the `/graph`-route mention); umbrella `_index.md` §5 S5 row shipped + §7 change log
- [ ] Only `packages/ui` write is the DF-S5-1 metadata field (BR-1-S5); no new DS value/hex (BR-2)

## 5. Implementation Prompt (ordered; each step cites §2/§3)

1. **Confirm the §3.1 matrix on `main`** — run the existing `apps/web` suite (typecheck + tests); confirm all six
   seams green. Record any gap; a gap → close under §XXVIII, else proceed. (Gate ground truth.)
2. **`app/graph/index.tsx`** (§3.2, BR-4-S5) — default-export `GraphRoute` rendering `<NeuralGraph nodes={[]}
edges={[]} state="empty" />` + the WHY-lazy header comment.
3. **`routes.tsx`** (§3.3, BR-7-S5) — add `graphRoute` (mirror `notesRoute`) + register in `addChildren`.
4. **`packages/ui/package.json`** (§3.3, DF-S5-1, BR-7-S5) — add `"sideEffects": false`; re-run `@vida/ui` build +
   tests to confirm the metadata edit changes no behavior.
5. **Integration test** (§3.2) — full-`<App/>` mount driving the §3.1 seams end-to-end; DB + first-run stubbed per
   the `App.test.tsx` precedent (jsdom docblock).
6. **MEASURE the build, gzipped** (BR-7-S5, §4) — `pnpm --filter @vida/web build`; for each `dist/assets/*.js`
   inspect content (grep for `barnesHutOptimize`/`forceatlas2`/sigma markers) AND gzipped size (e.g. `gzip -c
<file> | wc -c`). Confirm: (a) sigma markers ABSENT from the initial chunk, PRESENT in a `graph-*` chunk;
   (b) record initial-chunk gzipped size. If sigma is still in the initial chunk → STOP, §XXIV triage — do not
   proceed to regression on a failed budget.
7. **Whole-shell regression + Visual Gate** (§4) — `pnpm --filter @vida/web dev`, walk 375/768/1440/1920 in a real
   browser, both themes; capture the SHIP verdict.
8. **Currency (§XXIX)** (§4) — extend `shell/CLAUDE.md` to cover S4 + S5 (`/graph` route); touch `shell-layout.md`
   only if a reflow rule changed (none → mark current) + umbrella §5/§7; commit docs WITH the code.
9. **Green + PR** — typecheck · tests · lint · build all green → commit → PR off clean `main` → on merge, LIF-89 →
   Done + `tracker --sync`.

### 5b. Preflight folds (MEASURED 2026-08-17 — the load-bearing fold is empirical, not a hypothesis)

The bundle claim was PROVEN by three real `pnpm --filter @vida/web build` runs on branch `ui-4-s5-integration`
(gzipped, since §6 budgets are gzipped):
| Build | Initial chunk (gzip) | Sigma in initial? | Graph chunk |
|-------|---------------------|-------------------|-------------|
| Baseline (main) | 177 KB | YES ❌ | — |
| Lever A — lazy route ONLY | 202 KB | YES ❌ (grew) | none |
| **Lever B — lazy route + `sideEffects:false`** | **154 KB** | **NO ✅** | **42 KB, lazy ✅ (< 50 KB §6)** |

- **FOLD-1 (DF-S5-1 is not a drift):** Lever A alone leaves sigma in the initial chunk (and enlarges it) — the
  `sideEffects` metadata edit is genuinely required, empirically. Both levers together sever sigma → 42 KB lazy
  `graph-*` chunk, initial chunk sigma-free.
- **FOLD-2 (no overclaim):** the initial chunk stays ~154 KB gzipped (framework unsplit) — over the §6 "Initial
  < 80 KB" target, but that residual is NOT sigma. S5 claims only BR-7 ("sigma out of the initial bundle"), met.
  The framework-split is homed separately (§6).
- **FOLD-3 (soundness):** `@vida/web` typecheck + `@vida/ui` typecheck both green after the 3 changes (`app/graph/
index.tsx`, `routes.tsx` graphRoute, `packages/ui/package.json` sideEffects); the built main chunk references the
  `graph-*` chunk as a dynamic import (confirmed lazy). ⚠ these 3 changes are applied on the branch AS the measured
  spike — the remaining S5 work (integration test, regression, Currency) is the post-Approval-2 build.

## 6. Open UNKNOWNs / Decisions Needed

- **DF-S5-1 (RESOLVED — flagged for Approval 1, not an open question).** The measured barrel↔sigma coupling forces a
  SECOND `packages/ui` write (`"sideEffects": false`) to satisfy BR-7, which the literal umbrella BR-1 ("only the
  media edit") forbids. Resolution (BR-7-S5): BR-1 fences new `@vida/ui` **components** (its stated rationale); a
  build-metadata field is a **barrel-defect fix in the producing package** (established precedent) and
  performance-strategy §6 (the bundling authority) mandates the tree-shakeability it enables. §6 governs; BR-1's
  fence is refined, not broken. Presented transparently; Victor may veto at Approval 1. No other open fork.
- **Framework-chunk split → HOMED OUTSIDE S5 (not a decision, a scope boundary).** The measured initial chunk is
  ~154 KB gzipped after both BR-7 levers — over the §6 "Initial < 80 KB" target because React + Tamagui + router
  ride the initial chunk unsplit. Closing that is a `manualChunks` framework-split — a general perf-hardening task
  touching `apps/web/vite.config.ts`, NOT BR-7 (which is scoped to sigma). S5 records the number + flags it as a
  follow-up (a `perf-framework-chunk-split` planned task, sibling to `tsconfig-strict-index-access`); it is NOT
  folded into S5 (BR-7 does not mandate it, and scope-creeping it would violate the per-unit discipline).

## 7. Change Log

| Date       | Session                                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-6 | S5 spec authored — §1 identity (integration tile) · §2 BR-\*-S5 · §3 verification matrix + new/edited files · §4 DoD · §5 impl prompt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-6 | **Gate-1 critique REVISE → Rev 2.** B1 (BLOCKER, MEASURED): a lazy `/graph` route alone can't sever sigma — it's already in the initial chunk via the eager `@vida/ui` barrel import + no `sideEffects`. Fixed: BR-7-S5 now prescribes BOTH levers (lazy route + `"sideEffects": false`), reconciles the BR-1 conflict as flagged **DF-S5-1** (barrel-defect fix, not a component; §6 governs). M1 (§6 "None" → DF-S5-1 resolved). M2 (integration-test DB/first-run stubbing named, `App.test.tsx` precedent). M3 (measure GZIPPED vs §6 budgets, not raw bytes). M4 (Currency scoped: `shell/CLAUDE.md` covers S4+S5; `shell-layout.md` touched only if reflow changed). Minors: §XXVIII/§XXIV = standards/process.md; integration test is a NEW file (preserves `App.test.tsx`). |
