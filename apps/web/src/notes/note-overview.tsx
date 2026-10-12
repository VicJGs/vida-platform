// ============================================================================
// note-overview — the per-entity-type Layout-facet renderers (fe-notes-and-pages
// #27, S2). Each renderer feeds BOTH modes from one set of sections (envision
// round-2d): MERGED = a continuous Notion page (NotionHeader → inline Eyebrow
// sections, no boxes — EC-19); TABBED = a DashboardView Card grid (EC-18f).
//
// S2 ships `note` (full) + `journal` (stub); task/milestone/deliverable Overviews
// RIDE in from fe-tasks/fe-projects via `registerOverview` (overview-registry).
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
import { MetadataControls } from './page-metadata'
import { SummaryBlock } from './summary-block'
// Type-only (erased at build) → no runtime import cycle with overview-registry.
import type { OverviewContext, OverviewRenderer } from './overview-registry'

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
export const noteOverview: OverviewRenderer = ({ page, mode }: OverviewContext) => {
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
  )
}

/** The `journal` Overview STUB (EC-15/EC-18a): the daily OS dashboard arrives with fe-journals; S2 ships the
 *  /summary seam (filled S5) + properties, honest-empty elsewhere. */
export const journalOverviewStub: OverviewRenderer = ({ page, mode }: OverviewContext) => {
  if (mode === 'merged') {
    return (
      <View gap="$24">
        <NotionHeader page={page} />
        <Section title="Summary">
          <SummaryBlock date={page.journalDate} />
        </Section>
        <Section title="Backlinks">
          <BacklinksPanel entityType={page.type} entityId={page.id} />
        </Section>
      </View>
    )
  }
  const blocks: readonly DashboardBlock[] = [
    // 'success' so SummaryBlock (which owns its own loading/error/empty/populated ladder) renders in both modes (D-S5-8).
    { id: 'summary', title: 'Summary', size: 'full', state: 'success' },
    { id: 'properties', title: 'Properties', size: 'md', state: 'success' },
  ]
  return (
    <DashboardView
      title="Overview"
      aria-label="Journal overview"
      blocks={blocks}
      renderBlock={(b) => {
        if (b.id === 'summary') return <SummaryBlock date={page.journalDate} />
        if (b.id === 'properties') return <PropertyRows page={page} />
        return null
      }}
    />
  )
}
