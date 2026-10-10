import type { Meta, StoryObj } from '@storybook/react-vite'
import { Text, View } from '@tamagui/core'
import { CanvasView } from './canvas-view'
import { GalleryView } from './gallery-view'
import { CalendarView } from './calendar-view'
import { EmptyState } from './empty-state'
import { Button } from './button'

// fe-codec-canvas-board · S1 · canvas-view stories — the component Visual Gate surface. Toolbar: Preset × Mode × Density.
// CanvasView is the immersive CODEC Canvas FRAME: masthead (eyebrow · serif $display title · meta · progress slot ·
// read-only action slot · hairline) + a hosted-renderer region (children). It owns NO renderer state — it selects an
// optional empty/error override by `state`, else delegates to the hosted renderer (BR-CB-S1-6).
//
// MEASURE (s1-canvas-view.md §4): EC-1 editorial masthead (.vida-canvas-eyebrow UPPERCASE · .vida-canvas-title serif
// $display · .vida-canvas-meta $small muted) — not a grid/switcher · EC-3 progress slot (meta→progress order) · EC-4
// empty: teaching override shows when provided, else children · EC-6 read-only action slot · EC-7 preset re-voice ·
// EC-8 AA ≥4.5 title/eyebrow/meta full matrix (incl warm-dark) · BR-CB-S1-12 responsive 375/768/1440 (actions reflow
// below the title-group at 375, no overflow).

const meta: Meta<typeof CanvasView> = { title: 'Platform Views/Canvas', component: CanvasView }
export default meta
type Story = StoryObj<typeof CanvasView>

// ── a quiet board-level progress meter (the consumer's `progress` slot content) ──────────────────────────
const RealizedMeter = ({ done, total }: { done: number; total: number }) => {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <View gap="$8" maxWidth={340} marginTop="$4">
      <View flexDirection="row" justifyContent="space-between" alignItems="baseline">
        <Text fontFamily="$body" fontSize="$caption" fontWeight="700" letterSpacing={1} color="$colorTextMuted" style={{ textTransform: 'uppercase' }}>
          Realized
        </Text>
        <Text fontFamily="$body" fontSize="$small" color="$colorTextPrimary" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {done} / {total}
        </Text>
      </View>
      <View height={6} borderRadius={999} backgroundColor="$colorSurfaceSecondary" overflow="hidden">
        <View height={6} width={`${pct}%`} backgroundColor="$colorBrandPrimary" borderRadius={999} />
      </View>
    </View>
  )
}

// ── fake dreams (a reference renderItem — the production tile is fe-purposes', measure-driven) ────────────
type Dream = { id: string; title: string; hue: string; tag: string }
const DREAMS: Dream[] = [
  { id: 'd1', title: 'See the northern lights', hue: '#2f4858', tag: 'Travel' },
  { id: 'd2', title: 'Run a half marathon', hue: '#7a5c3e', tag: 'Health' },
  { id: 'd3', title: 'Learn to sail', hue: '#3a6b5e', tag: 'Skill' },
  { id: 'd4', title: 'Write a novel', hue: '#5b3a4a', tag: 'Craft' },
]
const dreamTile = (d: Dream) => (
  <View>
    <View height={140} borderRadius="$lg" backgroundColor={d.hue} borderWidth={1} borderColor="$colorBorderDefault" />
    <Text fontFamily="$display" fontSize="$small" fontWeight="500" color="$colorTextPrimary" marginTop={8}>
      {d.title}
    </Text>
  </View>
)

// ── fake calendar events ─────────────────────────────────────────────────────────────────────────────────
type Evt = { id: string; on: string; title: string }
const MONTH = new Date(2026, 7, 1)
const TODAY = new Date(2026, 7, 10)
const EVENTS: Evt[] = [
  { id: '1', on: '2026-08-03', title: 'Kickoff' },
  { id: '2', on: '2026-08-10', title: 'Design review' },
  { id: '3', on: '2026-08-18', title: 'Demo' },
]
const evtChip = (e: Evt) => (
  <View flexDirection="row" alignItems="center" gap={5}>
    <View width={5} height={5} borderRadius={999} backgroundColor="$colorBrandPrimary" />
    <Text fontSize="$caption" color="$colorTextPrimary" numberOfLines={1}>
      {e.title}
    </Text>
  </View>
)
const monthNav = (
  <>
    <Button intent="ghost" size="sm" onPress={() => {}} aria-label="Previous month">
      ‹
    </Button>
    <Button intent="ghost" size="sm" onPress={() => {}} aria-label="Next month">
      ›
    </Button>
  </>
)

// ── EC-1/EC-3: vision-board composition (masthead + progress + hosted GalleryView) ───────────────────────
export const VisionBoard: Story = {
  render: () => (
    <CanvasView eyebrow="Vision board" title="Before I die" progress={<RealizedMeter done={3} total={7} />} aria-label="Dreams vision board">
      <GalleryView<Dream> items={DREAMS} getKey={(d) => d.id} renderItem={dreamTile} minTileWidth={220} aria-label="Dreams" />
    </CanvasView>
  ),
}

// ── EC-5/EC-6: calendar-grid composition (user-named title + read-only month nav + hosted CalendarView) ──
export const CalendarGrid: Story = {
  render: () => (
    <CanvasView eyebrow="Calendar" title="My calendar" meta="Today · Mon 10 Aug" actions={monthNav} aria-label="Month calendar">
      <CalendarView<Evt> items={EVENTS} getDate={(e) => e.on} getKey={(e) => e.id} renderItem={evtChip} month={MONTH} today={TODAY} aria-label="Month" />
    </CanvasView>
  ),
}

// ── EC-4: empty TEACHING override (vision-board owns it) ─────────────────────────────────────────────────
export const EmptyTeaching: Story = {
  render: () => (
    <CanvasView
      eyebrow="Vision board"
      title="Before I die"
      state="empty"
      empty={
        <EmptyState title="Your vision board is a blank page" action={<Button intent="primary" size="sm" onPress={() => {}}>Add a dream</Button>}>
          Pin the things you want to do, see, or become.
        </EmptyState>
      }
      aria-label="Dreams vision board"
    >
      <View />
    </CanvasView>
  ),
}

// ── EC-4: empty DELEGATE (no override → the hosted renderer's own empty shows; calendar keeps its grid) ───
export const EmptyDelegate: Story = {
  render: () => (
    <CanvasView eyebrow="Calendar" title="My calendar" meta="Nothing scheduled" actions={monthNav} state="empty" aria-label="Month calendar">
      <CalendarView<Evt> items={[]} getDate={(e) => e.on} getKey={(e) => e.id} renderItem={evtChip} month={MONTH} today={TODAY} state="empty" aria-label="Month" />
    </CanvasView>
  ),
}

// ── error override (calm role=status) ───────────────────────────────────────────────────────────────────
export const ErrorOverride: Story = {
  render: () => (
    <CanvasView
      eyebrow="Vision board"
      title="Before I die"
      state="error"
      error={
        <View role="status">
          <Text fontSize="$small" color="$colorTextMuted">
            Couldn’t load your vision board.
          </Text>
        </View>
      }
      aria-label="Dreams vision board"
    >
      <View />
    </CanvasView>
  ),
}
