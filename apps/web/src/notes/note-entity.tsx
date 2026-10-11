// ============================================================================
// NoteEntity — the note-entity page surface (`/notes/$id`) (fe-notes-and-pages #27,
// S2). COMPOSES the shipped @vida/ui `EntityView` (merged⇄tabbed) with the borderless
// editor facet + the per-type Layout-facet slot. First consumer of the #6 entity
// adapter (`toEntityProps` + `EntityModeStore`) and the #7 editor binding.
//
// Editor-led (EC-4): `defaultFacet='editor'` opens on the Note tab. The merged layout
// is a continuous Notion page; the tabbed Overview is the per-type DashboardView grid
// (overview-registry). Data is M1-stub (useNoteEntity — honest-empty / `?sample`).
//
// Memory (D-S2-3 / O4): the merged/tabbed choice rides the `EntityModeStore`
// CONVENTION on the in-memory reference store — the durable storage schema is
// design-pass-open, never invented here.
// ============================================================================
import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { Text, View } from '@tamagui/core'
import { EmptyState, EntityView, type FacetMode } from '@vida/ui'
import { createInMemoryEntityModeStore, toEntityProps } from '../entity/adapter'
import { NoteEditorBody } from './note-editor-body'
import { overviewFor } from './overview-registry'
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

// The merged/tabbed memory store (O4 CONVENTION on the in-memory reference impl; durable schema deferred).
// Default 'tabbed' so `defaultFacet='editor'` opens the note on its Note (editor) tab (EC-4/EC-5).
const modeStore = createInMemoryEntityModeStore('tabbed')

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
  const { page, state } = useNoteEntity(id)

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
      <Centered role="status">
        <Text fontSize="$small" color="$colorTextMuted">
          Couldn’t load this page.
        </Text>
      </Centered>
    )
  }
  if (state === 'empty' || page === null) {
    // M1 honest-empty: no live data plane yet (useNoteEntity default). `?sample` renders a populated page for the gate.
    return (
      <Centered>
        <EmptyState title="This page isn’t available yet">
          <Text fontSize="$body" color="$colorTextMuted">
            Notes open here once the local data plane is connected.
          </Text>
        </EmptyState>
      </Centered>
    )
  }

  // key={id} resets the per-instance mode state on navigation between note pages.
  return <NoteEntityView key={id} page={page} />
}

/** The success body — page is guaranteed, so the mode hook sits here (clean hook order). */
export function NoteEntityView({ page }: { page: NoteEntityData }) {
  const [mode, setMode] = useState<FacetMode>(() => modeStore.readMode(page.type, page.id))
  const onModeChange = (next: FacetMode) => {
    modeStore.persistMode(page.type, page.id, next)
    setMode(next)
  }

  const layout = overviewFor(page.type)({ page, mode })
  const props = toEntityProps({
    title: page.title,
    entityType: page.type,
    hasPage: true,
    editorNode: <NoteEditorBody page={page} />, // gated by offersEditor inside toEntityProps
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
