import { useId, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button } from './button'
import { Card } from './card'
import { EmptyState } from './empty-state'
import { HonestProgress } from './sync-status'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// CanvasReader — the CODEC Canvas: Reader shell (fe-codec-canvas-reader #9, S1).
// The 5th archetype shell (Collection #4 · Dashboard #5 · Entity #6 · Flow/Session #11 · Reader #9 ← this).
// A long-form read·listen·annotate FRAME: a title-hero header + a measured reading column (the hero) rendered
// through a `renderContent` slot + the shell-owned terminal/access states. The Contents panel (S2), margin rail
// (S3), selection affordance (S4), and listen bar (S5) EXTEND this frame in later slices — S1 ships the frame,
// header, reading column, and states so they gate independently.
// Presentational, state-as-prop (BR-2); @vida/ui is Tamagui-only → all types LOCAL, no @vida/core import.
// Non-generic → React-19 ref-as-prop (no forwardRef). The flow-session-view pattern.
// Spec: docs/specs/foundation/fe-codec-canvas-reader/ (delivery/ + PLAN-S1-frame.md).
// ============================================================================

/** The reading-column state (BR-S1-5): extends the shared `ViewState` with `unavailable` — access (a physical copy /
 *  no openable file), a calm state DISTINCT from `empty` (IR-NEEDS-4). */
export type ReaderState = ViewState | 'unavailable'

/** The listen-bar state (S5 / EC-7 / BR-S5-1): `idle` (ready) · `playing` (live, HonestProgress) · `unavailable` (TTS
 *  deny-safe — a CALM status, never an error, IR-7). A LOCAL union (the `ReaderState` precedent; no @vida/core import). */
export type ListenMode = 'idle' | 'playing' | 'unavailable'

/** A flat-TOC chapter (S2 / EC-13) — mirrors `book_chapters` by VALUE (no @vida/core import). */
export interface ReaderChapter {
  id: string
  number: number
  /** @encrypted-origin — the chapter title (plain ReactNode here). */
  title: ReactNode
  /** e.g. "p. 56" — the start-page ref. */
  pageRef?: ReactNode
  done?: boolean
  current?: boolean
}

/** The three annotation natures (S3 / IR-2). Highlights are NEVER linkable (IR-1 / BR-S3-2). */
export type Nature = 'highlight' | 'bookmark' | 'quote'

/** One annotation row (S3). `location` is ALREADY RESOLVED by the adapter (S6) — the shell only renders it,
 *  it never parses `position` or derives the chapter (EC-14 / IR-8 / BR-S3-4). */
export interface ReaderAnnotation {
  id: string
  nature: Nature
  /** @encrypted-origin — the annotation excerpt (3-line clamped in the rail, BR-S3-3a). */
  text: ReactNode
  /** a ready "Ch. 4 · p. 56 · line 12" node (the adapter resolves it; the shell renders it). */
  location: ReactNode
}

/** Annotations PRE-GROUPED by chapter (S3 / EC-14). The adapter (S6) builds the groups — the shell never groups,
 *  sorts, or parses (BR-S3-1; the board-view / list-view `sections` precedent). `id`/`title` = chapter id/title;
 *  an unresolved-position bucket ("Unplaced") is the adapter's concern. */
export interface AnnotationGroup {
  id: string
  title: ReactNode
  annotations: ReaderAnnotation[]
}

export interface CanvasReaderProps {
  /** The book title — names the region + renders as the serif $display H1 (BR-S1-1 / EC-2). */
  title: string
  /** ONE quiet plain-language location line (e.g. "Chapter 4 of 10, page 56") — $small muted, 16px below the title. */
  context?: ReactNode
  /** 0..1 reading fraction → the HonestProgress bar. Rendered ONLY when provided (a reader has no stages to derive). */
  progress?: number
  /** The progress bar label; derived ("N% read") when omitted. */
  progressLabel?: string
  /** The save-state slot (e.g. a SyncStatus pill) — right-aligned. */
  saveStatus?: ReactNode
  /** The ⋯ action SLOT — right-aligned. */
  action?: ReactNode
  /** The honest not-synced position line (IR-3) — a quiet $small muted line under the context; rendered only when provided. */
  positionNote?: ReactNode

