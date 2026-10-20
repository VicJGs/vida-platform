// ============================================================================
// HomeSurface — fe-home S3 (the Home surface: arrangement + greet + composition).
// Entity Delivery Flow ②. The rendered `/` Home (Phase-1b, home-journal-dashboard.md:63).
//
// Composes the two Home entities (EC-1): the Dashboard (S1, standalone widgets) + the
// journal page (S2, inline blocks), via the ARRANGEMENT layer (EC-2) that reads the
// persisted Settings preference (default Journal-first). fe-home OWNS the arrangement
// layout (RP4): EntityView's merged mode is a fixed layout→editor stack (= Dashboard-
// first only), so Journal-first's page-hero + glance-rail is this surface's bespoke
// 2-col. The greet header (EC-6) + 375 reflow (EC-7) live here.
//
// Seams: useHomeArrangement (READ, A — default 'journalFirst'; write = Settings).
// ============================================================================
import { styled, Text, View } from '@tamagui/core'
import { HomeDashboard, useHomeWidgets, renderHomeWidget, type HomeWidget, type HomeWidgetId } from './home-dashboard'
import { JournalPageRegion } from './journal-page-region'
import { usePreferencesStore, type HomeArrangement as PrefArrangement } from '../stores/preferences-store'

/** The Home arrangement — a user personalization chosen in Settings (decomposition.md:71). */
export type HomeArrangement = 'journalFirst' | 'dashboardFirst'

/** The useHomeArrangement READ seam (A). fe-settings S3 ACTIVATED the read: it now reads the app-owned preferences
 *  store (the Settings arrangement control writes it, so the toggle applies in-session). The default is 'journalFirst'.
 *  Cross-reload PERSISTENCE is still a deferred seam (seam-contract §A0 — the worker `values` seam blocks the live DB). */
export function useHomeArrangement(): HomeArrangement {
  return usePreferencesStore((s): PrefArrangement => s.arrangement)
}

// Time-of-day greeting. The user NAME is a user_profile seam (deferred); M1 greets without a name.
function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning.'
  if (hour < 18) return 'Good afternoon.'
  return 'Good evening.'
}

function Greeting() {
  const now = new Date()
  const eyebrow = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  return (
    <View gap="$4">
      <Text fontSize="$small" color="$colorTextMuted" style={{ textTransform: 'uppercase', letterSpacing: '0.14em' }}>
        {eyebrow}
      </Text>
      <Text fontFamily="$display" fontSize="$display" color="$colorTextPrimary">
        {greetingFor(now.getHours())}
      </Text>
      <Text fontSize="$body" color="$colorTextMuted">
        A quiet start — the day across your OS, and a page to think on it.
      </Text>
    </View>
  )
}

const Surface = styled(View, { flexDirection: 'column', gap: '$24', maxWidth: 1200, width: '100%', marginHorizontal: 'auto' })
// Journal-first 2-col: the page is the hero; the dashboard compacts to a glance rail. Both drop flex-grow + go full
// width when the row wraps to a column at 375 (the RNW flex-in-column collapse guard, [[flex1-child-collapses...]]).
const JFRow = styled(View, { flexDirection: 'row', flexWrap: 'wrap', gap: '$24' })
const JFMain = styled(View, { flexGrow: 3, flexShrink: 1, flexBasis: '60%', minWidth: 300 })
const JFSide = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: '30%', minWidth: 260 })

/** The glance-rail widget subset (Journal-first): the key stats, each full-width in the narrow rail. PURE (takes the set). */
function railWidgets(widgets: readonly HomeWidget[]): HomeWidget[] {
  const keep = new Set<HomeWidgetId>(['summary', 'finance', 'tasks'])
  return widgets.filter((w) => keep.has(w.id)).map((w) => ({ ...w, size: 'full' as const }))
}

export interface HomeSurfaceProps {
  /** Override the arrangement (tests/Visual Gate). Default = the persisted preference seam. */
  arrangement?: HomeArrangement
}

export function HomeSurface({ arrangement }: HomeSurfaceProps) {
  // Read the seams UNCONDITIONALLY at the top so the live ProviderRead (React Query) swap is drop-in (Rules of Hooks).
  const persisted = useHomeArrangement()
  const widgets = useHomeWidgets()
  const arr = arrangement ?? persisted
  return (
    <Surface>
      <Greeting />
      {arr === 'journalFirst' ? (
        <JFRow>
          <JFMain>
            <JournalPageRegion />
          </JFMain>
          <JFSide>
            <HomeDashboard widgets={railWidgets(widgets)} renderWidget={renderHomeWidget} title="At a glance" density="compact" />
          </JFSide>
        </JFRow>
      ) : (
        <>
          <HomeDashboard widgets={widgets} renderWidget={renderHomeWidget} />
          <JournalPageRegion />
        </>
      )}
    </Surface>
  )
}

export default HomeSurface
