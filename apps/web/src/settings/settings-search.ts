import { SETTINGS_INDEX, type SettingIndexEntry, type SettingsCategoryId } from './settings-model'

// fe-settings S4 — the searchable index (EC-6). One index drives BOTH the search box and the grouping
// (conventions.md:16 G7). A PURE, case-insensitive substring filter over each entry's label + description + keywords.
// Empty/whitespace query → [] (the caller then renders the normal category pane, not a results view).

export function searchSettings(query: string): SettingIndexEntry[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  return SETTINGS_INDEX.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}

export interface SettingsResultGroup {
  category: SettingsCategoryId
  entries: SettingIndexEntry[]
}

/** Group matches by category, preserving the SETTINGS_INDEX order within each group (stable, grouping-drives-display). */
export function groupResults(entries: SettingIndexEntry[]): SettingsResultGroup[] {
  const groups: SettingsResultGroup[] = []
  for (const e of entries) {
    const g = groups.find((x) => x.category === e.category)
    if (g) g.entries.push(e)
    else groups.push({ category: e.category, entries: [e] })
  }
  return groups
}
