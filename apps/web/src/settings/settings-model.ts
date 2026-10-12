// fe-settings S3 — the Settings index model. The category list drives the left rail; the per-setting index entries
// (label · description · keywords) are the SEARCHABLE INDEX that both the search box and the section grouping consume
// (conventions.md:16 G7 — one index drives both). S4 filters SETTINGS_INDEX; S3 renders the rail + Appearance pane.

export type SettingsCategoryId =
  | 'appearance'
  | 'locale'
  | 'notifications'
  | 'modules'
  | 'data'
  | 'account'

export interface SettingsCategory {
  id: SettingsCategoryId
  label: string
  /** false → rendered as a calm "built in a later slice/release" placeholder (S4–S6 fill these; data/account = M3/M4). */
  built: boolean
}

// Rail order mirrors the OS System specimen (p6-archetypes-design.html:298) + decomposition.md:71.
export const SETTINGS_CATEGORIES: readonly SettingsCategory[] = [
  { id: 'appearance', label: 'Appearance', built: true },
  { id: 'locale', label: 'Locale', built: false },
  { id: 'notifications', label: 'Notifications', built: false },
  { id: 'modules', label: 'Modules', built: false },
  { id: 'data', label: 'Data', built: false },
  { id: 'account', label: 'Account', built: false },
]

/** One searchable entry per control (the S4 search + section grouping both read this; keywords aid fuzzy matching). */
export interface SettingIndexEntry {
  id: string
  category: SettingsCategoryId
  label: string
  description: string
  keywords: readonly string[]
}

// Appearance entries (S3). S4–S6 append their categories' entries; S4's search filters this whole list.
export const SETTINGS_INDEX: readonly SettingIndexEntry[] = [
  {
    id: 'theme-preset',
    category: 'appearance',
    label: 'Theme preset',
    description: 'The reading voice of the whole app',
    keywords: ['theme', 'preset', 'reader', 'editorial', 'quiet desk', 'colour', 'color', 'font'],
  },
  {
    id: 'mode',
    category: 'appearance',
    label: 'Mode',
    description: 'Light or dark',
    keywords: ['mode', 'light', 'dark', 'scheme', 'appearance'],
  },
  {
    id: 'density',
    category: 'appearance',
    label: 'Density',
    description: 'Comfortable or compact spacing',
    keywords: ['density', 'compact', 'comfortable', 'spacing'],
  },
  {
    id: 'reduce-motion',
    category: 'appearance',
    label: 'Reduce motion',
    description: 'Minimise animations',
    keywords: ['motion', 'animation', 'reduce', 'accessibility', 'a11y'],
  },
  {
    id: 'home-arrangement',
    category: 'appearance',
    label: 'Home arrangement',
    description: 'What leads the daily screen',
    keywords: ['home', 'arrangement', 'journal', 'dashboard', 'layout'],
  },
]
