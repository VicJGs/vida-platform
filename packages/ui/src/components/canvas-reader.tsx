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
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: CanvasReaderProps) {
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('CanvasReader', ariaLabel, resolvedLabelledby)

  const hasContents = summary != null || (chapters != null && chapters.length > 0)
  const showContents = hasContents && (contentsOpen ?? true)

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
            {onToggleContents != null && hasContents && (
              <MetaToggles>
                <Button intent={showContents ? 'primary' : 'secondary'} size="sm" aria-pressed={showContents} onPress={onToggleContents}>
                  Contents
                </Button>
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

      {/* Body — the living-margin row: Contents panel (S2, left) ∣ reading column. The rail (S3) adds the right zone.
          Lone column centers (S1); with the panel it left-aligns (BR-S2-5). */}
      <Body justifyContent={showContents ? 'flex-start' : 'center'}>
        {showContents && <ContentsPanel summary={summary} chapters={chapters} onJumpToChapter={onJumpToChapter} />}
        <ReadingColumn>
          <ReadingBody state={state} renderContent={renderContent} emptyTitle={emptyTitle} emptyAction={emptyAction} />
        </ReadingColumn>
      </Body>
    </CanvasRoot>
  )
}

export default CanvasReader
