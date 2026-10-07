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
//
// fe-codec-primitives-refinement · P2 (LIF-230) — aesthetic refinement + alive-hooks, all PRESENTATIONAL:
//  · BR-C-11 landmark fix: `header`/`footer` are plain <div> regions, NOT <header>/<footer> — a <header> nested in the
//    <div> frame is exposed as a banner/contentinfo LANDMARK (duplicated N× in a list row). card.md:6 Intent ("NOT a
//    page section landmark by default") governs the :45 mechanism; a descoped <header> had no AT value. Frame stays a
//    <div> → the HTMLDivElement ref contract (card.md:21 / u5-card.md:82-83) is preserved.
//  · `status` (neutral|calm|warm|faded): an entity-state signal. calm/warm = a 3px left ACCENT bar (an absolute
//    StatusEdge child — NOT borderLeftWidth, which fights the 1px border + radius per toast.tsx:133-135; NOT frame
//    overflow:hidden, which would clip CardElevation's raised shadow). faded = a dimmed frame (disabled's 0.5 wins if
//    both). Edge is aria-hidden/decorative; the state meaning lives in content. Signal tokens are preset-invariant.
//  · `metric` slot: a non-interactive glanceable readout (e.g. a progress ring), top-right of the header, before actions.
//  · `headerDivider`: an optional hairline under the header bar.
//  · softer resting elevation = the 2-layer `shadow.resting` token (primitive.json; Card is its sole consumer).

type Padding = 'compact' | 'default' | 'spacious'
type Status = 'neutral' | 'calm' | 'warm' | 'faded'

