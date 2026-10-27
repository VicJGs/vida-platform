# First-Run Onboarding

The design model for the Vida web app's **first-run experience**: what the user sees on first launch, how the app
detects first-run, and how the crypto-coupled parts stay honest while encryption is deferred. This is the
experience-track front door (UX-5, LIF-94) — it builds on the IA (UX-1), shell (UX-3), and state conventions (UX-4).

**Audience:** Developers and agents building the app-shell / boot path. Read after `information-architecture.md`.

**Governs:** The onboarding flow model + the first-run boundary contract. The code artifact is
`apps/web/src/onboarding/{steps,first-run}.ts` (central data/logic; **not chrome**). Rendering the screens and
wiring the boot branch are owned by **UI-4**; the vault-unlock/lock UX is **UX-5b (M3)**.

**Content Source:** ADR-019 (auth-coupled deferral split) · ADR-017 (features-first: encryption/auth off in the
feature phase) · the boot path `apps/web/src/App.tsx` + `db/client.ts` · UX-4 `state-conventions.md` (focus/keyboard)
· UX-3 `shell-layout.md` (breakpoints). Full derivation + gates: `docs/specs/foundation/ux-5-onboarding/`.

> **Scope (what this is NOT):** not the rendered onboarding screens (UI-4); not the real vault-key creation or the
> unlock/lock-on-every-launch UX (AR-3 crypto + UX-5b, **M3**); not per-name/multi-vault first-run semantics
> (AR-4/auth). This doc DESIGNS the flow + reserves the boundary; the surfaces are built by their owners.

---

## 1. The M1.0 boundary — designed now vs deferred

Auth is **off** in the feature phase — "no SRP/vault-unlock … a trivial local passphrase or none" (ADR-017 §Summary).
The vault key (AR-3) and the unlock-on-every-launch UX (UX-5b) are **M3**. So UX-5 designs the _full_ first-run flow
but marks every crypto/auth element as a deferred seam:

| Designed now (UX-5, M1.0)                                                                    | Deferred seam (owner)                              |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Welcome · local-first expectation-setting · vault-readiness confirmation · completion → Home | —                                                  |
| First-run detection + branch (boot)                                                          | per-name/multi-vault first-run → AR-4/auth         |
| Vault-creation **step** (present in the model, confirmation-only in M1.0)                    | real key creation (Argon2id/Account-Key) → AR-3/M3 |
| —                                                                                            | passphrase capture → AR-3/UX-5b/M3                 |
| —                                                                                            | unlock-on-every-launch UX → UX-5b/M3               |
| local-first copy (BR-4)                                                                      | full ZK-crypto copy → UX-5b/M3                     |

---

## 2. The flow — ordered step model

Four steps (`ONBOARDING_STEPS`), advanced by explicit primary action (no Escape-skip — §4):

| #   | id        | kind           | Intent                                             | M1.0                                          | Deferred                                  |
| --- | --------- | -------------- | -------------------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| 1   | `welcome` | `intro`        | What Vida is + "Get started"                       | render                                        | —                                         |
| 2   | `privacy` | `explain`      | Local-first expectation-setting (the trust moment) | local-first copy                              | full ZK claim → M3                        |
| 3   | `vault`   | `vault-create` | The reserved seat for account/vault creation       | **confirmation only** ("your vault is ready") | key creation + passphrase → AR-3/UX-5b/M3 |
| 4   | `ready`   | `complete`     | Set the marker + hand off to Home `/`              | render + mark                                 | —                                         |

The step stays in the model so its index is stable for UX-5b/M3 (`vault` carries `deferredImpl: 'vault-key'`); only
its M1.0 copy is confirmation-shaped. `complete` is terminal; no deferred step may be terminal (locked by test).

---

## 3. The first-run boundary contract

- **Signal:** the device-local `app_state['first_run:completed']` marker. `isFirstRun(flag) = flag !== '1'`
  (absent/empty/other → first run). `app_state` is a `{key,value}` KV store, not synced — a boolean earns no table.
