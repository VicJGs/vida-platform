import { Text, View } from '@tamagui/core'
import { Card, Select, Switch, type ThemeDensity, type ThemeMode, type ThemePreset } from '@vida/ui'
import { PERSONA } from '@vida/types'
import { usePreferencesStore } from '../stores/preferences-store'
import { usePreferences } from '../preferences/use-preferences'
import { PERSONA_UNSET, type HomeArrangement, type PersonaChoice } from '../preferences/preferences-view'
import { OptionRow } from './option-row'
import { useSettings } from './settings-context'
import { SETTINGS_COPY } from './settings-copy'

// fe-settings S3 — the Appearance pane (EC-4 Appearance controls + EC-5 live apply).
// preferences-rescope R3 (D6/D7/D10/D4): the controls READ the persisted view (`usePreferences`) and WRITE through the
// Settings save path (`useSettings().update` → the preferences writer). The writer sets the cache optimistically, the
// derived theme store follows it, so a preset/mode/density change still re-themes the WHOLE app instantly (EC-5) — and
// a failed save reverts (+ one toast, from the writer). Preset → `dashboard_layout.theme` · mode → `theme` · density →
// `compact_mode` · arrangement → `dashboard_layout.arrangement` (per-sub-key merge, siblings survive) · persona →
// `persona` (`Not set` ↔ null). Reduce motion still binds the transitional store until R4 (D8/D9). Read-only (EC-7) →
// every control disabled. Each control carries its own accessible name; DIRECT semantic tokens.
//
// Design decision (documented): Mode offers Light / Dark only — `ThemeMode` is `'light' | 'dark'` (theme-resolution.ts),
// so a "System" option would be a fake third value with no backing until an OS-scheme follow seam exists. Honest > fake.
// No `game` preset: `game` is a module (the System), not a theme (Victor 2026-10-21; reconciliation D3).

const PRESET_OPTIONS: ReadonlyArray<{ value: ThemePreset; label: string }> = [
  { value: 'reader', label: 'Reader' },
  { value: 'editorial', label: 'Editorial' },
  { value: 'quietDesk', label: 'Quiet Desk' },
]
const MODE_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const DENSITY_OPTIONS: ReadonlyArray<{ value: ThemeDensity; label: string }> = [
  { value: 'calm', label: 'Comfortable' },
  { value: 'dense', label: 'Compact' },
]
const ARRANGEMENT_OPTIONS: ReadonlyArray<{ value: HomeArrangement; label: string }> = [
  { value: 'journalFirst', label: 'Journal first' },
  { value: 'dashboardFirst', label: 'Dashboard first' },
]
// D4 — `Not set` (persona is nullable) + the PERSONA enum in title case, in the enum's order.
const PERSONA_OPTIONS: ReadonlyArray<{ value: PersonaChoice; label: string }> = [
  { value: PERSONA_UNSET, label: SETTINGS_COPY.personaUnset },
  ...PERSONA.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
]

export function AppearancePane() {
  const { view } = usePreferences()
  const { readOnly, update } = useSettings()
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion)
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion)
  const { selection } = view

  return (
    <Card
      padding="spacious"
      header={
        <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
          Appearance
        </Text>
      }
    >
      <View>
        <OptionRow
          label="Theme preset"
          description="The reading voice of the whole app"
          control={
            <Select<ThemePreset>
              aria-label="Theme preset"
              disabled={readOnly}
              value={selection.preset}
              options={PRESET_OPTIONS}
              onValueChange={(preset) => void update({ selection: { preset } })}
            />
          }
        />
        <OptionRow
          label="Mode"
          description="Light or dark"
          control={
            <Select<ThemeMode>
              aria-label="Mode"
              disabled={readOnly}
              value={selection.mode}
              options={MODE_OPTIONS}
              onValueChange={(mode) => void update({ selection: { mode } })}
            />
          }
        />
        <OptionRow
          label="Density"
          description="Comfortable or compact spacing"
          control={
            <Select<ThemeDensity>
              aria-label="Density"
              disabled={readOnly}
              value={selection.density}
              options={DENSITY_OPTIONS}
              onValueChange={(density) => void update({ selection: { density } })}
            />
          }
        />
        {/* D4 — directly under the three theme rows (interpretation.md:239). Drives reward COPY only (fe-gamification
            EC-10); the live read lands with gamification-rescope (G3-E6). */}
        <OptionRow
          label={SETTINGS_COPY.personaLabel}
          description={SETTINGS_COPY.personaDescription}
          control={
            <Select<PersonaChoice>
              aria-label={SETTINGS_COPY.personaLabel}
              disabled={readOnly}
              value={view.persona}
              options={PERSONA_OPTIONS}
              onValueChange={(persona) => void update({ persona })}
            />
          }
        />
        <OptionRow
          label="Reduce motion"
          description="Minimise animations"
          control={
            <Switch
              aria-label="Reduce motion"
              disabled={readOnly}
              checked={reduceMotion}
              onCheckedChange={setReduceMotion}
            />
          }
        />
        <OptionRow
          label="Home arrangement"
          description="What leads the daily screen"
          last
          control={
            <Select<HomeArrangement>
              aria-label="Home arrangement"
              disabled={readOnly}
              value={view.arrangement}
              options={ARRANGEMENT_OPTIONS}
              onValueChange={(arrangement) => void update({ arrangement })}
            />
          }
        />
      </View>
    </Card>
  )
}
