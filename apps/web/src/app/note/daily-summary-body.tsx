// ============================================================================
// dailySummary block body — MOD-notes ② · B7 (LIF-131). The REAL inline body the
// editor's `dailySummary` node-view delegates to (BR-B7-1), replacing the E5
// placeholder. It reads the node's {date, sections} attrs, calls B7's own
// buildJournalSummary (which consumes MOD-journals' engine — inert today), and
// renders ONE card per enabled summary row. Each row degrades independently to
// 'empty' ("available when Journals ships" — NOT an error, business-rules.md:30);
// the block NEVER blanks (structural — a card always renders per row; the no-rows
// case renders an explicit non-blank surface, R2). Read-only body (ignores the
// updateAttributes/deleteNode mutators). §XXVIII refinement (surfaced, not silent):
// the A7 summary-config fallback is read INSIDE the body via useSummaryConfig(pageId)
// — mirrors B4's CommittedRef reading useNoteTitle internally — instead of a threaded
// `config` prop. `[FACT: b7-summary-block.md BR-B7-1/3/4; entity-link-body.tsx pattern]`
// ============================================================================

import type { ReactElement } from 'react'
import { styled, Text, View } from '@tamagui/core'
import type { DailySummarySectionType } from '@vida/types'
import { buildJournalSummary, sectionsFromConfig, type SummaryRow } from './build-journal-summary'
import { useSummaryConfig } from './use-note'

/** Human labels for the 6 summary rows (the block enum). `[FACT: editor.ts:56-63 DAILY_SUMMARY_SECTION_TYPE]` */
const SECTION_LABEL: Record<DailySummarySectionType, string> = {
  habits: 'Habits',
  tasks: 'Tasks',
  study: 'Study',
  transactions: 'Transactions',
  interactions: 'Interactions',
  routines: 'Routines',
}

// ── styled parts (base tokens only — the B2/B3/B4 language; no injected CSS/motion) ───────────────────────────────────
const SummaryCard = styled(View, {
  flexDirection: 'column',
  gap: '$2',
  paddingHorizontal: '$12',
  paddingVertical: '$8',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
})
const Region = styled(View, { flexDirection: 'column', gap: '$4' })
const CardTitle = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextPrimary' })
const CardText = styled(Text, { fontFamily: '$body', fontSize: '$caption', color: '$colorTextMuted' })

/** One summary row → a named card in its terminal state. Inert → the muted "available when Journals ships" message. */
function RowCard({ row }: { row: SummaryRow }): ReactElement {
  const label = SECTION_LABEL[row.section] ?? row.section
  return (
    <SummaryCard role="group" aria-label={`${label} — ${row.state}`} contentEditable={false}>
      <CardTitle>{label}</CardTitle>
      {row.state === 'empty' ? (
        <CardText fontStyle="italic">{row.message ?? 'Nothing today'}</CardText>
      ) : row.state === 'error' ? (
        <CardText>Couldn’t load this section</CardText>
      ) : row.state === 'loading' ? (
        <CardText>Loading…</CardText>
      ) : (
        row.dataPoints.map((p) => <CardText key={p.id}>{p.label}</CardText>)
      )}
    </SummaryCard>
  )
}

/**
 * The `/summary` block body. Rows come from the block's `sections` attr (CB2, authoritative); when empty, they fall
 * back to the A7 persisted `summary_config` (BR-B7-4). The block never blanks: an empty row-set renders an explicit
 * non-blank surface (R2). `[FACT: b7-summary-block.md §3/§5, BR-B7-3/4]`
 */
export function DailySummaryBody({
  attrs,
  pageId,
}: {
  attrs: { date: string | null; sections: readonly DailySummarySectionType[] }
  pageId: string
}): ReactElement {
  const config = useSummaryConfig(pageId).data
  // R1 — ctx.attrs is loosely typed; the `sections` default is `() => []` so it is normally an array, but guard anyway.
  const attrSections = Array.isArray(attrs.sections) ? attrs.sections : []
  const rows: readonly DailySummarySectionType[] =
    attrSections.length > 0 ? attrSections : config != null ? sectionsFromConfig(config) : []
  // R1 (symmetric with sections) — ctx.attrs is loosely typed; harden the frozen `date` slot #33 will feed to the engine.
  const date = typeof attrs.date === 'string' ? attrs.date : null
  const summary = buildJournalSummary(date, rows)

  return (
    <Region className="vida-daily-summary" role="note" aria-label="Daily summary" contentEditable={false}>
      {summary.length === 0 ? (
        <SummaryCard role="group" aria-label="No summary sections configured" contentEditable={false}>
          <CardTitle>Daily summary</CardTitle>
          <CardText fontStyle="italic">No summary sections configured — available when Journals ships</CardText>
        </SummaryCard>
      ) : (
        summary.map((row) => <RowCard key={row.section} row={row} />)
      )}
    </Region>
  )
}
