---
Session 1 — 2026-10-11
Goal: Finish fe-shell-scope #15 (LIF-219) — the CODEC Bar 1 (Spaces scope selector + 6 global surfaces) into the fe-shell frame, both homes.
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
---

## Accomplished
- **S2 — Global surfaces, re-homed** (`ac52952`): `shell/global-surfaces-strip.tsx` (mode-prop full icon-nav / condensed Search+overflow; hamburger dropped — app-shell owns toggles) + `shell/global-surfaces-list.tsx` (labeled `render:'nav'` landmark IR6; NavLink rows + a raw `<button>` Search row + ⌘K hint) + 8 tests. Search = ⌘K action never a link; account dropped (No-Guessing). Covers EC-3/EC-4/EC-6.
- **S3 — Bar 1 assembly + dual-home wiring** (`f8f9a44`): `shell/global-bar-1.tsx` (`variant="strip"|"panel"`) + 3 tests · `AppShell.systemPanelSlot` additive seam (system body renders it, docked + float; modules keeps placeholder) · `routes.tsx` wire-in (+ QueryClient-wrapped, teardown-safe test harness) · deleted the dead `global-bar.tsx`. Covers EC-5.
- **4 shipped-primitive AA fixes**, each surfaced by a Visual Gate and fixed at the ROOT (benefit the whole app):
  1. `@vida/ui` Button — frame per-intent `color` so `leading`/`trailing` slot icons tint (were black in dark); also fixed scope-selector `ChevronDown`, the dock, and global-bar.
  2. `@vida/ui` Menu — `MenuItemRow` resting `color` so item leading icons tint in dark (also scope-selector's menu).
  3. shell NavLink — active `$colorBrandPrimary` → `$colorBrandEmphasis` (brand-on-secondary was 4.39/4.44 < 4.5 AA; also fixes the module-dock active item).
  4. app-shell #14 — System/Modules toggles condense to icon-only <768 (`PANEL_ICON`) + scope-selector `compact` prop — the 375 co-fit.
- **Gates:** tsc 0 · eslint 0 · @vida/ui 524/524 · @vida/web 355/355 (exit 0) · independent code-review SHIP · **Visual Gate PASS** — S2 isolated (132 measured, 0 AA fails) + S3 REAL shell (both homes × 3 presets × 2 modes = 0 fails incl. warm-dark · float dialog · 375 no-overflow · dark portal menu · axe 0). Prettier-clean on all changed code files.
- **PR #125 merged** to `main` (`7f3d530`), branch deleted. **LIF-219 → Done**; task completed.

## Decisions Made
- **Fix the roots, not the call sites** (Victor-approved): the slot-icon and brand-on-secondary AA bugs lived in shipped primitives (Button, Menu, NavLink) + #14's chrome — fixed there so every consumer benefits, rather than patching #15 locally.
- **375 co-fit via condensing #14's toggles** (icon-only <768) + a scope `compact` mode — the 172px text toggles, not Bar 1, were the width hog; icon-only frees room while scope keeps its name in `aria-label` (EC-1 held).
- **Account affordance dropped** from Bar 1 — no route backing + redundant with Settings (No-Guessing).
- **Merge with 2 infra reds** — Format Check (repo-wide md/doc debt) + Workers Builds (Cloudflare) are pre-existing and unrelated to this frontend PR; policy merges a unit when Typecheck/Lint/Test/E2E are green.

## Open Questions
- none blocking. Deferred (homed): live `listSpaces` read + dangling-scope reconcile · view scoping → ViewProviderRegistry · ADR-006 amendment · Space CRUD + Spaces page → fe-spaces-page #20 · Modules panel body re-home.

## Next Session
First step: pick the next head via `tracker_sync --next` (computed: `mod-routines` backend), or continue the FE campaign with `fe-spaces-page` #20 (picks up #15's deferred live `listSpaces` + Space CRUD).
Context to reload: `apps/web/src/shell/CLAUDE.md`, `.claude/tasks/_index.md` Completed, `docs/specs/foundation/fe-shell-scope/delivery/` (seam-contract §E deferrals).
Infra follow-ups (separate PRs, not blocking): repo-wide `pnpm format`; Cloudflare Workers build config.
