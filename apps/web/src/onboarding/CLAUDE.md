# apps/web/src/onboarding — First-run onboarding model layer

**Owning issue:** UX-5 First-run onboarding (LIF-94) · **Authority:** ADR-019 (auth-coupled → deferred split),
ADR-017 (features-first: auth off in M1.0) · Full model: `docs/core/architecture/onboarding.md`.

## What lives here
The **design model** for the first-run experience — the ordered step model + the first-run boundary contract — as
central DATA/logic the render layer (UI-4) consumes. **No chrome, no screens.** UX-5 owns the *model*; UI-4 owns the
*rendering* (the screens) and *wiring* (the App.tsx branch + the completion write). Vault-unlock is UX-5b/M3.

- `steps.ts` — `ONBOARDING_STEPS` (ordered: welcome · privacy · vault · ready), `OnboardingStep`/`OnboardingStepKind`, and the per-step `OnboardingCopyContract` (the BR-4 copy-honesty contract: `m1` = what M1.0 may claim, `m3?` = the encryption-backed claim gated to AR-3/M3).
- `first-run.ts` — `isFirstRun`, `FIRST_RUN_COMPLETE_KEY`/`_VALUE` (the reserved device-local `app_state` marker), `FIRST_RUN_BRANCH` (the App.tsx seam described as data).

## Rules (do not violate)
- **Data/logic, not chrome.** No JSX, no components, no rendering. UX-5 builds no screen and no `@vida/ui` primitive; UI-4 renders + wires it.
- **Crypto/auth is a deferred seam — never presumed.** No code here reads or creates a vault key. The `vault` step is present in the model (`deferredImpl: 'vault-key'`) but its M1.0 copy is a **confirmation**, never a "create" (BR-4). Real key creation + passphrase → AR-3 / UX-5b / M3.
- **Copy honesty (BR-4).** No `m1` string may claim encryption or zero-knowledge (encryption is off in M1.0). M1.0 claims **local-first** only; the ZK claim lives in `m3?`, gated to when AR-3 lands.
- **Two-signal independence.** The onboarding branch keys ONLY on `isFirstRun(app_state['first_run:completed'])`. `WorkerDbClient.exists('vida')` is the DB-lifecycle signal (open-vs-create) and is NOT the onboarding trigger — they disagree on first launch by design. Keying on `exists()` would make onboarding never show.
- **Distinct from the synced user flag.** `first_run:completed` (device-local `app_state`, never synced) is deliberately distinct from the synced `UserProfile.onboarding_completed` (cross-device *user* flag; table lands M1.1+). Reconciliation is a UX-5b/M1.1 concern.
- **Not a nav surface.** Onboarding is a boot-phase surface, not a `MODULE_MAP`/`GLOBAL_SURFACES` entry and not an `overlayHost` overlay — so `OVERLAY_DISMISS` is out of scope by category; no-Escape is stated explicitly so UI-4 does not add it.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Reuse, never redefine.** Focus = UX-4 `FOCUS_CONTRACT` (each step transition = `pageNav` → main-heading); responsive = UX-3 breakpoints/`CONTENT_MAX_WIDTH`.
