# apps/web/src/onboarding — First-run onboarding model layer

**Owning issues:** UX-5 First-run onboarding (LIF-94) — the MODEL · UI-4 App shell / S4 (LIF-89) — the SCREENS +
WIRING · **Authority:** ADR-019 (auth-coupled → deferred split), ADR-017 (features-first: auth off in M1.0) ·
Full model: `docs/core/architecture/onboarding.md`.

## What lives here
Two concerns coexist (the `shell/` precedent — UX-3 model + UI-4 chrome together). The UX-5 **design model** (the
ordered step model + the first-run boundary contract, as central DATA/logic) AND the UI-4 **chrome + wiring** (the
rendered screens, the boot-resolution hook, the marker DB access). UX-5 owns the *model* (data-only); UI-4 owns the
*rendering* (the screens) and *wiring* (the App.tsx branch + the completion write). Vault-unlock is UX-5b/M3.

**Model (UX-5 — data/logic only, no JSX):**
- `steps.ts` — `ONBOARDING_STEPS` (ordered: welcome · privacy · vault · ready), `OnboardingStep`/`OnboardingStepKind`, and the per-step `OnboardingCopyContract` (the BR-4 copy-honesty contract: `m1` = what M1.0 may claim, `m3?` = the encryption-backed claim gated to AR-3/M3).
- `first-run.ts` — `isFirstRun`, `FIRST_RUN_COMPLETE_KEY`/`_VALUE` (the reserved device-local `app_state` marker), `FIRST_RUN_BRANCH` (the App.tsx seam described as data).

**Chrome + wiring (UI-4 · S4 — the rendered first-run experience):**
- `onboarding.tsx` — `Onboarding` (`onComplete` prop): the full-viewport 4-screen flow. Renders `ONBOARDING_STEPS`' `m1` copy only (BR-6 copy honesty — the `vault` step is confirmation-only, no input/crypto), a UI-1 `Button` primary action, focus-to-`<h1>` per step (FOCUS_CONTRACT.pageNav), NO Escape (boot gate, not an overlay), DS-tokens + reduced-motion. Renders OUTSIDE `AppShell` (before the router). Composes UI-1 + Tamagui only — no `@vida/ui`/`packages/ui` edit (BR-1).
- `use-first-run.ts` — `useFirstRun(dbReady)` → `{status: 'resolving'|'onboarding'|'ready', markComplete}`. The 3-state boot resolution (no app-flash before onboarding); `markComplete` writes THEN flips (a reload never re-shows a completed onboarding).
- `first-run-repo.ts` — `readFirstRunComplete`/`writeFirstRunComplete`: the device-local `app_state` marker I/O over `getDbClient().driver`, mirroring `@vida/core`'s `get/setSchemaVersion` idiom (`SELECT` / `INSERT OR REPLACE`).

## Rules (do not violate)
- **Model files are data-only; the chrome files render them.** `steps.ts`/`first-run.ts` (UX-5) carry NO JSX; UX-5 builds no screen and no `@vida/ui` primitive. `onboarding.tsx`/`use-first-run.ts`/`first-run-repo.ts` (UI-4) are the render + wiring. Do not put layout/JSX in the model files; do not put step-order/copy the model owns into the chrome.
- **Crypto/auth is a deferred seam — never presumed.** No code here reads or creates a vault key. The `vault` step is present in the model (`deferredImpl: 'vault-key'`) but its M1.0 copy is a **confirmation**, never a "create" (BR-4). Real key creation + passphrase → AR-3 / UX-5b / M3.
- **Copy honesty (BR-4).** No `m1` string may claim encryption or zero-knowledge (encryption is off in M1.0). M1.0 claims **local-first** only; the ZK claim lives in `m3?`, gated to when AR-3 lands.
- **Two-signal independence.** The onboarding branch keys ONLY on `isFirstRun(app_state['first_run:completed'])`. `WorkerDbClient.exists('vida')` is the DB-lifecycle signal (open-vs-create) and is NOT the onboarding trigger — they disagree on first launch by design. Keying on `exists()` would make onboarding never show.
- **Distinct from the synced user flag.** `first_run:completed` (device-local `app_state`, never synced) is deliberately distinct from the synced `UserProfile.onboarding_completed` (cross-device *user* flag; table lands M1.1+). Reconciliation is a UX-5b/M1.1 concern.
- **Not a nav surface.** Onboarding is a boot-phase surface, not a `MODULE_MAP`/`GLOBAL_SURFACES` entry and not an `overlayHost` overlay — so `OVERLAY_DISMISS` is out of scope by category; no-Escape is stated explicitly so UI-4 does not add it.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Reuse, never redefine.** Focus = UX-4 `FOCUS_CONTRACT` (each step transition = `pageNav` → main-heading); responsive = UX-3 breakpoints/`CONTENT_MAX_WIDTH`.
