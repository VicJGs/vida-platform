// Calendar UI store — fe-calendar #19 · S1. Ephemeral UI state ONLY (BR-RT-6, the app-shell-ui-store pattern):
// the active range + the focused date. Never entity data, never persisted — a *saved* default range would be a
// user_preferences write = the owning capability, not this read-only lens (D-IR-10 / slice-map). The calendar's
// dated data is React Query over the ProviderRead seam (useCalendar, S7), never here.
// S7 adds `expandedDay` (the Month unfurl, EC-F3) — still UI-only; the store owns its collapse (PLAN-S7 R8).
import { create } from 'zustand'

export type CalendarRange = 'year' | 'month' | 'week' | 'day' | 'agenda' | 'living'

interface CalendarUIState {
  range: CalendarRange
  /** 'YYYY-MM-DD' — the TZ-safe focused day the active range is centred on (never `new Date(str)`; parse by parts). */
  focusedDate: string
  /** The Month day whose full list is unfurled; null = none. Leaving Month or changing month clears it (R8). */
  expandedDay: string | null
  setRange: (range: CalendarRange) => void
  setFocusedDate: (date: string) => void
  setExpandedDay: (day: string | null) => void
}

// Local-midnight 'YYYY-MM-DD' for the default focus (TZ-safe — never toISOString, which is UTC).
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const monthOf = (key: string) => key.slice(0, 7)

// zustand v5 curried form for correct TS inference (the app-shell-ui-store precedent).
export const useCalendarUIStore = create<CalendarUIState>()((set) => ({
  range: 'month',
  focusedDate: todayKey(),
  expandedDay: null,
  setRange: (range) => set((s) => ({ range, expandedDay: range === 'month' ? s.expandedDay : null })),
  setFocusedDate: (focusedDate) =>
    set((s) => ({ focusedDate, expandedDay: monthOf(focusedDate) === monthOf(s.focusedDate) ? s.expandedDay : null })),
  setExpandedDay: (expandedDay) => set({ expandedDay }),
}))
