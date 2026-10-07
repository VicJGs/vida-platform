// Pure — env `node` (no jsdom). Locks the flow↔FlowSessionView adapter (S2): the typed assembler (toFlowProps), the
// applied-effects ledger → effect-rail mapping (mapEffectLog), and the intent wiring (bindFlowIntents) against a mock
// SessionsPort. The live useFlowSession hook is deferred (see ./CLAUDE.md).
import { describe, expect, it, vi } from 'vitest'
import {
  bindFlowIntents,
  createFlowAdapter,
  mapEffectLog,
  type AppliedEffectRow,
  type FlowSource,
  type SessionsPort,
  toFlowProps,
} from './adapter'
import type { FlowStage } from '@vida/ui'

const STAGES: FlowStage[] = [
  { id: 's1', label: 'Stage 1', title: 'Outline', status: 'done', proof: 'outline.md' },
  { id: 's2', label: 'Stage 2', title: 'Draft', status: 'current' },
]

describe('toFlowProps — the typed assembler', () => {
  it('maps a flow source through to FlowSessionView props', () => {
    const src: FlowSource = { title: 'Deep work', context: 'For X', stages: STAGES, effectRailLabel: 'Effect rail' }
    const props = toFlowProps(src)
    expect(props.title).toBe('Deep work')
    expect(props.context).toBe('For X')
    expect(props.stages).toBe(STAGES)
    expect(props.effectRailLabel).toBe('Effect rail')
  })

  it('passes explicit progress + label through (the shell derives from stages when omitted)', () => {
    const props = toFlowProps({ title: 'F', stages: STAGES, progress: 0.5, progressLabel: 'halfway' })
    expect(props.progress).toBe(0.5)
    expect(props.progressLabel).toBe('halfway')
  })

  it('forwards the emitted intents', () => {
    const onMarkDone = vi.fn()
    const props = toFlowProps({ title: 'F', stages: STAGES, onMarkDone })
    props.onMarkDone?.('s2')
    expect(onMarkDone).toHaveBeenCalledWith('s2')
  })
})

describe('mapEffectLog — applied-effects ledger → effect-rail entries', () => {
  it('labels the ADR-004 effect catalogue in plain language', () => {
    const rows: AppliedEffectRow[] = [
      { id: 'e1', effectType: 'log_time', detail: '25 min' },
      { id: 'e2', effectType: 'award_xp', detail: '+15' },
      { id: 'e3', effectType: 'surface_journal', detail: 'added' },
    ]
    const out = mapEffectLog(rows)
    expect(out).toEqual([
      { id: 'e1', kind: 'Logged time', detail: '25 min' },
      { id: 'e2', kind: 'Experience', detail: '+15' },
      { id: 'e3', kind: 'Journal', detail: 'added' },
    ])
  })

  it('falls back to the raw key for an unknown effect type (never drops a row)', () => {
    const out = mapEffectLog([{ id: 'e', effectType: 'custom_effect' }])
    expect(out).toEqual([{ id: 'e', kind: 'custom_effect', detail: '' }])
  })
})

describe('bindFlowIntents — the intent wiring against a SessionsPort', () => {
  function mockPort() {
    return { transition: vi.fn(), attach: vi.fn() } satisfies SessionsPort
  }

  it('onMarkDone → transition(sessionId, "complete")', () => {
    const port = mockPort()
    const intents = bindFlowIntents(port, 'sess-1')
    intents.onMarkDone('s2')
    expect(port.transition).toHaveBeenCalledWith('sess-1', 'complete')
  })

  it('onAttach → attach(...) to the consumer-resolved target (instance level); no-op when no target', () => {
    const port = mockPort()
    const intents = bindFlowIntents(port, 'sess-1', {
      attachTarget: (stageId, kind) => (kind === 'audio' ? { entityType: 'note', entityId: `n-${stageId}` } : undefined),
    })
    intents.onAttach('s2', 'audio')
    expect(port.attach).toHaveBeenCalledWith('sess-1', 'note', 'n-s2', 'instance')
    port.attach.mockClear()
    intents.onAttach('s2', 'document') // no target → no write
    expect(port.attach).not.toHaveBeenCalled()
  })

  it('onRequireProof → the consumer proof flow with (sessionId, stageId)', () => {
    const port = mockPort()
    const onProof = vi.fn()
    const intents = bindFlowIntents(port, 'sess-1', { onProof })
    intents.onRequireProof('s2')
    expect(onProof).toHaveBeenCalledWith('sess-1', 's2')
  })
})

describe('createFlowAdapter — the composed convention', () => {
  it('exposes the assembler + effect-log map + intent wiring', () => {
    const a = createFlowAdapter()
    expect(a.toFlowProps).toBe(toFlowProps)
    expect(a.mapEffectLog).toBe(mapEffectLog)
    expect(a.bindFlowIntents).toBe(bindFlowIntents)
  })
})
