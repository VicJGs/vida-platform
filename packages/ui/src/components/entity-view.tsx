import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Button } from './button'
import { Tabs } from './tabs'
import { EmptyState } from './empty-state'
import { Input } from './input'
import { SR_ONLY } from '../internal/calendar-shared'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// EntityView — the CODEC Entity shell (fe-codec-entity-facet S1).
// "The facet system" — the 3rd archetype shell (decomposition.md:31 §1.2):
// a Layout facet (Title·bio·summary·dashboard·views) + an OPTIONAL Editor facet
// (the entity's linked page), composed in a user-chosen merged | tabbed mode.
// A facet FRAME, not a facet renderer — it owns the header + the mode + per-facet
// state threading; the facet BODIES are consumer slots (the Layout composite =
// DashboardView #5 + CollectionView #4; the Editor = Canvas: Editor #7, later).
// Presentational, state-as-prop (BR-2); @vida/ui is Tamagui-only, so FacetMode is
// a LOCAL union and the editor state reuses the intra-package ViewState canon.
// Spec: docs/specs/components/ui-2-platform-views/entity-view.md.
//
// REGISTRY GATE (the "registry-gated editor"): resolved in apps/web (S2) — it runs
// isEntityType() + a page lookup and PASSES an `editor` node or omits it. The shell
// offers the Editor facet IFF `editor` is present (the onFilter != null precedent).
// So @vida/ui never imports the @vida/core registry.
//
// NON-GENERIC: holds no entity data (slots own the bodies) → no <T> → React-19
// ref-as-prop (no forwardRef).
// ============================================================================

/** The facet composition mode (EC-4) — a LOCAL union (@vida/ui is Tamagui-only). */
export type FacetMode = 'merged' | 'tabbed'
/** The active facet in tabbed mode (B1 — deep-link / hold across a mode round-trip). */
export type Facet = 'layout' | 'editor'

export interface EntityViewProps {
  /** The entity title — names the region (aria-labelledby) + renders as the serif $display H1. */
  title: string
  /** notes-rescope R3 (EC-25): makes the title renamable in place — click/Enter opens an input; Enter or blur commits a
   *  changed, trimmed value (an empty string passes through); Esc reverts. Absent → the title is plain text. */
  onTitleCommit?: (next: string) => void
  /** The raw value the rename input starts from (the visible `title` may be a fallback label). Default `title`. */
  titleEditValue?: string
  /** The persistent H1 (`tabIndex=-1`) — a focus target (e.g. after a recovered read). */
  titleRef?: Ref<HTMLElement>
  /** Bio / summary line (type · counts · updated) — a slot. */
  subtitle?: ReactNode
  /** The ⋯ entity-action SLOT (a Menu trigger etc.). */
  action?: ReactNode
  /** The facet composition mode (EC-4) — CONTROLLED (the app owns + persists; per-instance memory, S2). */
  mode: FacetMode
  onModeChange: (next: FacetMode) => void
  /** The initially-active facet in tabbed mode (default 'layout') — seeds the Tabs defaultValue. */
  defaultFacet?: Facet
  /** Optionally CONTROL the active facet (+ onActiveFacetChange) — deep-link to the Editor; hold across a mode
   *  round-trip (B1). Ignored in merged mode + when page-less. */
  activeFacet?: Facet
  onActiveFacetChange?: (next: Facet) => void
  /** The Layout facet body — a self-stating composite (its sub-shells thread their own state). ALWAYS present. */
  layout: ReactNode
  /** The OPTIONAL Editor facet body (the entity's linked page = Canvas: Editor #7, composed). PRESENCE = the registry
   *  gate (EC-3): absent → no Content tab / no merged editor section; Layout stands alone. */
  editor?: ReactNode
  /** The Editor facet's OWN state (BR-2) — the shell owns a calm page skeleton/teaching-empty/role="status" error and
   *  renders `editor` only for 'success'. Default 'success'. */
  editorState?: ViewState
  /** Tabbed-mode tab labels (default 'Home' / 'Content'); also the merged-mode region aria-labels. */
  layoutLabel?: string
  editorLabel?: string
  /** Accessible name for the region (defaults to the visible title via aria-labelledby). */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention) ──────────────────────────────
