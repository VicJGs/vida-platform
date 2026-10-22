# Known Failures — this project
# Project-specific failure patterns. Added via the On Failure protocol in each scenario.
# Assign F-numbers sequentially — check the last entry before adding. Format: _template.md
# This file is seeded once by the toolkit and then OWNED by the project — never overwritten.

---

## F001 — @vida/core: "Cannot find module '@vida/types'" during typecheck

**Symptom:** `pnpm typecheck` fails in `@vida/core` with `error TS2307: Cannot find module '@vida/types'` across 6 source files. `editor`/`ui`/`server` pass (they don't import it).
**Root cause:** ISOLATED. `packages/core/package.json` imported `@vida/types` in source but never declared it as a dependency, so pnpm didn't symlink it into `core/node_modules`. `tsc --noEmit` resolves bare specifiers via `node_modules` (unlike `tsc --build`, which can follow project `references`), so it couldn't find the package.
**Fix:** Add `"@vida/types": "workspace:*"` to `packages/core/package.json` dependencies, then `pnpm install` to create the symlink.
**Prevention:** When a package imports another workspace package, declare it in `package.json` — a tsconfig `references` entry alone is NOT enough for `tsc --noEmit`. Grep `@vida/*` imports vs declared deps when adding cross-package imports.
**Documented:** 2026-06-08 | Session: 2026-06-08-toolkit-setup-2

---

## F002 — key-management.ts: Uint8Array | null not assignable to Uint8Array

**Symptom:** `error TS2322: Type 'Uint8Array | null' is not assignable to type 'Uint8Array'` at `unlockVault` return (line 99).
**Root cause:** ISOLATED. `_vaultKey` is a module-level `let` typed `Uint8Array | null`. Although assigned a non-null value earlier in the function, TypeScript widens it back to the declared union after intervening function calls (`zeroKey`, `setState`) that could theoretically reassign it, so the `return _vaultKey` is seen as possibly null.
**Fix:** Return the local non-null value directly: `return keyChain.vault_key` instead of `return _vaultKey`.
**Prevention:** Don't return module-level mutable union-typed variables across function-call boundaries; return the narrowed local that holds the same value.
**Documented:** 2026-06-08 | Session: 2026-06-08-toolkit-setup-2

---

## F003 — token pipeline: `dark_<Comp>` sub-themes identical to `light_<Comp>` (dark mode uses light values)

**Symptom:** Generated `themes.ts` emits `light_Button ≡ dark_Button` (both `backgroundPrimary: tokens.color.brand600`). Component sub-themes render light-mode token values in dark mode; the `semantic.dark.json` overlay is bypassed for the entire component-token layer. Surfaced by DS-5 when firming the `component.json` intent set (previously invisible because only `button.background.primary` existed).
**Root cause:** STRUCTURAL. The `vida/tamagui-themes` emitter resolves component (rank-2) tokens to their **primitive** value (`build-tokens.mjs:179` `toPrimitivePath` + `:183` `tokenRef`) and emits `light_`/`dark_` from **one shared `subs` object** (`:217-218`) — collapsing the semantic light/dark indirection. This deviates from the DS-1 spec's projection example (`ds-1-token-pipeline/_index.md:113`: `light_Button = { background: light.colorSurfacePrimary }` — sub-themes reference the **base theme objects** `light.*`/`dark.*`). The DS-1 acceptance prose ("referencing those tokens") was ambiguous and the impl followed it; a placeholder duplication of `light_/dark_` went unnoticed while only one non-dark-critical component token existed.
**Fix:** In the rank-2 branch, read the component token's semantic ref (`t.original.value` → `refTarget` → `camel`) and store the **semantic key**; emit `light_<Comp>[k] = light.<semKey>` / `dark_<Comp>[k] = dark.<semKey>` per DS-1:113 (dark inherits the overlay by construction). Add a `build-tokens.test.ts` fixture asserting `light_<Comp> ≠ dark_<Comp>` when a referenced semantic has a dark override. Full diagnosis + fix: `docs/specs/fixes/component-subtheme-dark-drift/_index.md`.
**Prevention:** When an acceptance criterion's prose disagrees with its concrete projection example, the **example is authoritative** — encode it as a test, not prose. Fix pipeline defects at the pipeline root (DS-1), never per-consumer (DS-5) — a per-component patch masks the shared root cause.
**Documented:** 2026-08-05 | Session: 2026-08-05-ds-5-primitive-contracts

---

## F004 — horizontal scroller widens the PAGE although `overflow:auto` contains the grid

**Symptom:** Visual Gate at 375: `document.scrollWidth` 616 > 375 on the fe-calendar Week range, while the scroll region itself measured 311px wide with `overflow-x:auto`. jsdom tests all green (no layout engine).
**Root cause:** ISOLATED. A visually-hidden (sr-only) span is `position:absolute`. An absolute element is clipped by an `overflow:auto` ancestor ONLY if that ancestor is (or contains) its containing block; with no positioned ancestor inside the scroller, the ", today" span positioned against an ancestor OUTSIDE it and escaped the clip at its in-grid x (~600px).
**Fix:** `position:'relative'` on the scroll region (and the renderer root) so it is the containing block. `packages/ui/src/components/week-view.tsx` (`WeekRoot`, `ScrollRegion`).
**Prevention:** any horizontal scroller that holds sr-only text gets `position:relative`. Score PAGE overflow separately from REGION overflow in every Visual Gate; a region probe that treats scroller descendants as contained assumes the clip works.
**Documented:** 2026-10-20 | Session: 2026-10-20-fe-calendar-1

---

## F005 — list accessible name differs by engine ("Thu8" in jsdom vs "Thu 8" in a browser)

**Symptom:** `getByRole('list', { name: 'Thu 8, today' })` fails in jsdom; the computed name is "Thu8" / "Thu 8 , today". A whitespace-only sr-only separator span is dropped.
**Root cause:** ISOLATED. `aria-labelledby` pointed at a visual header whose eyebrow + number are separate inline spans; the accname algorithm concatenates their text without a separator in jsdom, while a browser's flex column blockifies them. Deriving a NAME from visual layout is engine-dependent.
**Fix:** point `aria-labelledby` at ONE explicit sr-only string (`"Thu 8, today"`) and mark the visual header `aria-hidden`. `week-view.tsx` column headers.
**Prevention:** when a name is composed from several visual pieces, author the name as a single string; assert it with an exact `name:` in tests (a `\s*` regex hides the defect).
**Documented:** 2026-10-20 | Session: 2026-10-20-fe-calendar-1

---

## F006 — `encryption/vault.test.ts` Argon2id / "large data (1 MB)" timeouts read as a regression
**Symptom:** full `@vida/core` run shows 1–4 reds in `src/encryption/__tests__/vault.test.ts` (`deriveMasterKey`, `unlockKeyChain`, `encryptBytes … handles large data (1 MB)`) taking 6–143 s against a 20 s budget.
**Root cause:** ENVIRONMENTAL. CPU-bound Argon2id + 1 MB XChaCha tests are marginal on this Mac; they time out when the full suite runs concurrently or another session runs vitest (load avg 100–400). Not a code regression — appears on branches that touch no encryption file.
**Fix:** check `uptime` + `pgrep -fl vitest`; re-run `npx vitest run src/encryption/__tests__/vault.test.ts` alone on an idle machine (expect 36/36, seen 2026-10-20). Record, don't patch. Candidate follow-up outside any module: mark the 1 MB test `slow`/raise its timeout.

## F007 — the live app shows "Failed to open the local database: DB worker RPC 1 (open) timed out after 15000ms"
**Symptom:** on a page load of the running app (dev server or a `vite preview` production build) the boot screen shows the
timeout + Retry. Dev: intermittent, Retry opens the DB with data intact. Production build: every load; the worker chunk
loads (200) but never requests its wasm. (fe-calendar S7 live gate, 2026-10-22.)
**Root cause:** UNKNOWN — filed as **LIF-250** `fix-data-plane-boot-open` (bug unit `docs/specs/fixes/data-plane-boot-open/`:
hypotheses = the previous document's worker still holding the exclusive AccessHandlePoolVFS OPFS handles · the prod
worker's wasm locate path). NOT caused by a feature change if the diff doesn't touch `apps/web/src/db/*` / `vite.config.ts`.
**Fix (until LIF-250 lands):** in a gate, press the app's own Retry (or wait, then reload) — don't misread it as your
regression; never measure performance on the prod build until LIF-250 is fixed (it can't boot).

## F008 — a wave of FIRST-test-of-file timeouts across unrelated files in a full-suite run
**Symptom:** 10+ files fail their first test at 5–19 s (Select, Tabs, Menu, AppShell, App first-run…) — files the change
never touched.
**Root cause:** ENVIRONMENTAL load — the run competed with a dev server, a `vite preview` and a Playwright browser
(same class as the cold Tamagui load under concurrency).
**Fix:** stop the servers/browsers you started, re-run ONLY the failed files in isolation; green there = flake, not a
regression. Run full suites on a quiet machine, sequentially per package.
