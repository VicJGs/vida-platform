import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useMemo } from 'react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { VidaEditor } from './editor'
import { SlashMenu } from './slash-menu'
import { SLASH_MENU_ITEMS } from './slash-commands'
import { INTEGRATION_BLOCK_TYPE, type EditorDocument } from '@vida/types'

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

// E2 (UI-3) — the standard-block Visual-Gate surface. Seeds one document exercising every E2 block via defaultValue
// (the only insertion path pre-toolbar/slash-menu): taskList (checked + unchecked), a table (header + body), an
// image, all 3 callout variants (info/success/danger), a code block, and a divider. Review in BOTH themes: token
// tints switch, table borders/header fill read the border/surface tokens, callout accents match the DS accents.
const standardBlocks: EditorDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Standard blocks' }] },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done item' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Open item' }] }],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Metric' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Value' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Streak' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '12 days' }] }] },
          ],
        },
      ],
    },
    { type: 'image', attrs: { src: 'https://placehold.co/240x120/png', alt: 'A placeholder image' } },
    {
      type: 'callout',
      attrs: { variant: 'info' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Info callout — the default variant.' }] }],
    },
    {
      type: 'callout',
      attrs: { variant: 'success' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Success callout.' }] }],
    },
    {
      type: 'callout',
      attrs: { variant: 'danger' },
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Danger callout.' }] }],
    },
    { type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1 // styled, StarterKit-owned' }] },
    { type: 'horizontalRule' },
    { type: 'paragraph', content: [{ type: 'text', text: 'A divider sits above this paragraph.' }] },
  ],
}

/** Standard blocks — every E2 block in one document (taskList · table · image · callout ×3 · code · divider). */
export const StandardBlocks: Story = {
  args: { defaultValue: standardBlocks },
}

// E3 (UI-3) — the toolbar Visual-Gate surface. The toolbar is ON by default (all editable stories above show it);
// this story seeds mixed content so the reviewer can verify, in BOTH themes:
//  · active-state — put the cursor in the bold word / the heading → the Bold button shows the pressed bg (BR-E3-3,
//    the active-bg-over-ghost check), the "Block type" trigger label tracks the block;
//  · the two Menus (Turn into / Insert) open, flip when clipped, and dispatch (insert a table/callout/divider);
//  · disabled — Undo is dimmed until the first edit;
//  · roving — Tab reaches the toolbar once, then ←/→/Home/End move between controls; focus ring is visible.
const toolbarSeed: EditorDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Toolbar' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Select a ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
        { type: 'text', text: ' word, or click into the heading — the controls reflect the active state.' },
      ],
    },
  ],
}

/** Toolbar (E3) — formatting controls that apply commands and reflect the active marks/block. */
export const Toolbar: Story = {
  args: { defaultValue: toolbarSeed },
}

/** No toolbar — `toolbar={false}` renders the bare editor (E1/E2 surface, opt-out). */
export const NoToolbar: Story = {
  args: { defaultValue: seeded, toolbar: false },
}

// E4 (UI-3) — the slash-menu Visual-Gate surface. Two stories:
//  · "Slash menu (popup)" stub-renders the <SlashMenu> popup directly (the Suggestion trigger can't be scripted in a
//    static story) so the chrome is reviewable in BOTH themes: the Menu sub-theme bg/border, the group labels
//    (Basic · Media · Platform blocks · Embeds), the selected-row highlight (first row), and — since E5 landed — the
//    integration rows are now SELECTABLE (available:true; each inserts its placeholder), no longer dimmed.
//  · "Slash menu (live)" is a real editable editor — click in and type `/` to open the menu at the caret; standard
//    blocks insert, integration blocks insert their E5 placeholder, and `/` inside a code block stays literal (BR-E4-10).
function SlashMenuPreview(): React.ReactElement {
  const editor = useMemo(() => new Editor({ extensions: [StarterKit], content: '<p></p>' }), [])
  useEffect(() => () => editor.destroy(), [editor])
  return <SlashMenu items={SLASH_MENU_ITEMS} command={() => {}} editor={editor} query="" />
}

/** Slash menu (popup) — the full command surface: standard blocks (selectable) + 11 dimmed integration blocks. */
export const SlashMenuPopup: Story = {
  name: 'Slash menu (popup)',
  render: () => <SlashMenuPreview />,
}

/** Slash menu (live) — click in and type `/` to open the block menu at the caret. */
export const SlashMenuLive: Story = {
  name: 'Slash menu (live — type /)',
  args: {
    defaultValue: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Type / here to open the block menu…' }] }],
    },
  },
}

// E5 (UI-3) — the integration-block placeholder Visual-Gate surface. Seeds a doc with all 11 integration nodes; each
// renders its placeholder node-view — the inline "available when its module ships" terminal state (CB6, ADR-008). This
// is the FIRST React node-view in the editor. Review in BOTH themes: the card bg reads `$colorSurfaceSecondary`, the
// border `$colorBorderDefault`, the title `$colorTextPrimary`, and the description + italic hint `$colorTextMuted`.
const integrationBlocks: EditorDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Integration blocks (placeholders)' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Each renders a placeholder until its module ships (E5 — the ADR-008 inline seam).' },
      ],
    },
    ...INTEGRATION_BLOCK_TYPE.map((type) => ({ type })),
  ],
}

/** Integration blocks (E5) — all 11 platform integration nodes as placeholder node-views. */
export const IntegrationBlocks: Story = {
  name: 'Integration blocks (placeholders)',
  args: { defaultValue: integrationBlocks },
}
