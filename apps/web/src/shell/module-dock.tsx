// UI-4 · S2 (LIF-89) — the module dock content (S2-BR-a,a2,b,c,d). Renders MODULE_MAP's `placement:'dock'` entries,
// grouped by ModuleGroup (declaration order), into the S1 frame's dock region. Three forms follow the dock state
// (from the breakpoint): drawer (mobile, icon+label) · rail (tablet, icon-only) · sidebar (desktop+, icon+label,
// collapsible to icon-only via `isSidebarOpen`). app-shell owns the region geometry; this owns the content.
import { useId } from 'react'
import { Text, View } from '@tamagui/core'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@vida/ui'
import { MODULE_MAP, type ModuleGroup, type ModuleNavEntry } from '../nav/module-map'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { isFeatureEnabled } from './feature-flags'
import { navIcon } from './nav-icons'
import { NavLink } from './nav-link'
import { type Breakpoint } from './breakpoints'
import { type DockState } from './regions'

// Display labels for the six dock groups (information-architecture.md §3). Presentation data — the module-map holds
// the group KEY; the human label is chrome's.
const GROUP_LABELS: Record<ModuleGroup, string> = {
  integration: 'Integration',
  productivity: 'Productivity',
  knowledge: 'Knowledge',
  'personal-growth': 'Personal Growth',
  'life-management': 'Life Management',
  'platform-services': 'Platform Services',
}

interface DockGroupModel {
  group: ModuleGroup
  label: string
  entries: ModuleNavEntry[]
}

/**
 * The visible dock groups in declaration order. Filters `placement:'dock'` by `isFeatureEnabled` FIRST, then groups —
 * so a group left with zero visible entries never appears (S2-BR-a2: no empty heading; e.g. `platform-services` has
 * only the hidden `gamification` in M1.0).
 */
function visibleDockGroups(): DockGroupModel[] {
  const order: ModuleGroup[] = []
  const byGroup = new Map<ModuleGroup, ModuleNavEntry[]>()
  for (const entry of MODULE_MAP) {
    if (entry.placement !== 'dock') continue
    if (entry.visibleWhen != null && !isFeatureEnabled(entry.visibleWhen)) continue // S2-BR-b fail-closed
    const existing = byGroup.get(entry.group)
    if (existing == null) {
      order.push(entry.group)
      byGroup.set(entry.group, [entry])
    } else {
      existing.push(entry)
    }
  }
  return order.map((group) => ({ group, label: GROUP_LABELS[group], entries: byGroup.get(group) ?? [] }))
}

export interface ModuleDockProps {
  /** The dock's responsive form (from `dockStateAt(bp)`). */
  dock: DockState
  /** The active breakpoint (documented contract; the form is derived from `dock`). */
  bp: Breakpoint
}

export function ModuleDock({ dock }: ModuleDockProps) {
  const isSidebarOpen = useAppShellUIStore((s) => s.isSidebarOpen)
  const toggleSidebar = useAppShellUIStore((s) => s.toggleSidebar)
  // Icon-only when the tablet rail OR a collapsed desktop sidebar (FOLD-1: collapsed desktop is dock==='sidebar' +
  // !isSidebarOpen — visually rail-like but NOT the tablet rail form).
  const iconOnly = dock === 'rail' || (dock === 'sidebar' && !isSidebarOpen)
  // The collapse toggle exists only on the desktop sidebar (both expanded and collapsed → it can always re-expand);
  // never on the tablet rail or mobile drawer (M4/FOLD-1).
  const showToggle = dock === 'sidebar'
  const groups = visibleDockGroups()

  return (
    <View flex={1} flexDirection="column" gap="$4" paddingVertical="$12" paddingHorizontal="$8">
      {showToggle ? (
        <View flexDirection="row" justifyContent={isSidebarOpen ? 'flex-end' : 'center'} paddingBottom="$8">
          <Button
            intent="ghost"
            size="sm"
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isSidebarOpen}
            onPress={toggleSidebar}
            leading={isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          />
        </View>
      ) : null}

      {groups.map((g) => (
        <NavGroup key={g.group} model={g} iconOnly={iconOnly} />
      ))}
    </View>
  )
}

/** One dock group: a labelled `role=group`. Full forms show a visible heading (aria-labelledby); the icon-only rail
 *  has no visible heading, so the group name rides `aria-label` instead (FOLD-2) — grouping stays announced. */
function NavGroup({ model, iconOnly }: { model: DockGroupModel; iconOnly: boolean }) {
  const headingId = useId()
  return (
    <View
      role="group"
      aria-labelledby={iconOnly ? undefined : headingId}
      aria-label={iconOnly ? model.label : undefined}
      flexDirection="column"
      gap="$2"
    >
      {!iconOnly ? (
        <Text
          id={headingId}
          fontFamily="$body"
          fontSize="$caption"
          color="$colorTextMuted"
          paddingHorizontal="$12"
          paddingVertical="$4"
        >
          {model.label}
        </Text>
      ) : null}
      {model.entries.map((entry) => (
        <NavLink
          key={entry.key}
          // dock entries always carry a routePath; `?? '/'` is a type-guard for the `string | null` shape (never hit).
          to={entry.routePath ?? '/'}
          label={entry.label}
          icon={navIcon(entry.key)}
          iconOnly={iconOnly}
        />
      ))}
    </View>
  )
}
