# PLAN — fe-shell S5 · Rearrange + dock-together + responsive + full gate (the finale)

> Entity Delivery Flow ② · per-slice §XXVI gate. S1–S4 shipped. This is the LAST slice — it also opens the **PR**.
> **No `@vida/core`/`@vida/types` change.** Home: `apps/web/src/shell`. [FACT: path:line] / INTERPRETATION. No-Guessing binds.

## §1. Context (what's already done vs what S5 adds)
- **Rearrange is already LIVE** — S3 wired `onSetEdge`→`setPanelEdge`; S3/S4 wired `onSetMode`→`setPanelMode`. A panel
  already moves between edges + dock⇄float. `[FACT: shell/app-shell.tsx foldDocked + float mount]`
- **Persist seam** — `shell/shell-prefs.ts` (S1): `stubShellPrefs: ShellPrefsRead = () => DEFAULT_PLACEMENT`. **Live
  `nav_preferences` read/write is the FIRST CONSUMER's work** (envision L5, seam-contract §D). `[FACT: shell/shell-prefs.ts:6-16]`
- **foldDocked (S3/S4)** nests each docked+open panel independently → two panels at the SAME edge render as two
  side-by-side strips, NOT a cluster. `[FACT: shell/app-shell.tsx:110-142]`

## §2. What S5 builds (scope) — covers EC-4 (dock-together + persist) · EC-9 (full reflow) · EC-10 (full matrix)
1. **Dock-together cluster (`app-shell.tsx`, EC-4).** Refactor `foldDocked` to **group** open+docked panels **by edge**:
   panels sharing an edge render in ONE cluster container, **stacked along the cross axis** (L/R edge → a `column` of
   panels; T/B edge → a `row`), each still content-fit; the cluster (`flexGrow/Shrink:0`) sits flush at the edge with
   Content beside. Different-edge groups nest around Content as today (RNW flex-collapse guard preserved). **N1
   [INTERPRETATION]:** envision M4 ("the two can dock together") doesn't fix stacked-vs-side-by-side; cross-axis stacking
   is the macOS-inspector convention — the Visual Gate + Victor confirm the visual. **N2 — intra-cluster separation:** the
   two panels in a cluster are visually separated by each panel's own frame border/header (the docked `BORDER_FACING` +
   header `borderBottom`); the gate asserts they read as two grouped panels, not one fused block. `[FACT: envision.md:19 M4; EC-4]`
