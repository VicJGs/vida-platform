// ============================================================================
// NoteEntity — the note-entity page surface (`/notes/$id`) (fe-notes-and-pages #27,
// S2). COMPOSES the shipped @vida/ui `EntityView` (merged⇄tabbed) with the borderless
// editor facet + the per-type Layout-facet slot. First consumer of the #6 entity
// adapter (`toEntityProps` + `EntityModeStore`) and the #7 editor binding.
//
// Editor-led (EC-4): `defaultFacet='editor'` opens on the Note tab — for EVERY page type
// (notes-rescope R1: the page gate keys on PAGE_TYPE, NP-10 / EC-15). The merged layout is
// a continuous Notion page; the tabbed Overview is the per-type component from
// overview-registry, mounted as `<Overview/>`. Data is LIVE (useNoteEntity → getPage);
// `?sample` is the DEV fixture. The title row carries the one save chip + the ⋯ slot
// (PageActions); a read error offers Retry in place.
//
// Memory (notes-rescope R2, EC-5): the merged/tabbed choice is remembered per page on this device (`app_state`,
// `useEntityModeStore`) — seeded with the type's default while the read loads; the DEV `?sample` page uses the
// in-memory reference store.
// ============================================================================
import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Text, View } from '@tamagui/core'
import { EmptyState, EntityView, type FacetMode } from '@vida/ui'
import { createInMemoryEntityModeStore, toEntityProps, type EntityModeStore } from '../entity/adapter'
import { NoteEditorBody } from './note-editor-body'
import { overviewFor } from './overview-registry'
import { pageLabel } from './note-chrome'
import { PageActions } from './page-actions'
import { ReadErrorMessage } from './read-error-message'
import { useEntityModeStore } from './use-entity-modes'
import { useNoteEntity, type NoteEntityData } from './use-note-entity'
import { WikiLinkPicker } from './wikilink-picker'
import { PreviewCard } from './link-preview-card'
import { TemplatePicker } from './template-picker'

const routeApi = getRouteApi('/notes/$id')

/** DEV/gate affordance: `?<flag>` mounts a standalone overlay for the blocking Visual Gate; off in prod
 *  (NODE_ENV-replaced, dead-code-eliminated). `?picker` = the `[[` picker (real trigger = ui-3, D-S4-1);
 *  `?templates` = the templates picker (real invocation = a menu item + F-S8-1 execution seam, D-S8-4). */
function devFlagActive(flag: string): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has(flag)
  )
}

// The in-memory reference store — the DEV `?sample` page and tests (the live page passes the app_state store, R2).
const referenceModeStore = createInMemoryEntityModeStore('tabbed')

// The ⋯ items arrive with their legs (R3 Rename · R5 Move to Trash · R9 Save as template); none yet → no ⋯ (BR-R1-6).
const NO_ACTIONS = [] as const

/** A centered page-level state host (the surface owns loading/empty/error before the frame mounts). */
function Centered({ children, role, busy }: { children: React.ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <View
      role={role}
      aria-busy={busy ? true : undefined}
      width="100%"
      maxWidth={720}
      marginHorizontal="auto"
      paddingVertical="$48"
      paddingHorizontal="$16"
    >
      {children}
    </View>
  )
}

