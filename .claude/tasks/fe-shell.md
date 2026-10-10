# Task: fe-shell
# Status: in-progress
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
- [ ] S3 — Docked panel (A): inline flush, content beside, contained header control — EC-1/2/4/5
- [ ] S4 — Floating panel (B): overlay + scrim + elevation + dismiss/focus/motion — EC-1/3/6/12
- [ ] S5 — Rearrange + dock-together + responsive + full a11y/AA Visual Gate + Verification — EC-4/9/10

- 2026-10-10 — front matter gated+approved (baseline → interpretation → **envision LOCKED** → decomposition).
  Worktree `.claude/worktrees/fe-shell` off origin/main. Next: S1.
- 2026-10-10 — **S1 ✅** placement model + shell state (data/logic, no Visual Gate).
- 2026-10-10 — **S2 ✅** CODEC frame (`app-shell.tsx` reshape + `routes.tsx` overlaySlot + 4-test reconcile). Full §XXVI
  double-gate + blocking Visual Gate PASS + g2 SHIP + /critique SHIP. **Next: S3** — the docked panel (A): `ShellPanel`
  inline-flush at its edge, content beside, two-row contained header (`▣ Dock|⧉ Float` + `◧⬒◨⬓` edge picker). Upgrade the
  bar toggles to `aria-expanded`/`aria-controls` once the panel renders (g2 forward-note). PR at S5.
