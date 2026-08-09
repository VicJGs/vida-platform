import {
  forwardRef,
  type ComponentRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { styled, View, type GetProps } from '@tamagui/core'
import { ensureCardStyles } from '../internal/card-styles'

// UI-1 · Card (primitive 5/10, molecular) — implements ds-5-primitive-contracts/card.md against Tamagui v2.
// Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u5-card.md.
// - A static grouped surface. Renders a <div> (default render) — NEVER a native <button>, even when `interactive`:
//   the contract ref is HTMLDivElement (card.md:21) AND a native <button> can't legally contain the focusable
//   `actions`/`footer` controls. So an entirely-clickable card is a <div role="button"> + hand-handled keyboard.
// - name:'Card' scopes the light_/dark_Card sub-theme ($background/$border/$radius).
// - Elevation = the OPACITY of a raised-shadow overlay child (B12); resting shadow self-cancels in dark (its colour
//   IS the dark surface) so the border carries dark elevation (design §V). See internal/card-styles.ts. The dark
//   hover cue is an INSTANT `hoverStyle` border strengthen (a variant, not injected CSS — no `animation` prop on the
//   frame → not transitioned → B12-legal).
// - No `loading` prop: the contract's CardProps (card.md:10-20) authors none. The §VIII loading state is achieved by
//   composition (consumer renders a skeleton as `children` + passes `aria-busy`), exactly like `empty`. Matrix-vs-API
//   gap flagged for DS as DEF-U5-f. [[deliverable-is-the-doc-not-my-discretion]]

type Padding = 'compact' | 'default' | 'spacious'

const CardFrame = styled(View, {
  name: 'Card',
  flexDirection: 'column',
  position: 'relative',
  gap: '$12',
  borderWidth: 1,
  borderColor: '$border',
  // radius.card (lg) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$lg',
  backgroundColor: '$background',
  variants: {
    // Padding drives the $space scale, NOT the `card.padding` sub-theme token — one token can't express three
    // options, and Tamagui resolves space props against the space scale, not a theme sub-theme (button.tsx lesson;
    // u5-card.md §1.1 / DEF-U5-b). Values = the semantic space.inset.{compact,default,spacious} the token references.
    padding: {
      compact: { padding: '$8' },
      default: { padding: '$12' },
      spacious: { padding: '$24' },
    },
    // Passed `interactive && !disabled` by the wrapper. The button affordances: pointer cursor, an INSTANT hover
    // border strengthen (dark-elevation cue, B12 — no transition), and the :focus-visible ring (§VIII, pointer-
    // suppressed). A disabled interactive card is passed `false` here → no hover/focus affordance.
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: { borderColor: '$colorTextMuted' },
        focusVisibleStyle: {
          outlineColor: '$colorFocusRing',
          outlineWidth: 2,
          outlineStyle: 'solid',
          outlineOffset: 2,
        },
      },
    },
  } as const,
  defaultVariants: { padding: 'default' },
})

// Absolute overlay carrying the RAISED shadow at opacity 0 → 1 on hover/active (via .vida-card-elevation, B12).
// name:'Card' + borderRadius:'$radius' so the shadow follows the card's rounded shape.
const CardElevation = styled(View, {
  name: 'Card',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: '$lg', // match the frame (radius.card) so the raised shadow follows the rounded shape
  pointerEvents: 'none',
})

// Real <header>/<footer> landmark regions (render:'<tag>' = a semantic HTML element — Tamagui docs; checkbox.tsx
// render:'label' precedent). Header lays content left + actions top-right.
const CardHeader = styled(View, {
  name: 'Card',
  render: 'header',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '$8',
})

const CardFooter = styled(View, {
  name: 'Card',
  render: 'footer',
})

