// fe-onboarding (LIF-216) · S3 — the Step 2 theme picker body (EC-5). Mounts into the S1 frame's `renderStepBody` for
// the `theme` step. The shipped THEME_PRESETS (reader · editorial · quietDesk) as selectable swatches; selecting one
// LIVE-PREVIEWS it via the app-owned selection lever (the `preview` seam). Each swatch's palette band shows its OWN
// preset's CONCRETE colors, resolved via a `getComputedStyle` probe (see `resolvePresetPalette`) — a nested `<Theme>`
// can't, because the active `<body>` preset scope out-specifies it — so all three palettes show at once, not just the
// active theme, with NO hardcoded color. `ThemePickerView` is PURE (state-as-prop); `ThemePicker` is the thin hook
// shell. Tokens only, no @vida/ui edit (BR-1).
import { useEffect, useState } from 'react'
import { Text, View, styled } from '@tamagui/core'
import { THEME_PRESETS, type ThemePreset, type ThemeMode } from '@vida/ui'
import { useThemeSelection } from './use-theme-selection'

const PRESET_LABELS: Record<ThemePreset, string> = {
  editorial: 'Editorial',
  reader: 'Reader',
  quietDesk: 'Quiet Desk',
  // fe-gamification G0 added the `game` preset to THEME_PRESETS (the manhwa-"System" register); the picker
  // iterates THEME_PRESETS, so it needs this label. Game is meant to be picked here (GM-16: applied via the
  // theme picker; persona → suggest-game-at-onboarding). Its palette band resolves generically via the probe.
  game: 'Game',
}

// A swatch = a real <button> (native Enter/Space) carrying `aria-pressed`. Single-select: only the chosen preset is
// pressed at a time. §VIII focus ring. Selected = brand-emphasis ring; the fill stays a quiet surface either way.
const SwatchCard = styled(View, {
  render: 'button',
  type: 'button',
  flexDirection: 'column',
  gap: '$8',
  padding: '$8',
  borderRadius: '$md',
  borderWidth: 2,
  backgroundColor: '$colorSurfaceSecondary',
  cursor: 'pointer',
  userSelect: 'none',
  width: 140,
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  variants: {
    selected: {
      true: { borderColor: '$colorBrandEmphasis' },
      false: { borderColor: '$colorBorderDefault' },
    },
  } as const,
})

// The 4 semantic tokens the palette band previews (surface · surface-2 · brand · text).
const PALETTE_VARS = ['--colorSurfacePrimary', '--colorSurfaceSecondary', '--colorBrandPrimary', '--colorTextPrimary'] as const

// Resolve a preset's CONCRETE colors in the active scheme, independent of which preset is globally active. The preset
// palette is applied by a `<body class="t_<preset>">` DESCENDANT scope (provider.tsx:127-131) whose `:root.t_<mode>
// .t_<preset>` selector out-specifies any in-tree wrapper — so a nested <Theme> can't preview a NON-active preset. A
// throwaway probe appended to <html> (OUTSIDE <body>, so the active body-preset never leaks) + reading getComputedStyle
// resolves each preset's real tokens — the [[webgl-canvas-color-needs-getcomputedstyle-probe]] pattern, no hardcoded color.
function resolvePresetPalette(preset: ThemePreset): string[] | null {
  if (typeof document === 'undefined') return null
  const wrap = document.createElement('div')
  if (preset !== 'editorial') wrap.className = `t_${preset}` // editorial = the bare scheme base (no class)
  wrap.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
  const cells = PALETTE_VARS.map((v) => {
    const c = document.createElement('div')
    c.style.backgroundColor = `var(${v})`
    wrap.appendChild(c)
    return c
  })
  document.documentElement.appendChild(wrap)
  try {
    const out = cells.map((c) => getComputedStyle(c).backgroundColor)
    if (out.some((c) => !c || c === 'rgba(0, 0, 0, 0)')) return null // jsdom/SSR → no resolved vars
    return out
  } finally {
    wrap.remove() // leak-safe even if getComputedStyle throws mid-read (g2 NIT)
  }
}

