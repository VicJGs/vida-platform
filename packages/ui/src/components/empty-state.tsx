import { forwardRef, useId, type ComponentRef, type ReactNode } from 'react'
import { styled, Text, View, type GetProps } from '@tamagui/core'

// fe-codec-patterns · S3 — EmptyState (the CODEC teaching-invitation empty state).
// Reconcile: docs/specs/foundation/fe-codec-patterns/s3-empty-state.md · interpretation R3 · state-conventions.md:81.
//
// A PRESENTATIONAL teaching empty state a surface drops into its data-view `empty?` slot (richer than the default muted
// `internal/data-view` Message) or renders standalone. The P5 anatomy (p5-discover-own-specimen.html:159-166): an
// honest invitation — say what it is, teach how to fill it, offer the way in — NEVER "No data available." (BR-S3-1).
//
// - Composition over config (§VII, BR-S3-2): variable content = SLOTS (icon · children · action · guidedSetup), never
//   booleans/enums. `action` holds one or more ui-1 Buttons (the specimen's primary + ghost).
// - Non-interactive: the §VIII 8-state matrix applies to the composed Buttons, not to EmptyState itself.
// - a11y (BR-S3-5): the frame is a `role="group"` NAMED by its title (aria-labelledby); the title is ALSO a heading
//   (role="heading" + aria-level, default 2, `titleLevel`-overridable — SR heading-navigation without a native <hN>
//   that would pollute the outline at an arbitrary depth); the icon is decorative (aria-hidden). It does NOT self-wrap
//   in role="status" — the data-view owns that live region; standalone use is static page content.
// - Tokens only (BR-S3-4): direct semantic tokens ($colorText*) inherit the active preset at component scope (B-codec-6);
//   fontSize role keys are the real ones ($display/$heading/$body/$small/$caption — there is no $subheading).
// - name:'EmptyState' scopes any future light_/dark_EmptyState sub-theme (none needed — all keys are direct semantics).

const EmptyFrame = styled(View, {
  name: 'EmptyState',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '$12',
  paddingVertical: '$24',
  paddingHorizontal: '$12',
  width: '100%',
})

// Decorative art — the glyph/icon the consumer passes. aria-hidden on the wrapper (the title carries the meaning).
const EmptyArt = styled(View, {
  name: 'EmptyState',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.6, // the P5 "art" is a quiet mark, not a focal point
})

const EmptyTitle = styled(Text, {
  name: 'EmptyState',
  fontFamily: '$display', // the editorial headline family (swaps per preset via the S2 font-var seam)
  fontSize: '$heading',
  color: '$colorTextPrimary',
  textAlign: 'center',
})

const EmptyBody = styled(Text, {
  name: 'EmptyState',
  fontFamily: '$body',
  fontSize: '$body',
  color: '$colorTextMuted',
  textAlign: 'center',
  maxWidth: '60ch', // the 45–75ch readable measure (typography §III)
})

const EmptyGuided = styled(Text, {
  name: 'EmptyState',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
  textAlign: 'center',
})

export interface EmptyStateProps extends Omit<GetProps<typeof EmptyFrame>, 'children'> {
  /** The headline — "what this is" (sentence-case, VoiceCopy). A string so it can name the group (aria-labelledby). */
  title: string
  /** aria-level for the title heading. Default 2; override per placement depth so the document outline stays correct. */
  titleLevel?: number
  /** Optional art/glyph — decorative (rendered aria-hidden). */
  icon?: ReactNode
  /** Teaching body — why it's empty / how to fill it. "Nothing's required." */
  children?: ReactNode
  /** The primary way(s) in — a slot for one or more ui-1 Buttons. */
  action?: ReactNode
  /** Optional opt-in guided-setup — secondary, never a wall. */
  guidedSetup?: ReactNode
}

export const EmptyState = forwardRef<ComponentRef<typeof EmptyFrame>, EmptyStateProps>(function EmptyState(
  { title, titleLevel = 2, icon, children, action, guidedSetup, ...rest },
  ref,
) {
  // Dev-time contract guard (DCE'd in prod, per card.tsx): the title IS the accessible name + teaching headline.
  if (process.env.NODE_ENV !== 'production' && title.trim() === '') {
    console.warn('[vida/ui] EmptyState: `title` is required — it names the region and teaches what lives here.')
  }

  const titleId = useId()

  return (
    // role/aria-labelledby AFTER {...rest} so the a11y contract wins over a stray consumer prop (the Card N1 precedent).
    <EmptyFrame ref={ref} {...rest} role="group" aria-labelledby={titleId}>
      {icon != null && <EmptyArt aria-hidden>{icon}</EmptyArt>}
      <EmptyTitle id={titleId} role="heading" aria-level={titleLevel}>
        {title}
      </EmptyTitle>
      {children != null && <EmptyBody>{children}</EmptyBody>}
      {action != null && (
        <View flexDirection="row" flexWrap="wrap" alignItems="center" justifyContent="center" gap="$8">
          {action}
        </View>
      )}
      {guidedSetup != null && <EmptyGuided>{guidedSetup}</EmptyGuided>}
    </EmptyFrame>
  )
})