export interface CardProps extends Omit<GetProps<typeof CardFrame>, 'children'> {
  /** Slot rendered in the header bar (left). */
  header?: ReactNode
  /** Slot rendered as a `<footer>` region. */
  footer?: ReactNode
  /** Slot rendered top-right in the header bar (controls). */
  actions?: ReactNode
  /** Makes the whole card a single pressable target (adds `role=button` + keyboard). */
  interactive?: boolean
  /** Activation handler — only meaningful with `interactive`. Wired to click + Enter/Space. */
  onPress?: () => void
  /** Muted + not focusable — only meaningful with `interactive`. */
  disabled?: boolean
  /** Inset padding. Default 'default'. */
  padding?: Padding
  /** Card content (body). An empty-state or a loading skeleton is passed here by the consumer (§VIII empty/loading). */
  children: ReactNode
}

export const Card = forwardRef<ComponentRef<typeof CardFrame>, CardProps>(function Card(
  { header, footer, actions, interactive = false, onPress, disabled = false, padding = 'default', children, ...rest },
  ref,
) {
  // Dev-time contract guards (NODE_ENV-replaced by the bundler → dead-code-eliminated in prod, per button.tsx).
  if (process.env.NODE_ENV !== 'production') {
    const r = rest as Record<string, unknown>
    if (!interactive && (onPress != null || disabled)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Card: `onPress`/`disabled` only apply when `interactive` — set `interactive` or remove them.',
      )
    }
    if (interactive) {
      const hasName =
        (header != null && header !== '') ||
        (children != null && children !== '') ||
        r['aria-label'] != null ||
        r['aria-labelledby'] != null
      if (!hasName) {
        // eslint-disable-next-line no-console
        console.warn(
          '[vida/ui] Card: an interactive card needs an accessible name (text content or `aria-label`).',
        )
      }
    }
  }

  ensureCardStyles()

  const active = interactive && !disabled
  // role=button is driven by the RAW `interactive` (kept even when disabled, just aria-disabled + out of tab order);
  // the VISUAL `interactive` variant is gated to `active` so a disabled card gains no hover/focus affordance.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      if (e.repeat) return // Enter would native-repeat while held — guard (u5-card.md §2.1)
      e.preventDefault()
      onPress?.()
    } else if (e.key === ' ') {
      e.preventDefault() // block page scroll on keydown; Space activates on keyUp (role=button contract)
    }
  }
  const handleKeyUp = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ') {
      e.preventDefault()
      onPress?.()
    }
  }
  // Nested actions/footer controls activate independently — stop their events reaching the card's onClick/onKeyDown.
  const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation()

  const baseClass = active ? 'vida-card vida-card-interactive' : 'vida-card'
  const className = [baseClass, (rest as { className?: string }).className].filter(Boolean).join(' ')

  return (
    <CardFrame
      ref={ref}
      {...rest}
      // Computed props AFTER {...rest} so a11y/state wins (N1); className merged so a consumer className is preserved.
      className={className}
      role={interactive ? 'button' : 'group'}
      tabIndex={interactive ? (disabled ? -1 : 0) : undefined}
      aria-disabled={interactive && disabled ? true : undefined}
      padding={padding}
      interactive={active}
      opacity={interactive && disabled ? 0.5 : 1}
      onClick={active ? onPress : undefined}
      onKeyDown={active ? handleKeyDown : undefined}
      onKeyUp={active ? handleKeyUp : undefined}
    >
      {/* Elevation overlay — raised shadow, opacity 0→1 on hover/active (card-styles.ts). Behind content (first child). */}
      <CardElevation className="vida-card-elevation" aria-hidden />

      {(header != null || actions != null) && (
        <CardHeader>
          <View flex={1}>{header}</View>
          {actions != null && (
            <View flexDirection="row" alignItems="center" gap="$8" onClick={stop} onKeyDown={stop}>
              {actions}
            </View>
          )}
        </CardHeader>
      )}

      <View>{children}</View>

      {footer != null && (
        <CardFooter onClick={stop} onKeyDown={stop}>
          {footer}
        </CardFooter>
      )}
    </CardFrame>
  )
})
