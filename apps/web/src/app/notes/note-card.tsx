// NoteCard — MOD-notes ②b (LIF-131). One note row/tile: an interactive UI-1 Card
// that navigates to the per-page detail (`note/$id`, structure-data.md:40). The
// `renderItem` for the List + Gallery views. Presentational — reads PageRow fields
// only; no business logic (NC-8). Token-only → dark-capable (NC-6). The Card owns
// role="button" + Enter/Space + the focus ring; we own the content + onPress (NC-4).
import { Card } from '@vida/ui'
import { Text, View } from '@tamagui/core'
import { useNavigate } from '@tanstack/react-router'
import type { PageRow } from '@vida/core'

export interface NoteCardProps {
  page: PageRow
}

/** A short "Note · <date>" meta line from the row's plaintext fields (M1.0 pass-through). */
function metaLine(page: PageRow): string {
  const when = new Date(page.updated_at).toLocaleDateString()
  return `Note · ${when}`
}

export function NoteCard({ page }: NoteCardProps) {
  const navigate = useNavigate()
  return (
    <Card
      interactive
      onPress={() => navigate({ to: '/note/$id', params: { id: page.id } })}
      aria-label={page.title ?? 'Untitled note'}
    >
      <View gap="$4">
        <Text
          fontFamily="$body"
          fontSize="$body"
          fontWeight="500"
          color="$colorTextPrimary"
          numberOfLines={1}
        >
          {page.title != null && page.title !== '' ? page.title : 'Untitled'}
        </Text>
        <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted" numberOfLines={1}>
          {metaLine(page)}
        </Text>
      </View>
    </Card>
  )
}

export default NoteCard
