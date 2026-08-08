import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { styled, View } from '@tamagui/core'
import { ensureInputStyles } from '../internal/input-styles'

// UI-1 · Input (primitive 2/10) — implements ds-5-primitive-contracts/input.md against Tamagui v2.
// Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u2-input.md. /verify /tamagui/tamagui (2026-08-06).
// - Frame (View) owns the border/bg/padding + the leading/trailing slots; the real <input> sits inside it.
// - render:'input' → a real <input> (native text editing, type, form participation) [FACT: styled.mdx].
// - Focus lands on the inner <input>. The contract (input.md:37,55) + components §VIII:155 mandate `:focus-visible`
//   (keyboard focus, POINTER-SUPPRESSED). Tamagui `focusVisibleStyle` keys off the element's OWN focus, so it can't
//   fire on the never-focused frame; and `focusWithinStyle` (`:focus-within`) would ring on pointer-click and on a
//   focused trailing button — a spec deviation. So the ring is delivered as the DOCUMENTED `:focus-visible` selector
//   lifted to the frame: `.vida-input-frame:has(input:focus-visible)` (internal/input-styles.ts), colors = real
//   switching theme vars. Error precedence handled there via `:not(.vida-input-invalid)`.
// - B12: no color/border is animated — focus/hover/error are instant state swaps.

type InputSize = 'sm' | 'md' | 'lg'
type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'

const InputFrame = styled(View, {
  name: 'Input',
  // name:'Input' auto-applies light_Input/dark_Input ($background, $border, $borderFocus, $borderError…) [FACT:
  // theme-builder.mdx]. The sub-theme MUST be registered in tamagui.config.ts (done) or these resolve nothing.
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$border',
  // radius.control (md) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$md',
  cursor: 'text',
  // NB: the focus ring + border→focus are NOT a Tamagui pseudo-style here — they need `:focus-visible` on the inner
  // input reflected onto the frame, which only `.vida-input-frame:has(input:focus-visible)` expresses (input-styles.ts).
  // Hover strengthens the border (perceivable beyond color). No input.borderHover token exists (UI-1 can't add
  // component tokens) → $colorTextMuted (neutral500) via the parent-theme cascade under name:'Input'. Instant swap.
  hoverStyle: { borderColor: '$colorTextMuted' },
  variants: {
    // Space tokens for padding (a COMPONENT token can't drive paddingHorizontal — Tamagui resolves space props
    // against the space scale, not the sub-theme; U1 fact). Height from the size scale, gap for the slots.
    size: {
      sm: { height: '$32', paddingHorizontal: '$12', gap: '$4' },
      md: { height: '$40', paddingHorizontal: '$16', gap: '$8' },
      lg: { height: '$48', paddingHorizontal: '$20', gap: '$8' },
    },
    // error precedence: danger border wins over hover (contract: border → danger when invalid). Focus-border is
    // excluded from an invalid frame by the `:not(.vida-input-invalid)` guard in input-styles.ts.
    invalid: {
      true: {
        borderColor: '$borderError',
        hoverStyle: { borderColor: '$borderError' },
      },
    },
    // disabled dims the frame + blocks the hover swap; the native `disabled` (removed from tab order) is on the input.
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed', hoverStyle: { borderColor: '$border' } },
    },
  } as const,
  defaultVariants: { size: 'md' },
})

// The real <input>: transparent, borderless (the frame draws the box), text token color, no own outline (the ring
// is on the frame). minWidth:0 lets flex:1 shrink so long values never push the frame wider. size → font size.
const NativeInput = styled(View, {
  name: 'Input',
  render: 'input',
  flex: 1,
  minWidth: 0,
  height: '100%',
  backgroundColor: 'transparent',
  borderWidth: 0,
  outlineStyle: 'none',
  color: '$text',
  fontFamily: '$body',
  variants: {
    size: {
      sm: { fontSize: '$caption' },
      md: { fontSize: '$small' },
      lg: { fontSize: '$body' },
    },
  } as const,
  defaultVariants: { size: 'md' },
})

