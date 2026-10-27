// ============================================================================
// RenameDialog — ⋯ → "Rename" (notes-rescope R3, PLAN-R3 G13 · EC-25). One input seeded with the RAW stored title (an
// untitled page starts empty, not with its "Task note" label), selected on open; Save runs the SAME rename mutation as the
// inline title seam. Esc / Cancel close without writing; the Dialog returns focus to the ⋯ trigger.
// ============================================================================
import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input } from '@vida/ui'

export interface RenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The raw stored title ('' when untitled). */
  value: string
  onSave: (next: string) => void
}

export function RenameDialog({ open, onOpenChange, value, onSave }: RenameDialogProps) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setDraft(value)
      requestAnimationFrame(() => ref.current?.select())
    }
  }, [open, value])
  const save = () => {
    onSave(draft)
    onOpenChange(false)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename page"
      footer={
        <>
          <Button intent="ghost" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button intent="primary" onPress={save}>
            Save
          </Button>
        </>
      }
    >
      <Input
        ref={ref}
        aria-label="Page title"
        value={draft}
        onChangeText={setDraft}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) {
            e.preventDefault()
            save()
          }
        }}
      />
    </Dialog>
  )
}
