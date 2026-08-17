// UI-4 · S2 (LIF-89) — the global bar content (S2-BR-a,e,g). Renders the six GLOBAL_SURFACES into the S1 frame's
// global-bar region, in two forms: `full` (tablet+) shows the Search launcher + the route surfaces; `condensed`
// (mobile) shows a hamburger (opens the dock drawer) + a search icon + an overflow Menu of the rest.
//
// The ⌘K seam (S2-BR-g): the Search action flips `commandBar.open()` (its owned store action); S3 renders the overlay
// that `isOpen` shows + owns the global keydown listener. S2 wires the trigger only.
import { Ellipsis, Menu as MenuIcon, Search } from 'lucide-react'
import { Button, Menu, type MenuItem } from '@vida/ui'
import { GLOBAL_SURFACES } from '../nav/module-map'
import { View } from '@tamagui/core'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { navIcon } from './nav-icons'
import { NavLink, useShellNavigate } from './nav-link'

// The command-palette surface (routePath:null) is the Search action, never a link (S2-BR-g).
const SEARCH_KEY = 'command-palette'

export interface GlobalBarProps {
  mode: 'condensed' | 'full'
  /** Opens the mobile off-canvas dock drawer (condensed form's hamburger). */
  onOpenMobileNav: () => void
}

export function GlobalBar({ mode, onOpenMobileNav }: GlobalBarProps) {
  const openCommandBar = useCommandBarUIStore((s) => s.open)
  const shellNavigate = useShellNavigate()

  // The route-backed surfaces (everything except the Search action). `routePath ?? '/'` type-guards the string|null.
  const routeSurfaces = GLOBAL_SURFACES.filter((s) => s.key !== SEARCH_KEY && s.routePath !== null)

  if (mode === 'condensed') {
    const overflowItems: MenuItem[] = routeSurfaces.map((s) => {
      const Icon = navIcon(s.key)
      return {
        id: s.key,
        label: s.label,
        leading: <Icon size={18} aria-hidden="true" />,
        onSelect: () => shellNavigate(s.routePath ?? '/'),
      }
    })
    return (
      <View flex={1} flexDirection="row" alignItems="center" gap="$8">
        <Button
          intent="ghost"
          size="sm"
          aria-label="Open navigation"
          onPress={onOpenMobileNav}
          leading={<MenuIcon size={20} />}
        />
        <View flex={1} />
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

  // full (tablet+)
  return (
    <View flex={1} flexDirection="row" alignItems="center" gap="$8">
      <View flex={1} />
      <Button intent="secondary" size="sm" onPress={openCommandBar} leading={<Search size={16} />}>
        Search
      </Button>
      {routeSurfaces.map((s) => (
        <NavLink key={s.key} to={s.routePath ?? '/'} label={s.label} icon={navIcon(s.key)} iconOnly />
      ))}
    </View>
  )
}
