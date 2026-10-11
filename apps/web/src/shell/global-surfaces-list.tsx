// fe-shell-scope (#15) · S2 — the 6 GLOBAL_SURFACES as a LABELED vertical nav list for the expanded System-panel body
// (EC-4). The System panel is an `<aside>` landmark (shell-panel.tsx), so this carries its OWN labelled `<nav>` for
// screen-reader correctness (IR6). Route surfaces render as labeled NavLink rows (icon + label; aria-current + active
// fill via NavLink, EC-6); Search is a `<button>` row (icon + label + a ⌘K hint) — the ⌘K action, never a link (EC-3).
// Composes NavLink + the shell primitives — adds NO `@vida/ui` component (ui-4 BR-1). The scope selector sits ABOVE this
// list in the S3 assembly, not here.
import { styled, Text, View } from '@tamagui/core'
import { GLOBAL_SURFACES } from '../nav/module-map'
import { TOUCH_TARGET } from './breakpoints'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { navIcon } from './nav-icons'
import { NavLink } from './nav-link'

// The command-palette surface (routePath:null) is the Search action, never a link (EC-3).
const SEARCH_KEY = 'command-palette'

// IR6 — a real `<nav>` landmark inside the System `<aside>`. `render:'nav'` emits the element (the shell-panel.tsx
// `PanelNav` precedent; a runtime `tag` prop is NOT honoured).
const SurfacesNav = styled(View, { render: 'nav', flexDirection: 'column', gap: '$4' })

// The Search row — a real `<button>` (⌘K action, never a link, EC-3) that MIRRORS NavLink's row dimensions (≥44 touch
// target · $12 gutter · $md radius · hover fill) so it keeps the list's vertical rhythm. `color` is the resting text
// token so the lucide icon tints via `currentColor` (the button.tsx:110 Spinner precedent). `space-between` pushes the
// ⌘K hint to the trailing edge.
const SearchRow = styled(View, {
  render: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$8',
  minHeight: TOUCH_TARGET.minSize,
  paddingHorizontal: '$12',
  borderWidth: 0,
  borderRadius: '$md',
  backgroundColor: 'transparent',
  color: '$colorTextPrimary',
  cursor: 'pointer',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  // §VIII focus ring — 2px solid $colorFocusRing, 2px offset, :focus-visible only.
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})

export function GlobalSurfacesList() {
  const openCommandBar = useCommandBarUIStore((s) => s.open)

  return (
    <SurfacesNav aria-label="Global surfaces">
      {GLOBAL_SURFACES.map((s) => {
        if (s.key === SEARCH_KEY) {
          const Icon = navIcon(s.key)
          return (
            // Visible "Search" text IS the accessible name; the ⌘K hint is decoration (aria-hidden so it isn't announced).
            // `type="button"`: a raw render:'button' defaults to type="submit" (unlike @vida/ui Button) — explicit here.
            <SearchRow key={s.key} type="button" onPress={openCommandBar}>
              <View flexDirection="row" alignItems="center" gap="$8">
                <Icon size={20} aria-hidden="true" />
                <Text fontFamily="$body" fontSize="$small" color="$colorTextPrimary" textDecorationLine="none">
                  {s.label}
                </Text>
              </View>
              <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted" aria-hidden="true">
                ⌘K
              </Text>
            </SearchRow>
          )
        }
        return <NavLink key={s.key} to={s.routePath ?? '/'} label={s.label} icon={navIcon(s.key)} />
      })}
    </SurfacesNav>
  )
}
