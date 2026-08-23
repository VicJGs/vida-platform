// Notes view switcher — MOD-notes ②b (LIF-131). The `hasMultiModeTopView`
// selector (module-map.ts:68) over the ephemeral "open view" (Zustand,
// structure-data.md:36): List · Gallery · Neural. No doc fixes the control
// primitive → composed here as a labeled group of UI-1 toggle Buttons (APG:
// each a native focusable button with `aria-pressed`; Tab moves between them,
// Enter/Space activates — no roving to re-implement). Token-only → dark-capable.
import { Button } from '@vida/ui'
import { View } from '@tamagui/core'
import { useNotesUiStore, type NotesView } from '../../stores/notes-ui-store'

const VIEWS: ReadonlyArray<{ value: NotesView; label: string }> = [
  { value: 'list', label: 'List' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'neural', label: 'Graph' },
]

export function NotesViewSwitcher() {
  const active = useNotesUiStore((s) => s.activeNotesView)
  const setActive = useNotesUiStore((s) => s.setActiveNotesView)

  return (
    <View role="group" aria-label="Notes view" flexDirection="row" gap="$4">
      {VIEWS.map((v) => {
        const isActive = active === v.value
        return (
          <Button
            key={v.value}
            size="sm"
            intent={isActive ? 'secondary' : 'ghost'}
            aria-pressed={isActive}
            onPress={() => setActive(v.value)}
          >
            {v.label}
          </Button>
        )
      })}
    </View>
  )
}

export default NotesViewSwitcher
