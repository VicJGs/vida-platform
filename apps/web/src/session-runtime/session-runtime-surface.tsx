// ============================================================================
// SessionRuntimeSurface — the Session runtime page surface (fe-session-runtime #23, S2).
// ROUTER-FREE (takes `sessionId` as a prop) so the standalone Visual-Gate entry can mount
// it directly; the routed wrapper (session-runtime-page.tsx) reads the param and delegates
// here. Composes the shipped @vida/ui `FlowSessionView` via the flow adapter
// (toFlowProps + bindFlowIntents) over the S1 `useFlowSession` data hook.
//
// The SURFACE owns the page-level terminal states (loading/empty/error) before the frame
// mounts (the note-entity.tsx precedent); the shell renders only on success. The shell
// NEVER writes — intents are bound to the SessionsPort here (BR-2). Deliverable-per-stage:
// the stage is the deliverable (title) + the standardized affordances; the description is
// the hero context line; the effect rail always renders (teaching-empty when none, EC-4).
// ============================================================================
import type { ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { EmptyState, FlowSessionView } from '@vida/ui'
import { bindFlowIntents, toFlowProps } from '../flow/adapter'
import { useFlowSession } from '../flow/use-flow-session'

export interface SessionRuntimeSurfaceProps {
  sessionId: string
}

/** A centered page-level state host — the surface owns loading/empty/error before the frame (note-entity precedent). */
function Centered({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <View
      role={role}
      aria-busy={busy ? true : undefined}
      width="100%"
      maxWidth={820}
      marginHorizontal="auto"
      paddingVertical="$48"
      paddingHorizontal="$16"
    >
      {children}
    </View>
  )
}

export function SessionRuntimeSurface({ sessionId }: SessionRuntimeSurfaceProps) {
  const { source, port, state } = useFlowSession(sessionId)

  // Explicit per-state ladder — forward-covers the live-swap's future loading+null; aria-busy on the region host.
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
        <Text fontSize="$body" color="$colorTextMuted">
          This session couldn’t be loaded.
        </Text>
      </Centered>
    )
  }
  if (state === 'empty' || !source) {
    return (
      <Centered>
        <EmptyState title="No session open">
          <Text fontSize="$body" color="$colorTextMuted">
            Start a session to see its stages, deliverables, and activity here.
          </Text>
        </EmptyState>
      </Centered>
    )
  }

  // Success — bind the shell's emitted intents to the sessions port (the shell never writes; BR-2). M1 stubs:
  // no live deliverable_note target yet (→ attach safely skips), proof-capture is a driving module's (EC-10 live-deferred).
  const intents = bindFlowIntents(port, sessionId, {
    attachTarget: () => undefined,
    onProof: () => {},
  })
  // EC-4: the effect rail ALWAYS renders — a teaching-empty when a session has fired nothing, never a blank/omitted rail.
  const effects = source.effects ?? []
  return (
    <FlowSessionView
      {...toFlowProps({
        ...source,
        ...intents,
        effects,
        effectsState: effects.length > 0 ? 'success' : 'empty',
      })}
      aria-label={source.title}
    />
  )
}

export default SessionRuntimeSurface
