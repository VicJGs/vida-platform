// preferences-rescope R3 (LIF-247), PLAN-R3 R3-BR-6/7 — what every Settings pane needs from the surface, without
// threading props: `readOnly` (EC-7: a read error renders every pane read-only) and `update` (the ONE save path, so one
// `SyncStatus` reflects every pane). R5/R6 plug their panes into the same context.
//
// The default is editable + the writer-backed module function `updateView` (a hook can't be a static default), so a pane
// rendered on its own — its unit tests — still reads and writes for real.
import { createContext, useContext } from 'react'
import { updateView } from '../preferences/use-preferences'
import type { ViewPatch } from '../preferences/preferences-view'

export interface SettingsContextValue {
  readOnly: boolean
  update: (patch: ViewPatch) => Promise<void>
}

export const SettingsContext = createContext<SettingsContextValue>({ readOnly: false, update: updateView })

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}
