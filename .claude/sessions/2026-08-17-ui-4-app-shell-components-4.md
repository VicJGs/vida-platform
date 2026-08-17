---
Session 4 — 2026-08-17
Goal: UI-4 app shell (LIF-89) — unit S3, the ⌘K command-bar overlay
Profile: New Feature (scenario Default)
---

## Accomplished
- **S3 (command-bar overlay) SHIPPED + MERGED** — PR #27 → `main` (`7ddfd2b`); commit `1daf2f4`; branch deleted.
- Built the ⌘K launcher by **composing UI-1 `Dialog` + `Input`** (zero `packages/ui` edit, BR-1) + a hand-rolled
  `role=listbox` of non-focusable `role=option` divs — the Select `aria-activedescendant` pattern (one tab stop,
  ↑/↓ move a virtual active item, Enter executes). Files: `shell/{command-bar.tsx, use-command-keybind.ts,
  use-command-search.ts}` + `lib/platform.ts`; `app-shell.tsx` mounts `<CommandBar/>`.
- Wired the model: registry (`navProvider`+`shellActionsProvider`), `useShellNavigate` injected into
  `CommandRunContext`, `visibleWhen` filter (gamification fail-closed). Two store-driven modes: command list ↔
  `search-unavailable` (a loud `role=status`; the grouped `results` UI is a DB-8 seam).
- Full §XXVI gate: Step-0 baseline (command-bar model + shell seams current) → gate-1 **independent critique REVISE**
  (2 blockers on the empty-state that ships in M1.0 + 4 material, all folded) → Approval 1 → **preflight PASSED** (3
  folds) → gate-2 SHIP → Approval 2.
- **Visual Gate caught a real bug jsdom couldn't:** ⌘K was dead on the Mac (the Search button worked). Root cause:
  `detectPlatform()` resolved `'other'` because Brave farbles `navigator` → the single-mod listener expected Ctrl+K.
  Fixed with a **lenient ⌘/Ctrl mod match** (§XXVIII deviation) + 2 regression tests.
- Green: web typecheck · **139 tests** · lint 0-err · build. Currency (§XXIX): shell `CLAUDE.md`, umbrella `_index.md`,
  `.claude/docs/{decisions,components}.md`, task file all refreshed.

## Decisions Made
- **Compose Dialog+Input, don't rebuild** (BR-1 + the v6 export-dialog precedent). The load-bearing "Input forwards the
  combobox ARIA via `{...rest}` with no `packages/ui` edit" claim was *verified by the gate-1 critic compiling it*.
- **Lenient ⌘/Ctrl keybind** — reachability must not hinge on fragile `navigator` detection (Brave farbles it);
  `resolveKeybind` stays the canonical/display binding.
- **Two-mode surface is store-driven** (empty→command, non-empty→search); command-filter-by-keystroke is a UX-2 model
  change, out of S3 scope. Search stays `search-unavailable` until DB-8 (fail-loud, BR-4).
- **Retracted a self-manufactured drift:** the "test-timeout hygiene bump" was my own machine-load noise (70 zombie
  processes + concurrent runs → `collect` 2× normal → render tests exceeded the 5s default), NOT a standing infra
  defect. Contrast the real precedent (`vault.test` ~4.8s baseline tipping at 5s): these render tests have a ~1–2s
  baseline and pass clean (139/139) under normal load. No config change; nothing leaked into the docs.

## Open Questions
- none. (`DEF-S3-a` — a sr-only Dialog title + top-anchored/sheet command-palette placement — is a deferred DS
  enhancement, fenced out of S3 by BR-1's no-`packages/ui`-edit rule. Not blocking.)

## Next Session
First step: **Start S4 (onboarding)** — the 4 first-run screens + `App.tsx` `FIRST_RUN_BRANCH` wiring + completion
write, off clean `main` through its own §XXVI gate + Visual Gate. The UX-5 model is shipped in
`apps/web/src/onboarding/*` (`ONBOARDING_STEPS` + `FIRST_RUN_BRANCH`).
Context to reload: the umbrella `docs/specs/features/ui-4-app-shell-components/_index.md` §5 (S4 row);
`apps/web/src/onboarding/*` + `docs/core/architecture/onboarding.md`; memory
[[apps-web-is-the-first-vida-ui-consumer]] (Tamagui gotchas). LIF-89 stays in-progress until S1–S5 land — do NOT
tracker --sync. ⚠ CI red repo-wide is the known pnpm action-setup infra conflict (local green).