export function NoteEntity() {
  const { id } = routeApi.useParams()
  const sample = devFlagActive('sample')
  const { page, state, retry, retrying } = useNoteEntity(id)
  // Called before any early return (hook order). The page never waits on it: seeded default while loading (R2 G4).
  const modeStore = useEntityModeStore(!sample)

  // Explicit per-state ladder (g2 N1) — covers the live-swap's future loading+null; aria-busy on the region HOST (g2 B1).
  if (state === 'loading') {
    return (
      <Centered busy>
        <Text fontSize="$body" color="$colorTextMuted">
          Loading…
        </Text>
      </Centered>
    )
  }
  if (state === 'error') {
    return (
      <Centered>
        <ReadErrorMessage message="Couldn’t load this page." retry={retry} retrying={retrying} />
      </Centered>
    )
  }
  if (state === 'empty' || page === null) {
    // The data plane is live: a real note returns state:'success' (blank content is fine). This branch is
    // genuine not-found — getPage(id) returned null (e.g. a deleted or bad id). `?sample` renders a populated page.
    return (
      <Centered>
        <EmptyState title="Note not found">
          <Text fontSize="$body" color="$colorTextMuted">
            This note may have been deleted, or the link is out of date.
          </Text>
        </EmptyState>
      </Centered>
    )
  }

  // key={id} resets the per-page toggle override on navigation between note pages.
  return <NoteEntityView key={id} page={page} modeStore={sample ? undefined : modeStore} />
}

/** The success body — page is guaranteed, so the mode hook sits here (clean hook order). */
export function NoteEntityView({
  page,
  modeStore = referenceModeStore,
}: {
  page: NoteEntityData
  modeStore?: EntityModeStore
}) {
  // The user's toggle for this mount wins; otherwise the store (remembered, or the per-type default while loading).
  const [override, setOverride] = useState<FacetMode | null>(null)
  const mode = override ?? modeStore.readMode(page.type, page.id)
  const onModeChange = (next: FacetMode) => {
    modeStore.persistMode(page.type, page.id, next) // in the handler — never in a state updater (StrictMode)
    setOverride(next)
  }

  const Overview = overviewFor(page.type)
  const layout = <Overview page={page} mode={mode} /> // a component (IR-R13): its hooks bind to it, not to this page
  const props = toEntityProps({
    title: pageLabel(page), // never empty (E-3 / BR-R1-2)
    entityType: page.type,
    hasPage: true,
    gate: 'page', // NP-10 / EC-15: every page type is editor-capable on the page surface
    // The title-row slot: the ONE save chip (EC-34) + the ⋯ menu — no items until R3 (Rename) · R5 (Trash) · R9 (template).
    action: <PageActions pageId={page.id} locked={page.contentStatus === 'malformed'} items={NO_ACTIONS} />,
    editorNode: <NoteEditorBody page={page} />, // gated by offersPageEditor inside toEntityProps
    editorState: 'success',
    layout,
    mode,
    onModeChange,
    defaultFacet: 'editor', // EC-4: lead with the editor
    layoutLabel: 'Overview',
    editorLabel: 'Note',
  })

  // EntityView self-names its region via the visible title (aria-labelledby → titleId); no redundant aria-label (g2 N-corr-2).
  const view = <EntityView {...props} />
  const showPicker = devFlagActive('picker')
  const showTemplates = devFlagActive('templates')
  if (!showPicker && !showTemplates) return view
  // DEV-only demonstration mounts for the blocking Visual Gate (no production entry yet — the real triggers are deferred).
  return (
    <>
      {view}
      {showPicker && (
        // `?picker` (B1 / D-S4-1): the `[[` picker overlay. In production the ui-3 suggestion surface mounts it at the caret.
        <View position="absolute" top={88} right={24} zIndex={1000} gap="$12">
          <WikiLinkPicker sourcePageId={page.id} />
          {/* A sample PreviewCard demonstrates EC-11 (BSE-12 available-data); its real hover mount is ui-3. */}
          <PreviewCard target={{ id: 's-milestone-a', type: 'milestone_note', title: 'Launch milestone', icon: null }} />
        </View>
      )}
      {showTemplates && (
        // `?templates` (D-S8-4): the templates picker/save overlay. The real menu invocation + the apply/capture
        // execution are deferred (F-S8-1) — a visible no-op button would be a dead affordance, so it stays DEV-gated.
        <View position="absolute" top={88} left={24} zIndex={1000}>
          <TemplatePicker pageId={page.id} />
        </View>
      )}
    </>
  )
}

export default NoteEntity
