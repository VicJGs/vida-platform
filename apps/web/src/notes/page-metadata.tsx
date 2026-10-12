// ============================================================================
// PageMetadata — the note-page metadata controls (fe-notes #27, S6; EC-7). favorite ·
// archive · icon · cover, reflecting state + mutating via (stubbed) updatePage. Split
// (the BacklinksView precedent): MetadataControlsView is pure presentational; MetadataControls
// is the hook shell. CoverBanner is a merged-only placeholder strip (NOT a media component —
// cover is [E] with no blob pipeline in M1, D-S6-5). Rendered in BOTH modes (D-S6-8).
// ============================================================================
import type { KeyboardEvent } from 'react'
import { Text, View } from '@tamagui/core'
import { Archive, Image as ImageIcon, Smile, Star, type LucideIcon } from 'lucide-react'
import { Icon } from './note-chrome'
import { usePageMetadata } from './use-page-metadata'
import type { NoteEntityData } from './use-note-entity'

/** A control button; `pressed` (set) → aria-pressed toggle semantics; otherwise a plain action with `active` reflect. */
function Ctrl({
  icon,
  label,
  pressed,
  active,
  onPress,
}: {
  icon: LucideIcon
  label: string
  pressed?: boolean
  active?: boolean
  onPress: () => void
}) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPress()
    }
  }
  const on = pressed ?? active ?? false
  return (
    <View
      role="button"
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      tabIndex={0}
      onPress={onPress}
      onKeyDown={onKeyDown}
      cursor="pointer"
      padding="$8"
      borderRadius="$sm"
      backgroundColor={on ? '$colorSurfaceSecondary' : 'transparent'}
      hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
      focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
    >
      <Icon icon={icon} tone={on ? 'accent' : 'muted'} />
    </View>
  )
}

/** Pure presentational — reflects state + fires handlers (no hook). */
export function MetadataControlsView({
  favorite,
  archived,
  icon,
  cover,
  onToggleFavorite,
  onToggleArchive,
  onChangeIcon,
  onChangeCover,
}: {
  favorite: boolean
  archived: boolean
  icon: string | null
  cover: string | null
  onToggleFavorite: () => void
  onToggleArchive: () => void
  onChangeIcon: () => void
  onChangeCover: () => void
}) {
  return (
    <View role="group" aria-label="Page metadata" flexDirection="row" gap="$8">
      <Ctrl icon={Star} label="Favorite" pressed={favorite} onPress={onToggleFavorite} />
      <Ctrl icon={Archive} label="Archive" pressed={archived} onPress={onToggleArchive} />
      <Ctrl icon={Smile} label={icon ? 'Change icon' : 'Add icon'} active={icon !== null} onPress={onChangeIcon} />
      <Ctrl icon={ImageIcon} label={cover ? 'Change cover' : 'Add cover'} active={cover !== null} onPress={onChangeCover} />
    </View>
  )
}

/** The hook-wired shell. */
export function MetadataControls({ page }: { page: NoteEntityData }) {
  const m = usePageMetadata(page)
  return (
    <MetadataControlsView
      favorite={m.favorite}
      archived={m.archived}
      icon={m.icon}
      cover={m.cover}
      onToggleFavorite={m.toggleFavorite}
      onToggleArchive={m.toggleArchive}
      onChangeIcon={m.changeIcon}
      onChangeCover={m.changeCover}
    />
  )
}

/** A merged-only cover placeholder strip when `cover` is set (NOT a media fetch — D-S6-5). */
export function CoverBanner({ cover }: { cover: string | null }) {
  if (cover === null) return null
  return (
    <View
      role="img"
      aria-label="Cover"
      height={96}
      borderRadius="$md"
      backgroundColor="$colorSurfaceSecondary"
      alignItems="center"
      justifyContent="center"
    >
      <Text fontSize="$caption" color="$colorTextMuted" textTransform="uppercase" letterSpacing={0.8}>
        Cover
      </Text>
    </View>
  )
}
