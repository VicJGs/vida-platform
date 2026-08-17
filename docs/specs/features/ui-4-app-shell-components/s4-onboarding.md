# Spec: feature:ui-4-app-shell-components / S4 — Onboarding

Status: draft            <!-- draft → approved → implemented -->
Source-repo: apps/web/src/onboarding (chrome + wiring), apps/web/src/App.tsx (the first-run branch)
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X]. Inherits the umbrella §2 BR-1..7.
Sessions: 2026-08-17-ui-4-app-shell-components-5

> Unit S4 of UI-4 (umbrella `_index.md` §5). The **first-run onboarding**: the four screens the UX-5 model
> (`onboarding/steps.ts` + `onboarding/first-run.ts`) was designed against, plus the **`App.tsx` boot branch** that
> shows them on first launch and the **completion write** that retires them. Composes UI-1 `Button` + Tamagui `Text`/
> `View` on DS tokens (BR-1 — no new `@vida/ui` component, no `packages/ui` edit). Off clean `main`, own PR.

## 1. Identity
The **first-run onboarding** — a full-viewport, boot-phase takeover shown ONCE per device, before the app chrome
ever mounts. Four informational screens (welcome · local-first expectation-setting · vault-readiness confirmation ·
completion) advanced by an explicit primary action; on the last, it writes the device-local completion marker and
hands off to the app at `/`. Not a route, not an overlay — a boot gate.

- [FACT: _index.md:81] S4 scope = "the 4 first-run screens + `App.tsx` `FIRST_RUN_BRANCH` wiring + completion write".
- [FACT: onboarding.md:9-11] ownership: UX-5 owns the *model* (data/logic); **UI-4 owns the rendering (the screens)
  and the wiring (the App.tsx branch + the completion write)**. Vault-unlock/lock UX is UX-5b/M3.
- [FACT: onboarding.md:102-103] "UI-4 (app shell) renders the four onboarding screens, wires the `App.tsx` first-run
  branch (`FIRST_RUN_BRANCH`), and performs the completion write. It reads `ONBOARDING_STEPS` for order + copy and
  `isFirstRun` for the gate."

**What it renders/wires** (existing artifacts, referenced not redefined):
- [FACT: onboarding/steps.ts:22-51] `ONBOARDING_STEPS` — the ordered 4-step model (`welcome`·`privacy`·`vault`·
  `ready`) + `OnboardingStep`/`OnboardingStepKind` + the per-step `OnboardingCopyContract` (`m1` = the M1.0 claim;
  `m3?` = the encryption-backed claim, GATED to UX-5b/M3). S4 renders `step.copy.m1` for every step (M1.0).
- [FACT: onboarding/first-run.ts:16-37] `isFirstRun(flag)`, `FIRST_RUN_COMPLETE_KEY='first_run:completed'`,
  `FIRST_RUN_COMPLETE_VALUE='1'`, `FIRST_RUN_BRANCH` (the App.tsx seam described as data). S4 implements the branch.
- [FACT: App.tsx:12-66] the boot component: `dbReady` gate → `UIProvider ⊃ QueryClientProvider ⊃ RouterProvider`. S4
  inserts the first-run branch in the `dbReady === true` arm, **before** `<RouterProvider>` (FIRST_RUN_BRANCH.at).
- [FACT: db/boot.ts:19-25 `getDbClient`] + [FACT: db/client.ts:141-148 `driver.query`/`driver.run`] the marker
  read/write path. [FACT: adapter.ts:210-232] the canonical `app_state` KV idiom (`getSchemaVersion`/`setSchemaVersion`):
  read `SELECT value FROM app_state WHERE key=?`, write `INSERT OR REPLACE INTO app_state (key,value) VALUES (?,?)`.
- [FACT: state-conventions/keyboard.ts:21-32] `FOCUS_CONTRACT.pageNav = 'main-heading'` — each step transition moves
  focus to the step's `<h1>`. [FACT: breakpoints.ts:29] `CONTENT_MAX_WIDTH=1280` — the centered content cap.
- [FACT: @vida/ui index.ts:20 `Button`, :49 `useReducedMotion`] the primitives S4 composes; Tamagui `Text`/`View`/
  `styled` from `@tamagui/core` (the `nav-link.tsx`/`module-dock.tsx` idiom: `<Text fontSize="$…" fontFamily="$…">`).

