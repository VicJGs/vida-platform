import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { ensureSwitchStyles } from '../internal/switch-styles'

// UI-1 · Switch (fe-settings S1, EC-3) — the binary on/off pill toggle. The OS System specimen's toggle
// (p6-archetypes-design.html:301). Mirrors the Checkbox recipe (checkbox.tsx): a real <input type="checkbox"
// role="switch"> (native role/Space-toggle/form/focus) sits opacity:0 absolute-filling a styled TRACK; a real <label>
// (render:'label') wraps both so label-click toggles natively. The state visuals (track fill / knob slide / focus ring)
// are pure CSS off the input's `:checked`/`:focus-visible` (switch-styles.ts) — no re-render on toggle (BR-SW-2).
// Direct semantic tokens, no sub-theme (BR-SW-3). B12: only the knob transform transitions (BR-SW-5).

type SwitchSize = 'sm' | 'md' | 'lg'

// Pill track + circular knob. No `switch.size` token exists — raw 4pt-grid dp (the checkbox BOX precedent, DEF-U3-b).
// travel = trackWidth − knob − 4 (2px inset each side); set inline as --vida-switch-travel (BR-SW-4).
const TRACK: Record<SwitchSize, { w: number; h: number }> = {
  sm: { w: 28, h: 16 },
  md: { w: 36, h: 20 },
  lg: { w: 44, h: 24 },
}
const KNOB: Record<SwitchSize, number> = { sm: 12, md: 16, lg: 20 }
const LABEL_SIZE: Record<SwitchSize, string> = { sm: '$caption', md: '$small', lg: '$body' }
const travelOf = (s: SwitchSize): number => TRACK[s].w - KNOB[s] - 4

// The real <label>: click-to-toggle + implicit association. render:'label' → <label> (Tamagui v2 string render prop).
const SwitchRoot = styled(View, {
  name: 'Switch',
  render: 'label',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  cursor: 'pointer',
  userSelect: 'none',
  variants: {
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed' }, // native `disabled` on the input removes it from tab order.
    },
  } as const,
})

// The pill. Off = secondary surface + default border; ON fill/border = injected CSS (var(--colorBrandPrimary)).
// Hover strengthens the border (§VIII, the Card/Toast dark-border precedent — no overflow-clipped overlay needed).
const SwitchTrack = styled(View, {
  name: 'Switch',
  position: 'relative',
  flexShrink: 0,
  borderRadius: 999, // full pill (a literal — `$radius` dimension props read the token scale, not a sub-theme; DEF-U8-h)
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  backgroundColor: '$colorSurfaceSecondary',
  hoverStyle: { borderColor: '$colorTextMuted' },
  variants: {
    // Danger border via a Tamagui variant (the Checkbox/Input precedent) — NOT injected CSS (specificity race).
    // ⚠ Uses the BASE signal token `$colorSignalDanger`, NOT `$borderError`: the latter is a sub-theme key defined only
    // in light_Checkbox/Input/Select (themes.ts); Switch is direct-token with no sub-theme (the fe-codec-theme accent-fix
    // direction), so `$borderError` would resolve to nothing. `$colorSignalDanger` is preset-invariant (the Card
    // precedent) and is what `borderError` maps to anyway. Visual-Gate-caught (tsc + unit tests passed over it).
    invalid: {
      true: { borderColor: '$colorSignalDanger', hoverStyle: { borderColor: '$colorSignalDanger' } },
    },
  } as const,
})

// The sliding knob. Absolute, 2px inset; translateX(0)→translateX(travel) on :checked (switch-styles.ts).
const SwitchKnob = styled(View, {
  name: 'Switch',
  position: 'absolute',
  top: 2,
  left: 2,
  borderRadius: 999,
  backgroundColor: '$colorSurfacePrimary',
  pointerEvents: 'none',
})

export interface SwitchProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'onChange' | 'checked' | 'defaultChecked' | 'type'
  > {
  /** Controlled checked state. */
  checked?: boolean
  /** Uncontrolled initial checked state. */
  defaultChecked?: boolean
  /** Change handler — receives the new checked value. */
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Semantic error state — danger border + `aria-invalid`. */
  invalid?: boolean
  required?: boolean
  /** Control size. Default 'md'. */
  size?: SwitchSize
  /** Label slot — associates natively (click toggles). When omitted, an `aria-label` is REQUIRED. */
  label?: ReactNode
  name?: string
  value?: string
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { checked, defaultChecked, onCheckedChange, disabled, invalid, required, size = 'md', label, name, value, ...rest },
  ref,
) {
  ensureSwitchStyles()

  if (process.env.NODE_ENV !== 'production') {
    const r = rest as Record<string, unknown>
    const named = label != null || r['aria-label'] != null || r['aria-labelledby'] != null
    if (!named) {
      console.warn(
        '[vida/ui] Switch: provide a `label`, or an `aria-label`/`aria-labelledby`, for an accessible name.',
      )
    }
  }

  const isControlled = checked !== undefined
  const { w, h } = TRACK[size]
  const knob = KNOB[size]

  return (
    <SwitchRoot
      className={invalid === true ? 'vida-switch vida-switch-invalid' : 'vida-switch'}
      disabled={disabled === true}
    >
      <SwitchTrack
        className="vida-switch-track"
        invalid={invalid === true}
        width={w}
        height={h}
        // per-instance knob travel (BR-SW-4) — the knob (descendant) inherits this custom prop.
        style={{ ['--vida-switch-travel' as string]: `${travelOf(size)}px` }}
      >
        <SwitchKnob className="vida-switch-knob" width={knob} height={knob} />
        {/* The real input: transparent, absolute-fills the track (whole pill clickable + focusable), form-participating.
            {...rest} first so the computed a11y props below win (the Checkbox N1 ordering). */}
        <input
          {...rest}
          ref={ref}
          type="checkbox"
          role="switch"
          className="vida-switch-input"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            opacity: 0,
            cursor: 'inherit',
          }}
          checked={isControlled ? checked : undefined}
          defaultChecked={isControlled ? undefined : defaultChecked}
          disabled={disabled === true}
          required={required === true}
          name={name}
          value={value}
          aria-invalid={invalid === true ? true : undefined}
          aria-required={required === true ? true : undefined}
          onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
        />
      </SwitchTrack>
      {label != null && (
        <Text fontFamily="$body" fontSize={LABEL_SIZE[size]} color="$colorTextPrimary" userSelect="none">
          {label}
        </Text>
      )}
    </SwitchRoot>
  )
})