// Tamagui types a View-rendered styled component as View props; on web `render:'input'` forwards native <input>
// attributes at runtime (verified in-browser — u2-input.md First-impl VERIFY). We widen the type to the input
// attrs we actually pass (incl. Tamagui's `placeholderTextColor` token prop), keeping strict TS with no `any`.
type NativeInputExtra = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'type'
  | 'disabled'
  | 'readOnly'
  | 'required'
  | 'placeholder'
  | 'name'
  | 'id'
  | 'inputMode'
  | 'autoComplete'
  | 'aria-invalid'
  | 'aria-required'
  | 'aria-readonly'
  | 'aria-describedby'
  | 'aria-label'
  | 'aria-labelledby'
  | 'aria-busy'
> & { size?: InputSize; className?: string }
const NativeInputEl = NativeInput as unknown as React.ForwardRefExoticComponent<
  NativeInputExtra & React.RefAttributes<HTMLInputElement>
>

export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'type' | 'onChange' | 'value' | 'defaultValue'
  > {
  /** Controlled value. */
  value?: string
  /** Uncontrolled initial value. */
  defaultValue?: string
  /** Change handler (web-standard value extracted; RN-safe). */
  onChangeText?: (v: string) => void
  placeholder?: string
  /** Semantic error state (§VII) — drives the danger border + `aria-invalid`. */
  invalid?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  /** Control size. Default 'md'. */
  size?: InputSize
  /** Input mode; 'password' masks. Default 'text'. */
  type?: InputType
  /** Slot before the field (icon/prefix). */
  leading?: ReactNode
  /** Slot after the field (icon/clear/reveal, or a spinner for async-validate loading). */
  trailing?: ReactNode
  name?: string
  id?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size = 'md',
    invalid,
    disabled,
    readOnly,
    required,
    type = 'text',
    value,
    defaultValue,
    placeholder,
    onChangeText,
    leading,
    trailing,
    name,
    id,
    ...rest
  },
  ref,
) {
  ensureInputStyles() // idempotent, browser-only — the ::placeholder color rule (reads the --placeholder theme var).

  // A textbox needs an accessible name (contract §A11y — "no unlabeled input"). We can't see an external
  // <label htmlFor> from inside, so we warn only when there is provably no name: no `id` (nothing a label could
  // target) AND no aria-label/labelledby. Dev-time only (bundler-replaced NODE_ENV → dead-code-eliminated in prod).
  if (process.env.NODE_ENV !== 'production') {
    const r = rest as Record<string, unknown>
    const named = id != null || r['aria-label'] != null || r['aria-labelledby'] != null
    if (!named) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Input: provide an `aria-label`/`aria-labelledby`, or an `id` with a matching `<label htmlFor>`, for an accessible name.',
      )
    }
  }

  return (
    <InputFrame
      // vida-input-frame → the injected `:has(input:focus-visible)` ring targets it; vida-input-invalid → the CSS
      // guard that keeps the focus border from overriding the danger border (input-styles.ts).
      className={invalid === true ? 'vida-input-frame vida-input-invalid' : 'vida-input-frame'}
      size={size}
      invalid={invalid === true}
      disabled={disabled === true}
    >
      {leading}
      <NativeInputEl
        ref={ref}
        className="vida-input"
        // {...rest} first so the computed semantic/a11y props below WIN, while consumer extras (aria-describedby,
        // onFocus/onBlur, autoComplete, inputMode…) still pass through (N1, carried from Button).
        {...rest}
        size={size}
        id={id}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled === true}
        readOnly={readOnly === true}
        required={required === true}
        aria-invalid={invalid === true ? true : undefined}
        aria-required={required === true ? true : undefined}
        aria-readonly={readOnly === true ? true : undefined}
        onChange={(e) => {
          // Web-standard extraction [FACT: how-to-upgrade.mdx], RN-safe fallback.
          const native = e as unknown as { nativeEvent?: { text?: string } }
          onChangeText?.(e.target?.value ?? native.nativeEvent?.text ?? '')
        }}
      />
      {trailing}
    </InputFrame>
  )
})