**What it is NOT** — [INTERP] not the vault-key creation or passphrase capture (AR-3/UX-5b/M3 — the `vault` step is
**confirmation-only** copy in M1.0, no input, no crypto call) · not the unlock/lock-on-every-launch UX (UX-5b/M3) ·
not a navigable `/onboarding` route (onboarding.md:61 rejects it — no deep-link, no history entry) · not an
`overlayHost` overlay (onboarding.md:79 — boot-phase full-viewport surface, **no Esc-dismiss**, no `aria-modal`) ·
not the synced `UserProfile.onboarding_completed` flag (that's a cross-device *user* flag, M1.1+; this marker is
device-local `app_state`, never synced) · not shell chrome (it renders OUTSIDE `AppShell`, replacing the whole app
tree until complete — zero regression surface against S1–S3) · not a new `@vida/ui` primitive (rule-of-three unmet).

## 2. Business Rules (S4 refinements of the umbrella BR-1..7)

- **S4-BR-a · Compose UI-1 + Tamagui primitives; build no new component (BR-1).** [FACT: @vida/ui index.ts:20;
  global-bar.tsx:43-68 the `Button intent/size/onPress/leading` idiom] the screens are `styled(View)`/`styled(Text)`
  layout + copy + a UI-1 `Button` primary action. **No `packages/ui` edit** (the S1 `media` object remains UI-4's only
  `packages/ui` write, BR-1); no new `@vida/ui` component (one consumer, rule-of-three unmet). Every surface/text/
  border/gap/radius/z value resolves to a DS token (BR-2) — no hex, no invented spacing.

- **S4-BR-b · The branch keys ONLY on the marker (two-signal independence).** [FACT: first-run.ts:1-13 +
  onboarding.md:64-68] the first-run decision is `isFirstRun(app_state['first_run:completed'])` — **never**
  `WorkerDbClient.exists('vida')`. `exists()` is the DB-lifecycle (open-vs-create) signal and is already `true` on
  first launch (open migrates the DB) while the marker is unset — they disagree BY DESIGN; keying on `exists()` would
  make onboarding never show. S4 reads only the marker.

- **S4-BR-c · The boot branch resolves in THREE states — no app flash before onboarding (integration risk R1).**
  [FACT: App.tsx:16-52] App currently gates on one async signal (`dbReady`). The marker read is a **second** async
  worker RPC, so a naive `dbReady && isFirstRun` check would render the app for one commit before the read resolves.
  S4 introduces `useFirstRun(dbReady)` → `status: 'resolving' | 'onboarding' | 'ready'`: while `resolving` the boot
  shows the SAME neutral "Loading…" surface (App.tsx:46-52), and only after the marker read resolves does it branch to
  onboarding or the app. The read effect is StrictMode-safe (an `active` cleanup flag — the App.tsx:32-34 / boot.ts R9
  precedent); the read is idempotent.

- **S4-BR-d · Completion is write-THEN-flip, and never strands (BR-4 degrade-never-crash + integration risk R2).**
  [FACT: adapter.ts:230-232 `INSERT OR REPLACE`] on the final step's primary action S4 `await`s
  `writeFirstRunComplete()` **before** flipping `status → 'ready'` — so a reload can never re-show onboarding after a
  successful completion. **On a write rejection** the status does NOT flip (the marker stays unset — honest): the
  screen surfaces an inline `role="alert"` error + a retry (the primary button re-enables), never a blank screen and
  never a silent skip of the mandatory gate. The write is idempotent (`INSERT OR REPLACE`), so a retry after a partial
  failure is safe.

