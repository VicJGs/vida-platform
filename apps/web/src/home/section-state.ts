// Section-state degrade composition — UX-6 (LIF-95). UX-6 owns ONLY the composition: map each section's
// ALREADY-RESOLVED terminal state so one failing section degrades alone and never blanks its siblings (BR-3).
// Reuses the @vida/core 4-literal `TerminalState` canon by TYPE — it does NOT derive state: no live query exists
// in a design model, so the query→state `deriveTerminalState` derivation is the downstream engine's per-section
// job (MOD-journals #33), NOT UX-6's. `[FACT: journals/identity.md:52-54; BR-3/BR-4]`
import type { TerminalState } from '../state-conventions/terminal-state'
import type { SectionData } from './journal-contribution'
import type { HomeSectionKey } from './section-model'

/**
 * Compose the dashboard's per-section states from each section's already-resolved `state`. Independent by
 * construction: an `'error'` section maps to `'error'` while every other section keeps its own state — the
 * "never a blank journal" degrade rule. `[FACT: journals/identity.md:52-54; BR-3]`
 */
export function resolveDashboardStates(
  sections: readonly SectionData[],
): Partial<Record<HomeSectionKey, TerminalState>> {
  const out: Partial<Record<HomeSectionKey, TerminalState>> = {}
  for (const section of sections) out[section.sectionKey] = section.state
  return out
}

/**
 * True when at least one section resolved to a non-error state — the journal still renders (anti-blank, BR-3).
 * A provider failure degrades its own section; the dashboard is only blank if EVERY section errored.
 */
export function journalStillRenders(sections: readonly SectionData[]): boolean {
  return sections.some((section) => section.state !== 'error')
}
