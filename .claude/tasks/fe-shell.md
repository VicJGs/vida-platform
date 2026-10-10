# Task: fe-shell
# Status: in-review
# Linear: LIF-226
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #14 — #14 Shell — two positionable content-fit panels + regions (EXTEND ui-4/ux-3). Split-outs: fe-shell-scope #15, fe-session-hud #16; ⌘K reuse ui-4/ux-2.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Shell** frame (G6 unit #14): two positionable content-fit panels + regions, extending ui-4/ux-3. Split-outs: `fe-shell-scope` #15, `fe-session-hud` #16; ⌘K reuses ui-4/ux-2. Wires the built M1.0 UI (⌘K search · export dialog · MD/PDF/DOCX serializers · neural-graph · Spaces add-menu · view degradation) to its finished provider seams, all terminal states rendered. The ⌘K search legs (BSE-14/15/16) render `search-unavailable` now — live FTS5 ranked results complete via DB-8/M1.4. Per-slice blocking Visual Gate.

## Dependencies
- blocked by `fe-codec-patterns`

## Entity Front Matter — GATED & APPROVED (2026-10-10)
Delivery docs: `docs/specs/foundation/fe-shell/delivery/`. Default scenario (not a greenfield build — reshapes the
shipped **ui-4/ux-3** shell; baseline this session confirmed it intact).
- **Step 0 BASELINE ✅** — the 5-region ui-4/ux-3 shell is built (`shell/{app-shell,regions,breakpoints}.tsx`, stores,
  nav); all CODEC primitives shipped in `@vida/ui`. fe-shell = `ext UI-4/UX-3 (sup LIF-199)` — reshape, not greenfield.
- **Step 1 INTERPRETATION ✅** — `interpretation.md`; DEPENDENCIES·NEEDS·ORGANIZATION·IMPLICIT (IR-1…IR-8), all `[FACT]`.
- **Step 1.5 ENVISION ✅ LOCKED (Victor, 6 greybox rounds)** — `envision.md`; §3.75 FIRED; the **macOS/iPadOS inspector
  dock⇄detach** model **M1–M7**: each nav panel (System·Modules) toggles **docked** (inline, content beside = "A") ⇄
  **floating** (overlay + scrim = "B"), **rearrangeable to any edge** (L·R·T·B incl. bottom), content-fit, one responsive
  model, reserved top strip. **EC-1…EC-12 pinned.** Greybox deleted.
- **Step 2 DECOMPOSITION ✅** — `slice-map.md` (5 frontend slices) + `seam-contract.md`; coverage holds (EC-1…EC-10 →
  ≥1 slice). NO `@vida/core`/`@vida/types` change. Scope line: #14 builds the frame+panels; Bar 1 content→#15, HUD→#16,
  ⌘K→#17 (slots).

