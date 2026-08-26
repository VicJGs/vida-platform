// ============================================================================
// Link panels — MOD-notes ② · B4 (LIF-131). The note-detail rail's Links-out +
// Backlinks sections; the Backlinks one is ALSO the `/backlink` block body.
//   • LinksOutPanel  — this page's OUTGOING links (page_links ⊕ entity_links),
//                      two distinct groups, each row navigable + REMOVABLE.
//   • BacklinksPanel — what references this page (getBacklinks = AR-8 ⊕ A2),
//                      two distinct groups, READ-ONLY (BR-B4-7).
// Terminal states are the doc-fixed set (business-rules.md:32). Titles resolve
// by id (NP-7) via useNoteTitle. Spec: b4-link-panels.md · BR-B4-1/2/3/7/8.
// ============================================================================

import type { ReactElement } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button } from '@vida/ui'
import { Link } from '@tanstack/react-router'
import type { EntityLinkRow, PageLinkRow } from '@vida/core'
import { deriveTerminalState } from '../../state-conventions/terminal-state'
import {
  useBacklinks,
  useLinksOut,
  useNoteTitle,
  useRemoveEntityLink,
  useRemovePageLink,
} from './use-note'

// ── styled parts (mirror the B2 rail language — token spacing only) ──────────────────────────────────────────────────
const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  fontWeight: '$semibold',
  color: '$colorTextMuted',
})
const GroupLabel = styled(Text, { fontFamily: '$body', fontSize: '$caption', color: '$colorTextMuted' })
const Row = styled(View, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '$8' })
const Muted = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted' })
const Section = styled(View, { flexDirection: 'column', gap: '$4' })

// ── a single link row: resolve the target title by id (NP-7), navigate by id, optional remove (BR-B4-7/8) ────────────
function LinkRow({ targetId, onRemove }: { targetId: string; onRemove?: () => void }): ReactElement {
  const title = useNoteTitle(targetId).data?.title ?? 'Untitled'
  return (
    <Row>
      <Link to="/note/$id" params={{ id: targetId }} aria-label={`Open ${title}`}>
        {title}
      </Link>
      {onRemove ? (
        <Button intent="ghost" size="sm" aria-label={`Remove link to ${title}`} onPress={onRemove}>
          ✕
        </Button>
      ) : null}
    </Row>
  )
}

// A group of link rows, or its own per-group empty line (never a blank half — BR-B4-3).
function LinkGroup({
  label,
  rows,
  empty,
}: {
  label: string
  rows: ReactElement[]
  empty: string
}): ReactElement {
  return (
    <Section>
      <GroupLabel>{label}</GroupLabel>
      {rows.length === 0 ? <Muted>{empty}</Muted> : rows}
    </Section>
  )
}

// ── Links-out (BR-B4-3): OUTGOING — page_links target = target_page_id; entity_links target = entity_id ──────────────
export function LinksOutPanel({ id }: { id: string }): ReactElement {
  const query = useLinksOut(id)
  const removePageLink = useRemovePageLink(id)
  const removeEntityLink = useRemoveEntityLink(id)
  const state = deriveTerminalState(query, (d) => d.pageLinks.length === 0 && d.entityLinks.length === 0)

  return (
    <Section aria-label="Links out">
      <SectionLabel>Links out</SectionLabel>
      {state === 'loading' ? (
        <Muted role="status" aria-busy>
          Querying links…
        </Muted>
      ) : state === 'error' ? (
        <Row>
          <Muted role="status">Couldn’t load links.</Muted>
          <Button intent="ghost" size="sm" onPress={() => void query.refetch()}>
            Retry
          </Button>
        </Row>
      ) : state === 'empty' || !query.data ? (
        <Muted role="status">This note doesn’t link out yet.</Muted>
      ) : (
        <>
          <LinkGroup
            label="Page links"
            empty="No page links"
            rows={query.data.pageLinks.map((r: PageLinkRow) => (
              <LinkRow
                key={r.id}
                targetId={r.target_page_id}
                onRemove={() => removePageLink.mutate(r.target_page_id)}
              />
            ))}
          />
          <LinkGroup
            label="Entity links"
            empty="No entity links"
            rows={query.data.entityLinks.map((r: EntityLinkRow) => (
              <LinkRow
                key={r.id}
                targetId={r.entity_id}
                onRemove={() => removeEntityLink.mutate({ entityType: r.entity_type, entityId: r.entity_id })}
              />
            ))}
          />
        </>
      )}
    </Section>
  )
}

// ── Backlinks (BR-B4-2): INCOMING — page_links source = source_page_id; entity_links source = page_id. READ-ONLY. ────
export function BacklinksPanel({ id }: { id: string }): ReactElement {
  const query = useBacklinks(id)
  const state = deriveTerminalState(query, (d) => d.entityLinks.length === 0 && d.pageLinks.length === 0)

  return (
    <Section aria-label="Backlinks">
      <SectionLabel>Backlinks</SectionLabel>
      {state === 'loading' ? (
        <Muted role="status" aria-busy>
          Querying links…
        </Muted>
      ) : state === 'error' ? (
        <Row>
          <Muted role="status">Couldn’t load backlinks.</Muted>
          <Button intent="ghost" size="sm" onPress={() => void query.refetch()}>
            Retry
          </Button>
        </Row>
      ) : state === 'empty' || !query.data ? (
        <Muted role="status">Nothing links here yet.</Muted>
      ) : (
        <>
          <LinkGroup
            label="Page links"
            empty="No page links"
            rows={query.data.pageLinks.map((r: PageLinkRow) => (
              <LinkRow key={r.id} targetId={r.source_page_id} />
            ))}
          />
          <LinkGroup
            label="Entity links"
            empty="No entity links"
            rows={query.data.entityLinks.map((r: EntityLinkRow) => (
              <LinkRow key={r.id} targetId={r.page_id} />
            ))}
          />
        </>
      )}
    </Section>
  )
}