- **S4-BR-e · Copy honesty — render `m1` only; the vault step is confirmation, not creation (BR-6).**
  [FACT: steps.ts:6-12,36-45 + onboarding.md:88-96] each step renders `step.copy.m1`. M1.0 (encryption off) MAY claim
  **local-first**; MUST NOT claim data is encrypted-at-rest or zero-knowledge — those live in `m3?`, gated behind an
  encryption-active signal UX-5b/M3 will flip (S4 renders NO `m3` copy — there is no such signal in M1.0). The `vault`
  step (`kind:'vault-create'`, `deferredImpl:'vault-key'`) renders as a **confirmation** ("Your local vault is ready
  on this device.") — **no passphrase input, no key-creation call, no crypto**. Its presence keeps the step index
  stable for UX-5b/M3 (onboarding.md:51); only its M1.0 copy is confirmation-shaped.

- **S4-BR-f · Focus moves to the step heading on every transition; NO Escape-dismiss (BR-5).**
  [FACT: keyboard.ts:21-32 `FOCUS_CONTRACT.pageNav='main-heading'` + onboarding.md:77-81] each step is a `<main>`
  landmark with a single `<h1>`; on mount and on every step advance, focus moves programmatically to that `<h1>`
  (`tabIndex={-1}` + a ref + a `useLayoutEffect` keyed on the step index — the U7-Menu mount-gated-focus precedent so
  the first `.focus()` actually lands). Moving focus to the new heading IS the transition announcement (a screen
  reader reads the heading) — no extra live region for step changes. The primary action is a UI-1 `Button`
  (Tab-reachable, Enter/Space activate, visible focus ring). **No `keydown`/Escape handler** — onboarding is a
  mandatory boot gate, NOT an `overlayHost` overlay, so `OVERLAY_DISMISS` is out of scope by category (onboarding.md:79);
  S4 adds no Esc by habit. Forward-only: the primary action advances; there is no Back and no Skip in M1.0 (the model
  describes forward advance by explicit action only — a disclosed decision, §6, not a fork).

- **S4-BR-g · Full-viewport, mobile-first responsive; motion is transform/opacity only (BR-2, BR-3).**
  [FACT: onboarding.md:82-84 + breakpoints.ts:29] a full-viewport (`height:100vh`) single-column takeover: mobile =
  full-bleed with `SIDE_PADDING` gutters; tablet/desktop = the content column centered within `CONTENT_MAX_WIDTH`
  (1280); `wide` caps containment. Values come from `breakpoints.ts` (BR-3) — no invented widths. [FACT:
  onboarding.md:84 + DS-3 motion] step transitions animate **opacity/transform only** (DS-3 `moderate`), and
  `useReducedMotion()` (@vida/ui) → instant (no transition) under `prefers-reduced-motion` (B12). A decorative step
  indicator (4 dots) is `aria-hidden` (the heading + a "Step N of 4"-equivalent is conveyed by focus + the accessible
  heading; the dots are a token-only visual affordance, not an interactive control).

- **S4-BR-h · Renders outside `AppShell`; zero regression surface against S1–S3 (integration risk R3).**
  [FACT: App.tsx:58-65 + routes.tsx:29-35] the branch replaces the ENTIRE app tree (before `<RouterProvider>`), so the
  dock/global-bar/command-bar (S1–S3, mounted inside the router's `RootComponent`) do NOT co-exist with onboarding —
  they render only in the `'ready'` branch. `<Onboarding>` renders INSIDE `UIProvider` (App.tsx:59 — so Tamagui theme
  + DS tokens resolve) but needs neither `QueryClientProvider` nor `RouterProvider` (completion flips a state; the app
  then mounts at `/` — no navigate). S4 changes `App.tsx` only; it does NOT touch `boot.ts`/`client.ts`/`routes.tsx`/
  the shell (blast radius = App.tsx + the new `onboarding/*` files).

## 3. Contract
The UX-5 model (`onboarding/{steps,first-run}.ts`) + the DB client + `FOCUS_CONTRACT` + `CONTENT_MAX_WIDTH` are
REFERENCED, not redefined. New chrome + wiring live in `apps/web/src/onboarding/` (co-located with the model — the
`shell/` precedent where the UX-3 model + UI-4 chrome coexist); `App.tsx` gains the branch. No new cross-package edge;
the `apps/web` → `@vida/ui` boundary stays one-way.

- **`readFirstRunComplete` / `writeFirstRunComplete`** (`apps/web/src/onboarding/first-run-repo.ts`) — the marker's DB
  access, isolated so the hook + tests don't hand-write SQL (the `lib/platform.ts` precedent). Mirrors
  `getSchemaVersion`/`setSchemaVersion` (adapter.ts:210-232) over `getDbClient().driver`:
  - `readFirstRunComplete(): Promise<boolean>` → `driver.query<{value:string}>('SELECT value FROM app_state WHERE
    key = ?', [FIRST_RUN_COMPLETE_KEY])`; returns `!isFirstRun(rows[0]?.value)` (`true` = completed). **The `?.` is a
    deliberate defensive read** — `adapter.ts:216`'s `getSchemaVersion` uses a bare `rows[0].value` (which compiles
    only because the repo has no `noUncheckedIndexedAccess` today — the parked `tsconfig-strict-index-access` task); the
    `?.` is correct regardless of that flag and handles the no-row (absent-marker) case. Same SQL, safer access — not a
    literal mirror.
  - `writeFirstRunComplete(): Promise<void>` → `driver.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?,
    ?)', [FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE])` (the adapter.ts:230-232 write idiom, verbatim).
- **`useFirstRun`** (`apps/web/src/onboarding/use-first-run.ts`) — `useFirstRun(dbReady: boolean): { status:
  FirstRunStatus; markComplete: () => Promise<void> }`, `FirstRunStatus = 'resolving' | 'onboarding' | 'ready'`.
  - A `useEffect([dbReady])`: while `!dbReady` no-op (stays `resolving`); once `dbReady`, `readFirstRunComplete()` →
    `setStatus(done ? 'ready' : 'onboarding')`, guarded by an `active` flag (StrictMode). **On read rejection →
    `'onboarding'`** (conservative + idempotent: the mandatory gate re-shows and re-writes; never strands at Loading,
    never silently skips — S4-BR-c/d).
  - `markComplete = useCallback(async () => { await writeFirstRunComplete(); setStatus('ready') }, [])` — write THEN
    flip (S4-BR-d). A rejection propagates to the caller (the button) and leaves `status` unchanged.
- **`Onboarding`** (`apps/web/src/onboarding/onboarding.tsx`) — `function Onboarding({ onComplete }: OnboardingProps)`,
  `OnboardingProps = { onComplete: () => Promise<void> }`. The 4-screen flow:
  - `const [index, setIndex] = useState(0)`; `const step = ONBOARDING_STEPS[index]`; `const reduced = useReducedMotion()`.
  - **Rules of Hooks:** call ALL hooks first (`useState(index)`, `useReducedMotion`, `useState(submitting)`,
    `useState(error)`, the `headingRef`, the `useLayoutEffect([index])`); the defensive `if (!step) return null` sits
    **just before the JSX return, after every hook** (NOT immediately after `const step` — that would be a conditional
    hook call). It never actually fires (`index` is always in `[0,4)`); it only future-proofs the parked
    `noUncheckedIndexedAccess` flip, where `ONBOARDING_STEPS[index]` narrows to `OnboardingStep | undefined`.
  - `const [submitting, setSubmitting] = useState(false)` + `const [error, setError] = useState<string | null>(null)`
    (completion-write failure copy). `submitting` is set ONLY in the `complete` branch — so on steps 1–3 the button's
    `loading`/`disabled` are always `false`.
  - **Advance (re-entrancy-guarded, M1):** `if (submitting) return` first; then `step.kind === 'complete'` →
    `setSubmitting(true); setError(null); onComplete().catch(() => { setError('Could not finish setup. Please try
    again.'); setSubmitting(false) })` (no `setSubmitting(false)` on success — the component unmounts when `status`
    flips to `'ready'`); otherwise `setIndex(i => i + 1)` (S4-BR-d,f). The `if (submitting) return` + `disabled`
    together stop a double-click double-write; the write is idempotent (`INSERT OR REPLACE`) so even a race is safe.
  - **Structure:** a full-viewport `styled(View,{render:'main'})` (S4-BR-g) → a centered content column
    (`maxWidth={CONTENT_MAX_WIDTH}`, `alignItems:'center'`, per-breakpoint gutters via `SIDE_PADDING`) →
    an animated step group `keyed on index` (`enterStyle` opacity/`y`, `animation={reduced ? undefined : 'moderate'}`,
    B12 — the `app-shell.tsx:108-109` drawer `enterStyle`+`animation` idiom, `y` symmetric to its `x`): the `<h1>`
    heading (`styled(Text,{render:'h1'})` — the `dialog.tsx:107-115` `DialogTitle = styled(Text,{render:'h2'})`
    precedent, a real focusable semantic heading — `tabIndex={-1}`, ref, `fontFamily="$display"`, `fontSize="$display"`
    [36, fonts.ts:6], `$colorTextPrimary`), the body `<Text>` (`step.copy.m1`, `fontSize="$subheading"` [18],
    `$colorTextMuted`), the decorative dot indicator (`aria-hidden`, active = `$colorBrandPrimary`, rest =
    `$colorBorderDefault`), and the primary `<Button intent="primary" size="lg" onPress={advance} loading={submitting}
    disabled={submitting}>` with a per-kind label (see below). On completion error, a `role="alert"` `<Text
    color="$colorSignalDanger">` (B1 — `$colorSignalDanger` is the danger-family token that exists, themes.ts:5,7;
    there is NO `$colorTextDanger`). `role` passes through Tamagui `Text` the same way `aria-*`/`role` pass through
    `View` in `nav-link.tsx`/`module-dock.tsx` — asserted in §4 via `getByRole('alert')`.
  - **Primary-action labels** (UI-4 render decisions — the model gives copy, not button labels; onboarding.md:44-49
    intents): `intro` → "Get started" · `explain` → "Continue" · `vault-create` → "Continue" · `complete` → "Enter
    Vida". (Disclosed, not a fork — the model owns headings/body; labels are the render layer's.)
  - **Focus (S4-BR-f):** a `useLayoutEffect([index])` → `headingRef.current?.focus()` (mount-gated so the first focus
    lands — the U7 precedent). No Escape handler.
- **`App.tsx` change** [FACT: App.tsx:12-66] — insert the first-run branch:
  - `const firstRun = useFirstRun(dbReady)` — placed among the existing hooks (after the `useState`/`useEffect` block,
    **before** the `if (dbError)`/loading early returns — Rules of Hooks: it must run on every render).
  - Gate: keep `if (dbError) …`; change the loading gate to `if (!dbReady || firstRun.status === 'resolving') return
    <Loading/>` (the marker read is part of boot — no app flash, S4-BR-c).
  - The `dbReady`-ready return renders, inside `<UIProvider theme="light">`: when `firstRun.status === 'onboarding'` →
    `<Onboarding onComplete={firstRun.markComplete} />`; else → `<QueryClientProvider><RouterProvider …/>
    </QueryClientProvider>`. `<ToastProvider />` stays a constant sibling inside `UIProvider` (harmless during
    onboarding). No change to the provider hierarchy, the DB boot effect, or the error/retry arm (S4-BR-h).
- **a11y** [FACT: §XIV + onboarding.md:75-84] — the surface is a `<main>` landmark with one `<h1>` per step; focus
  moves to the `<h1>` on each transition (announcement); the primary action is a real focusable `Button` with a
  visible ring; completion errors announce via `role="alert"`; no focus trap, no Esc (not an overlay). Contrast: text
  on `$colorSurfacePrimary` uses `$colorTextPrimary`/`$colorTextMuted` (DS AA pairings — DS-2 provisional palette).

## 4. Acceptance (S4 DoD — includes the component Visual Gate)
- [ ] First launch (marker absent): after `dbReady`, the boot shows Loading until the marker read resolves, THEN
      renders `<Onboarding>` — the app chrome (dock/bar) never flashes (S4-BR-c) — asserted via a mocked repo
- [ ] The four steps render in order (welcome→privacy→vault→ready) from `ONBOARDING_STEPS`; each renders its
      `step.copy.m1` (never `m3`); the primary action advances; `complete` calls `onComplete` (S4-BR-e,f) — jsdom
- [ ] The `vault` step renders confirmation copy with **no input field and no crypto call** (BR-6/S4-BR-e) — jsdom
      (assert no `<input>`, the confirmation copy present)
- [ ] Focus moves to the step's `<h1>` on mount and on every advance (`tabIndex=-1`, programmatic) (S4-BR-f) — jsdom
      `activeElement` assertions
- [ ] No Escape-dismiss: an Escape keydown does NOT change the step or dismiss the surface (S4-BR-f) — jsdom
- [ ] Completion writes `first_run:completed='1'` via `INSERT OR REPLACE` BEFORE flipping to the app; a reload does
      not re-show onboarding (S4-BR-d) — asserted via a spy on `writeFirstRunComplete` + the status flip
- [ ] Completion-write rejection surfaces a `role="alert"` error + re-enables the button; status stays `'onboarding'`
      (never strands, never silently skips) (S4-BR-d) — jsdom
- [ ] Returning launch (marker `'1'`): the boot goes straight to the app (RouterProvider), onboarding never renders;
      the branch keys on the marker, never `exists()` (S4-BR-b,h) — asserted via a mocked repo
- [ ] `<Onboarding>` renders outside the router; S1–S3 chrome is unaffected (routes.test still green) (S4-BR-h)
- [ ] Completion-error state announces via `getByRole('alert')` and the text is `$colorSignalDanger` (M4/B1) — jsdom
- [ ] ⚠ **jsdom test-coverage boundary (M3):** `test-setup.ts`'s `matchMedia` stub returns `matches:false` for every
      query, so `useMedia()` resolves to the mobile baseline in ALL jsdom tests — `<Onboarding>` reads `useMedia()`
      directly (no `__bp` override, unlike `app-shell.tsx`). Therefore jsdom asserts the **mobile** form only; the
      tablet/desktop centering + `SIDE_PADDING`/`CONTENT_MAX_WIDTH` cap (S4-BR-g) are verified in the **Visual Gate**,
      not jsdom. (Disclosed, not a gap.)
- [ ] Every value is a DS token (no hex, no invented spacing/z); step motion is transform/opacity only, DS-3
      `moderate`, reduced-motion→instant (S4-BR-a,g) — code review + Visual Gate
- [ ] Visual Gate = running app (`pnpm dev`, render-table:45; `apps/web` has no Storybook) at 375/768/1440, **both
      themes** (temp root `theme='dark'`): all four screens full-viewport + centered, heading/body legible, primary
      button + focus ring, dot indicator, step transition motion (+ reduced-motion instant), completion → app at `/`
- [ ] `@vida/web` typecheck · tests · lint green; `apps/web`→`@vida/ui` boundary one-way; no new runtime dep
      (`@vida/ui` Button + `@tamagui/core` already consumed)
- [ ] Currency (§XXIX): `onboarding.md` re-verified current for the rendered screens; `apps/web/src/onboarding/CLAUDE.md`
      updated with the new chrome/wiring files; any deferred nicety (tighter reading measure, Back/progress copy) filed

## 5. Implementation Prompt (ordered; each step cites §2/§3)
1. **Marker repo.** `apps/web/src/onboarding/first-run-repo.ts` — `readFirstRunComplete()` + `writeFirstRunComplete()`
   over `getDbClient().driver`, mirroring `get/setSchemaVersion` (adapter.ts:210-232) with `FIRST_RUN_COMPLETE_KEY`/
   `_VALUE` + `isFirstRun` from `./first-run` (S4-BR-b,d). +test (`first-run-repo.test.ts`): a fake driver asserts the
   exact SQL + params; read `'1'`→true, absent→false; write issues `INSERT OR REPLACE`.
2. **First-run hook.** `apps/web/src/onboarding/use-first-run.ts` — `useFirstRun(dbReady)` → `{status, markComplete}`,
   the `active`-guarded read effect (read-fail→`'onboarding'`) + write-then-flip `markComplete` (S4-BR-c,d). +test
   (`use-first-run.test.ts`, mock `./first-run-repo`): `dbReady=false`→`resolving`; `dbReady=true` + read `true`→
   `ready`, read `false`→`onboarding`, read-reject→`onboarding`; `markComplete` writes then flips to `ready`; a write
   reject leaves status unchanged + rejects.
3. **Onboarding screens.** `apps/web/src/onboarding/onboarding.tsx` — the 4-step `<main>` flow: index state, per-kind
   advance (`complete`→`onComplete` write-guard w/ error+retry), full-viewport centered layout on tokens
   (`CONTENT_MAX_WIDTH`/`SIDE_PADDING`), keyed step motion (opacity/`y`, `moderate`, reduced→instant), the `<h1>`
   focus `useLayoutEffect([index])`, no Esc, per-kind primary labels, decorative dots, `role="alert"` on write error
   (S4-BR-a,d,e,f,g). +test (`onboarding.test.tsx`): renders step 1 heading/body + focus; "Get started"→step 2;
   walks to `complete`→`onComplete` called; `vault` step has no `<input>`; Escape is a no-op; `onComplete` reject →
   `role="alert"` + button re-enabled.
4. **Wire the boot branch.** `apps/web/src/App.tsx` — `const firstRun = useFirstRun(dbReady)`; loading gate becomes
   `!dbReady || firstRun.status==='resolving'`; the ready return branches `onboarding` → `<Onboarding
   onComplete={firstRun.markComplete}/>` vs the app (`QueryClientProvider ⊃ RouterProvider`), `ToastProvider` a
   constant sibling; error/retry + boot effect unchanged (S4-BR-c,h). +test (`App.test.tsx`, new — mock `./db/boot`
   `ensureDbReady` resolved + mock `./onboarding/first-run-repo`): first-run→onboarding heading renders, app chrome
   absent; returning→the index route renders, onboarding absent; completion→marker write called then the app mounts.
5. **Visual Gate = running app** (`pnpm dev`, render-table:45; no Storybook in `apps/web`) — capture 375/768/1440 ×
   {light, dark via a temporary root `theme='dark'`}: each of the four screens full-viewport + centered, heading/body,
   primary button + focus ring, dots, step transition motion (+ reduced-motion instant), and the live completion →
   app-at-`/` hand-off. Fix anything jsdom can't see (the S1 process-shim/viewport lessons already landed).
6. **Currency + docs.** Re-verify `docs/core/architecture/onboarding.md` current for the rendered screens; update
   `apps/web/src/onboarding/CLAUDE.md` — the dir now holds model (UX-5) + chrome/wiring (UI-4): add `onboarding.tsx`,
   `use-first-run.ts`, `first-run-repo.ts` and relax the "no chrome, no screens" line to "UX-5 model files are
   data-only; UI-4 adds the screens + wiring here". File any deferred nicety (a tighter onboarding reading measure;
   Back/Skip; a spoken "Step N of 4") as a DS/UX enhancement (`DEF-S4-a`). Done-check → §4; run `@vida/web`
   typecheck/test/lint + build; confirm the one-way boundary; Visual Gate (step 5).

