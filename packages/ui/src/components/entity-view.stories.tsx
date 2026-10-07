import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { EntityView, type FacetMode, type Facet } from './entity-view'
import { Button } from './button'
import type { ViewState } from '../internal/data-view'

// UI-2 · fe-codec-entity-facet · EntityView stories — the component Visual-Gate surface. Toggle Preset × Mode × Density.
// EntityView = the CODEC Entity shell ("the facet system", decomposition.md:31 §1.2) — a facet FRAME composing a Layout
// facet + an optional Editor facet in a merged | tabbed mode; the Editor facet is registry-gated (slot presence).
//
// MEASURE (entity-view.md · envision EC-1…EC-8): merged = both facets, one surface, divider (EC-1) · tabbed = Home/Content,
// active-only, indicator (EC-2) · page-less = no editor facet/tab/toggle, DISTINCT from empty-editor (EC-3) · toggle
// role="toolbar"+aria-pressed (EC-4) · per-facet state loading/empty/error calm, merged regions labeled (EC-5) · reflow
// 375→1440 no overflow (EC-6) · serif $display title + DIRECT tokens + dark designed + preset flips (EC-7). axe clean.

// ── fake facet bodies (EntityView's own gate; the real sub-shells have their own) ───────────────────────
function FakeLayout() {
  return (
    <View flexDirection="column" gap="$16">
      <View flexDirection="row" flexWrap="wrap" gap="$24">
        {[
          ['Status', 'In progress'],
          ['Due', 'Oct 24'],
          ['Priority', 'High'],
        ].map(([label, value]) => (
          <View key={label}>
            <Text fontFamily="$display" fontSize="$subheading" color="$colorTextPrimary" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </Text>
            <Text fontSize="$caption" color="$colorTextMuted">
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View borderWidth={1} borderColor="$colorBorderDefault" borderRadius="$lg" padding="$16">
        <Text fontSize="$body" color="$colorTextMuted">
          Layout facet — the composed dashboard + views (DashboardView #5 · CollectionView #4) slot in here.
        </Text>
      </View>
    </View>
  )
}
function FakeEditor() {
  return (
    <View flexDirection="column" gap="$12">
      <Text fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
        Working notes
      </Text>
      <Text fontSize="$body" color="$colorTextPrimary">
        The Editor facet renders the entity’s linked page — the TipTap block canvas (Canvas: Editor #7), composed into this
        slot. The shell owns the generic page states; the page owns its content.
      </Text>
      <Text fontSize="$body" color="$colorTextPrimary">
        A second paragraph, to show the page reads as a document, not a form.
      </Text>
    </View>
  )
}

// A controlled harness — mode toggle + active-facet are controlled so the story is interactive.
function Controlled({
  pageAble = true,
  editorState = 'success' as ViewState,
  initialMode = 'merged' as FacetMode,
  initialFacet = 'layout' as Facet,
}: {
  pageAble?: boolean
  editorState?: ViewState
  initialMode?: FacetMode
  initialFacet?: Facet
}) {
  const [mode, setMode] = useState<FacetMode>(initialMode)
  const [facet, setFacet] = useState<Facet>(initialFacet)
  return (
    <EntityView
      title="Redesign the onboarding"
      // Title-hero canonical subtitle (EC-5): ONE quiet plain-language line — NOT a middle-dot meta-string.
      // Page-less-ness is signalled by the ABSENT Content facet, not a "· no page" dot-tack.
      subtitle="In the Q3 Launch project"
      action={
        <Button size="sm" intent="ghost" aria-label="Entity actions">
          ⋯
        </Button>
      }
      mode={mode}
      onModeChange={setMode}
      activeFacet={facet}
      onActiveFacetChange={setFacet}
      layout={<FakeLayout />}
      editor={pageAble ? <FakeEditor /> : undefined}
      editorState={editorState}
    />
  )
}

const meta: Meta<typeof Controlled> = { title: 'UI-2 Platform Views/EntityView', component: Controlled }
export default meta
type Story = StoryObj<typeof Controlled>

export const MergedWithEditor: Story = { render: () => <Controlled initialMode="merged" /> }
export const TabbedWithEditor: Story = { render: () => <Controlled initialMode="tabbed" /> }
// Deep-link (B1): open straight to the Editor facet.
export const TabbedDeepLinkEditor: Story = { render: () => <Controlled initialMode="tabbed" initialFacet="editor" /> }
// The registry gate OFF — a page-less entity: no Editor facet, no Content tab, no toggle.
export const PageLessEntity: Story = { render: () => <Controlled pageAble={false} /> }
// DISTINCT from page-less (EC-3): the Content tab IS shown, rendering a teaching empty body.
export const EmptyEditor: Story = { render: () => <Controlled initialMode="tabbed" initialFacet="editor" editorState="empty" /> }
export const EditorLoading: Story = { render: () => <Controlled initialMode="tabbed" initialFacet="editor" editorState="loading" /> }
export const EditorError: Story = { render: () => <Controlled initialMode="merged" editorState="error" /> }
