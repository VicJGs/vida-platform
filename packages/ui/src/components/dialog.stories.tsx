import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { Dialog, type DialogProps } from './dialog'
import { Button } from './button'
import { Input } from './input'

// UI-1 · Dialog stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both.
//
// MEASURE (u8-dialog.md §5/§6/§10): the scrim dims the page + the panel is CENTERED (radiusCard, $background) · the
// panel ENTERS with opacity + a small scale/lift (transform/opacity ONLY — B12), instant under reduced-motion · on
// open focus lands on the first focusable inside · Tab CYCLES within the panel (never escapes to the page) · Esc +
// backdrop close (dismissible) · the non-dismissible confirm ignores Esc/backdrop (only its actions close it) · the
// background is inert (can't Tab/click the page behind) · both themes correct.

// A live trigger + controlled Dialog (Dialog owns no trigger — the consumer flips `open`).
function DialogDemo({
  triggerLabel = 'Open dialog',
  children,
  ...props
}: Partial<DialogProps> & { triggerLabel?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button intent="primary" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog {...props} title={props.title ?? 'Dialog title'} open={open} onOpenChange={setOpen}>
        {children ?? <Text color="$colorTextPrimary">Dialog body content.</Text>}
      </Dialog>
    </>
  )
}

const meta = {
  title: 'Primitives/Dialog',
  component: Dialog,
  args: {
    open: false,
    onOpenChange: () => {},
    title: 'Dialog title',
    children: <Text color="$colorTextPrimary">Dialog body content.</Text>,
  },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    dismissible: { control: 'boolean' },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

// Default — description + footer actions, dismissible (Esc + backdrop close).
export const Default: Story = {
  render: () => (
    <DialogDemo
      title="Rename workspace"
      description="Give this workspace a clear, memorable name. You can change it later."
      footer={
        <>
          <Button intent="secondary">Cancel</Button>
          <Button intent="primary">Save</Button>
        </>
      }
    >
      <Input placeholder="Workspace name" defaultValue="Vida" />
    </DialogDemo>
  ),
}

// Sizes — sm / md / lg maxWidth (DEF-U8-e provisional).
export const Sizes: Story = {
  render: () => (
    <View flexDirection="row" gap={16}>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <DialogDemo
          key={size}
          triggerLabel={`Open ${size}`}
          title={`Size ${size}`}
          description={`This dialog uses size="${size}".`}
          size={size}
          footer={<Button intent="primary">Done</Button>}
        >
          <Text color="$colorTextPrimary">The panel width tracks the `size` prop.</Text>
        </DialogDemo>
      ))}
    </View>
  ),
}

// Destructive confirm — dismissible={false}: Esc + backdrop are inert, only the footer actions resolve it.
export const NonDismissible: Story = {
  render: () => (
    <DialogDemo
      triggerLabel="Delete account"
      title="Delete account?"
      description="This permanently deletes your account and all data. This cannot be undone."
      dismissible={false}
      footer={
        <>
          <Button intent="secondary">Keep account</Button>
          <Button intent="danger">Delete</Button>
        </>
      }
    >
      <Text color="$colorTextPrimary">Type your password to confirm in the field below.</Text>
    </DialogDemo>
  ),
}

// Loading — consumer-composed skeleton + aria-busy (no `loading` prop, DEF-U8-b, the Card/Tabs precedent).
export const Loading: Story = {
  render: () => (
    <DialogDemo
      title="Loading report"
      description="Fetching the latest data…"
      footer={
        <Button intent="primary" disabled>
          Continue
        </Button>
      }
    >
      <View gap={8} aria-busy="true">
        {[80, 100, 60].map((w) => (
          <View key={w} height={12} width={`${w}%`} borderRadius="$sm" backgroundColor="$colorSurfaceSecondary" />
        ))}
      </View>
    </DialogDemo>
  ),
}

// Empty — consumer-composed empty state in the body.
export const Empty: Story = {
  render: () => (
    <DialogDemo title="No items" description="You haven't added anything yet.">
      <View alignItems="center" paddingVertical={24} gap={8}>
        <Text fontSize={32}>📭</Text>
        <Text color="$colorTextMuted">Nothing here — add your first item to get started.</Text>
      </View>
    </DialogDemo>
  ),
}

// Long content — the body scrolls within the panel; header + footer stay put; panel clamps to the viewport.
export const LongContent: Story = {
  render: () => (
    <DialogDemo
      title="Terms of service"
      description="Please review before continuing."
      footer={
        <>
          <Button intent="secondary">Decline</Button>
          <Button intent="primary">Accept</Button>
        </>
      }
    >
      <View gap={12}>
        {Array.from({ length: 20 }, (_, i) => (
          <Text key={i} color="$colorTextPrimary">
            {i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
            labore et dolore magna aliqua.
          </Text>
        ))}
      </View>
    </DialogDemo>
  ),
}
