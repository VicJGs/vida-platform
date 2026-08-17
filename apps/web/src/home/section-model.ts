// Home dashboard section model — UX-6 (LIF-95). UX-6's NOVEL design content: the three sections of the daily
// Journal Home, where each sits in the shell frame, and which renderer is intended. Data-only; imports ONLY the
// `ShellRegion` TYPE from ../shell/regions. NO component import, NO JSX — the render is Phase-1b (the rendered
// screen consumes this model). Full model: docs/core/architecture/home-journal-dashboard.md.
import type { ShellRegion } from '../shell/regions'

/** The three sections of the Journal daily dashboard. `[FACT: journals/identity.md:8-9]` */
export type HomeSectionKey = 'summary' | 'agenda' | 'entry'

/**
 * The INTENDED renderer for a section, named as a string — NOT an imported component. UX-6 is a design model;
 * which UI-1/UI-2 primitive draws each section is a Phase-1b render concern. `[INTERP: from journals/contract.md]`
 */
export type SectionRenderHint = 'data-view' | 'list' | 'editor-seam'

/** One section's placement + render intent within the shell `<Outlet/>`. */
export interface HomeSection {
  readonly key: HomeSectionKey
  readonly title: string
  /** The shell region this section renders into — the region is the shell's (UX-3), the placement is Home's. */
  readonly region: ShellRegion
  readonly renderHint: SectionRenderHint
}

/**
 * The ordered Home dashboard model: summary (what happened) · agenda (what's due today) · free-form entry. All
 * three sit in the shell `content` region. The free-form `entry` is Notes & Pages' editor, referenced here as a
 * mount seam only (Journals fills the block; it does not own the page). `[FACT: journals/identity.md:8-9,42-43; BR-1/BR-7]`
 */
export const HOME_SECTIONS: readonly HomeSection[] = [
  { key: 'summary', title: "Today's summary", region: 'content', renderHint: 'data-view' },
  { key: 'agenda', title: 'Agenda', region: 'content', renderHint: 'list' },
  { key: 'entry', title: 'Journal entry', region: 'content', renderHint: 'editor-seam' },
]
