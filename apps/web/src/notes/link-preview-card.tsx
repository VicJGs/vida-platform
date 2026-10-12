// ============================================================================
// PreviewCard — a wiki-link target preview (fe-notes-and-pages #27, S4; EC-11 / BSE-12).
// Renders with AVAILABLE data only (title + type); enrichment (snippet/thumbnail) is
// deferred to M1.1+ — never a dead/empty card. A WikiCandidate always has a title.
//
// Its real mount (hover on a `[[link]]` in the editor) is a ui-3 concern; S4 ships it
// presentational + demonstrates it in the `?picker` dev-gate.
// ============================================================================
import { Text, View } from '@tamagui/core'
import type { WikiCandidate } from './wikilink'
import { Icon, Row, typeIcon, typeLabel } from './note-chrome'

export function PreviewCard({ target }: { target: WikiCandidate }) {
  return (
    <View
      role="group"
      aria-label={`Link preview: ${target.title}`}
      gap="$2"
      padding="$8"
      maxWidth={320}
      backgroundColor="$colorSurfacePrimary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
    >
      <Row>
        <Icon icon={typeIcon(target.type)} />
        <Text fontSize="$body" color="$colorTextPrimary">
          {target.title}
        </Text>
      </Row>
      <Text fontSize="$small" color="$colorTextMuted">
        {typeLabel(target.type)}
      </Text>
    </View>
  )
}