### 5b. Preflight folds (test feasibility — 2026-08-17, PASSED)
- **FOLD-1 · Test wrapping.** `onboarding.test.tsx` renders `<Onboarding>` inside `<UIProvider>` (Tamagui `Text`/
  `Button`/tokens require it — the `command-bar.test.tsx:25` precedent). `first-run-repo.test.ts` drives a **fake
  `SqliteDriver`** (asserts SQL + params) in a `node` env — no jsdom, no worker. `use-first-run.test.ts` uses
  `vi.mock('./first-run-repo')` + `renderHook` (jsdom).
- **FOLD-2 · App.test mocks.** the new `App.test.tsx` `vi.mock('./db/boot')` (`ensureDbReady` → resolved) +
  `vi.mock('./onboarding/first-run-repo')` (the `command-bar.test.tsx:11` `vi.mock` precedent). The **"no app-flash"**
  criterion (§4) is asserted with a **deferred** read promise (a manually-resolved `Promise`): while it is pending the
  Loading surface shows and the app chrome (`nav[aria-label="Modules"]`) is ABSENT; resolving it to `false` flips to
  the onboarding `<h1>` — proving no chrome renders in between. `waitFor` drives the async settle.
- **FOLD-3 · Keyed-remount focus.** the `key={index}` step group remounts the heading on each advance, so `headingRef`
  reattaches; the `useLayoutEffect([index])` fires after the remount (incl. the initial mount = step 1) and lands
  focus on the fresh `<h1>` — this is the intended `pageNav` focus, not focus-theft, and there is no stale ref (the
  callback re-runs on remount). jsdom `document.activeElement` asserts it (the `command-bar.test.tsx` focus-assert idiom).

