// ============================================================================
// BacklinksPanel — the "what links here" panel body (fe-notes-and-pages #27, S3).
// Fills the S2 BacklinksSeam in BOTH overviews × BOTH modes. BODY-ONLY: the frame
// (merged Section eyebrow / tabbed Card title) supplies the "Backlinks" label.
//
// Split (the note-entity NoteEntityView precedent): BacklinksView is pure
// presentational (state-as-prop → all 4 states unit-tested directly); BacklinksPanel
// is the thin hook-wiring shell. One state ladder serves both modes.
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import type { BacklinkGroup } from './backlinks'
import { Eyebrow, Icon, Row, typeIcon } from './note-chrome'
import { useBacklinks, type BacklinkState } from './use-backlinks'

/** A muted single-line message (the S2 state-host voice). */
function Muted({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

/** Pure presentational — all 4 states as props (no hook, no env). */
export function BacklinksView({ groups, state }: { groups: BacklinkGroup[]; state: BacklinkState }) {
  if (state === 'loading') return <Muted busy>Loading…</Muted>
  if (state === 'error') return <Muted role="status">Couldn’t load what links here.</Muted>
  if (state === 'empty') return <Muted>Nothing links here yet.</Muted>
  return (
    <View gap="$16">
      {groups.map((group) => (
        <View key={group.module} gap="$8">
          <Eyebrow>{group.module}</Eyebrow>
          <View role="list" aria-label={group.module} gap="$8">
            {group.items.map((item) => (
              <View key={item.sourceId} role="listitem" gap="$2">
                <Row>
                  <Icon icon={typeIcon(item.type)} />
                  <Text fontSize="$body" color="$colorTextPrimary">
                    {item.title}
                  </Text>
                  {item.count > 1 ? (
                    <Text fontSize="$small" color="$colorTextMuted">
                      · {item.count} links
                    </Text>
                  ) : null}
                </Row>
                {item.snippet !== null ? (
                  <Text fontSize="$small" color="$colorTextMuted">
                    {item.snippet}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

/** The hook-wired shell: reads the data seam, delegates to the pure view. */
export function BacklinksPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { groups, state } = useBacklinks(entityType, entityId)
  return <BacklinksView groups={groups} state={state} />
}
