import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { ExportDialog, type ExportFormat } from './export-dialog'
import { Button } from './button'

// UI-2 · V6 · export-dialog stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark).
// A presentational export modal: composes UI-1 Dialog (footer + description props) + a hand-rolled radiogroup; emits
// onExport(format) — the app wires the actual serialization.
//
// MEASURE (v6-export-dialog.md §4): the format radiogroup (selected = brand dot + border) · arrow-key selection ·
// Export/Cancel in the Dialog <footer> (right-aligned) · the description copy · busy = "Exporting…" spinner + disabled
// radios/Cancel · dark mode.

const meta: Meta = { title: 'Platform Views/ExportDialog' }
export default meta
type Story = StoryObj

// A stateful wrapper: open the dialog; onExport fakes a ~1.4s async export (busy) then closes.
function Demo(props: { formats?: readonly ExportFormat[]; defaultFormat?: ExportFormat; entityLabel?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return (
    <View padding={24}>
      <Button intent="primary" onPress={() => setOpen(true)}>
        Export…
      </Button>
      <ExportDialog
        open={open}
        onOpenChange={setOpen}
        busy={busy}
        formats={props.formats}
        defaultFormat={props.defaultFormat}
        entityLabel={props.entityLabel}
        onExport={(format) => {
          setBusy(true)
          window.setTimeout(() => {
            setBusy(false)
            setOpen(false)
            // eslint-disable-next-line no-console
            console.info('[story] exported as', format)
          }, 1400)
        }}
      />
    </View>
  )
}

export const Playground: Story = { render: () => <Demo entityLabel="journal entry" /> }

// A limited format set (e.g. a surface that only supports Markdown + PDF).
export const LimitedFormats: Story = {
  render: () => <Demo formats={['md', 'pdf']} defaultFormat="pdf" entityLabel="note" />,
}