const EntityRoot = styled(View, {
  flexDirection: 'column',
  gap: '$16',
  width: '100%',
  maxWidth: 1136,
  marginHorizontal: 'auto',
})
const Header = styled(View, { flexDirection: 'column', gap: '$8' })
// Wraps (notes-rescope R1, DEV-R1-1): when the title and the action slot don't both fit (375 px), the action drops below
// the title instead of squeezing it into a narrow column; at 768/1440 they sit side by side.
const TitleRow = styled(View, {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '$12',
})
// $16 title→metadata rhythm (EC-5 / review-2 — the title-hero canonical header; mirrors flow-session-view.tsx:97,
// on branch fe-codec-flow-session).
// Without it the $display title + $small subtitle render flush (fix-entity-view-header).
const TitleGroup = styled(View, { flexShrink: 1, flexGrow: 1, flexBasis: 240, gap: '$16' })
// The merged⇄tabbed toggle — a role="toolbar" of aria-pressed buttons (the collection-view switcher precedent).
const ModeToolbar = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$4' })
const MergedStack = styled(View, { flexDirection: 'column', gap: '$24' })
const FacetDivider = styled(View, { height: 1, backgroundColor: '$colorBorderDefault' })
const SkeletonRow = styled(View, {
  height: 14,
  borderRadius: '$sm',
  backgroundColor: '$colorSurfaceSecondary',
  marginBottom: 8,
})

// The shell-owned Editor-facet terminal states (EC-5) — the dashboard BlockBody precedent. renderBlock analog = `editor`,
// called only for success; a block/page is CONTENT, not a self-stated component.
function EditorBody({ editor, editorState }: { editor: ReactNode; editorState: ViewState }) {
  switch (editorState) {
    case 'loading':
      return (
        <View aria-busy="true">
          <SkeletonRow width="80%" />
          <SkeletonRow width="95%" />
          <SkeletonRow width="60%" />
          <SkeletonRow width="88%" />
        </View>
      )
    case 'empty':
      return (
        <EmptyState title="This page is empty">
          <Text fontSize="$body" color="$colorTextMuted">
            Start writing, or drop in a block to build this page.
          </Text>
        </EmptyState>
      )
    case 'error':
      // Calm, polite error (the internal/data-view `Message` precedent: muted text + role="status", NOT $colorSignalDanger
      // — the role carries the semantics, and the danger red fails AA 4.5 in light, the known ds-2 M4 fix).
      return (
        <View role="status">
          <Text fontSize="$small" color="$colorTextMuted">
            Couldn’t load this page.
          </Text>
        </View>
      )
    case 'success':
      return <>{editor}</>
  }
}

type EditEnd = 'enter' | 'escape' | 'blur'

/**
 * The entity title (notes-rescope R3, PLAN G11 · IMPL R-5/R-6): a PERSISTENT level-1 heading (the contract's "entity page's
 * H1"), focusable by script. The region is labelled by `textId`, a span that ALWAYS holds `title` — the visible text, the
 * button's text, or a hidden copy beside the input while editing — so the region name is exactly the title (the rename hint
 * sits OUTSIDE the heading, reached by aria-describedby). Enter / Esc / blur all end an edit through `finish`, exactly once.
 */
function EntityTitle({
  title,
  textId,
  onTitleCommit,
  titleEditValue,
  titleRef,
}: {
  title: string
  textId: string
  onTitleCommit?: (next: string) => void
  titleEditValue?: string
  titleRef?: Ref<HTMLElement>
}) {
  const hintId = useId()
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLElement>(null)
  const endedRef = useRef(false)
  const lastEnd = useRef<EditEnd | null>(null)
  const seed = titleEditValue ?? title

  useEffect(() => {
    if (editing) {
      endedRef.current = false
      inputRef.current?.select()
    } else if (lastEnd.current === 'enter' || lastEnd.current === 'escape') {
      lastEnd.current = null
      buttonRef.current?.focus() // never on first mount, never after a blur (focus already moved on)
    }
  }, [editing])

  const finish = (kind: EditEnd) => {
    if (endedRef.current) return
    endedRef.current = true
    lastEnd.current = kind
    if (kind !== 'escape') {
      const next = (inputRef.current?.value ?? '').trim()
      if (next !== seed.trim()) onTitleCommit?.(next)
    }
    setEditing(false)
  }

  const textStyle = {
    fontFamily: '$display',
    fontSize: '$display',
    lineHeight: '$display',
    color: '$colorTextPrimary',
  } as const
  let body: ReactNode
  if (onTitleCommit == null) {
    body = (
      <Text id={textId} {...textStyle}>
        {title}
      </Text>
    )
  } else if (editing) {
    body = (
      <>
        <span id={textId} style={SR_ONLY}>
          {title}
        </span>
        <Input
          ref={inputRef}
          size="display"
          aria-label="Page title"
          defaultValue={seed}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              finish('enter')
            } else if (e.key === 'Escape') {
              e.preventDefault()
              finish('escape')
            }
          }}
          onBlur={() => finish('blur')}
        />
      </>
    )
  } else {
    body = (
      <Text
        ref={buttonRef as never}
        role="button"
        tabIndex={0}
        aria-describedby={hintId}
        cursor="text"
        onPress={() => setEditing(true)}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setEditing(true)
          }
        }}
        {...textStyle}
      >
        <span id={textId}>{title}</span>
      </Text>
    )
  }
  return (
    <>
      <View role="heading" aria-level={1} tabIndex={-1} ref={titleRef as never}>
        {body}
      </View>
      {onTitleCommit != null && (
        <span id={hintId} style={SR_ONLY}>
          Rename the page
        </span>
      )}
    </>
  )
}

