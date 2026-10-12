// ============================================================================
// AttachmentsList — the note-page attachments list (fe-notes #27, S6; EC-8). Fills the
// S2 AttachmentsSeam. Split (the BacklinksView precedent): AttachmentsView is pure
// presentational (state-as-prop); AttachmentsPanel is the hook shell. The Add affordance
// is present; the real file→blob upload is deferred (D-S6-5).
// ============================================================================
import type { KeyboardEvent, ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { File, FileText, Image as ImageIcon, Paperclip, Trash2, type LucideIcon } from 'lucide-react'
import { formatBytes, type AttachmentItem } from './attachments'
import { Icon, Row } from './note-chrome'
import { useAttachments, type AttachmentsState } from './use-attachments'

function fileIconFor(mime: string): LucideIcon {
  if (mime.startsWith('image/')) return ImageIcon
  if (mime === 'application/pdf') return FileText
  return File
}

function Muted({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

/** A small pressable (role=button) with keyboard activation + focus ring. */
function PressIcon({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPress()
    }
  }
  return (
    <View
      role="button"
      aria-label={label}
      tabIndex={0}
      onPress={onPress}
      onKeyDown={onKeyDown}
      cursor="pointer"
      padding="$4"
      borderRadius="$sm"
      hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
      focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
    >
      <Icon icon={icon} />
    </View>
  )
}

function AddButton({ onAdd }: { onAdd: () => void }) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onAdd()
    }
  }
  return (
    <View
      role="button"
      aria-label="Add attachment"
      tabIndex={0}
      onPress={onAdd}
      onKeyDown={onKeyDown}
      cursor="pointer"
      alignSelf="flex-start"
      paddingVertical="$4"
      paddingHorizontal="$8"
      borderRadius="$sm"
      hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
      focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
    >
      <Row>
        <Icon icon={Paperclip} />
        <Text fontSize="$small" color="$colorTextPrimary">
          Add attachment
        </Text>
      </Row>
    </View>
  )
}

/** Pure presentational — all 4 states as props (no hook, no env). */
export function AttachmentsView({
  attachments,
  state,
  onAdd,
  onRemove,
}: {
  attachments: readonly AttachmentItem[]
  state: AttachmentsState
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  if (state === 'loading') return <Muted busy>Loading…</Muted>
  if (state === 'error') return <Muted role="status">Couldn’t load attachments.</Muted>
  if (state === 'empty')
    return (
      <View gap="$8">
        <Muted>No attachments yet.</Muted>
        <AddButton onAdd={onAdd} />
      </View>
    )
  return (
    <View gap="$8">
      <View role="list" gap="$4">
        {attachments.map((a) => (
          <Row key={a.id} role="listitem">
            <Icon icon={fileIconFor(a.mime)} />
            <Text flex={1} fontSize="$body" color="$colorTextPrimary">
              {a.filename}
            </Text>
            <Text fontSize="$small" color="$colorTextMuted">
              {formatBytes(a.sizeBytes)}
            </Text>
            <PressIcon icon={Trash2} label={`Remove ${a.filename}`} onPress={() => onRemove(a.id)} />
          </Row>
        ))}
      </View>
      <AddButton onAdd={onAdd} />
    </View>
  )
}

/** The hook-wired shell: reads the data seam, delegates to the pure view. */
export function AttachmentsPanel({ pageId }: { pageId: string }) {
  const { attachments, state, add, remove } = useAttachments(pageId)
  return <AttachmentsView attachments={attachments} state={state} onAdd={add} onRemove={remove} />
}