## 6. Open UNKNOWNs / Decisions Needed
- **None (no fork).** Every gap is closed by the documentation + the shipped UX-5 model. Three composition details are
  **disclosed** (render-layer decisions, not decisions to escalate):
  - **Home for the screens** → co-locate in `apps/web/src/onboarding/` with the model (the `shell/` precedent: UX-3
    model + UI-4 chrome coexist), NOT `shell/` (onboarding is not `AppShell` chrome — S4-BR-h). The onboarding
    `CLAUDE.md` "no chrome" line is UX-5-scoped; UI-4 adding the screens is exactly what onboarding.md:102 assigns.
  - **Forward-only, no Back/Skip in M1.0** → the model describes advance "by explicit primary action" (onboarding.md:42);
    four informational screens with no input make Back non-essential. Disclosed; `DEF-S4-a` reserves it as a nicety.
  - **Primary-button labels + the dot indicator** → render-layer affordances (the model owns headings/body/copy, not
    button text or progress chrome); token-only, `aria-hidden` dots. Not a `packages/ui` component (BR-1 holds).
  - **Boot-branch shape** → `useFirstRun(dbReady)` as a hook keyed on `dbReady` (leaves `boot.ts`/`client.ts`
    untouched — smallest blast radius, S4-BR-h), vs folding the marker read into `ensureDbReady`. The hook is chosen.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | **Visual Gate SHIP (real browser, Victor).** All 4 screens full-viewport + centered, both themes; heading focus clean (no stray outline); step motion + reduced-motion instant; vault confirmation (no input); completion → app at `/` + marker persists across reload. §4 DoD met. Committed + PR opened + merged. |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | S4 detailed spec authored (4 first-run screens + `App.tsx` first-run branch + completion write: `useFirstRun` 3-state boot resolution, marker repo mirroring `get/setSchemaVersion`, copy-honesty/confirmation-vault, focus-to-heading/no-Esc, full-viewport responsive, write-then-flip completion; BR-a..h; §5 6-step prompt; §6 = none/all doc-resolved) — per Step-0 baseline (built-vs-model current) + the shipped UX-5 model. |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | **Approval 2 ✅ → IMPLEMENTED.** Built `onboarding/{first-run-repo,use-first-run,onboarding}.{ts,tsx}` (+3 tests) + `App.tsx` first-run branch + `App.test.tsx`. Token grounding fixes at build: space tokens are numeric (`$16/$24/$32`, not `$lg`); error color `$colorSignalDanger` (B1). Test-infra fix: `afterEach(cleanup)` per jsdom file (the `command-bar.test.tsx:16` house pattern — no auto-cleanup → renders accumulated). Green: web **typecheck** · **161 tests (+22)** · **lint 0-err** · build. ⚠ The full-`<App/>` integration tests exceed the 5s default ONLY under abnormal machine load (~100-200; Tamagui cold-compile ~3-4s) — proven green with a one-off `--testTimeout=25000` (per-test 1-4s at baseline); NO config change (the S3 load-noise lesson). **Next: Victor Visual Gate (real browser).** |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | **Rev 3 — gate-2 critique.** Confirmed all gate-1 (B1/B2/M1-M4) + preflight fixes landed. Caught **1 NEW gap the B2 edit opened:** the `if (!step) return null` guard, worded "immediately" after `const step`, would be a **conditional hook call** (more hooks follow) → moved to just before the JSX return, after every hook. Also made `useFirstRun(dbReady)` placement explicit in `App.tsx` (among the hooks, before the early returns). No other new material. → Approval 2 requested. |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | **Approval 1 ✅. /preflight PASSED (+3 folds, §5b).** FOLD-1 test wrapping (`<UIProvider>` for the component test; fake driver for the repo test; `vi.mock` for the hook test). FOLD-2 App.test mocks `./db/boot`+`./onboarding/first-run-repo`; the "no app-flash" criterion uses a deferred read promise (Loading→onboarding, no chrome between). FOLD-3 keyed-remount focus (heading remounts per step → ref reattaches → `useLayoutEffect([index])` focuses, incl. initial mount = intended pageNav). No new material. |