  /** The reading-column state (BR-2); default 'success'. Shell owns loading/empty/error/unavailable. */
  state?: ReaderState
  /** The format-agnostic reading body — called ONLY on `state==='success'` (the renderStage precedent, BR-S1-4). */
  renderContent?: () => ReactNode
  /** The empty-state title (teaching invitation); default "Nothing to read yet". */
  emptyTitle?: string
  /** The empty-state way-in (a slot for one or more ui-1 Buttons). */
  emptyAction?: ReactNode

  // ── Contents panel (S2) ──
  /** The book summary ("About") — the book-level Notes page content; the shell renders the slot (BR-S2-2). */
  summary?: ReactNode
  /** The flat TOC (BR-S2-1); scales to many chapters. */
  chapters?: ReaderChapter[]
  /** Panel visibility; app-owned (R5). Default: open when `summary`/`chapters` exist. */
  contentsOpen?: boolean
  /** Wire the "Contents" header toggle; the toggle renders only when provided (BR-S2-4). */
  onToggleContents?: () => void
  /** Chapter rows become pressable only when provided (the `collection onFilter` precedent, BR-S2-3). */
  onJumpToChapter?: (chapterId: string) => void

  // ── Margin rail (S3) ──
  /** Annotations PRE-GROUPED by chapter (BR-S3-1); the adapter (S6) builds the groups. */
  annotationGroups?: AnnotationGroup[]
  /** The rail state (BR-2 / BR-S3-6); default 'success'. `ViewState` — annotations have no access-`unavailable` concept. */
  annotationsState?: ViewState
  /** Rail visibility; app-owned (R5). Default: open when annotations exist. */
  railOpen?: boolean
  /** Wire the "Annotations" header toggle; the toggle renders only when provided (BR-S3-7). */
  onToggleRail?: () => void
  /** Add-note intent — the SHELL ENFORCES IR-1: never offered on a highlight row (BR-S3-2 / BR-S3-9). */
  onAddNote?: (annotationId: string) => void
  /** Link intent — bookmark & quote only (IR-1 shell-enforced). */
  onLinkAnnotation?: (annotationId: string) => void

  // ── Listen bar (S5) ──
  /** The listen state (BR-S5-1); the slim persistent bar renders ONLY when provided (the `progress` render-when-provided
   *  precedent). Drives the three honest states (idle · playing · unavailable). */
  listen?: ListenMode
  /** 0..1 playback fraction → the HonestProgress bar, shown in `playing` ONLY and only when provided (honest, no fake fill). */
  listenProgress?: number
  /** The listen label; default "Listen to this book". */
  listenLabel?: ReactNode
  /** Toggle intent — emits, never writes (IR-5). The control renders on idle/playing only when provided (BR-S5-4). */
  onListenToggle?: () => void

  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention; DIRECT semantic tokens) ───────────
