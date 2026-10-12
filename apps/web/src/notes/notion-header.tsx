// ============================================================================
// NotionHeader — the Notion page chrome for the note-entity MERGED layout
// (fe-notes-and-pages #27, S2). Icon badge + continuous property ROWS, NO boxes
// (EC-19). The frame (EntityView) owns the serif title; `cover_image` is an M1 seam
// (no field in the stub). `PropertyRows` is reused by the tabbed Overview grid.
// ============================================================================
import { Text, View } from '@tamagui/core'
import { Clock, Hash, type LucideIcon } from 'lucide-react'
import { Icon, Row, typeIcon, typeLabel } from './note-chrome'
import { CoverBanner, MetadataControls } from './page-metadata'
import type { NoteEntityData } from './use-note-entity'

export interface NotionHeaderProps {
  page: NoteEntityData
}

function PropRow({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Row>
      <Icon icon={icon} size={14} />
      <Text fontSize="$small" color="$colorTextMuted" width={96}>
        {label}
      </Text>
      <Text fontSize="$small" color="$colorTextPrimary">
        {value}
      </Text>
    </Row>
  )
}

/** The continuous property rows — shared by the merged NotionHeader and the tabbed Properties block (EC-18f).
 *  Read-only FACTS only (Type · Updated); favorite/archived are now MetadataControls toggles (S6 — no duplicate display). */
export function PropertyRows({ page }: NotionHeaderProps) {
  return (
    <View gap="$8">
      <PropRow icon={Hash} label="Type" value={typeLabel(page.type)} />
      <PropRow icon={Clock} label="Updated" value={page.updated} />
    </View>
  )
}

/** The merged-mode page head: cover banner (if set) · icon badge · metadata controls · property rows (EC-7/EC-19/EC-22). */
export function NotionHeader({ page }: NotionHeaderProps) {
  const PageIcon = typeIcon(page.type)
  return (
    <View gap="$12">
      <CoverBanner cover={page.cover} />
      <View
        width={48}
        height={48}
        borderRadius="$md"
        backgroundColor="$colorSurfaceSecondary"
        alignItems="center"
        justifyContent="center"
      >
        <Icon icon={PageIcon} size={26} tone="primary" />
      </View>
      <MetadataControls page={page} />
      <PropertyRows page={page} />
    </View>
  )
}
