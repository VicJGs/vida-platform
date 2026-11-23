import type { Meta, StoryObj } from '@storybook/react-vite'
import { View } from '@tamagui/core'
import { ToastProvider, toast, type ToastIntent, type ToastProviderProps } from './toast'
import { Button } from './button'

// UI-1 · Toast stories — the component Visual Gate surface. Toggle the toolbar Theme (light｜dark) to review both.
// Toast is IMPERATIVE — there is no <Toast> element to render; each story mounts its OWN <ToastProvider> (the F1
// single-provider invariant, per canvas) + buttons that call toast().
//
// MEASURE items: toasts stack at the bottom-center · each carries an intent LEFT-ACCENT
// bar (info=brand · success=green · danger=red) · they ENTER with opacity + a translateY slide from the edge and
// EXIT the same way (transform/opacity only — B12; instant under reduced motion, but still announced via aria-live)
// · auto-dismiss after 5s, PAUSED while hovered/focused · duration:0 = sticky · the cap (default 3) evicts the
// oldest · focus is NEVER stolen on appear · Esc dismisses a focused toast · both themes correct.

const meta = {
  title: 'Primitives/Toast',
  component: ToastProvider,
} satisfies Meta<typeof ToastProvider>

export default meta
type Story = StoryObj<typeof meta>

// Playground — set the toast in the controls, then press the button (toast is imperative; nothing shows until fired).
// `limit` and `placement` configure the provider; the rest is what the next toast carries.
type PlaygroundArgs = ToastProviderProps & {
  title: string
  description: string
  intent: ToastIntent
  duration: number
  withAction: boolean
}

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    limit: 3,
    placement: 'bottom',
    title: 'Saved',
    description: 'Your changes were saved.',
    intent: 'info',
    duration: 5000,
    withAction: false,
  },
  argTypes: {
    limit: { control: { type: 'number', min: 1, max: 6 } },
    placement: { control: 'inline-radio', options: ['top', 'bottom'] },
    title: { control: 'text' },
    description: { control: 'text' },
    intent: { control: 'inline-radio', options: ['info', 'success', 'danger'] },
    duration: { control: { type: 'number', min: 0, step: 1000 }, description: 'ms before auto-dismiss; 0 = sticky' },
    withAction: { control: 'boolean', name: 'action' },
  },
  render: ({ limit, placement, title, description, intent, duration, withAction }) => (
    <View height={420} gap={12} alignItems="flex-start">
      <Button
        intent="secondary"
        onPress={() =>
          toast({
            title,
            description: description || undefined,
            intent,
            duration,
            action: withAction ? { label: 'Undo', onPress: () => {} } : undefined,
          })
        }
      >
        Show toast
      </Button>
      <ToastProvider limit={limit} placement={placement} />
    </View>
  ),
}

// Intents — one of each, so all three accents are visible at once (info in the polite region, danger in assertive).
export const Intents: Story = {
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => {
    const fire = () => {
      ;(['info', 'success', 'danger'] as ToastIntent[]).forEach((intent) =>
        toast({ title: `${intent} toast`, description: `A ${intent} message.`, intent, duration: 0 }),
      )
    }
    return (
      <View height={420} gap={12} alignItems="flex-start">
        <Button intent="primary" onPress={fire}>
          Show all intents (sticky)
        </Button>
        <ToastProvider />
      </View>
    )
  },
}

// With action — a single optional action; pressing it fires onPress and does NOT dismiss the toast (F2).
export const WithAction: Story = {
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => (
    <View height={360} gap={12} alignItems="flex-start">
      <Button
        intent="secondary"
        onPress={() =>
          toast({
            title: 'Message archived',
            intent: 'info',
            duration: 0,
            // eslint-disable-next-line no-alert, no-console
            action: { label: 'Undo', onPress: () => console.info('undo pressed') },
          })
        }
      >
        Archive (with Undo)
      </Button>
      <ToastProvider />
    </View>
  ),
}

// Loading — consumer-composed (no `loading` prop, DEF-U10-b): a sticky toast (duration:0) with a spinner in the
// description; the consumer dismisses it via the returned id when the async work resolves.
export const Loading: Story = {
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => {
    const fire = () => {
      const id = toast({
        title: 'Saving…',
        intent: 'info',
        duration: 0,
        description: (
          <View flexDirection="row" gap={8} alignItems="center">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="0.8s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </View>
        ),
      })
      setTimeout(() => toast({ title: 'Saved', intent: 'success' }), 2000)
      setTimeout(() => toast.dismiss(id), 2000)
    }
    return (
      <View height={360} gap={12} alignItems="flex-start">
        <Button intent="secondary" onPress={fire}>
          Save (loading → success)
        </Button>
        <ToastProvider />
      </View>
    )
  },
}

// Cap / stacking — fire a burst; the region caps at `limit` (2 here), evicting the oldest as new ones arrive.
export const CapAndStacking: Story = {
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => {
    let n = 0
    return (
      <View height={420} gap={12} alignItems="flex-start">
        <Button intent="primary" onPress={() => toast({ title: `Toast #${(n += 1)}`, intent: 'info', duration: 0 })}>
          Add a toast (cap = 2)
        </Button>
        <ToastProvider limit={2} />
      </View>
    )
  },
}

// Top placement — the stack anchors to the top edge; toasts slide down from above.
export const TopPlacement: Story = {
  parameters: { controls: { disable: true } }, // a fixed showcase: it ignores args
  render: () => (
    <View height={420} gap={12} alignItems="flex-start">
      <Button intent="secondary" onPress={() => toast({ title: 'From the top', intent: 'info' })}>
        Show (top)
      </Button>
      <ToastProvider placement="top" />
    </View>
  ),
}
