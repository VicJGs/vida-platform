// UX-5 (LIF-94) — first-run boundary contract. Pure logic + data; UI-4 wires it into App.tsx.
//
// The onboarding gate keys ONLY on this marker. WorkerDbClient.exists('vida')
// [apps/web/src/db/client.ts:120] is the DB-lifecycle signal (open-vs-create) and is NOT the
// onboarding trigger: on first launch open() migrates the DB, so exists() is already true while
// this marker is unset — they disagree by design. Keying the branch on exists() would make
// onboarding never show.
//
// DISTINCT from `UserProfile.onboarding_completed` [packages/types/src/entities/user.ts:61] — that
// is the SYNCED, cross-device *user* flag (a `SyncableEntity` field; its table lands with the
// user_profile module, M1.1+). THIS is a DEVICE-LOCAL "this device finished first-run" marker in
// `app_state` (never synced). The colon-namespaced key makes the locality explicit; reconciling the
// two (does a synced user flag suppress a new device's first-run?) is a UX-5b / M1.1 concern, not M1.0.

/** Reserved DEVICE-LOCAL app_state key [packages/core/src/db/schema/foundation/app-state.ts:18-21]. */
export const FIRST_RUN_COMPLETE_KEY = 'first_run:completed'

/** Value written on completion. app_state stores TEXT values. */
export const FIRST_RUN_COMPLETE_VALUE = '1'

/** First run iff the marker is not the completion value (absent, empty, or anything else). */
export function isFirstRun(flag: string | undefined): boolean {
  return flag !== FIRST_RUN_COMPLETE_VALUE
}

/** Documents the App.tsx seam UI-4 implements — as data, so the contract is inspectable/testable. */
export interface FirstRunBranch {
  readonly file: string
  readonly at: string
  readonly signalKey: typeof FIRST_RUN_COMPLETE_KEY
}

export const FIRST_RUN_BRANCH: FirstRunBranch = {
  file: 'apps/web/src/App.tsx',
  at: 'dbReady === true branch, before <RouterProvider>',
  signalKey: FIRST_RUN_COMPLETE_KEY,
}
