// ============================================================================
// PageActions — the note page's title-row action slot (notes-rescope R1, G5/G6 · EC-34 · BR-R1-5/6).
// The save chip ("Saved on this device", `@vida/ui` SyncStatus — the page's ONE save announcement) + the ⋯ menu.
// The ⋯ renders only with ≥1 item (no dead affordance): its items arrive with their legs — Rename (R3), Move to Trash
// (R5), Save as template (R9). `PageSaveStatus` is also Home's chip (journal frame).
// ============================================================================
import { useId } from 'react'
import { View } from '@tamagui/core'
import { Button, Menu, SyncStatus, type MenuItem, type SyncStatusProps } from '@vida/ui'
import { MoreHorizontal } from 'lucide-react'
import { useSaveStatus } from './save-status'

export interface PageSaveStatusProps extends Omit<SyncStatusProps, 'state'> {
  pageId: string
  /** The body is unreadable at load (`contentStatus === 'malformed'`) — hidden synchronously, no store write in render. */
  locked: boolean
}

/** The page's save chip; nothing while the body is locked (the EC-33 notice speaks instead). */
export function PageSaveStatus({ pageId, locked, ...rest }: PageSaveStatusProps) {
  const status = useSaveStatus(pageId)
  if (locked || status === 'locked') return null
  return <SyncStatus state={status} {...rest} />
}

export interface PageActionsProps {
  pageId: string
  locked: boolean
  items: ReadonlyArray<MenuItem>
}

export function PageActions({ pageId, locked, items }: PageActionsProps) {
  // The ⋯ panel is labelled by its trigger (R1 carry, R3 G13) — the trigger keeps its own aria-label.
  const triggerId = useId()
  return (
    <View flexDirection="row" alignItems="center" gap="$8" flexShrink={0}>
      <PageSaveStatus pageId={pageId} locked={locked} />
      {items.length > 0 ? (
        <Menu
          aria-labelledby={triggerId}
          placement="bottom-end"
          items={items}
          trigger={
            <Button
              id={triggerId}
              intent="ghost"
              size="sm"
              aria-label="Page actions"
              leading={<MoreHorizontal size={16} strokeWidth={2} />}
            />
          }
        />
      ) : null}
    </View>
  )
}
