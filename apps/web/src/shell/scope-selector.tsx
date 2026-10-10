// fe-shell-scope (#15) · S1 — the `Spaces:` scope selector. A persistent Bar-1 control (EC-1) that shows the active
// global scope and switches it. Composes @vida/ui `Menu` + `Button` (adds NO @vida/ui component — ui-4 BR-1); reads the
// space list through the `SpacesScopeRead` provider seam via React Query (the ProviderRead convention); reads/writes the
// active scope via the ephemeral `useScopeStore`.
//
// DEGRADE, NEVER CRASH (EC-2): the space-list read has four shapes —
//   populated → a Menu (All + each Space)   loading → a busy trigger
//   empty []  → global-only (disabled "Spaces: All")   error → a calm role=status fallback, still global-usable
// M1.0 ships the stub (→ []), so the resting state is global-only; the live provider swaps in at the first consumer.
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Globe } from 'lucide-react'
import { Text, View } from '@tamagui/core'
import { Button, Menu, type MenuItem } from '@vida/ui'
import { FALLBACK_ICON, navIcon } from './nav-icons'
import { type SpaceOption, type SpacesScopeRead, stubSpacesScope } from './spaces-scope'
import { useScopeStore } from '../stores/scope-store'

const ALL_LABEL = 'All'

export interface ScopeSelectorProps {
  /** The space-list read seam. Default = the M1 stub (→ [] ⇒ global-only). Live provider swaps here at first consumer. */
  read?: SpacesScopeRead
}

/** Icon for a Space row: its `icon` key via navIcon(), else the neutral fallback. */
function spaceIcon(opt: SpaceOption) {
  const Icon = opt.icon ? navIcon(opt.icon) : FALLBACK_ICON
  return <Icon size={16} aria-hidden="true" />
}

export function ScopeSelector({ read = stubSpacesScope }: ScopeSelectorProps) {
  const { data: spaces, isLoading, isError } = useQuery({ queryKey: ['spaces', 'scope-list'], queryFn: read })
  const activeSpaceId = useScopeStore((s) => s.activeSpaceId)
  const setScope = useScopeStore((s) => s.setScope)

  // Active label: global ⇒ "All"; a set id ⇒ its name, degrading to "All" if the list can't resolve it (error/stale).
  const activeName =
    activeSpaceId === null ? ALL_LABEL : (spaces?.find((s) => s.id === activeSpaceId)?.name ?? ALL_LABEL)

  // Loading — a busy trigger (holds width, aria-busy via Button `loading`).
  if (isLoading) {
    return (
      <Button intent="secondary" size="sm" loading aria-label="Loading spaces">
        {`Spaces: ${ALL_LABEL}`}
      </Button>
    )
  }

  // Error — calm, still global-usable. role=status announces the degrade; scope stays global ("All").
  if (isError) {
    return (
      <View role="status" flexDirection="row" alignItems="center" gap="$4">
        <Button intent="secondary" size="sm" disabled aria-label="Scope: All (spaces unavailable)">
          {`Spaces: ${ALL_LABEL}`}
        </Button>
        <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted">
          offline
        </Text>
      </View>
    )
  }

  // Empty — no Spaces yet ⇒ global-only. A disabled trigger (nothing to switch to) that still reads "All".
  if (!spaces || spaces.length === 0) {
    return (
      <Button intent="secondary" size="sm" disabled aria-label="Scope: All (no spaces yet)">
        {`Spaces: ${ALL_LABEL}`}
      </Button>
    )
  }

  // Populated — a Menu: "All" (global) + each Space. Selecting sets the scope (emit-to-seam).
  const items: MenuItem[] = [
    {
      id: '__all__',
      label: ALL_LABEL,
      leading: <Globe size={16} aria-hidden="true" />,
      onSelect: () => setScope(null),
    },
    ...spaces.map((s) => ({
      id: s.id,
      label: s.name,
      leading: spaceIcon(s),
      onSelect: () => setScope(s.id),
    })),
  ]

  return (
    <Menu
      trigger={
        <Button intent="secondary" size="sm" trailing={<ChevronDown size={16} aria-hidden="true" />}>
          {`Spaces: ${activeName}`}
        </Button>
      }
      items={items}
      aria-label="Switch scope"
      placement="bottom-start"
    />
  )
}