## Build Steps (per-slice §XXVI double-gate + blocking Visual Gate; PR at S5)
- [x] S1 — Placement model + shell state — EC-1/4/5/9 (model). `regions.ts` (+`PanelId`/`PanelMode`/`PanelEdge`/`PanelPlacement`/`ShellPlacement`/`DEFAULT_PLACEMENT`/`PANEL_IDS`/`panelAxis`/`isOverlay`/`reservedTopInset`) · `app-shell-ui-store` (+`placement`/`togglePanel`/`setPanelMode`/`setPanelEdge`/`setPlacement`, panel state = ephemeral UI per BR-RT-6) · `shell/shell-prefs.ts` (`ShellPrefsRead=ProviderRead<ShellPlacement>` + `stubShellPrefs`→DEFAULT, L5 deferred-persist seam). Data/logic only, no JSX → no Visual Gate. **tsc 0 · lint 0 · 27/27 new tests · full @vida/web 267/268** (1 = module-dock load-timeout flake, passes isolated).
- [x] S2 — Frame + Content + Overlay host + reserved strip (`app-shell.tsx`) — EC-7/8/9. **Reshaped `AppShell`** from the superseded 5-region ui-4/ux-3 frame to the CODEC dock⇄float frame: bounded-viewport column → **reserved top strip** (`<header>`/banner, `reservedTopInset(bp)` 52/56, `data-top-inset`; serif `$display` "Vida" wordmark + **System/Modules** toggles `aria-pressed`←`placement[id].open`→`togglePanel` + `bar1Slot`#15/`hudSlot`#16 slots) → full-bleed **Content** `<main>` (1280-centered + gutters, independent scroll) → **overlay host** (`overlaySlot`, `pointerEvents:none`, `$overlay` z). Props `children`/`bar1Slot`/`hudSlot`/`overlaySlot`/`__bp` (seam-contract §C). `routes.tsx` mounts `overlaySlot={<CommandBar/>}` → **⌘K survives** (reuses ui-4/ux-2; CommandBar owns its keybind + self-portals). **Panels (S3/S4) NOT built** — toggles only read `open` for pressed state; stops clean at the S3 boundary. Added `data-region="wordmark"` gate hook. Reconciled 4 tests (app-shell.test rewritten for the frame; App.test/App.integration/routes.test: old mount-detector `nav[aria-label="Modules"]`+`getByText('Vida')` → stable `[data-region="topStrip"]`/banner — nav→S3, ⌘K kept green via overlaySlot; coverage strengthened not gutted). **tsc 0 · eslint 0 err · @vida/web 267/267** (47 files). **Visual Gate PASS** (Brave real app via onboarding→shell; 3 presets × light/dark + 390/768/1440: wordmark serif-swap Spectral/Fraunces/Source-Serif AA 15.84–17.29 · toggle labels AA 4.95–6.41 incl. warm-dark · content ≤1280 · **0 overflow** everywhere · inset 52/56 · axe 0). **g2 independent review SHIP** (0 blockers; 2 forward-notes homed to S3: overlay-host self-portal invariant · upgrade `aria-pressed`→`aria-expanded`/`aria-controls` when the panel renders). /critique SHIP.
- [x] S3 — Docked panel (A): inline flush, content beside, contained header control — EC-1/2/4/5. **NEW `shell/shell-panel.tsx`** (`ShellPanel`, docked render: `<nav>`/`<aside>` landmark · content-fit `flexGrow/Shrink=0` · `BORDER_FACING` 1px separator, no scrim/elevation · two-row contained header = ⠿ grip + `$display` title + ✕ · Dock/Float mode + lucide 4-edge picker) + **`app-shell.tsx` docked composition** (`foldDocked` wraps Content so it sits beside — flex row L/R · column T/B, panel-first for left/top; RNW flex-collapse guard; bar toggles → `aria-expanded={dockedOpen}`/`aria-controls` + `toggleRefs` focus-return). Edge picker LIVE (`onSetEdge`→`setPanelEdge`). **Float DISABLED until S4** (§XXVIII deviation from live-Float, g2 fold — removes a float dead-end + dishonest `aria-expanded`). §8-gap per §X. Panel body = empty-but-functional placeholder (L4). tsc 0 · eslint 0 · **@vida/web 279/279** (+12) · **Visual Gate PASS** (Brave, 3 presets × L/D × 375/768/1440: title serif AA 15.84–17.29 · panel text AA 4.94–6.53 incl. warm-dark · no elevation · 4 edges live-reposition · content beside · 0 overflow [375 content=50px, documented interim; near-full-sheet=S5] · axe 0) · **g2 correctness + g2 a11y/token SHIP** (both folded) · /critique SHIP.
- [x] S4 — Floating panel (B): overlay + scrim + elevation + dismiss/focus/motion — EC-1/3/6/12. **`FloatShellPanel`** branch in `shell/shell-panel.tsx` (same chrome as docked, mode-branched): edge-anchored **modal drawer** — scrim `$colorSurfaceInverse`@0.5 (click→close) + `role="dialog" aria-modal` (NOT landmark, B4) + `EDGE_ANCHOR` within the below-strip float layer + Level-3 `shadow.overlay` (dark self-cancel→border). **NEW `shell/shell-panel-styles.ts`** (injected keyframes, mirrors dialog-styles.ts; fail-safe-visible resting base; reduced-motion `@media`). **`app-shell.tsx`**: float layer mount + `bgRef` inert/aria-hidden (NOT top strip, G1) + toggles `tabIndex=-1`+`aria-haspopup=dialog` while float-open + widened `aria-expanded={open}`. Dismiss Esc/scrim/re-toggle→onClose→focus-return to toggle; focus-in on open; Tab trap (Dialog algorithm). Float ENABLED (S3 `disabled` removed). tsc 0 · eslint 0 · **@vida/web 289/289** (+10) · **Visual Gate PASS** (Brave, 3 presets × L/D × 375/768/1440: role=dialog aria-modal · scrim 0.5 · title serif AA 15.84–17.29 · panel AA 4.94–6.53 incl. warm-dark · Level-3 shadow(light)+border · Esc+scrim dismiss · focus-in · 4-edge sweep · axe 0 · 0 overflow) · **g2 correctness + g2 a11y/modal SHIP** (both folded: #1 focus-return→toggle · trap completed via tabIndex=-1 · aria-haspopup · concurrent-float UI-unreachable documented) · /critique SHIP (§XV `!` comments). §XXVIII: S3 Float-disabled deviation reversed.
- [x] S5 — Rearrange + dock-together + responsive + full a11y/AA Visual Gate + Verification — EC-4/9/10. **`foldDocked` edge-grouped** (dock-together: panels sharing an edge → ONE `data-dock-edge` cluster, cross-axis stacked [L/R→column, T/B→row], content-fit, content beside; different edges nest). **Persist-read seam wired:** `AppShell.shellPrefs?` (default stub) + once/cold-boot-only hydration (`getState().placement===DEFAULT_PLACEMENT` guard, no `active`-cleanup → StrictMode-safe; never clobbers a set arrangement); live `nav_preferences` write-back = first consumer (L5). **No mobile auto-switch** (dock/float choice IS the model, M7). tsc 0 · eslint 0 · **@vida/web 293/293** (+6) · **Visual Gate PASS** (Brave, dock-together 3 presets × L/D × 375/768/1440: 1 cluster/2 panels · content beside · AA 4.94–6.03 incl. warm-dark · axe 0 · 0 overflow) · **Verification = the 3 real-browser gates [S3 docked · S4 float · S5 dock-together] + 293 unit + 4 g2 reviews** · /critique REVISE→SHIP (StrictMode hydration-cancel fixed). **PR merges S1–S5 to main.**

- 2026-10-10 — front matter gated+approved (baseline → interpretation → **envision LOCKED** → decomposition).
  Worktree `.claude/worktrees/fe-shell` off origin/main. Next: S1.
- 2026-10-10 — **S1 ✅** placement model + shell state (data/logic, no Visual Gate).
- 2026-10-10 — **S2 ✅** CODEC frame (`app-shell.tsx` reshape + `routes.tsx` overlaySlot + 4-test reconcile). Full §XXVI
  double-gate + blocking Visual Gate PASS + g2 SHIP + /critique SHIP.
- 2026-10-10 — **S3 ✅** Docked panel (A). Full §XXVI double-gate (Approval 1 → preflight PASSED → gate-2 REVISE→folded
  [B3 edge-liveness, N4 grip] → Approval 2) on `sessions/PLAN-s3-docked-panel.md`. Built `shell/shell-panel.tsx`
  (`ShellPanel` docked) + `app-shell.tsx` `foldDocked` composition (content beside) + bar-toggle disclosure upgrade +
  `shell-panel.test.tsx` + extended `app-shell.test.tsx`. **§XXVIII deviation (g2 fold):** Float DISABLED until S4
  (was live — created a float dead-end + dishonest `aria-expanded`); BR-S3-7 revised, `aria-expanded={dockedOpen}`.
  tsc 0 · eslint 0 · @vida/web 279/279 · blocking Visual Gate PASS · 2 independent g2 reviews (correctness + a11y/token)
  folded · /critique SHIP.
- 2026-10-10 — **S4 ✅** Floating panel (B). Full §XXVI double-gate (Approval 1 → preflight BLOCKED→G1 resolved [in-shell
  below-strip overlay, inert scoped so re-toggle survives] → gate-2 REVISE→folded [B4 role=dialog aria-modal] → Approval 2)
  on `sessions/PLAN-s4-floating-panel.md`. Built `FloatShellPanel` (modal drawer) + `shell-panel-styles.ts` + app-shell
  float mount/inert/trap. **2 independent g2 reviews folded:** correctness #1 (focus-return→toggle, the in-panel
  Dock→Float capture-of-`<body>` bug) + #3 (concurrent-float UI-unreachable, documented); a11y CONFIRMED-1/2/6 (toggles
  `tabIndex=-1` completes the trap + aria-modal consistency + `aria-haspopup`). /critique REVISE→folded (§XV `!` comments).
  tsc 0 · eslint 0 · @vida/web 289/289 · blocking Visual Gate PASS.
- 2026-10-10 — **S5 ✅ — fe-shell COMPLETE (S1–S5).** Full §XXVI double-gate (Approval 1 → preflight PASSED → gate-2 SHIP →
  Approval 2) on `sessions/PLAN-s5-rearrange-responsive.md`. Built dock-together (edge-grouped `foldDocked`) + the
  cold-boot persist-read seam (`shellPrefs` + guarded hydration). /critique REVISE→SHIP (StrictMode hydration-cancel fix).
  tsc 0 · eslint 0 · @vida/web 293/293 · blocking Visual Gate PASS · Verification = 3 real-browser gates + 293 unit + 4 g2.
  **All EC-1…EC-10 built + gate-verified; EC-11/EC-12 (feel) live-gate-confirmed across S2–S5.** **Opening the PR**
  (S1–S5 → main). Deferred (homed): live `nav_preferences` read/write + real panel bodies (module nav / #15) +
  #15/#16/#17 contents → their own units / first consumer.