const CardFrame = styled(View, {
  name: 'Card',
  flexDirection: 'column',
  position: 'relative',
  gap: '$12',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  // radius.card (lg) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$lg',
  backgroundColor: '$colorSurfacePrimary',
  variants: {
    // Inset padding drives the $space scale, NOT the `card.padding` sub-theme token — one token can't express three
    // options, and Tamagui resolves space props against the space scale, not a theme sub-theme (button.tsx lesson;
    // u5-card.md §1.1 / DEF-U5-b). Values = the semantic space.inset.{compact,default,spacious} the token references.
    // DEF-U5-h (P2 bug-fix): the variant key is `pad`, NOT `padding` — a variant named `padding` COLLIDES with
    // Tamagui's built-in `padding` style prop, so `padding="default"` was applied as an invalid CSS value → 0px inset
    // (the shipped Card rendered with NO padding; every card's content sat flush-left — latent until the status edge
    // exposed it by clipping). The public prop stays `padding` (contract), mapped to `pad` in the component.
    pad: {
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
  defaultVariants: { pad: 'default' },
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

// BR-C-7c — the `status` accent: an absolute 3px LEFT bar (calm/warm). NOT borderLeftWidth (toast.tsx:133-135: a
// border-left fights Card's 1px border + $lg radius) and NOT via frame overflow:hidden (would clip CardElevation's
// raised box-shadow). Left corners radiused to follow the card corner; aria-hidden + pointerEvents:none. Being a
// separate element, it is immune to the interactive hover border-strengthen (card.tsx hoverStyle) — hover can't
// clobber the status colour. Signal tokens are preset-invariant (the SyncStatus precedent). Only rendered calm/warm.
const StatusEdge = styled(View, {
  name: 'Card',
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 3,
  borderTopLeftRadius: '$lg',
  borderBottomLeftRadius: '$lg',
  pointerEvents: 'none',
  variants: {
    tone: {
      calm: { backgroundColor: '$colorSignalSuccess' },
      warm: { backgroundColor: '$colorSignalDanger' },
    },
  } as const,
})

// BR-C-11 — header/footer are plain <div> regions (NO render:'header'/'footer'). A real <header>/<footer> nested in
// the <div> frame is exposed as a banner/contentinfo LANDMARK (duplicated N× in a list); card.md:6 Intent forbids it.
// Header lays content left + metric/actions top-right. `divider` adds the optional hairline rule (BR-C-6).
const CardHeader = styled(View, {
  name: 'Card',
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '$8',
  variants: {
    divider: {
      true: { borderBottomWidth: 1, borderBottomColor: '$colorBorderDefault', paddingBottom: '$8' },
    },
  } as const,
})

const CardFooter = styled(View, { name: 'Card' })

export interface CardProps extends Omit<GetProps<typeof CardFrame>, 'children' | 'pad'> {
  /** Slot rendered in the header bar (left). */
  header?: ReactNode
  /** Slot rendered as a footer region (a plain <div>, never a <footer> landmark — BR-C-11). */
  footer?: ReactNode
  /** Slot rendered top-right in the header bar (interactive controls). */
  actions?: ReactNode
  /** Non-interactive glanceable readout (e.g. a progress ring), top-right of the header, before `actions` (BR-C-8). */
  metric?: ReactNode
  /** Entity-state signal: `calm`/`warm` = a left accent bar; `faded` = a dimmed frame. Default 'neutral' (BR-C-7). */
  status?: Status
  /** Hairline rule under the header bar. Default false (BR-C-6). */
  headerDivider?: boolean
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
  {
    header,
    footer,
    actions,
    metric,
    status = 'neutral',
    headerDivider = false,
    interactive = false,
    onPress,
    disabled = false,
    padding = 'default',
    children,
    ...rest
  },
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
  const showEdge = status === 'calm' || status === 'warm'
  const faded = status === 'faded'
  // BR-C-7a (Gate-proven): a blanket frame opacity drops the muted/meta text below AA (opacity composites the whole
  // subtree over the page; measured 2.4–2.6, axe-confirmed). So faded "dims the CHROME, holds the TEXT": a recessed
  // surface + FLAT (no resting elevation, `vida-card-flat`), with text + its surface-contrast UNCHANGED → text AA is the
  // baseline (guaranteed). disabled stays WCAG-1.4.3-exempt at 0.5 (BR-C-7b precedence: disabled wins if both).
  const frameOpacity = interactive && disabled ? 0.5 : 1
  const showHeader = header != null || actions != null || metric != null
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

  // faded is FLAT (recessed/dormant) — vida-card-flat suppresses the resting elevation (card-styles.ts). Text held.
  const baseClass = [active ? 'vida-card vida-card-interactive' : 'vida-card', faded ? 'vida-card-flat' : null]
    .filter(Boolean)
    .join(' ')
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
      pad={padding}
      interactive={active}
      // faded recesses the surface (chrome dim); text + its contrast are untouched (BR-C-7a). Conditional spread so a
      // NON-faded card never pins backgroundColor — a consumer's `backgroundColor` (via {...rest}) + the styled default
      // ($colorSurfacePrimary) both survive (an unconditional override after {...rest} clobbered them — review BLOCKER).
      {...(faded ? { backgroundColor: '$colorSurfaceSecondary' as const } : null)}
      opacity={frameOpacity}
      onClick={active ? onPress : undefined}
      onKeyDown={active ? handleKeyDown : undefined}
      onKeyUp={active ? handleKeyUp : undefined}
    >
      {/* Elevation overlay — raised shadow, opacity 0→1 on hover/active (card-styles.ts). Behind content (first child). */}
      <CardElevation className="vida-card-elevation" aria-hidden />

      {/* Status accent bar (calm/warm) — decorative; the state meaning lives in content. */}
      {showEdge && <StatusEdge className="vida-card-edge" aria-hidden tone={status === 'calm' ? 'calm' : 'warm'} />}

      {showHeader && (
        <CardHeader divider={headerDivider}>
          <View flex={1}>{header}</View>
          {(metric != null || actions != null) && (
            <View flexDirection="row" alignItems="center" gap="$8">
              {/* metric = a non-interactive readout (no stopPropagation needed); rendered BEFORE actions (BR-C-8). */}
              {metric != null && <View>{metric}</View>}
              {actions != null && (
                <View flexDirection="row" alignItems="center" gap="$8" onClick={stop} onKeyDown={stop}>
                  {actions}
                </View>
              )}
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
