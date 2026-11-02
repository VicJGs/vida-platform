// ============================================================================
// block-renderers — the app's live bodies for integration blocks (LIF-354), passed to `<VidaEditor blockRenderers>`.
// The editor imports no module (BR-E5-7): each module's body is registered HERE, by block type. Live today: the task
// block (`taskChecklist` → ../tasks/task-checklist-block, LIF-339); a type without a body keeps the editor's placeholder.
//
// `?testblock` (DEV-only, the `?readerror` precedent — NODE_ENV-replaced, eliminated from the prod build) mounts a test
// body for the task block (`taskChecklist`) in place of the live one, so the e2e and the Visual Gate can prove the seam
// on its own.
// ============================================================================
import { Text, View } from '@tamagui/core'
import type { IntegrationBlockRendererProps, IntegrationBlockRenderers } from '@vida/editor'
import { TaskChecklistBlock } from '../tasks/task-checklist-block'

const LIVE_RENDERERS: IntegrationBlockRenderers = { taskChecklist: TaskChecklistBlock }

/** DEV: the test body for the task block. It renders live React, nothing more. */
export function TestTaskBlock({ blockType }: IntegrationBlockRendererProps) {
  return (
    <View
      role="group"
      aria-label="Task block (test renderer)"
      backgroundColor="$colorSurfaceSecondary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
      paddingHorizontal="$12"
      paddingVertical="$8"
    >
      <Text fontSize="$small" color="$colorTextPrimary">
        Test renderer: {blockType}
      </Text>
    </View>
  )
}

function testBlockArmed(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('testblock')
  )
}

let cached: IntegrationBlockRenderers | null = null

/** The renderers for this document load (stable identity, so node-views don't re-render on every host render). */
export function blockRenderers(): IntegrationBlockRenderers {
  cached ??= testBlockArmed() ? { ...LIVE_RENDERERS, taskChecklist: TestTaskBlock } : LIVE_RENDERERS
  return cached
}

/** Tests only: forget the cached set so a changed URL is read again. */
export function resetBlockRenderers(): void {
  cached = null
}