- **Placement:** a **boot-phase branch in `App.tsx`**, in the `dbReady === true` arm, **before** `<RouterProvider>`.
  First-run is not a navigable route (no deep-link, no history entry), so a `/onboarding` route is rejected.
  UX-5 describes this seam as data (`FIRST_RUN_BRANCH`); **UI-4 implements the branch** (no `App.tsx` edit in UX-5).
- **Completion:** on step 4, write `app_state['first_run:completed'] = '1'` (UI-4, via `Repository`/`run`), then
  render the app at `/`.
- **Two-signal independence.** `WorkerDbClient.exists('vida')` (`apps/web/src/db/client.ts:120`) is the DB-lifecycle
  signal (boot uses it to decide open-vs-create) and is **NOT** the onboarding trigger: on first launch `open()`
  migrates the DB, so `exists()` is already `true` while the marker is unset — they disagree by design. Keying the
  branch on `exists()` would make onboarding never show.
- **Distinct from the synced user flag.** `first_run:completed` (device-local, never synced) is deliberately distinct
  from the synced `UserProfile.onboarding_completed` (a cross-device _user_ flag; its table lands with the
  user_profile module, M1.1+). Reconciling the two is a UX-5b/M1.1 concern.

---

## 4. Accessibility + responsive (rules for UI-4)

- **Focus:** each step transition = UX-4 `FOCUS_CONTRACT.pageNav` → move focus to the step's `<h1>`/main heading.
  The primary action is Tab-reachable; Enter/Space activates (UX-4 keyboard model).
- **No Escape-dismiss.** Onboarding is a boot-phase full-viewport surface, **not** an `overlayHost` overlay, so
  `OVERLAY_DISMISS` (which governs modal/drawer/dropdown/popover) is out of scope by category. A mandatory first-run
  gate must not be Escape-skipped; UX-5 states no-Escape explicitly so UI-4 does not add it by habit.
- **Responsive:** full-viewport takeover. Mobile (375) = single-column full-bleed; tablet/desktop (768/1440) =
  centered content column within `CONTENT_MAX_WIDTH` (1280); `wide` (1920) caps containment (UX-3 breakpoints).
- **Reduced motion:** any step transition respects `prefers-reduced-motion` (DS-3 tokens; UI-4 applies).

---

## 5. The copy-honesty contract (BR-4)

The expectation-setting copy must be true at ship time. Encoded per step as `OnboardingCopyContract` (`m1` = M1.0
claim; `m3?` = the encryption-backed claim, gated behind an encryption-active signal UX-5b/M3 flips):

- **M1.0 (encryption off):** MAY claim **local-first** ("your data lives on this device"); MAY note encryption is
  "coming as the platform hardens." MUST NOT claim data is currently encrypted-at-rest or zero-knowledge. The `vault`
  step is a **confirmation**, never a "create" (no implied crypto action).
- **M3+ (AR-3 live):** the full claim — "encrypted on your device; never leaves in plaintext; only you hold the keys."

---

## 6. Consumption

- **UI-4** (app shell) renders the four onboarding screens, wires the `App.tsx` first-run branch (`FIRST_RUN_BRANCH`),
  and performs the completion write. It reads `ONBOARDING_STEPS` for order + copy and `isFirstRun` for the gate.
- **UX-5b (M3)** adds the real vault-key creation + passphrase capture (`deferredImpl` seams), the unlock/lock-on-launch
  UX, and flips the encryption-active signal that reveals the `m3` copy.
- **AR-3 (M3)** provides the crypto/vault lifecycle the `vault` step and UX-5b depend on.

---

## References

- ADR-019 (Phase-1.0 resequence — the auth-coupled deferral split) · ADR-017 (features-first; encryption/auth off)
- `information-architecture.md` (UX-1) · `shell-layout.md` (UX-3) · `state-conventions.md` (UX-4) — the surfaces this builds on
- `apps/web/src/onboarding/{steps,first-run}.ts` — the code artifact (data/logic)
- `docs/specs/foundation/ux-5-onboarding/` — baseline, PLAN + IMPLEMENTATION-PLAN, gates
