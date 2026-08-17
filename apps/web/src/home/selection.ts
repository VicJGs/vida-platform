// Journal personalization selection — UX-6 (LIF-95). The pure default-resolution logic for which data points show
// per module: a global default overlaid by a per-journal override (override wins PER MODULE, no module dropped —
// BR-6). The STORAGE (get/setSelection) is a deferred seam → Preferences/MOD-journals (M1.1); signatures only here,
// throwing the AR-9-style seam error. `[INTENT: journals/contract.md:23-24, identity.md:32-33 (J2/J4)]`
import { JournalSeamNotActivated } from './journal-contribution'

/** Enabled data-point ids per module. `[INTENT: journals/contract.md:23-24]` */
export type JournalSelection = Record<string, readonly string[]>

/**
 * Resolve the effective selection: the per-journal override replaces the global default PER MODULE; modules the
 * override does not mention keep the global default (no module is dropped). Pure. `[FACT: BR-6]`
 */
export function resolveSelection(
  globalDefault: JournalSelection,
  perJournalOverride?: Partial<JournalSelection>,
): JournalSelection {
  const resolved: Record<string, readonly string[]> = { ...globalDefault }
  for (const [module, dataPoints] of Object.entries(perJournalOverride ?? {})) {
    if (dataPoints !== undefined) resolved[module] = dataPoints
  }
  return resolved
}

/** Read the persisted selection — RESERVED seam (storage → Preferences/MOD-journals, M1.1). */
export function getSelection(): never {
  throw new JournalSeamNotActivated('getSelection')
}

/** Persist the per-module selection — RESERVED seam (storage → Preferences/MOD-journals, M1.1). */
export function setSelection(_selection: JournalSelection): never {
  throw new JournalSeamNotActivated('setSelection')
}
