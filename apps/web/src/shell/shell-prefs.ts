// fe-shell (#14) · S1 — the nav-placement persistence seam (`nav_preferences` via ProviderRead).
// Panel placement (dock/float · edge · open) is a user preference persisted to `nav_preferences`
// `[FACT: traceability.md:34; delivery/envision.md L5]`. Per the ProviderRead convention (providers/CLAUDE.md) a surface
// reads another module's data through its provider method, NEVER a raw table — enforced architecturally.
//
// M1 = a STUB that returns the cold-start DEFAULT (deny-safe): live read/write of `nav_preferences` is the FIRST
// consumer's work (the ReducedMotion / collection-adapter "defer the live hook" precedent). The app hydrates the store
// via `useAppShellUIStore.setPlacement(await read())`; writes emit store updates now + persist through this seam later.
import type { ProviderRead } from '../providers/provider-read'
import { DEFAULT_PLACEMENT, type ShellPlacement } from './regions'

/** The shell's placement-prefs read seam — a `nav_preferences` provider returning the saved ShellPlacement. */
export type ShellPrefsRead = ProviderRead<ShellPlacement>

/** M1 stub: no backing read yet → the cold-start default. Swap for the live `nav_preferences` provider at first consumer. */
export const stubShellPrefs: ShellPrefsRead = () => Promise.resolve(DEFAULT_PLACEMENT)
