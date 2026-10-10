// fe-shell-scope (#15) · S2 — the 6 GLOBAL_SURFACES in Bar 1's TOP-STRIP form, in two modes (EC-3):
//   • `full` (≥768)      = the Search launcher + the route surfaces as icon-nav.
//   • `condensed` (≤375) = a Search icon + an overflow Menu of the route surfaces.
// Supersedes the shipped `global-bar.tsx` (shape reference). The one refinement: Bar 1 NO LONGER owns the hamburger —
// the app-shell (#14) owns the panel toggles, so the condensed form is Search + overflow only.
//
// Mode is a PROP, not self-resolved: the parent (S3 `global-bar-1` / app-shell `useMedia` + the test override) owns the
// ONE responsive truth, so this stays a pure function of its inputs (deterministic to test). Composes NavLink + Button +
// Menu — adds NO `@vida/ui` component (ui-4 BR-1). Search is the ⌘K action, never a link (EC-3): it flips
// `commandBar.open()`; the overlay + the global keydown listener are owned downstream (S3).
import { Ellipsis, Search } from 'lucide-react'
import { View } from '@tamagui/core'
import { Button, Menu, type MenuItem } from '@vida/ui'
import { GLOBAL_SURFACES } from '../nav/module-map'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { navIcon } from './nav-icons'
import { NavLink, useShellNavigate } from './nav-link'

// The command-palette surface (routePath:null) is the Search action, never a link (EC-3).
const SEARCH_KEY = 'command-palette'
// The route-backed surfaces (all six minus Search). Every one has a non-null routePath (`?? '/'` type-guards it).
const ROUTE_SURFACES = GLOBAL_SURFACES.filter((s) => s.key !== SEARCH_KEY)

export interface GlobalSurfacesStripProps {
  /** `full` (≥768) = Search launcher + icon-nav; `condensed` (≤375) = Search icon + overflow Menu. Parent-resolved. */
  mode: 'condensed' | 'full'
}

export function GlobalSurfacesStrip({ mode }: GlobalSurfacesStripProps) {
  const openCommandBar = useCommandBarUIStore((s) => s.open)
  const shellNavigate = useShellNavigate()

  if (mode === 'condensed') {
    // Overflow Menu — `MenuItem` has an `onSelect` only (no link slot), so route via the shared imperative navigator.
    const overflowItems: MenuItem[] = ROUTE_SURFACES.map((s) => {
      const Icon = navIcon(s.key)
      return {
        id: s.key,
        label: s.label,
        leading: <Icon size={18} aria-hidden="true" />,
        onSelect: () => shellNavigate(s.routePath ?? '/'),
      }
    })
    return (
      <View flexDirection="row" alignItems="center" gap="$8">
        <Button intent="ghost" size="sm" aria-label="Search" onPress={openCommandBar} leading={<Search size={20} />} />
        <Menu
          trigger={<Button intent="ghost" size="sm" aria-label="More" leading={<Ellipsis size={20} />} />}
          items={overflowItems}
          aria-label="More surfaces"
          placement="bottom-end"
        />
      </View>
    )
  }

  // full (≥768) — the Search launcher + the route surfaces as icon-nav (aria-current + brand tint via NavLink, EC-6).
  return (
    <View flexDirection="row" alignItems="center" gap="$8">
      <Button intent="secondary" size="sm" onPress={openCommandBar} leading={<Search size={16} />}>
        Search
      </Button>
      {ROUTE_SURFACES.map((s) => (
        <NavLink key={s.key} to={s.routePath ?? '/'} label={s.label} icon={navIcon(s.key)} iconOnly />
      ))}
    </View>
  )
}