const CanvasRoot = styled(View, { flexDirection: 'column', gap: '$24', width: '100%', maxWidth: 1280, marginHorizontal: 'auto', padding: '$16' })
// flexWrap: at 375 the aside wraps BELOW the title so the title keeps full width (else the RNW min-width:0 flex-collapse
// squeezes the serif $display title into mid-word breaks — Visual-Gate caught). TitleGroup floors at 240 + grows.
const Header = styled(View, { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '$16', flexWrap: 'wrap' })
const TitleGroup = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: 240, minWidth: 240, gap: '$16' }) // 16px title→meta rhythm (EC-2)
const MetaGroup = styled(View, { gap: '$8', maxWidth: 480 })
const HeaderAside = styled(View, { flexShrink: 0, alignItems: 'flex-end', gap: '$8' })
// S1 Body centers the lone reading column; S2 (Contents) + S3 (rail) turn it into the 3-zone living-margin row.
const Body = styled(View, { flexDirection: 'row', flexWrap: 'wrap', gap: '$24', alignItems: 'flex-start', justifyContent: 'center' })
const ReadingColumn = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: 440, minWidth: 280, maxWidth: 660, gap: '$16' })
const SkeletonRow = styled(View, { height: 12, borderRadius: '$sm', backgroundColor: '$colorSurfaceSecondary' })
const MetaToggles = styled(View, { flexDirection: 'row', gap: '$8', flexWrap: 'wrap' })
// Contents panel (S2) — the left zone; flexShrink:1 (RNW never-collapse) so it stacks above the column at 375 (BR-S2-5).
const ContentsZone = styled(View, { flexGrow: 0, flexShrink: 1, flexBasis: 260, minWidth: 220, gap: '$12', borderRightWidth: 1, borderRightColor: '$colorBorderDefault', paddingRight: '$16' })
const PanelLabel = styled(Text, { fontFamily: '$body', fontSize: '$small', fontWeight: '500', color: '$colorTextMuted' })
const SummaryText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted', lineHeight: 20 })
const ChapterRowHost = styled(View, {
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: '$8',
  paddingVertical: '$4',
  borderRadius: '$sm',
  variants: {
    interactive: { true: { cursor: 'pointer', hoverStyle: { backgroundColor: '$colorSurfaceSecondary' }, focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 } } },
  } as const,
})
// Annotations rail (S3) — the RIGHT zone; mirrors ContentsZone (RNW never-collapse) with a LEFT divider so it stacks
// below the column at 375 (BR-S3-8). flexShrink:1 so the title/column keep width when the rail is present.
const RailZone = styled(View, { flexGrow: 0, flexShrink: 1, flexBasis: 280, minWidth: 220, gap: '$12', borderLeftWidth: 1, borderLeftColor: '$colorBorderDefault', paddingLeft: '$16' })
// Per-nature accent marker — a GRAPHICAL object (≥3:1, BR-S3-3): shape/fill distinguishes the three natures; the
// label is the non-colour signal. All-accent ($colorBrandPrimary, the calendar-dot / list-tick graphical token).
const NatureMarker = styled(View, {
  width: 10,
  height: 10,
  borderRadius: '$sm',
  marginTop: '$4',
  variants: {
    nature: {
      highlight: { backgroundColor: '$colorBrandPrimary' }, // filled block — a marked span
      bookmark: { borderWidth: 2, borderColor: '$colorBrandPrimary', backgroundColor: 'transparent' }, // outlined
      quote: { width: 3, height: 16, borderRadius: 0, backgroundColor: '$colorBrandPrimary', marginTop: '$2' }, // accent bar
    },
  } as const,
})
const AnnotationRowHost = styled(View, { flexDirection: 'row', gap: '$8', paddingVertical: '$8' })
// Chapter group header = the group eyebrow (primary) + a per-chapter count (muted) — the SectionHeader eyebrow recipe.
const ChapterEyebrow = styled(Text, { fontFamily: '$body', fontSize: '$caption', fontWeight: '600', color: '$colorTextPrimary', textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 1 })
const NatureLabel = styled(Text, { fontFamily: '$body', fontSize: '$caption', fontWeight: '600', color: '$colorTextMuted', textTransform: 'uppercase', letterSpacing: 0.6 })
const LocationText = styled(Text, { fontFamily: '$body', fontSize: '$caption', color: '$colorTextMuted', flexShrink: 0 })
const AnnotationText = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextPrimary', lineHeight: 20 })
const CountText = styled(Text, { fontFamily: '$body', fontSize: '$caption', color: '$colorTextMuted' })

// The reading column body — degrade-never-crash. renderContent runs ONLY on success (a block is CONTENT, not self-stating).
function ReadingBody({
  state,
  renderContent,
  emptyTitle,
  emptyAction,
}: {
  state: ReaderState
  renderContent?: () => ReactNode
  emptyTitle?: string
  emptyAction?: ReactNode
}) {
  if (state === 'loading')
    return (
      <Card padding="spacious">
        <View aria-busy="true" gap="$12">
          <SkeletonRow width="40%" />
          <SkeletonRow width="92%" />
          <SkeletonRow width="88%" />
          <SkeletonRow width="94%" />
          <SkeletonRow width="70%" />
        </View>
      </Card>
    )
  if (state === 'empty')
    return (
      <EmptyState title={emptyTitle ?? 'Nothing to read yet'} action={emptyAction}>
        Add an EPUB or PDF to this book and it opens here to read, listen, and annotate.
      </EmptyState>
    )
  if (state === 'error')
    return (
      <Card padding="spacious">
        <View role="status">
          <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Couldn’t open this book. Try again.</Text>
        </View>
      </Card>
    )
  // access-unavailable — DISTINCT calm state from empty (IR-NEEDS-4): a physical copy / no openable file.
  if (state === 'unavailable')
    return (
      <Card padding="spacious">
        <View role="status">
          <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">This is a physical copy — there’s no file to open here.</Text>
        </View>
      </Card>
    )
  // success — the consumer's reading body.
  return <>{renderContent != null ? renderContent() : null}</>
}

