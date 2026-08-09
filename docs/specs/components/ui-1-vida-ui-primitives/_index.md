# Spec: component:ui-1-vida-ui-primitives

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: in progress (2026-08-06 — U0 planning). Per-component §XXVI gate; each U1–U10 also runs the component Visual Gate.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-06-ui-1-vida-ui-primitives.

## 0. Source model (direction — inherited from DS-2)

Frontend source of truth = documented intent, realized code-first during M1; Figma-later as a projection.
Pointer: `docs/specs/foundation/frontend-source-of-truth.md` (guard `pnpm check:frontend-source-model`).
`[MEM: frontend-source-of-truth-is-documented-intent]`

## 1. Identity

**UI-1 — Vida UI primitives** (LIF-86) — M1.0 `#27`, Design System. Depends: DS-5 (done, PR #7).
Blocks: UI-2 (#28), UI-3 (#29), UI-4 (#30). [FACT: reconstructed-structure.md:84]
Build the 10 primitives against the DS-5 contracts (`docs/specs/components/ds-5-primitive-contracts/`).

---

# U0 — Storybook standup (render harness for the component Visual Gate)

## Why

The component Visual Gate has no mechanism yet. `frontend-visual-gate.md:44` names **Storybook**
(`pnpm storybook`, "stands up at DS-5/UI-1") as the Components-row render. U0 stands it up so U1–U10
can each be visually approved (8 states × light｜dark). Normal §XXVI gate (infra — no Visual Gate of its own).

## Verified integration facts (U0.1 /verify — Storybook v9 + Tamagui live docs, 2026-08-06)

- [FACT: context7 /storybookjs/storybook/v9.0.15] Storybook is **v9**; framework `@storybook/react-vite`;
  React 19 supported; `react`+`react-dom` are required devDeps; SB 8+ needs `@vitejs/plugin-react` explicit.
- [FACT: context7 /tamagui/tamagui] Tamagui runs **without** the optimizing compiler → Storybook runs
  untamed (runtime styles); no `@tamagui/vite-plugin` in U0 (perf optimization deferred, not needed for a gallery).
- [FACT: provider.tsx:20] `UIProvider({theme}:'light'|'dark')` re-roots via `defaultTheme` → the decorator
  is `<UIProvider theme={globals.theme}>`; a `globalTypes.theme` toolbar drives the global light/dark switch.
- [FACT: packages/ui/tsconfig.json] `include:["src"]` → `*.stories.tsx` would emit to `dist`; must be excluded.
- [FACT: apps/web/package.json] align versions: `vite@^6.3.5`, `@vitejs/plugin-react@^4.4.1`, `react@^19.1.0`.

## Deliverables

1. `packages/ui/package.json` — add devDeps `storybook@^9`, `@storybook/react-vite@^9`,
   `@storybook/addon-a11y@^9` (a11y is a contract concern — §XIV), `react@^19.1.0`, `react-dom@^19.1.0`,
   `@types/react-dom@^19`, `@vitejs/plugin-react@^4.4.1`, `vite@^6.3.5`. Scripts:
   `"storybook":"storybook dev -p 6006 --no-open"`, `"build-storybook":"storybook build"`.
   (NB [C6]: `react`/`react-dom` as explicit devDeps is required so Storybook resolves them in-package; this
   is NOT a version-conflict risk — `.npmrc` has `auto-install-peers=true`+`strict-peer-dependencies=false`,
   so the `react:>=19` peer never clashes with a `^19.1.0` devDep.)
2. `packages/ui/vite.config.ts` — `defineConfig({plugins:[react()], test:{environment:'node'}})`. The
   `test.environment:'node'` **pins the current vitest behavior** (there is no vite/vitest config today →
   vitest auto-loads this file; the pin prevents the new file from silently changing the 2 node-env test runs). [C1]
3. `packages/ui/.storybook/main.ts` — framework `@storybook/react-vite`; stories `../src/**/*.stories.tsx`; addons `['@storybook/addon-a11y']`.
4. `packages/ui/.storybook/preview.tsx` — global decorator wrapping in `UIProvider theme={ctx.globals.theme}`;
   `globalTypes.theme` toolbar (light｜dark); `initialGlobals:{theme:'light'}`; backgrounds off (surface comes from the provider).
5. `packages/ui/tsconfig.json` — add `"**/*.stories.tsx"` to `exclude` (keeps stories out of `dist`; `.storybook/`
   - root `vite.config.ts` are already invisible to the build since `include:["src"]`).
6. **`packages/ui/tsconfig.storybook.json`** [C2 — the critique's blocking-adjacent gap] — a typecheck-only
   tsconfig (`noEmit`, includes `.storybook/**`, `vite.config.ts`, `src/**/*.stories.tsx`). Without this, the
   new Storybook/story files are type-checked by **nothing** (react-vite uses esbuild, no typecheck), so a broken
   decorator/story would ship "green". Wire it into the DoD typecheck step. Catches `noUnusedLocals` traps too [C9].
7. root `package.json` — `"storybook":"pnpm --filter @vida/ui storybook"`. **No turbo wiring by design** —
   `storybook`/`build-storybook` run outside the graph (persistent dev server / ad-hoc build); distinct script
   keys from `build`, so `turbo run build` never invokes them (verified vs turbo.json tasks). [C5]
8. `packages/ui/src/_welcome.stories.tsx` — one smoke story: a themed Tamagui surface (token-driven bg + text)
   proving provider + token resolution + the light/dark toggle. Minimal; replaced/supplemented once U1 lands.
9. `.gitignore` — add `packages/ui/storybook-static/` (the `build-storybook` output). [C4]

## Definition of Done (U0)

- `pnpm --filter @vida/ui storybook` boots on :6006; the smoke story renders a token-themed surface.
- **Theme toolbar toggles light↔dark and the surface changes** — this is the _actual_ verification event that
  Tamagui's runtime style injection + the DS-4 switch work through Storybook (see Risks — first browser render
  in the repo). Watch specifically that `addThemeClassName:'html'` (tamagui.config.ts) + Storybook's iframe still
  scope the theme vars to the provider wrapper — the single most likely "toggle does nothing" failure point. [C8]
- `pnpm --filter @vida/ui typecheck` green **AND** `tsc -p tsconfig.storybook.json --noEmit` green (the new
  files are actually checked, not blind-green). `tsc --build` emits **no** `*.stories`/`.storybook` into `dist`. [C2/C9]
- `pnpm --filter @vida/ui test` still green (31/31 — proves the new `vite.config.ts` didn't change vitest). [C1]
- `build-storybook` runs once successfully (proves the build path, not just dev); `storybook-static/` gitignored. [C4]
- addon-a11y panel renders; new files pass `prettier --check`.
- No Tamagui compiler added; no primitive `.tsx` yet (that's U1+).

## Risks

- SB v9 + Vite 6 + React 19 — **verified compatible by live docs** (context7), and proven at runtime by the U0
  smoke story (this is the **first** browser render of `@vida/ui`'s Tamagui config anywhere in the repo — apps/web
  doesn't consume it yet). So: docs-verified now, render-proven at the DoD, not before. [C7]
- Tamagui runs untamed (no compiler): with React 19 it auto-injects runtime styles via style tags [FACT: tamagui
  live docs] — no `outputCSS`/vite-plugin needed for a gallery. Proven by the smoke story's visible surface.
- Adding `vite.config.ts` interacts with the existing vitest run — mitigated by pinning `test.environment:'node'`
  (#2) and the 31/31 re-run in the DoD. [C1]
- Stories import from `../src` (source, not `dist`) so no build needed and the `tamagui.d.ts` side-effect loads.
