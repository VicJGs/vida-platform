// ============================================================================
// note-overview — the `note` Layout-facet component (fe-notes-and-pages #27, S2;
// a component since notes-rescope R1, IR-R13). It feeds BOTH modes from one set of
// sections (envision round-2d): MERGED = a continuous Notion page (NotionHeader →
// inline Eyebrow sections, no boxes — EC-19); TABBED = a DashboardView Card grid (EC-18f).
//
// Notes ships only the `note` Overview (also the fallback for unregistered types). The
// journal Overview is journals-rescope's (EC-18a re-pin); task/milestone/deliverable
// Overviews RIDE in from fe-tasks/fe-projects via `registerOverview` (overview-registry).
// Backlinks is LIVE (S3 — BacklinksPanel). Attachments + metadata are LIVE (S6 —
// AttachmentsPanel + MetadataControls/CoverBanner via NotionHeader).
// ============================================================================
import type { ReactNode } from 'react'
import { View } from '@tamagui/core'
import { DashboardView, type DashboardBlock } from '@vida/ui'
import { AttachmentsPanel } from './attachments-list'
import { BacklinksPanel } from './backlinks-panel'
import { Eyebrow } from './note-chrome'
import { NotionHeader, PropertyRows } from './notion-header'
import { CoverBanner, MetadataControls } from './page-metadata'
// Type-only (erased at build) → no runtime import cycle with overview-registry.
import type { OverviewContext } from './overview-registry'

/** An inline merged section — eyebrow label + body, no box (EC-19). */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View gap="$8">
      <Eyebrow>{title}</Eyebrow>
      {children}
    </View>
  )
}

/** The `note` Overview: Properties · Attachments · Backlinks (EC-18f). Metadata controls ride in via NotionHeader
 *  (merged) + the Properties block (tabbed); the cover banner is merged-only (S6). */
export function NoteOverview({ page, mode }: OverviewContext) {
  if (mode === 'merged') {
    return (
      <View gap="$24">
        <NotionHeader page={page} />
        <Section title="Attachments">
          <AttachmentsPanel pageId={page.id} />
        </Section>
        <Section title="Backlinks">
          <BacklinksPanel entityType={page.type} entityId={page.id} />
        </Section>
      </View>
    )
  }
  const blocks: readonly DashboardBlock[] = [
    { id: 'properties', title: 'Properties', size: 'md', state: 'success' },
    // 'success' so each panel (which owns its own loading/error/empty/populated ladder) renders in both modes (S3/S6).
    { id: 'attachments', title: 'Attachments', size: 'md', state: 'success' },
    { id: 'backlinks', title: 'Backlinks', size: 'full', state: 'success' },
  ]
  return (
    // R3 G10: the cover strip at the TOP of the tabbed Overview too (the approved greybox), above the blocks.
    <View gap="$16">
      <CoverBanner cover={page.cover} />
      <DashboardView
        title="Overview"
        aria-label="Note overview"
        blocks={blocks}
        renderBlock={(b) => {
          // Properties block carries the read-only facts + the interactive metadata controls (D-S6-8).
          if (b.id === 'properties')
            return (
              <>
                <PropertyRows page={page} />
                <MetadataControls page={page} />
              </>
            )
          if (b.id === 'attachments') return <AttachmentsPanel pageId={page.id} />
          if (b.id === 'backlinks') return <BacklinksPanel entityType={page.type} entityId={page.id} />
          return null
        }}
      />
    </View>
  )
}