// A TOC chapter row — pressable (role=button + keyboard) ONLY when onJump is given (BR-S2-3); else a plain row.
function ChapterRow({ c, onJump }: { c: ReaderChapter; onJump?: (id: string) => void }) {
  const interactive = onJump != null
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onJump?.(c.id)
    }
  }
  return (
    <ChapterRowHost
      interactive={interactive}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-current={c.current ? 'true' : undefined}
      onClick={interactive ? () => onJump?.(c.id) : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
    >
      <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted" minWidth={14} aria-hidden>
        {c.done ? '✓' : ''}
      </Text>
      <Text
        fontFamily="$body"
        fontSize="$small"
        fontWeight={c.current ? '600' : '400'}
        color={c.current ? '$colorBrandEmphasis' : '$colorTextPrimary'}
        flexShrink={1}
      >
        {c.number}. {c.title}
      </Text>
      {c.pageRef != null && (
        <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted" marginLeft="auto">
          {c.pageRef}
        </Text>
      )}
    </ChapterRowHost>
  )
}

// The Contents panel (S2) — a labeled region: an "About" summary slot + the shell-owned TOC (a role=list).
function ContentsPanel({
  summary,
  chapters,
  onJumpToChapter,
}: {
  summary?: ReactNode
  chapters?: ReaderChapter[]
  onJumpToChapter?: (id: string) => void
}) {
  return (
    <ContentsZone role="region" aria-label="Contents">
      {summary != null && (
        <View gap="$8">
          <PanelLabel>About</PanelLabel>
          <SummaryText>{summary}</SummaryText>
        </View>
      )}
      {chapters != null && chapters.length > 0 && (
        <View gap="$8">
          <PanelLabel>Contents</PanelLabel>
          <View role="list" gap="$2">
            {chapters.map((c) => (
              <ChapterRow key={c.id} c={c} onJump={onJumpToChapter} />
            ))}
          </View>
        </View>
      )}
    </ContentsZone>
  )
}

const NATURE_LABEL: Record<Nature, string> = { highlight: 'Highlight', bookmark: 'Bookmark', quote: 'Quote' }

// One annotation row. IR-1 (BR-S3-2) is enforced BY CONSTRUCTION: `linkable` is gated on the nature BEFORE the
// handler, so a highlight renders NO Add-note/Link affordance even if the handlers are passed.
function AnnotationRow({
  a,
  onAddNote,
  onLinkAnnotation,
}: {
  a: ReaderAnnotation
  onAddNote?: (id: string) => void
  onLinkAnnotation?: (id: string) => void
}) {
  const linkable = a.nature !== 'highlight'
  const showAddNote = linkable && onAddNote != null
  const showLink = linkable && onLinkAnnotation != null
  return (
    <AnnotationRowHost role="listitem">
      <NatureMarker nature={a.nature} className={`vida-anno-marker vida-anno-${a.nature}`} aria-hidden />
      <View flexGrow={1} flexShrink={1} gap="$4">
        <View flexDirection="row" gap="$8" justifyContent="space-between" alignItems="baseline">
          <NatureLabel>{NATURE_LABEL[a.nature]}</NatureLabel>
          <LocationText>{a.location}</LocationText>
        </View>
        {/* 3-line clamp (BR-S3-3a) — the full text lives in the opened annotation note, not the rail. */}
        <AnnotationText numberOfLines={3}>{a.text}</AnnotationText>
        {(showAddNote || showLink) && (
          <View flexDirection="row" gap="$8">
            {showAddNote && (
              <Button intent="ghost" size="sm" onPress={() => onAddNote?.(a.id)}>
                Add note
              </Button>
            )}
            {showLink && (
              <Button intent="ghost" size="sm" onPress={() => onLinkAnnotation?.(a.id)}>
                Link
              </Button>
            )}
          </View>
        )}
      </View>
    </AnnotationRowHost>
  )
}

