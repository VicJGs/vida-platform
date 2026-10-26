import { MODULE_MAP } from '../nav/module-map'
import { SETTINGS_COPY } from './settings-copy'

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
  { id: 'locale', label: 'Locale', built: true },
  { id: 'notifications', label: 'Notifications', built: true },
  { id: 'modules', label: 'Modules', built: true },
  // data/account render delegated placeholders (owners = Data/Sync + Auth/Account, M3/M4) — "built" as placeholders (EC-9).
  { id: 'data', label: 'Data', built: true },
  { id: 'account', label: 'Account', built: true },
]

// S5 — the Modules pane list. EC-8 escape hatch (seam-contract §E): the nav show/hide list is the DOCK content modules,
// MINUS any surface that would hide the path back to Settings/Home. The service does NOT guard this (`setModuleVisibility`
// persists anything) — it's UI-enforced here. `preferences` (Settings) + `journals` (Home) are `global`, so the dock
// filter already excludes them; the explicit set documents the escape-hatch intent (belt + suspenders).
export const ALWAYS_REACHABLE_KEYS: ReadonlySet<string> = new Set(['preferences', 'journals'])

export interface HideableModule {
  key: string
  label: string
}

export const HIDEABLE_MODULES: readonly HideableModule[] = MODULE_MAP.filter(
  (m) => m.placement === 'dock' && !ALWAYS_REACHABLE_KEYS.has(m.key),
).map((m) => ({ key: m.key, label: m.label }))

// S5 — the "Surfaces" subsection: discovered global surfaces the user enables/disables (not dock modules).
// Keys map to module_visibility['features'|'sync'] (seam-contract §B). Match the greybox "Surfaces".
export interface ManageableSurface {
  key: string
  label: string
  description: string
}

export const MANAGEABLE_SURFACES: readonly ManageableSurface[] = [
  { key: 'features', label: 'Feature Atlas', description: 'The map of how your modules connect' },
  { key: 'sync', label: 'Sync & Activity log', description: 'Show the local change log' },
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
  // preferences-rescope R3 (D4) — the persona row, under the theme rows. Keywords = the PERSONA values (types/entities/user.ts).
  {
    id: 'persona',
    category: 'appearance',
    label: SETTINGS_COPY.personaLabel,
    description: SETTINGS_COPY.personaDescription,
    keywords: ['persona', 'role', 'student', 'professional', 'entrepreneur', 'creative', 'parent', 'retiree', 'rewards'],
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
  // Modules (S5)
  {
    id: 'module-visibility',
    category: 'modules',
    label: 'Show or hide modules',
    description: 'Choose which modules appear in the nav',
    keywords: ['module', 'modules', 'nav', 'navigation', 'show', 'hide', 'visibility', 'dock'],
  },
  {
    id: 'module-rename',
    category: 'modules',
    label: 'Rename a module',
    description: 'Give a module your own name',
    keywords: ['module', 'rename', 'name', 'label', 'custom'],
  },
  {
    id: 'feature-atlas',
    category: 'modules',
    label: 'Feature Atlas',
    description: 'The map of how your modules connect',
    keywords: ['feature', 'atlas', 'map', 'surfaces', 'graph', 'discover'],
  },
  {
    id: 'sync-log',
    category: 'modules',
    label: 'Sync & Activity log',
    description: 'Show the local change log',
    keywords: ['sync', 'activity', 'log', 'changes', 'history', 'surfaces'],
  },
  // Locale (S6)
  {
    id: 'date-format',
    category: 'locale',
    label: 'Date format',
    description: 'How dates are written across the app',
    keywords: ['date', 'format', 'locale', 'day', 'month', 'year'],
  },
  {
    id: 'time-format',
    category: 'locale',
    label: 'Time format',
    description: '12-hour or 24-hour clock',
    keywords: ['time', 'format', 'clock', '12', '24', 'hour', 'locale'],
  },
  {
    id: 'week-starts-on',
    category: 'locale',
    label: 'Week starts on',
    description: 'The first day of the week in calendars',
    keywords: ['week', 'start', 'monday', 'sunday', 'calendar', 'locale'],
  },
  // Notifications (S6)
  {
    id: 'notif-channels',
    category: 'notifications',
    label: 'Notification channels',
    description: 'In-app, push, and email notifications',
    keywords: ['notification', 'notifications', 'in-app', 'push', 'email', 'channel', 'alerts'],
  },
  {
    id: 'quiet-hours',
    category: 'notifications',
    label: 'Quiet hours',
    description: 'Pause notifications overnight',
    keywords: ['quiet', 'hours', 'do not disturb', 'dnd', 'pause', 'notifications'],
  },
]
