import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { CanvasReader, type ReaderChapter } from './canvas-reader'
import { Button } from './button'
import { SyncStatus } from './sync-status'

// CanvasReader stories — the component Visual Gate surface (fe-codec-canvas-reader S1). Toggle Theme (light｜dark) +
// preset in the toolbar. S1 ships the FRAME: title-hero header + reading column (renderContent) + the 5 states
// (loading/empty/error/unavailable/success). The Contents panel (S2), rail (S3), selection (S4), listen (S5) land later.
// MEASURE (PLAN-S1-frame.md §4): EC-2 title-hero · EC-3 serif column · EC-8 5 states (unavailable≠empty) · EC-9 375
// reflow · EC-10 dark × 3 presets + accent flip + AA · EC-11 semantic scale.

const meta: Meta<typeof CanvasReader> = { title: 'Canvas/CanvasReader', component: CanvasReader }
export default meta
type Story = StoryObj<typeof CanvasReader>

const PARAS = [
  'Alyosha was at this time a well-grown, red-cheeked, clear-eyed lad of nineteen, radiant with health. He was very handsome, too, graceful, moderately tall, with hair of a dark brown, with a regular, rather long, oval-shaped face, and wide-set dark grey, shining eyes.',
  'He was by no means a fanatic, and, in my opinion at least, was not even a mystic. He was simply an early lover of humanity, and that he adopted the monastic life was simply because at that time it struck him as the ideal escape for his soul.',
  'And this life struck him only because at that time he met a remarkable being, our celebrated elder, Zossima, to whom he became attached with all the warm first love of his ardent heart.',
]
const readingBody = () => (
  <View gap="$16">
    <Text fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">Chapter 4 · A Lady of Little Faith</Text>
    {PARAS.map((p, i) => (
      <Text key={i} fontFamily="$body" fontSize="$body" color="$colorTextPrimary" lineHeight={28}>{p}</Text>
    ))}
  </View>
)

const common = {
  title: 'The Brothers Karamazov',
  context: 'Chapter 4 of 10, page 56',
  progress: 0.26,
  saveStatus: <SyncStatus state="saved" />,
  action: <Button intent="ghost" size="sm" aria-label="More actions">⋯</Button>,
  'aria-label': 'Reader',
} as const

const SUMMARY =
  'Dostoevsky’s final novel — a philosophical drama of faith, doubt, and free will, told through the Karamazov brothers and the death of their father.'
const CH_TITLES = [
  'The History of a Family', 'He Gets Rid of His Eldest Son', 'Second Marriage and Second Family',
  'A Lady of Little Faith', 'So Be It! So Be It!', 'Why Is Such a Man Alive?', 'A Young Man Bent on a Career',
  'The Scandalous Scene', 'Sensualists', 'Both Together',
]
const CHAPTERS: ReaderChapter[] = CH_TITLES.map((t, i) => ({
  id: `c${i + 1}`, number: i + 1, title: t, pageRef: `p. ${i * 20 + 1}`, done: i < 3, current: i === 3,
}))

/** Success — the full reading frame: title-hero header + measured serif reading column. */
export const Reading: Story = { args: { ...common, state: 'success', renderContent: readingBody } }

/** Not-synced position — the honest line under the context (IR-3). */
export const NotSynced: Story = {
  args: { ...common, state: 'success', renderContent: readingBody, positionNote: 'Reading position isn’t synced across formats yet.' },
}

/** S2 — the Contents panel open: "About" summary + the TOC (completion ✓, current chapter accent) beside the column. */
export const ContentsOpen: Story = {
  args: {
    ...common, state: 'success', renderContent: readingBody,
    summary: SUMMARY, chapters: CHAPTERS, contentsOpen: true,
    onToggleContents: () => {}, onJumpToChapter: () => {},
  },
}

/** S2 — a long TOC (scale) — the panel handles many chapters. */
export const ContentsMany: Story = {
  args: {
    ...common, state: 'success', renderContent: readingBody,
    summary: SUMMARY,
    chapters: [...CHAPTERS, ...CH_TITLES.map((t, i) => ({ id: `c${i + 11}`, number: i + 11, title: t, pageRef: `p. ${(i + 10) * 20 + 1}`, done: false }))],
    contentsOpen: true, onJumpToChapter: () => {},
  },
}

/** The 5 states — loading · empty · error · unavailable (access, ≠ empty). */
export const States: Story = {
  render: () => (
    <View gap="$32">
      <View gap="$8"><Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Loading</Text>
        <CanvasReader title="The Brothers Karamazov" context="Chapter 4 of 10" state="loading" aria-label="Loading reader" /></View>
      <View gap="$8"><Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Empty</Text>
        <CanvasReader title="The Brothers Karamazov" state="empty" emptyAction={<Button intent="primary" size="sm">Add a file</Button>} aria-label="Empty reader" /></View>
      <View gap="$8"><Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Error</Text>
        <CanvasReader title="The Brothers Karamazov" state="error" aria-label="Errored reader" /></View>
      <View gap="$8"><Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Access-unavailable (≠ empty)</Text>
        <CanvasReader title="The Brothers Karamazov" context="Physical copy" state="unavailable" aria-label="Unavailable reader" /></View>
    </View>
  ),
}