// The palette preview — four cells in the preset's OWN resolved colors. Decorative (the preset's name is the accessible
// label); aria-hidden so the swatch's name stays the bare preset label. Resolved in a POST-PAINT effect (not useMemo):
// the probe needs the provider's `t_<mode>`/`t_<preset>` classes already on <html>, which the ancestor provider applies
// in its own layout effect — so a render-time read sees undefined vars. `mode` in deps re-resolves if the scheme flips.
function PaletteBand({ preset, mode }: { preset: ThemePreset; mode: ThemeMode }) {
  const [colors, setColors] = useState<string[] | null>(null)
  useEffect(() => {
    setColors(resolvePresetPalette(preset))
  }, [preset, mode])
  if (!colors)
    return <View aria-hidden height={36} borderRadius="$sm" borderWidth={1} borderColor="$colorBorderDefault" backgroundColor="$colorSurfaceSecondary" />
  return (
    <View aria-hidden flexDirection="row" height={36} borderRadius="$sm" overflow="hidden" borderWidth={1} borderColor="$colorBorderDefault">
      {colors.map((c, i) => (
        <View key={i} flex={1} backgroundColor={c} />
      ))}
    </View>
  )
}

function ThemeSwatch({ preset, mode, selected, onSelect }: { preset: ThemePreset; mode: ThemeMode; selected: boolean; onSelect: (preset: ThemePreset) => void }) {
  return (
    <SwatchCard selected={selected} aria-pressed={selected} onPress={() => onSelect(preset)}>
      <PaletteBand preset={preset} mode={mode} />
      <View flexDirection="row" alignItems="center" justifyContent="space-between" gap="$8">
        <Text fontSize="$small" fontWeight={selected ? '600' : '400'} color="$colorTextPrimary">
          {PRESET_LABELS[preset]}
        </Text>
        {/* decorative selected tick — state is carried by aria-pressed */}
        <Text aria-hidden fontSize="$small" color="$colorBrandEmphasis" opacity={selected ? 1 : 0}>
          ✓
        </Text>
      </View>
    </SwatchCard>
  )
}

export interface ThemePickerViewProps {
  /** The presets to offer. Defaults to the shipped THEME_PRESETS. */
  presets?: readonly ThemePreset[]
  /** The selected preset (reflects + previews). */
  selected: ThemePreset
  /** The mode the swatch bands preview in (the active selection's mode). Default 'light'. */
  mode?: ThemeMode
  /** Select + live-preview a preset. */
  onSelect: (preset: ThemePreset) => void
  'aria-label'?: string
}

/** Pure, state-as-prop — a labelled group of preset swatches. S4 lifts `selected`/`onSelect` to the flow + live lever.
 *  One group (3 swatches), labelled via aria-label — the visible step title ("Make it yours") is the S1 frame's. */
export function ThemePickerView({ presets = THEME_PRESETS, selected, mode = 'light', onSelect, 'aria-label': ariaLabel = 'Theme' }: ThemePickerViewProps) {
  return (
    <View role="group" aria-label={ariaLabel} flexDirection="row" flexWrap="wrap" gap="$12">
      {presets.map((p) => (
        <ThemeSwatch key={p} preset={p} mode={mode} selected={p === selected} onSelect={onSelect} />
      ))}
    </View>
  )
}

/** The in-flow mount (S1 `renderStepBody`) + Visual-Gate harness. `onPreview` = the app-owned live lever (S4 wires it). */
export function ThemePicker({ mode, onPreview, initial }: { mode?: ThemeMode; onPreview?: (preset: ThemePreset) => void; initial?: ThemePreset } = {}) {
  const { selected, preview } = useThemeSelection({ initial, onPreview })
  return <ThemePickerView selected={selected} mode={mode} onSelect={preview} />
}

export default ThemePicker
