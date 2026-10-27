// ============================================================================
// IconPickerDialog — "Choose an icon" (notes-rescope R3, PLAN-R3 G7 · EC-29/EC-22 · BR-R3-3).
// A single-choice `radiogroup` over the curated Lucide set (APG radio: one tab stop, roving tabindex). Arrow keys move
// focus AND the `aria-checked` selection inside the dialog only — they never save. Enter / Space / a click commit: the
// icon is written and the dialog closes. Esc closes without writing (the Dialog's own Esc; focus returns to the opener).
// Loaded lazily (React.lazy) by MetadataControls.
// ============================================================================
import { useRef, useState, type KeyboardEvent } from 'react'
import { View } from '@tamagui/core'
import { Button, Dialog } from '@vida/ui'
import { PAGE_ICONS } from './page-icons'

export interface IconPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: string | null
  onChoose: (name: string | null) => void
}

const NAMES = Object.keys(PAGE_ICONS)
const COLUMNS = 8

export function IconPickerDialog({ open, onOpenChange, current, onChoose }: IconPickerDialogProps) {
  const start = current != null && NAMES.includes(current) ? NAMES.indexOf(current) : 0
  const [selected, setSelected] = useState(start)
  const radios = useRef<Array<HTMLElement | null>>([])

  const commit = (i: number) => {
    onChoose(NAMES[i] ?? null)
    onOpenChange(false)
  }
  const move = (to: number) => {
    const i = (to + NAMES.length) % NAMES.length
    setSelected(i)
    radios.current[i]?.focus()
  }
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: COLUMNS, ArrowLeft: -1, ArrowUp: -COLUMNS }
    if (e.key in step) {
      e.preventDefault()
      move(i + (step[e.key] ?? 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      move(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      move(NAMES.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      commit(i)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Choose an icon"
      footer={
        current != null ? (
          <Button intent="ghost" onPress={() => (onChoose(null), onOpenChange(false))}>
            Remove icon
          </Button>
        ) : undefined
      }
    >
      <View role="radiogroup" aria-label="Icons" flexDirection="row" flexWrap="wrap" gap="$4">
        {NAMES.map((name, i) => {
          const entry = PAGE_ICONS[name]!
          const Ico = entry.icon
          const checked = i === selected
          return (
            <View
              key={name}
              ref={(el: unknown) => {
                radios.current[i] = el as HTMLElement | null
              }}
              role="radio"
              aria-checked={checked}
              aria-label={entry.label}
              tabIndex={checked ? 0 : -1}
              onPress={() => commit(i)}
              onKeyDown={(e: KeyboardEvent) => onKeyDown(e, i)}
              width={40}
              height={40}
              alignItems="center"
              justifyContent="center"
              borderRadius="$sm"
              cursor="pointer"
              backgroundColor={checked ? '$colorSurfaceSecondary' : 'transparent'}
              hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
              focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
            >
              <Ico
                size={20}
                strokeWidth={2}
                color={checked ? 'var(--colorBrandEmphasis)' : 'var(--colorTextPrimary)'}
                aria-hidden
              />
            </View>
          )
        })}
      </View>
    </Dialog>
  )
}

export default IconPickerDialog
