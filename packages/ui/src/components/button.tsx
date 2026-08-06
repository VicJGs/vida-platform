import { forwardRef, type ComponentRef, type ReactNode } from 'react'
import { styled, Text, View, type GetProps } from '@tamagui/core'
import { useReducedMotion } from '../hooks/use-reduced-motion'
import { ensureInteractionStyles } from '../internal/interaction-styles'

// UI-1 · Button (primitive 1/10) — implements ds-5-primitive-contracts/button.md against Tamagui v2.
// Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u1-button.md.
// - name:'Button' auto-applies the light_Button/dark_Button sub-themes ($backgroundPrimary, $textPrimary…).
// - render:'button' → a real <button> (native Enter/Space, type, form submit, role). (v2 renamed tag→render.)
// - hover/press overlay = a child whose opacity transitions via CSS descendant-hover (interaction-styles.ts),
//   NOT Tamagui `group` — `group` sets container-type:inline-size which collapses content-based width.
//   [[tamagui-group-breaks-content-width]]
// - B12: the intent FILL is an instant state swap; only the overlay's OPACITY transitions (never background/color).

type Intent = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const ButtonFrame = styled(View, {
  name: 'Button',
  render: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  borderWidth: 0,
  borderRadius: '$radius',
  cursor: 'pointer',
  userSelect: 'none',
  // §VIII focus ring — 2px solid $colorFocusRing, 2px offset, :focus-visible only (never suppressed).
  focusVisibleStyle: {
    outlineColor: '$colorFocusRing',
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  // NB: no `disabledStyle` — Tamagui applies it on `aria-disabled` too, which would dim the LOADING button
  // (loading sets aria-disabled but must keep its full fill). The disabled dim is applied manually in the
  // wrapper, keyed only to the real `disabled` prop.
  variants: {
    intent: {
      primary: { backgroundColor: '$backgroundPrimary' },
      secondary: {
        backgroundColor: '$backgroundSecondary',
        borderWidth: 1,
        borderColor: '$borderSecondary',
      },
      // ghost: transparent fill; hover fills surface.secondary (button.md:61) — a state swap, not animated.
      ghost: {
        backgroundColor: 'transparent',
        hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
      },
      danger: { backgroundColor: '$backgroundDanger' },
    },
    // Tokens only: height ← $size scale; horizontal padding ← $space scale. NB: the button.padding COMPONENT
    // token can't drive paddingHorizontal — Tamagui resolves space props against the space token scale, not the
    // theme sub-theme (verified: `$padding` here rendered 0px). Space tokens 12/16/20 are on-scale.
    size: {
      sm: { height: '$32', paddingHorizontal: '$12' },
      md: { height: '$40', paddingHorizontal: '$16' },
      lg: { height: '$48', paddingHorizontal: '$20' },
    },
  } as const,
  defaultVariants: { intent: 'primary', size: 'md' },
})

const ButtonText = styled(Text, {
  name: 'Button',
  fontFamily: '$body',
  fontWeight: '600',
  userSelect: 'none',
  // Text color is intent-driven — light_Button has no generic `color`, only text<Intent> keys (themes.ts).
  variants: {
    intent: {
      primary: { color: '$textPrimary' },
      secondary: { color: '$textSecondary' },
      ghost: { color: '$textGhost' },
      danger: { color: '$textDanger' },
    },
    // On the DS-2 type scale (fonts.ts): caption 12 · small 14 · body 16.
    size: {
      sm: { fontSize: '$caption' },
      md: { fontSize: '$small' },
      lg: { fontSize: '$body' },
    },
  } as const,
  defaultVariants: { intent: 'primary', size: 'md' },
})

const TEXT_TOKEN: Record<Intent, string> = {
  primary: '$textPrimary',
  secondary: '$textSecondary',
  ghost: '$textGhost',
  danger: '$textDanger',
}

/** Inline SVG spinner (no spinner primitive exists yet). Static arc when reduced-motion (motion.md §Reduced). */
function Spinner({ intent, reduced }: { intent: Intent; reduced: boolean }) {
  return (
    <View
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
      color={TEXT_TOKEN[intent]}
    >
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          {!reduced && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 12 12"
              to="360 12 12"
              dur="0.8s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </svg>
    </View>
  )
}

export interface ButtonProps extends Omit<GetProps<typeof ButtonFrame>, 'children'> {
  /** Emphasis level — semantic (§VII). Default 'primary'. */
  intent?: Intent
  /** Control size. Default 'md'. */
  size?: Size
  /** Non-interactive + muted; removed from tab order (native `disabled`). */
  disabled?: boolean
  /** Spinner shown, activation suppressed, width held, `aria-busy`. */
  loading?: boolean
  /** Stretch to the container inline size. */
  fullWidth?: boolean
  /** Slot before the label (icon). */
  leading?: ReactNode
  /** Slot after the label (icon). */
  trailing?: ReactNode
  /** Native button semantics for forms. Default 'button'. */
  type?: 'button' | 'submit' | 'reset'
  /** Activation handler (Tamagui universal press — pointer + keyboard). */
  onPress?: () => void
  children?: ReactNode
}

export const Button = forwardRef<ComponentRef<typeof ButtonFrame>, ButtonProps>(function Button(
  {
    intent = 'primary',
    size = 'md',
    disabled,
    loading,
    fullWidth,
    leading,
    trailing,
    type = 'button',
    onPress,
    children,
    ...rest
  },
  ref,
) {
  // Icon-only requires aria-label — contract-enforced as a dev-time assertion (button.md:85), not a type union.
  // `process.env.NODE_ENV` is bundler-replaced (Vite/Storybook define) → the block dead-code-eliminates in prod.
  if (process.env.NODE_ENV !== 'production') {
    const hasText = children != null && children !== ''
    const ariaLabel = (rest as Record<string, unknown>)['aria-label']
    if (!hasText && (leading != null || trailing != null) && ariaLabel == null) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Button: an icon-only button requires an `aria-label` for accessibility.',
      )
    }
  }

  const reduced = useReducedMotion()
  ensureInteractionStyles()

  // Loading ≠ disabled (button.md:51-52,86): a busy button stays focusable + in the a11y tree so it announces
  // "{name}, busy" (aria-busy + aria-disabled). Native `disabled` is reserved for the real `disabled` prop
  // (removes from tab order). Activation is suppressed for BOTH via the onPress guard + forcing type='button'
  // while loading (blocks native form submit). `{...rest}` is spread FIRST so computed a11y props win (N1).
  return (
    <ButtonFrame
      ref={ref}
      className="vida-interactive"
      {...rest}
      intent={intent}
      size={size}
      disabled={disabled === true}
      aria-busy={loading === true ? true : undefined}
      aria-disabled={loading === true ? true : undefined}
      type={loading === true ? 'button' : type}
      width={fullWidth === true ? '100%' : undefined}
      opacity={disabled === true ? 0.5 : 1}
      cursor={disabled === true ? 'not-allowed' : 'pointer'}
      onPress={disabled === true || loading === true ? undefined : onPress}
    >
      {/* Hover/press overlay — opacity driven by CSS descendant-hover (interaction-styles.ts), NOT `group`
          (which sets container-type:inline-size and collapses width). B12: only opacity transitions. */}
      <View
        className="vida-overlay"
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        borderRadius="$radius"
        backgroundColor="$colorTextPrimary"
        opacity={0}
        pointerEvents="none"
      />

      {/* Content — kept in flow at opacity 0 while loading so the button holds its exact width (no shift). */}
      <View flexDirection="row" alignItems="center" gap="$8" opacity={loading === true ? 0 : 1}>
        {leading}
        {children != null && (
          <ButtonText intent={intent} size={size}>
            {children}
          </ButtonText>
        )}
        {trailing}
      </View>

      {loading === true && <Spinner intent={intent} reduced={reduced} />}
    </ButtonFrame>
  )
})
