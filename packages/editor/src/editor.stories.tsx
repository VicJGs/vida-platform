import type { Meta, StoryObj } from '@storybook/react-vite'
import { VidaEditor } from './editor'
import type { EditorDocument } from '@vida/types'

// E1 (UI-3) — the component Visual-Gate surface for <VidaEditor> (frontend-visual-gate.md render table). The
// preview decorator roots each story in @vida/ui's UIProvider + paints the theme page surface, so the editor chrome
// (frame border, caret, placeholder) is reviewable in both light｜dark. States: default · focus (interact) · disabled
// · empty (placeholder). Smoke-verifies the contenteditable mounts with NO react-native-web / process-shim crash
// (the U0 lesson — @vida/ui is @tamagui/core-only).
const meta: Meta<typeof VidaEditor> = {
  title: 'Editor/VidaEditor',
  component: VidaEditor,
  args: { 'aria-label': 'Note body' },
}
export default meta

type Story = StoryObj<typeof VidaEditor>

const seeded: EditorDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Morning pages' }] },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Type here — bold, lists and headings come from StarterKit.' }],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A first thought' }] }],
        },
      ],
    },
  ],
}

/** Default — seeded content, editable. */
export const Default: Story = {
  args: { defaultValue: seeded },
}

/** Empty — the placeholder is visible (reads --colorTextMuted). */
export const Empty: Story = {
  args: { placeholder: 'Start writing…' },
}

/** Disabled — editable={false}: not editable, no caret. */
export const Disabled: Story = {
  args: { defaultValue: seeded, editable: false },
}
