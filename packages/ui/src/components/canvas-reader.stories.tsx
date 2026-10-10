import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { CanvasReader, SelectionActions, ReaderHighlightMark, type ReaderChapter, type AnnotationGroup } from './canvas-reader'
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

// ── S3 · Margin rail ─────────────────────────────────────────────────────────────────────────────────────────
// A highlight (NO Add-note/Link — IR-1) beside a quote & a bookmark (both affordances). location pre-resolved (S6).
const GROUPS: AnnotationGroup[] = [
  {
    id: 'c4', title: 'Chapter 4 · A Lady of Little Faith',
    annotations: [
      { id: 'a1', nature: 'highlight', text: 'He was simply an early lover of humanity.', location: 'Ch. 4 · p. 56 · line 12' },
      { id: 'a2', nature: 'quote', text: 'The awful thing is that beauty is mysterious as well as terrible. God and the devil are fighting there, and the battlefield is the heart of man.', location: 'Ch. 4 · p. 58' },
    ],
  },
  {
    id: 'c5', title: 'Chapter 5 · So Be It!',
    annotations: [{ id: 'a3', nature: 'bookmark', text: 'Return here — the argument on free will and the Grand Inquisitor.', location: 'Ch. 5 · p. 71' }],
  },
]
const marginRailArgs = {
  ...common, state: 'success', renderContent: readingBody,
  annotationGroups: GROUPS, annotationsState: 'success', railOpen: true,
  onToggleRail: () => {}, onAddNote: () => {}, onLinkAnnotation: () => {},
} as const

/** S3 — the living margin: 3 distinct natures grouped by chapter · IR-1 (highlight has no link/note) · counts. */
export const MarginRail: Story = { args: marginRailArgs }

/** S3 — the rail stacks below the column at 375 (view at the 390 viewport). */
export const Rail375: Story = { args: marginRailArgs }

/** S3 — N-scale (IR-10): many annotations of each nature, grouped by chapter, counted. */
const MANY: AnnotationGroup[] = CH_TITLES.slice(0, 4).map((t, gi) => ({
  id: `g${gi}`, title: `Chapter ${gi + 1} · ${t}`,
  annotations: Array.from({ length: 6 }, (_, i) => {
    const nature = (['highlight', 'bookmark', 'quote'] as const)[i % 3]
    return { id: `g${gi}a${i}`, nature, text: PARAS[i % PARAS.length], location: `Ch. ${gi + 1} · p. ${gi * 20 + i * 3 + 1}` }
  }),
}))
export const RailManyAnnotations: Story = {
  args: { ...common, state: 'success', renderContent: readingBody, annotationGroups: MANY, annotationsState: 'success', onAddNote: () => {}, onLinkAnnotation: () => {} },
}

/** S3 — the rail terminal states: loading · empty · error. */
export const RailStates: Story = {
  render: () => (
    <View gap="$32">
      {(['loading', 'empty', 'error'] as const).map((s) => (
        <View key={s} gap="$8">
          <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">{s}</Text>
          <CanvasReader {...common} state="success" renderContent={readingBody} annotationsState={s} railOpen aria-label={`Reader ${s} rail`} />
        </View>
      ))}
    </View>
  ),
}

// ── S4 · Selection affordance ────────────────────────────────────────────────────────────────────────────────
/** S4 — the birth action set: Highlight · Quote · Bookmark · Listen-from-here (real SVG icons, no emoji). */
export const SelectionActionSet: Story = {
  render: () => <SelectionActions onHighlight={() => {}} onQuote={() => {}} onBookmark={() => {}} onListenFrom={() => {}} />,
}

/** S4 — the inline highlight mark (EC-3): marked spans read as marked within the text. */
export const HighlightMark: Story = {
  render: () => (
    <View maxWidth={660} gap="$16">
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary" lineHeight={28}>
        He was by no means a fanatic, and, in my opinion at least,{' '}
        <ReaderHighlightMark>was not even a mystic</ReaderHighlightMark>. He was simply{' '}
        <ReaderHighlightMark>an early lover of humanity</ReaderHighlightMark>, and that he adopted the monastic life it
        struck him as the ideal escape for his soul.
      </Text>
    </View>
  ),
}

/** S4 — the EC-12 feel: the action set placed in-place over a selected span (a REPRESENTATIVE box — the live
 *  Range→rect anchoring is the apps/web consumer's, not the shipped trigger-anchored Popover). */
export const SelectionInPlace: Story = {
  render: () => (
    <View maxWidth={660} position="relative" paddingTop="$64">
      <View
        position="absolute"
        top={0}
        left={100}
        backgroundColor="$colorSurfacePrimary"
        borderWidth={1}
        borderColor="$colorBorderDefault"
        borderRadius="$lg"
        paddingHorizontal="$4"
      >
        <SelectionActions onHighlight={() => {}} onQuote={() => {}} onBookmark={() => {}} onListenFrom={() => {}} />
      </View>
      <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary" lineHeight={28}>
        And this life struck him only because at that time he met{' '}
        <ReaderHighlightMark>a remarkable being</ReaderHighlightMark>, our celebrated elder, Zossima, to whom he became
        attached with all the warm first love of his ardent heart.
      </Text>
    </View>
  ),
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
