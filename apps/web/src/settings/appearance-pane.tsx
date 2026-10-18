import { Text, View } from '@tamagui/core'
import { Card, Select, Switch, type ThemeDensity, type ThemeMode, type ThemePreset } from '@vida/ui'
import { useThemeStore } from '../stores/theme-store'
import { usePreferencesStore, type HomeArrangement } from '../stores/preferences-store'
import { OptionRow } from './option-row'

// fe-settings S3 — the Appearance pane (EC-4 Appearance controls + EC-5 live apply). The theme controls dispatch to the
// theme store → <UIProvider selection> → the WHOLE app re-themes instantly. Reduce-motion + arrangement dispatch to the
// preferences store (arrangement is read live by useHomeArrangement; reduce-motion's downstream motion gating is
// OS-media-query-driven, so its app-pref effect is persistence-gated, §A0). All controls carry their own accessible
// name (aria-label = the visible label); DIRECT semantic tokens.
//
// Design decision (documented): Mode offers Light / Dark only — `ThemeMode` is `'light' | 'dark'` (theme-resolution.ts),
// so a "System" option would be a fake third value with no backing until an OS-scheme follow seam exists. Honest > fake.

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

export function AppearancePane() {
  const selection = useThemeStore((s) => s.selection)
  const setPreset = useThemeStore((s) => s.setPreset)
  const setMode = useThemeStore((s) => s.setMode)
  const setDensity = useThemeStore((s) => s.setDensity)
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion)
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion)
  const arrangement = usePreferencesStore((s) => s.arrangement)
  const setArrangement = usePreferencesStore((s) => s.setArrangement)

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
              value={selection.preset}
              options={PRESET_OPTIONS}
              onValueChange={setPreset}
            />
          }
        />
        <OptionRow
          label="Mode"
          description="Light or dark"
          control={
            <Select<ThemeMode>
              aria-label="Mode"
              value={selection.mode}
              options={MODE_OPTIONS}
              onValueChange={setMode}
            />
          }
        />
        <OptionRow
          label="Density"
          description="Comfortable or compact spacing"
          control={
            <Select<ThemeDensity>
              aria-label="Density"
              value={selection.density}
              options={DENSITY_OPTIONS}
              onValueChange={setDensity}
            />
          }
        />
        <OptionRow
          label="Reduce motion"
          description="Minimise animations"
          control={
            <Switch aria-label="Reduce motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
          }
        />
        <OptionRow
          label="Home arrangement"
          description="What leads the daily screen"
          last
          control={
            <Select<HomeArrangement>
              aria-label="Home arrangement"
              value={arrangement}
              options={ARRANGEMENT_OPTIONS}
              onValueChange={setArrangement}
            />
          }
        />
      </View>
    </Card>
  )
}
