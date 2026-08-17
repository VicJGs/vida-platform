// UI-4 · S2 (LIF-89) — the shell nav link (S2-BR-d,e,h,j). A REAL SPA anchor: TanStack `createLink` wraps a Tamagui
// `<a>` so the link keeps SPA navigation + preload while carrying DS-token styling (focus ring, hover, active), and
// the icon tints via `currentColor` off the anchor's own `color` token (the button.tsx:110 Spinner precedent).
//
// Route targets tolerate UNBUILT routes (BR-4 degrade-never-crash): only `/` + `/notes` are registered today
// (routes.tsx); a dock/global item to an unregistered path SPA-navigates and the router renders its
// `NotFoundComponent`. TanStack's `to` is typed to registered routes only, so the widening to a plain string is
// confined to ONE boundary — the `to as ShellRoute` cast below (and the twin `shellNavigate` for imperative nav).
// NEVER `href` — TanStack treats `<Link href>` as an EXTERNAL target (full page reload), which would break SPA nav.
import { type ReactNode } from 'react'
import { createLink, useNavigate, useRouterState } from '@tanstack/react-router'
import { styled, Text, View } from '@tamagui/core'
import { type LucideIcon } from 'lucide-react'
import { TOUCH_TARGET } from './breakpoints'

/** The single widening for navigating to a not-yet-registered route path (see the file header). */
type ShellRoute = never

// A Tamagui anchor — DS tokens only. `color` (a text-colour prop set on the <a> View) is inherited by the icon SVG's
// `stroke="currentColor"` (BR-2 theme-crossing tint). Focus ring / hover / active are Tamagui styles (never injected
// CSS), so they resolve the real `$colorFocusRing`/`$colorSurfaceSecondary`/`$colorBrandPrimary` tokens.
const NavAnchor = styled(View, {
  render: 'a',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  minHeight: TOUCH_TARGET.minSize, // ≥44px touch target at all widths (shell-layout.md:87)
  paddingHorizontal: '$12',
  borderRadius: '$md',
  cursor: 'pointer',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  variants: {
    // Current route (aria-current) — a resting fill, distinct from hover. Instant state swap (no colour animation, B12).
    active: { true: { backgroundColor: '$colorSurfaceSecondary' } },
    // Icon-only (rail form): square ≥44 target, no label; the accessible name comes from aria-label.
    iconOnly: { true: { justifyContent: 'center', paddingHorizontal: 0, minWidth: TOUCH_TARGET.minSize } },
  } as const,
})

const NavAnchorLink = createLink(NavAnchor)

export interface NavLinkProps {
  /** The destination route path (from MODULE_MAP/GLOBAL_SURFACES). May be an unregistered route → degrades to NotFound. */
  to: string
  /** The accessible name — visible label, or the `aria-label` when `iconOnly`. */
  label: string
  /** Leading glyph (lucide). Tints via `currentColor` from the anchor's `color` token. */
  icon?: LucideIcon
  /** Rail form: render the icon only; `label` becomes the `aria-label`. */
  iconOnly?: boolean
  children?: ReactNode
}

/** A DS-styled SPA nav link with exact-match `aria-current` and theme-tinted icon. */
export function NavLink({ to, label, icon: Icon, iconOnly, children }: NavLinkProps) {
  // Exact pathname match (FOLD-3) — `/` must NOT light up every route. Works for unregistered targets too (it is a
  // plain string compare, independent of the registered route union).
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const active = pathname === to
  const color = active ? '$colorBrandPrimary' : '$colorTextPrimary'

  return (
    <NavAnchorLink
      // §XV: the ONE documented widening — TanStack `to` is typed to registered routes; nav to unbuilt routes degrades
      // to NotFoundComponent (BR-4). Not `any`; SPA only (never `href`).
      to={to as ShellRoute}
      color={color}
      active={active || undefined}
      iconOnly={iconOnly || undefined}
      aria-current={active ? 'page' : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      {Icon != null ? <Icon size={20} aria-hidden="true" /> : null}
      {!iconOnly ? (
        // textDecorationLine='none' on the label (a Text) overrides the anchor's inherited underline — set here, not
        // on the View-based <a> where Tamagui doesn't map it (it would leak as a DOM attribute).
        <Text color={color} fontFamily="$body" fontSize="$small" numberOfLines={1} textDecorationLine="none">
          {label}
        </Text>
      ) : null}
      {children}
    </NavAnchorLink>
  )
}

/**
 * Imperative navigation for surfaces that cannot render a link (the global-bar overflow `Menu` — `MenuItem` has an
 * `onSelect` only, no link slot). Shares the SAME `ShellRoute` widening as {@link NavLink} — one abstraction, not a
 * scattered cast. Returns a `(path) => void` navigator (SPA; degrades to NotFound for unbuilt routes).
 */
export function useShellNavigate(): (to: string) => void {
  const navigate = useNavigate()
  return (to: string) => {
    void navigate({ to: to as ShellRoute })
  }
}
