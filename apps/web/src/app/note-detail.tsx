// Note detail — MOD-notes ②b (LIF-131). The per-page route (`note/$id`,
// structure-data.md:40). ②b ships a PLACEHOLDER body (the page title) so
// navigation from the collection is real + testable; the TipTap editor + the
// 12 platform blocks + the `[[` picker mount in ②c. Token-only → dark-capable.
import { useParams } from '@tanstack/react-router'
import { styled, Text, View } from '@tamagui/core'
import { usePage } from './notes/hooks'

// A real <h1> — `render` emits the element (a runtime `tag`/`role` on Text is not honoured).
const PageHeading = styled(Text, { render: 'h1' })

export default function NoteDetailRoute() {
  const { id } = useParams({ from: '/note/$id' })
  const { data: page, state } = usePage(id)

  const title =
    page?.title != null && page.title !== ''
      ? page.title
      : state === 'loading'
        ? 'Loading…'
        : 'Untitled'

  return (
    <View padding="$24" gap="$12">
      <PageHeading fontFamily="$display" fontSize="$display" color="$colorTextPrimary">
        {title}
      </PageHeading>
      <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        The note editor mounts in MOD-notes ②c.
      </Text>
    </View>
  )
}