2. **Persist hydration seam (`app-shell.tsx`, EC-4 persist).** `AppShell` gains `shellPrefs?: ShellPrefsRead =
   stubShellPrefs`; a **once-guarded, COLD-BOOT-ONLY** hydration effect reads it → `setPlacement(...)` (wires the read
   path so the live `nav_preferences` provider swaps in at first consumer). **B1 — non-clobbering guard:** apply the read
   result **only if the store is still at the initial `DEFAULT_PLACEMENT` reference** (`getState().placement ===
   DEFAULT_PLACEMENT`); if a test or a live consumer has already set a non-default arrangement, the ref differs →
   hydration SKIPS (the async stub would otherwise reset placement to DEFAULT after first render and break the S3/S4
   tests + clobber a live arrangement). M1 stub → DEFAULT, so cold-boot hydration is a functional no-op but **activates
   the seam**. Write-back (persist-on-change) stays deferred (seam-contract §D: "writes emit store updates now + persist
   through this seam later"). `[FACT: shell-prefs.ts:7-8; seam-contract.md §D; stores/app-shell-ui-store.ts:42]`
3. **Full responsive reflow (EC-9).** Verify the SAME component at **375/768/1440** across every state (docked each edge ·
   float each edge · dock-together · closed) with **no horizontal overflow**. **No invented auto-switch:** the dock⇄float
   CHOICE is the responsive model (envision M7) — a user wanting a full-width surface on mobile *floats* it (→ near-full
   sheet, S4). A docked panel at 375 keeps its content-fit narrow-content column (the S3 B1 documented interim); S5 proves
   no overflow, it does NOT auto-convert docked→sheet (that'd be a guess past an UNKNOWN). `[FACT: envision.md:28 M7; slice-map.md:22]`
4. **Full a11y + AA matrix blocking Visual Gate (EC-10) + Verification Gate.** 3 presets × light/dark × 375/768/1440 over
   the full state matrix (docked all edges · float all edges · dock-together · closed): text AA (incl. warm-dark) · axe 0 ·
   no overflow · focus/dismiss/trap · reduced-motion. Then `victor:verification`.
5. **PR** — merge the whole fe-shell (S1–S5) → `main` via a proper PR (per [[git-workflow-per-issue-branch-pr-merge]]).

## §3. Contract delta
- `AppShellProps` gains **`shellPrefs?: ShellPrefsRead`** (default `stubShellPrefs`) — the only new prop. No `ShellPanel`
  change. No `@vida/core`/`@vida/types` change.

## §4. Business rules (BR-S5-n)
- **BR-S5-1** Docked panels sharing an edge render as ONE cluster, stacked along the cross axis (L/R→column, T/B→row);
  the cluster is content-fit (`flexGrow/Shrink:0`), Content beside. [EC-4]
- **BR-S5-2** Different-edge groups nest around Content; the RNW flex-collapse guard holds (Content `flex=1
  minHeight/minWidth=0`; clusters don't grow). [EC-4/EC-9/BR-S3-9]
- **BR-S5-3** The store hydrates once from `shellPrefs` **only on cold boot** (store placement still the
  `DEFAULT_PLACEMENT` ref); a non-default arrangement (test/live) is never clobbered (B1). Live `nav_preferences`
  read/write = first consumer (deferred); no write-back added. [EC-4 persist / envision L5]
- **BR-S5-4** One responsive model, no auto-switch: docked stays content-fit (narrow at 375, no overflow); float = the
  near-full sheet on mobile (S4). The user's dock/float choice is the model. [EC-9 / M7]
- **BR-S5-5** Full-matrix gate: every state × 3 presets × light/dark × 375/768/1440 — AA incl. warm-dark · axe 0 · no
  overflow. [EC-10]

## §5. Implementation order
1. `foldDocked` → edge-grouped clusters (group by edge → stack cross-axis → nest around Content).
2. `AppShell` `shellPrefs` prop + one-time hydration effect (`useRef` once-guard).
3. Tests: `app-shell.test.tsx` — dock-together (two panels same edge → one cluster, both mounted, Content beside) ·
   hydration seam (a custom `shellPrefs` resolving a non-default placement hydrates the store).
4. tsc 0 · eslint 0 · full `@vida/web` suite.
5. Full-matrix blocking Visual Gate (extend the S3/S4 gate harness: add dock-together + closed states; all edges; 3 widths).
6. `victor:verification` (the Verification Gate).
7. §XXIX currency (shell `CLAUDE.md` + task) → commit → **PR**.

## §6. Acceptance (§4 — the gate musts)
tsc 0 · eslint 0 · `@vida/web` green · **blocking full-matrix Visual Gate PASS** + **Verification Gate PASS**:
- **EC-4** dock-together: two panels at one edge cluster (stacked), Content beside; rearrange (edge/mode) live; persist
  seam hydrates.
- **EC-9** one responsive model: 375/768/1440, no horizontal overflow, in every state.
- **EC-10** every value a DS token; text AA full-matrix incl. warm-dark; axe 0.
- EC-11/EC-12 (`feel`) observed (preset identity, motion/reduced-motion).

## §7. Out of scope (homed)
Live `nav_preferences` read/write (first consumer — envision L5) · real panel bodies (module nav / #15) · #15/#16/#17
contents · a docked↔float responsive auto-switch (not doc-mandated — No-Guessing). `[FACT: slice-map.md:47; envision.md:36]`