| 2026-08-17 | 2026-08-17-ui-4-app-shell-components-5 | **Rev 2 — gate-1 critique (independent) REVISE folded** (2 blockers + 4 material + minors; every structural/wiring cite VERIFIED true against code, incl. the load-bearing `styled(Text,{render:'h1'})` focus mechanism via the `dialog.tsx` `DialogTitle` precedent). **B1** the error-text token `$colorTextDanger` does NOT exist → `$colorSignalDanger` (themes.ts:5,7); the old `$colorTextPrimary` fallback would render an inaccessible `role=alert`. **B2/CITE** the read's `rows[0]?.value` is a deliberate DEFENSIVE deviation, not a literal mirror of `adapter.ts:216`'s bare `rows[0].value` (which compiles only because `noUncheckedIndexedAccess` is off today — parked task); reworded + added a cheap `if (!step) return null` future-proof guard. **M1** re-entrancy guard `if (submitting) return` on the complete-branch advance (double-click double-write; write is idempotent anyway). **M2** `submitting`/`loading`/`disabled` scoped to the `complete` step only. **M3** disclosed the jsdom `matchMedia` stub (`matches:false`) → jsdom asserts the MOBILE form only (no `__bp` on Onboarding); responsive tablet/desktop is Visual-Gate-only. **M4** explicit `getByRole('alert')` + `role`-passthrough precedent. Minors: explicit `$display`/`$subheading` font-size tokens; `enterStyle`+`animation` idiom cite. |