// A plain component — non-generic (the shell holds no entity data). React 19 spreads `ref` as a prop (no forwardRef).
export function EntityView({
  title,
  onTitleCommit,
  titleEditValue,
  titleRef,
  subtitle,
  action,
  mode,
  onModeChange,
  defaultFacet = 'layout',
  activeFacet,
  onActiveFacetChange,
  layout,
  editor,
  editorState = 'success',
  layoutLabel = 'Home',
  editorLabel = 'Content',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: EntityViewProps) {
  // The visible title names the region when no explicit name is given (the data-view accessible-name convention).
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('EntityView', ariaLabel, resolvedLabelledby)

  // The registry gate = slot presence (BR-E-3): the Editor facet is offered iff the app passed an `editor` node.
  const hasEditor = editor != null
  const editorBody = hasEditor ? <EditorBody editor={editor} editorState={editorState} /> : null

  return (
    <EntityRoot ref={ref} role="region" aria-label={ariaLabel} aria-labelledby={resolvedLabelledby}>
      <Header>
        <TitleRow>
          <TitleGroup>
            <EntityTitle
              title={title}
              textId={titleId}
              onTitleCommit={onTitleCommit}
              titleEditValue={titleEditValue}
              titleRef={titleRef}
            />
            {subtitle != null && (
              <Text fontSize="$small" color="$colorTextMuted">
                {subtitle}
              </Text>
            )}
          </TitleGroup>
          {action}
        </TitleRow>

        {/* The merged⇄tabbed toggle — only when there IS a second facet to toggle to (BR-E-6). */}
        {hasEditor && (
          <ModeToolbar role="toolbar" aria-label="Facet mode">
            <Button
              size="sm"
              intent={mode === 'merged' ? 'primary' : 'ghost'}
              aria-pressed={mode === 'merged'}
              onPress={() => onModeChange('merged')}
            >
              Merged
            </Button>
            <Button
              size="sm"
              intent={mode === 'tabbed' ? 'primary' : 'ghost'}
              aria-pressed={mode === 'tabbed'}
              onPress={() => onModeChange('tabbed')}
            >
              Tabbed
            </Button>
          </ModeToolbar>
        )}
      </Header>

      {!hasEditor ? (
        // Page-less (BR-E-3): the Layout facet renders directly — nothing to tab between, no mode, no toggle.
        <View>{layout}</View>
      ) : mode === 'tabbed' ? (
        // Tabbed (EC-2): Home = Layout · Content = Editor; only the active panel mounts. Seeded/controlled by the facet
        // props (B1). Tabs is correct here (different content) — the inverse of collection-view's toolbar-over-Tabs.
        <Tabs
          items={[
            { value: 'layout', label: layoutLabel },
            { value: 'editor', label: editorLabel },
          ]}
          value={activeFacet}
          defaultValue={activeFacet == null ? defaultFacet : undefined}
          onValueChange={(v) => onActiveFacetChange?.(v as Facet)}
          aria-label="Entity facets"
        >
          <Tabs.Panel value="layout">{layout}</Tabs.Panel>
          <Tabs.Panel value="editor">{editorBody}</Tabs.Panel>
        </Tabs>
      ) : (
        // Merged (EC-1): both facets on one surface. Each is a labeled region (B2 — tabbed gets this free from Tabs);
        // the divider is decorative (aria-hidden). aria-label not aria-labelledby (no shell-rendered facet heading).
        <MergedStack>
          <View role="region" aria-label={layoutLabel}>
            {layout}
          </View>
          <FacetDivider aria-hidden />
          <View role="region" aria-label={editorLabel}>
            {editorBody}
          </View>
        </MergedStack>
      )}
    </EntityRoot>
  )
}

export default EntityView