// The rail body — degrade-never-crash, mirrors ReadingBody. `total` + `railId` thread down from AnnotationRail.
function RailBody({
  state,
  groups,
  total,
  railId,
  onAddNote,
  onLinkAnnotation,
}: {
  state: ViewState
  groups?: AnnotationGroup[]
  total: number
  railId: string
  onAddNote?: (id: string) => void
  onLinkAnnotation?: (id: string) => void
}) {
  if (state === 'loading')
    return (
      <View aria-busy="true" gap="$12">
        <SkeletonRow width="60%" />
        <SkeletonRow width="90%" />
        <SkeletonRow width="80%" />
      </View>
    )
  if (state === 'error')
    return (
      <View role="status">
        <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">Couldn’t load annotations. Try again.</Text>
      </View>
    )
  const hasGroups = groups != null && groups.length > 0 && total > 0
  // empty (or success with nothing) → the teaching invitation (titleLevel 3: a nested sub-region, BR-S3-6).
  if (state === 'empty' || !hasGroups)
    return (
      <EmptyState title="No annotations yet" titleLevel={3}>
        Highlight a passage, add a bookmark, or save a quote and it appears here.
      </EmptyState>
    )
  // success — grouped by chapter (counts: total + per-chapter). Each chapter is its OWN role=list (aria-labelledby its
  // eyebrow); do NOT wrap them in a single outer list — that nests lists + breaks the per-chapter labelling (BR-S3-5/10).
  return (
    <View gap="$12">
      <CountText>{total === 1 ? '1 annotation' : `${total} annotations`}</CountText>
      {groups.map((g, i) => {
        const headingId = `${railId}-g${i}` // useId-prefixed, index-keyed (group.id may hold spaces — board-view lesson)
        return (
          <View key={g.id} gap="$8">
            <View flexDirection="row" gap="$8" justifyContent="space-between" alignItems="baseline">
              <ChapterEyebrow id={headingId}>{g.title}</ChapterEyebrow>
              <CountText>{g.annotations.length}</CountText>
            </View>
            <View role="list" aria-labelledby={headingId} gap="$4">
              {g.annotations.map((a) => (
                <AnnotationRow key={a.id} a={a} onAddNote={onAddNote} onLinkAnnotation={onLinkAnnotation} />
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// The annotations rail (S3) — a labeled region: "Annotations" + the state-driven body. The living margin.
function AnnotationRail({
  groups,
  state = 'success',
  onAddNote,
  onLinkAnnotation,
}: {
  groups?: AnnotationGroup[]
  state?: ViewState
  onAddNote?: (id: string) => void
  onLinkAnnotation?: (id: string) => void
}) {
  const railId = useId()
  const total = groups?.reduce((n, g) => n + g.annotations.length, 0) ?? 0
  return (
    <RailZone role="region" aria-label="Annotations">
      <PanelLabel>Annotations</PanelLabel>
      <RailBody state={state} groups={groups} total={total} railId={railId} onAddNote={onAddNote} onLinkAnnotation={onLinkAnnotation} />
    </RailZone>
  )
}

// The slim persistent listen bar (S5) — book-level chrome between the header and the body. A single flexWrap row so the
// label wraps under the control at 375 (BR-S5-6; RNW flexShrink defaults to 0 — the flow-session AffordanceRow lesson).
const ListenBarRow = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$12',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
})
const ListenLabel = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextPrimary', flexShrink: 1 })
const ListenMuted = styled(Text, { fontFamily: '$body', fontSize: '$small', color: '$colorTextMuted', flexShrink: 1 })

// Named uniformly as a `role="group"` "Listen" across ALL three states so the `unavailable` state (no button to carry a
// name) is never an empty-named region (BR-S5-5). The toggle renders on idle/playing only when `onListenToggle` is given
// (render-when-handler, IR-5); `unavailable` shows a CALM role=status line (IR-7), never an error colour.
function ListenBar({
  listen,
  listenProgress,
  listenLabel,
  onListenToggle,
}: {
  listen: ListenMode
  listenProgress?: number
  listenLabel?: ReactNode
  onListenToggle?: () => void
}) {
  if (listen === 'unavailable')
    return (
      <ListenBarRow role="group" aria-label="Listen">
        <View role="status">
          <ListenMuted>Listening isn’t available on this device.</ListenMuted>
        </View>
      </ListenBarRow>
    )
  const playing = listen === 'playing'
  return (
    <ListenBarRow role="group" aria-label="Listen">
      {onListenToggle != null && (
        <Button intent="ghost" size="lg" aria-label={playing ? 'Pause' : 'Listen'} aria-pressed={playing} onPress={onListenToggle}>
          {playing ? <PauseIcon /> : <ListenIcon />}
        </Button>
      )}
      <ListenLabel>{listenLabel ?? 'Listen to this book'}</ListenLabel>
      {playing && listenProgress != null && (
        <View flexGrow={1} flexShrink={1} minWidth={120}>
          <HonestProgress value={listenProgress} label="Listening progress" />
        </View>
      )}
    </ListenBarRow>
  )
}

// A plain component — non-generic → React 19 spreads `ref` as a prop (no forwardRef).
export function CanvasReader({
  title,
  context,
  progress,
  progressLabel,
  saveStatus,
  action,
  positionNote,
  state = 'success',
  renderContent,
  emptyTitle,
  emptyAction,
  summary,
  chapters,
  contentsOpen,
  onToggleContents,
  onJumpToChapter,
  annotationGroups,
  annotationsState,
  railOpen,
  onToggleRail,
  onAddNote,
  onLinkAnnotation,
  listen,
  listenProgress,
  listenLabel,
  onListenToggle,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: CanvasReaderProps) {
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('CanvasReader', ariaLabel, resolvedLabelledby)

  const hasContents = summary != null || (chapters != null && chapters.length > 0)
  const showContents = hasContents && (contentsOpen ?? true)
  const hasAnnotations = annotationGroups != null || annotationsState != null
  const showRail = hasAnnotations && (railOpen ?? true)

  return (
    <CanvasRoot ref={ref} role="region" aria-label={ariaLabel} aria-labelledby={resolvedLabelledby}>
      {/* Header — title-hero (BR-S1-1): serif title carries alone; a quiet context line + optional progress BAR 16px below. */}
      <Header>
        <TitleGroup>
          <Text id={titleId} fontFamily="$display" fontSize="$display" color="$colorTextPrimary">
            {title}
          </Text>
          <MetaGroup>
            {context != null && (
              <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
                {context}
              </Text>
            )}
            {positionNote != null && (
              <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
                {positionNote}
              </Text>
            )}
            {progress != null && (
              <HonestProgress value={progress} label={progressLabel ?? `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}% read`} />
            )}
            {((onToggleContents != null && hasContents) || (onToggleRail != null && hasAnnotations)) && (
              <MetaToggles>
                {onToggleContents != null && hasContents && (
                  <Button intent={showContents ? 'primary' : 'secondary'} size="sm" aria-pressed={showContents} onPress={onToggleContents}>
                    Contents
                  </Button>
                )}
                {onToggleRail != null && hasAnnotations && (
                  <Button intent={showRail ? 'primary' : 'secondary'} size="sm" aria-pressed={showRail} onPress={onToggleRail}>
                    Annotations
                  </Button>
                )}
              </MetaToggles>
            )}
          </MetaGroup>
        </TitleGroup>
        {(saveStatus != null || action != null) && (
          <HeaderAside>
            {saveStatus}
            {action}
          </HeaderAside>
        )}
      </Header>

      {/* Listen bar (S5) — slim persistent book-level chrome; renders only when `listen` is provided (BR-S5-1). */}
      {listen != null && (
        <ListenBar listen={listen} listenProgress={listenProgress} listenLabel={listenLabel} onListenToggle={onListenToggle} />
      )}

      {/* Body — the living-margin row: Contents panel (S2, left) ∣ reading column ∣ annotations rail (S3, right).
          Lone column centers (S1); with either zone it left-aligns (BR-S2-5 / BR-S3-8). */}
      <Body justifyContent={showContents || showRail ? 'flex-start' : 'center'}>
        {showContents && <ContentsPanel summary={summary} chapters={chapters} onJumpToChapter={onJumpToChapter} />}
        <ReadingColumn>
          <ReadingBody state={state} renderContent={renderContent} emptyTitle={emptyTitle} emptyAction={emptyAction} />
        </ReadingColumn>
        {showRail && (
          <AnnotationRail groups={annotationGroups} state={annotationsState} onAddNote={onAddNote} onLinkAnnotation={onLinkAnnotation} />
        )}
      </Body>
    </CanvasRoot>
  )
}

// ============================================================================
// S4 · Selection affordance — the way an annotation is BORN. Presentational pieces the CONSUMER composes INSIDE
// `renderContent` (the shell doesn't own/parse the body → it can't anchor to a Range; IR-NEEDS-3). `SelectionActions`
// is the birth action set; `ReaderHighlightMark` is the inline marked span (EC-3). Both exported to the barrel.
// ============================================================================

// Inline SVG icons (EC-15, NEVER emoji). `currentColor` inherits the Button ghost colour ($colorBrandPrimary) via the
// ButtonText wrapper — the button.tsx Spinner precedent (a $token SVG attr renders colorless). aria-hidden; the Button
// aria-label carries the name.
function HighlightIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 17l8-8-3-3-8 8v3h3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 21h6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function QuoteIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 15V9h4v4c0 2-1.3 3.4-3.2 4l-.6-1.1c1-.4 1.6-.9 1.7-1.9H7zM15 15V9h4v4c0 2-1.3 3.4-3.2 4l-.6-1.1c1-.4 1.6-.9 1.7-1.9H15z" />
    </svg>
  )
}
function BookmarkIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h12v18l-6-4-6 4V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}
function ListenIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path d="M17 9a3.5 3.5 0 0 1 0 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
// S5 — the pause glyph for the playing listen state (two bars). Same recipe: 16px, aria-hidden, currentColor.
function PauseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}

const SelectionBar = styled(View, { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: '$8' })

export interface SelectionActionsProps {
  /** Births a highlight (a marked span). */
  onHighlight?: () => void
  /** Births a first-class quote. */
  onQuote?: () => void
  /** Births a bookmark (a saved position). */
  onBookmark?: () => void
  /** Listen from the selection (TTS). */
  onListenFrom?: () => void
  /** false ⇒ Listen-from-here is OMITTED (IR-7 TTS degrade). Default true. */
  listenAvailable?: boolean
  /** Names the toolbar. Default "Turn selection into". */
  'aria-label'?: string
  ref?: Ref<HTMLDivElement>
}

// The select-passage action set (EC-4). A `role="toolbar"` of icon Buttons (Tab-stops — the collection-view switcher
// precedent). Each action renders ONLY when its handler is passed (render-when-handler); emits an intent, never writes
// (IR-5). Icon buttons are `size="lg"` → 48px ≥ 44×44 (§X touch target). The CONSUMER anchors this at the selection.
export function SelectionActions({
  onHighlight,
  onQuote,
  onBookmark,
  onListenFrom,
  listenAvailable = true,
  'aria-label': ariaLabel = 'Turn selection into',
  ref,
}: SelectionActionsProps) {
  return (
    <SelectionBar ref={ref} role="toolbar" aria-label={ariaLabel}>
      {onHighlight != null && (
        <Button intent="ghost" size="lg" aria-label="Highlight" onPress={onHighlight}>
          <HighlightIcon />
        </Button>
      )}
      {onQuote != null && (
        <Button intent="ghost" size="lg" aria-label="Quote" onPress={onQuote}>
          <QuoteIcon />
        </Button>
      )}
      {onBookmark != null && (
        <Button intent="ghost" size="lg" aria-label="Bookmark" onPress={onBookmark}>
          <BookmarkIcon />
        </Button>
      )}
      {onListenFrom != null && listenAvailable && (
        <Button intent="ghost" size="lg" aria-label="Listen from here" onPress={onListenFrom}>
          <ListenIcon />
        </Button>
      )}
    </SelectionBar>
  )
}

// A 2px accent underline added to the span; font + colour INHERIT from the enclosing paragraph (BR-S4-4 "mark the chrome,
// hold the text" → don't recolour/resize, just mark). Use INSIDE a parent <Text> so RNW renders it inline.
const HighlightMarkText = styled(Text, { borderBottomWidth: 2, borderBottomColor: '$colorBrandPrimary' })

export interface ReaderHighlightMarkProps {
  children: ReactNode
  /** React-19 ref-as-prop → the mark span (the package ref-as-prop convention; lets a consumer measure/scroll-to it). */
  ref?: Ref<HTMLElement>
}

/** The inline highlight mark (EC-3) — a highlighted span reads as marked within the text. Use inside a <Text>. */
export function ReaderHighlightMark({ children, ref }: ReaderHighlightMarkProps) {
  return <HighlightMarkText ref={ref} className="vida-reader-highlight">{children}</HighlightMarkText>
}

export default CanvasReader
