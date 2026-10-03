import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { styled, Text, View } from '@tamagui/core'
import { ensureInteractionStyles } from '../internal/interaction-styles'
import { ensureCheckboxStyles } from '../internal/checkbox-styles'

// UI-1 · Checkbox (primitive 3/10, last atomic) — implements ds-5-primitive-contracts/checkbox.md against Tamagui v2.
// Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u3-checkbox.md.
// - A real <input type="checkbox"> (native role/Space-toggle/form participation/`indeterminate`) sits opacity:0,
//   absolute-filling a styled BOX; a real <label> (render:'label') wraps both so label-click toggles natively.
// - name:'Checkbox' establishes the .t_Checkbox sub-theme scope (light_/dark_Checkbox → $border/$colorBrandEmphasis/
//   $checkmark/$borderError/$radius). The state visuals (fill/checkmark/dash/ring/error) are pure CSS off the input's
//   `:checked`/`:indeterminate`/`:focus-visible` pseudo-classes (checkbox-styles.ts) — no re-render on toggle
//   (perf budget). React only sets `.indeterminate` (a DOM property, not an attribute) via a layout effect.
// - B12: only opacity+transform(scale) transition (checkmark/dash); fill/border are instant state swaps.

type CheckboxSize = 'sm' | 'md' | 'lg'

// Box is a square control; no `checkbox.size` token exists and $size (32/40/48) is control-height — so raw 4pt-grid
// dp (u3-checkbox.md D1 / DEF-U3-b: doc gap, flagged for DS to tokenize). Checkmark ~0.7× the box.
const BOX: Record<CheckboxSize, number> = { sm: 16, md: 20, lg: 24 }
const GLYPH: Record<CheckboxSize, number> = { sm: 12, md: 14, lg: 16 }
const LABEL_SIZE: Record<CheckboxSize, string> = { sm: '$caption', md: '$small', lg: '$body' }

// The real <label>: click-to-toggle + implicit label association (checkbox.md:50). render:'label' → <label>
// (Tamagui v2: string render prop = semantic HTML tag). name:'Checkbox' scopes the sub-theme for descendants.
const CheckboxRoot = styled(View, {
  name: 'Checkbox',
  render: 'label',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  cursor: 'pointer',
  userSelect: 'none',
  variants: {
    disabled: {
      // muted + non-interactive (checkbox.md:35). The native `disabled` on the input removes it from tab order.
      true: { opacity: 0.5, cursor: 'not-allowed' },
    },
  } as const,
})

// The visual box. name:'Checkbox' so its Tamagui $border/$radius resolve AND it emits the sub-theme vars the injected
// CSS reads. overflow:hidden clips the hover/press overlay to the rounded box (the focus outline is drawn outside,
// unaffected by overflow).
const CheckboxBox = styled(View, {
  name: 'Checkbox',
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  // radius.control (md) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$md',
  backgroundColor: 'transparent',
  overflow: 'hidden',
  variants: {
    // Danger border via a Tamagui variant (the proven Input precedent) — NOT injected CSS, which lost the
    // specificity race against Tamagui's own border-color classes. Precedence over the checked-fill border is
    // kept by the `:not(.vida-checkbox-invalid)` guard on that injected rule (checkbox-styles.ts).
    invalid: { true: { borderColor: '$borderError' } },
  } as const,
})

/** Checkmark — stroke = currentColor (set to $checkmark on the wrapper). Shown/animated via CSS (checkbox-styles.ts). */
function Check({ size }: { size: number }) {
  return (
    <View className="vida-checkbox-check" color="$colorTextInverse" pointerEvents="none">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12.5 10 17.5 19 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </View>
  )
}

/** Indeterminate dash — a single bar, currentColor = $checkmark. Shown via CSS on :indeterminate. */
function Dash({ size }: { size: number }) {
  return (
    <View className="vida-checkbox-dash" color="$colorTextInverse" pointerEvents="none" position="absolute">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 12h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </View>
  )
}

export interface CheckboxProps
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
  /** Tri-state: renders a dash + `aria-checked="mixed"`. Mutually exclusive with a `checked=true` render. */
  indeterminate?: boolean
  disabled?: boolean
  /** Semantic error state — danger border + `aria-invalid` (required-but-unchecked in a submitted form). */
  invalid?: boolean
  required?: boolean
  /** Control size. Default 'md'. */
  size?: CheckboxSize
  /** Label slot — associates natively (click toggles). When omitted, an `aria-label` is REQUIRED. */
  label?: ReactNode
  name?: string
  value?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    checked,
    defaultChecked,
    onCheckedChange,
    indeterminate,
    disabled,
    invalid,
    required,
    size = 'md',
    label,
    name,
    value,
    ...rest
  },
  ref,
) {
  ensureInteractionStyles()
  ensureCheckboxStyles()

  // `indeterminate` is a DOM property, not an attribute — set it imperatively. Callback-merge the internal ref with
  // the consumer's forwardRef (no `!`, no `any`); the null-guard makes an unmounted node a no-op, not a crash.
  const innerRef = useRef<HTMLInputElement | null>(null)
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  useLayoutEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate === true
  }, [indeterminate])

  if (process.env.NODE_ENV !== 'production') {
    const r = rest as Record<string, unknown>
    const named = label != null || r['aria-label'] != null || r['aria-labelledby'] != null
    if (!named) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Checkbox: provide a `label`, or an `aria-label`/`aria-labelledby`, for an accessible name.',
      )
    }
    if (checked === true && indeterminate === true) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Checkbox: `checked` and `indeterminate` are mutually exclusive — the indeterminate dash renders.',
      )
    }
  }

  const isControlled = checked !== undefined
  const box = BOX[size]

  return (
    <CheckboxRoot
      className={invalid === true ? 'vida-checkbox vida-checkbox-invalid' : 'vida-checkbox'}
      disabled={disabled === true}
    >
      {/* The box carries vida-interactive only when enabled (no hover/press overlay on a disabled control).
          vida-checkbox-box is the target for the injected fill/checkmark/focus-ring/error rules — always present. */}
      <CheckboxBox
        className={disabled === true ? 'vida-checkbox-box' : 'vida-checkbox-box vida-interactive'}
        invalid={invalid === true}
        width={box}
        height={box}
      >
        {/* Hover/press overlay — opacity via CSS descendant-hover (interaction-styles.ts). B12: only opacity. */}
        <View
          className="vida-overlay"
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          backgroundColor="$colorTextPrimary"
          opacity={0}
          pointerEvents="none"
        />
        <Check size={GLYPH[size]} />
        <Dash size={GLYPH[size]} />
        {/* The real input: transparent, absolute-fills the box (whole box clickable + focusable), form-participating.
            {...rest} first so computed a11y props below win (N1, carried from Button/Input). */}
        <input
          {...rest}
          ref={setRef}
          type="checkbox"
          className="vida-checkbox-input"
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
          aria-checked={indeterminate === true ? 'mixed' : undefined}
          aria-invalid={invalid === true ? true : undefined}
          aria-required={required === true ? true : undefined}
          onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
        />
      </CheckboxBox>
      {label != null && (
        <Text fontFamily="$body" fontSize={LABEL_SIZE[size]} color="$colorTextPrimary" userSelect="none">
          {label}
        </Text>
      )}
    </CheckboxRoot>
  )
})
