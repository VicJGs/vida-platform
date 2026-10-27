// ============================================================================
// PageMetadata — the note-page metadata controls (fe-notes #27, S6; EC-7; live since notes-rescope R3). favorite ·
// archive · icon · cover, reflecting state + mutating via `updatePage` (usePageMetadata). Split
// (the BacklinksView precedent): MetadataControlsView is pure presentational; MetadataControls
// is the hook shell. CoverBanner is the real cover strip (R3 G10: URL or attachment thumbnail, both modes).
// ============================================================================
import { lazy, Suspense, useState, type KeyboardEvent } from 'react'
import { Text, View } from '@tamagui/core'
import { Archive, Image as ImageIcon, Smile, Star, type LucideIcon } from 'lucide-react'
import { Icon } from './note-chrome'
import { CoverImage } from './cover-image'
import { usePageMetadata } from './use-page-metadata'
import type { NoteEntityData } from './use-note-entity'

/** A control button; `pressed` (set) → aria-pressed toggle semantics; otherwise a plain action with `active` reflect. */
// R3: the pickers load lazily (PLAN G6 — "Icon grid picker (lazy-loaded)").
const IconPickerDialog = lazy(() => import('./icon-picker'))
const CoverPickerDialog = lazy(() => import('./cover-picker'))

function Ctrl({
  icon,
  label,
  pressed,
  active,
  busy,
  onPress,
}: {
  icon: LucideIcon
  label: string
  pressed?: boolean
  active?: boolean
  /** A write is in flight (R-10): `aria-disabled`, still focusable, presses ignored. */
  busy?: boolean
  onPress: () => void
}) {
  const press = () => {
    if (!busy) onPress()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      press()
    }
  }
  const on = pressed ?? active ?? false
  return (
    // Icon + VISIBLE label (the approved greybox, R3 G16): the accessible name IS the visible label (WCAG 2.5.3).
    <View
      role="button"
      aria-pressed={pressed === undefined ? undefined : pressed}
      aria-disabled={busy ? true : undefined}
      tabIndex={0}
      onPress={press}
      onKeyDown={onKeyDown}
      flexDirection="row"
      alignItems="center"
      gap="$4"
      paddingVertical="$4"
      paddingHorizontal="$8"
      borderRadius="$sm"
      opacity={busy ? 0.6 : 1}
      cursor={busy ? 'progress' : 'pointer'}
      backgroundColor={on ? '$colorSurfaceSecondary' : 'transparent'}
      hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
      focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
    >
      <Icon icon={icon} tone={on ? 'accent' : 'muted'} />
      <Text fontSize="$small" color={on ? '$colorBrandEmphasis' : '$colorTextPrimary'}>
        {label}
      </Text>
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
  busy,
}: {
  favorite: boolean
  archived: boolean
  icon: string | null
  cover: string | null
  onToggleFavorite: () => void
  onToggleArchive: () => void
  onChangeIcon: () => void
  onChangeCover: () => void
  busy?: boolean
}) {
  return (
    // The greybox order (R3 G16): Change icon · Change cover · Favorite · Archive.
    <View role="group" aria-label="Page metadata" flexDirection="row" flexWrap="wrap" gap="$8">
      <Ctrl icon={Smile} label={icon ? 'Change icon' : 'Add icon'} active={icon !== null} busy={busy} onPress={onChangeIcon} />
      <Ctrl icon={ImageIcon} label={cover ? 'Change cover' : 'Add cover'} active={cover !== null} busy={busy} onPress={onChangeCover} />
      <Ctrl icon={Star} label="Favorite" pressed={favorite} busy={busy} onPress={onToggleFavorite} />
      <Ctrl icon={Archive} label="Archive" pressed={archived} busy={busy} onPress={onToggleArchive} />
    </View>
  )
}

/** The hook-wired shell. */
export function MetadataControls({ page }: { page: NoteEntityData }) {
  const m = usePageMetadata(page)
  const [picker, setPicker] = useState<'icon' | 'cover' | null>(null)
  const close = (open: boolean) => {
    if (!open) setPicker(null)
  }
  return (
    <>
      <MetadataControlsView
        favorite={m.favorite}
        archived={m.archived}
        icon={m.icon}
        cover={m.cover}
        busy={m.isPending}
        onToggleFavorite={m.toggleFavorite}
        onToggleArchive={m.toggleArchive}
        onChangeIcon={() => setPicker('icon')}
        onChangeCover={() => setPicker('cover')}
      />
      {/* Suspense wraps ONLY the lazy dialog — the trigger stays mounted, so the Dialog's focus return lands on it. */}
      {picker === 'icon' && (
        <Suspense fallback={null}>
          <IconPickerDialog open onOpenChange={close} current={m.icon} onChoose={m.setIcon} />
        </Suspense>
      )}
      {picker === 'cover' && (
        <Suspense fallback={null}>
          <CoverPickerDialog open onOpenChange={close} pageId={page.id} current={m.cover} onChoose={m.setCover} />
        </Suspense>
      )}
    </>
  )
}

/** The page's cover strip at the top of the Overview (R3 G10 — BOTH modes, the greybox): the real image (URL or an
 *  attachment's thumbnail) or the neutral placeholder. Nothing when unset. */
export function CoverBanner({ cover }: { cover: string | null }) {
  if (cover === null) return null
  return <CoverImage cover={cover} variant="header" height={96} />
}
