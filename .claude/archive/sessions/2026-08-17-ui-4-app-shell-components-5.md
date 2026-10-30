---
Session 5 — 2026-08-17
Goal: UI-4 app shell (LIF-89) — unit S4, first-run onboarding (4 screens + App.tsx branch)
Profile: New Feature (scenario Default)
---

## Accomplished
- **S4 (onboarding) SHIPPED + MERGED** — PR #28 → `main` (`c0598b2`); commit `cc39abb`; branch deleted.
- Rendered the 4 first-run screens + wired the `App.tsx` first-run branch + the completion write, composing the
  shipped UX-5 model (`onboarding/{steps,first-run}.ts`) on UI-1 primitives. Files:
  `onboarding/{first-run-repo.ts, use-first-run.ts, onboarding.tsx}` (+3 test files) · `App.tsx` branch · new `App.test.tsx`.
- **`useFirstRun(dbReady)`** — 3-state boot resolution (`resolving | onboarding | ready`) so the app chrome never
  flashes before onboarding; keys ONLY on the device-local `first_run:completed` marker, never `exists()`.
- **`first-run-repo.ts`** — marker read/write over `getDbClient().driver`, mirroring `@vida/core`
  `get/setSchemaVersion` (`SELECT` / `INSERT OR REPLACE`).
- **`onboarding.tsx`** — full-viewport 4-screen flow rendering **OUTSIDE `AppShell`** (before the router → zero
  S1–S3 regression). `m1` copy only (BR-6; vault = confirmation, no input/crypto); focus→`<h1>` per step; no Escape;
  DS tokens + reduced-motion. Write-then-flip completion (never strands on write failure).
- **Zero `packages/ui` edit** (BR-1). Green: web typecheck · **161 tests** (+22) · lint 0-err · build.

## Gate (§XXVI double-gate, full class)
- **Step 0 baseline** — built-vs-model verified current against code; key insight: onboarding is a boot-phase
  takeover, not `AppShell` chrome → near-zero regression surface. Integration risks (async marker read → app-flash;
  completion ordering; jsdom test infra) + M1.0 security boundary all resolved from docs. Zero forks.
- **Gate-1 critique (independent subagent) REVISE** — every structural/wiring cite verified true (incl. the
  load-bearing `styled(Text,{render:'h1'})` focus mechanism via the `dialog.tsx` `DialogTitle` precedent). 2 blockers
  (`$colorTextDanger` doesn't exist → `$colorSignalDanger`; the `noUncheckedIndexedAccess` premise is false today) +
  4 material (double-write guard · submitting scope · jsdom-mobile-only disclosure · `getByRole('alert')`) folded → Rev 2.
- **/preflight PASSED (+3 folds)** — `<UIProvider>` test wrap · deferred-promise no-flash assertion · keyed-remount focus.
- **Gate-2 critique** — confirmed all fixes landed; **caught 1 NEW gap the B2 edit opened**: the `if(!step) return null`
  guard as worded would be a conditional hook call → moved after all hooks (Rev 3). → Approval 2.
- **Visual Gate SHIP** (Victor, real browser, both themes): 4 screens full-viewport + centered; heading focus clean
  (no stray outline); step motion + reduced-motion instant; vault confirmation no-input; completion → app at `/` +
  marker persists across reload.

## Decisions Made
- **Onboarding renders OUTSIDE `AppShell`** (App.tsx branch before `<RouterProvider>`, per `FIRST_RUN_BRANCH`) —
  a boot gate, not chrome → the dock/bar/command-bar never co-exist with it. Zero S1–S3 regression by construction.
- **`useFirstRun` as a hook keyed on `dbReady`** (leaves `boot.ts`/`client.ts` untouched — smallest blast radius)
  over folding the marker read into `ensureDbReady`.
- **Forward-only wizard, no Back/Skip in M1.0** — the model describes advance by explicit action; 4 informational
  screens with no input make Back non-essential (`DEF-S4-a` reserves it as a nicety).
- **No test-timeout config change** — the full-`<App/>` integration tests exceed the 5s default ONLY under this
  machine's abnormal load (~100-200; Tamagui cold-compile ~3-4s), proven green with a one-off `--testTimeout=25000`
  (per-test 1-4s at baseline). Honors the S3 load-noise lesson (Victor retracted a timeout bump as drift last session).

## Build-time fixes (grounded, not drift)
- Space tokens are **numeric** (`$16/$24/$32`), not `$lg` (that's a radius key) — corrected during the write.
- `afterEach(cleanup)` per jsdom test file — the house pattern (`command-bar.test.tsx:16`); auto-cleanup isn't
  enabled, so renders were accumulating across tests (6 false "multiple elements" failures → fixed).

## Open Questions
- none. (`DEF-S4-a` — a tighter onboarding reading measure · Back/Skip · a spoken "Step N of 4" — a deferred DS/UX
  enhancement, not blocking.)

## Next Session
First step: **Start S5 (integration)** — the FINAL UI-4 tile. Compose/verify S1–S4 wired in `App.tsx`/`routes.tsx` ·
**`/graph` lazy-split** (BR-7 — the heavy sigma/graphology WebGL out of the initial bundle; current `dist` main chunk
585 kB) · whole-shell manual regression at 375/768/1440/1920 · §XXIX Currency + shell layer-doc. Off clean `main`
through its own §XXVI gate + Visual Gate. **On S5 SHIP + merge, THEN LIF-89 → Done + `tracker --sync`** (S5 is the
last unit — do NOT sync before). Spec home: `docs/specs/features/ui-4-app-shell-components/` (umbrella `_index.md` §5).
Context to reload: memory [[apps-web-is-the-first-vida-ui-consumer]] (Tamagui gotchas + the graph-barrel WebGL stub).
⚠ CI red repo-wide is the known pnpm action-setup infra conflict (local green).
