// preferences-rescope R3/R5 (LIF-247) — every user-facing string this unit adds, in ONE module (F17: the i18n platform unit
// externalizes from here mechanically). Plain, calm, honest, on-device (VOICE); `settings-copy.test.ts` runs `lintCopy`
// over every entry. Imports nothing, so the writer can use it without a cycle.

export const SETTINGS_COPY = {
  /** EC-7 — a first-read failure: nothing was loaded, the panes show the defaults. */
  readErrorDefaults:
    'Couldn’t load your saved settings — showing defaults, read-only. Your data is safe on this device.',
  /** EC-7 — a later read failure: the last loaded values are still shown. */
  readErrorKept:
    'Couldn’t refresh your settings — showing what was last loaded, read-only. Your data is safe on this device.',
  /** C5 — the revert toast (fired by the writer once per failed batch). */
  saveFailedTitle: 'Couldn’t save that change',
  saveFailedBody: 'It’s back to how it was. Your data is safe on this device.',
  /** D4 — the persona row. */
  personaLabel: 'Persona',
  personaDescription: 'Shapes the wording of rewards',
  personaUnset: 'Not set',
  /** state-conventions §3 — the error state's retry affordance (the shipped wording: App boot, notifications). */
  retry: 'Retry',
  /** The skeleton's accessible name while the pane loads. */
  loadingLabel: 'Loading your settings',
  // preferences-rescope R5 — ⌘K pinning (D-R5-1). Announced in the palette's live region after the write settles.
  cmdPinned: (label: string) => `Pinned ${label}`,
  cmdUnpinned: (label: string) => `Unpinned ${label}`,
  cmdPinFailed: (label: string) => `Couldn’t pin ${label}. Try again.`,
  cmdUnpinFailed: (label: string) => `Couldn’t unpin ${label}. Try again.`,
  /** Appended to a pinned option's accessible name (the visible text stays the label — label-in-name holds). */
  cmdPinnedSuffix: ', pinned',
  /** The hint under the palette input, also the combobox's description (how screen-reader users learn the gesture). */
  cmdHintMac: '⌥P pins the highlighted command · ↵ opens it',
  cmdHintOther: 'Alt+P pins the highlighted command · Enter opens it',
} as const
