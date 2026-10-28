// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { FlowSessionView, type FlowStage, type FlowEffect } from './flow-session-view'

// The shell composes the heaviest tree of the archetype shells (Timeline + ListView + Card + Button + HonestProgress);
// the FIRST jsdom render bears the whole Tamagui compile, which exceeds the 5s default on a cold worker. Scoped to this file.
vi.setConfig({ testTimeout: 15000 })

afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

const STAGES: FlowStage[] = [
  { id: 's1', label: 'Stage 1', title: 'Outline', status: 'done', proof: 'outline.md' },
  { id: 's2', label: 'Stage 2', title: 'Record a read-through', status: 'current' },
  { id: 's3', label: 'Stage 3', title: 'Revise', status: 'upcoming' },
]
const EFFECTS: FlowEffect[] = [
  { id: 'e1', kind: 'Logged time', detail: '25 min to the task' },
  { id: 'e2', kind: 'Experience', detail: '+15 xp' },
]
const renderStage = (s: FlowStage) => <div data-body={s.id}>BODY:{s.id}</div>

describe('FlowSessionView — the Flow/Session shell', () => {
  // ── BR-FS-9: the region is named by the visible title ──────────────────────────────────────
  it('names the region via the visible title', () => {
    const { getByRole, getByText } = renderUI(<FlowSessionView title="Deep work — §3 draft" stages={STAGES} />)
    expect(getByRole('region').getAttribute('aria-labelledby')).not.toBeNull()
    expect(getByText('Deep work — §3 draft')).not.toBeNull()
  })

  // ── BR-FS-7: progress is a HonestProgress BAR derived from stages ───────────────────────────
  it('renders a progress bar (role=progressbar) derived from stages', () => {
    const { getByRole } = renderUI(<FlowSessionView title="F" stages={STAGES} />)
    expect(getByRole('progressbar')).not.toBeNull() // 1 of 3 done
  })

  // ── BR-FS-3/EC-1: the staged progression renders every stage title ─────────────────────────
  it('renders every stage title in the rail', () => {
    const { getByText } = renderUI(<FlowSessionView title="F" stages={STAGES} />)
    expect(getByText('Outline')).not.toBeNull()
    expect(getByText('Record a read-through')).not.toBeNull()
    expect(getByText('Revise')).not.toBeNull()
  })

  // ── BR-FS-5: a done stage shows its proof (collapsed) ──────────────────────────────────────
  it('done stage shows the delivered proof', () => {
    const { getByText } = renderUI(<FlowSessionView title="F" stages={STAGES} />)
    expect(getByText(/outline\.md/)).not.toBeNull()
  })

  // ── BR-FS-4/EC-2: the CURRENT stage shows the standardized affordances ──────────────────────
  it('current stage renders Mark done / Require proof / Attach Document·Photo·Audio (when handlers given)', () => {
    // render-when-handler: the affordance row renders only when a handler is provided (not unconditionally).
    const { getByRole } = renderUI(
      <FlowSessionView title="F" stages={STAGES} onMarkDone={() => {}} onRequireProof={() => {}} onAttach={() => {}} />,
    )
    expect(getByRole('button', { name: 'Mark done' })).not.toBeNull()
    expect(getByRole('button', { name: 'Require proof' })).not.toBeNull()
    expect(getByRole('button', { name: 'Document' })).not.toBeNull()
    expect(getByRole('button', { name: 'Photo' })).not.toBeNull()
    expect(getByRole('button', { name: 'Audio' })).not.toBeNull()
  })

  it('no affordance handlers → no affordance row (render-when-handler; a wizard owns its own controls)', () => {
    const { queryByRole } = renderUI(<FlowSessionView title="F" stages={STAGES} renderStage={() => null} />)
    expect(queryByRole('button', { name: 'Mark done' })).toBeNull()
    expect(queryByRole('button', { name: 'Require proof' })).toBeNull()
    expect(queryByRole('button', { name: 'Document' })).toBeNull()
  })

  // ── BR-FS-2: the affordances EMIT intents (never a write) ───────────────────────────────────
  it('affordances emit their intents with the stage id', () => {
    const onMarkDone = vi.fn()
    const onRequireProof = vi.fn()
    const onAttach = vi.fn()
    const { getByRole } = renderUI(
      <FlowSessionView
        title="F"
        stages={STAGES}
        onMarkDone={onMarkDone}
        onRequireProof={onRequireProof}
        onAttach={onAttach}
      />,
    )
    fireEvent.click(getByRole('button', { name: 'Mark done' }))
    expect(onMarkDone).toHaveBeenCalledWith('s2')
    fireEvent.click(getByRole('button', { name: 'Require proof' }))
    expect(onRequireProof).toHaveBeenCalledWith('s2')
    fireEvent.click(getByRole('button', { name: 'Audio' }))
    expect(onAttach).toHaveBeenCalledWith('s2', 'audio')
  })

  // ── BR-FS-4: done/upcoming stages carry NO affordances (current only) ───────────────────────
  it('a flow with no current stage renders no affordances', () => {
    const noCurrent: FlowStage[] = [
      { id: 'a', label: 'Stage 1', title: 'A', status: 'done', proof: 'a.md' },
      { id: 'b', label: 'Stage 2', title: 'B', status: 'upcoming' },
    ]
    const { queryByRole } = renderUI(<FlowSessionView title="F" stages={noCurrent} />)
    expect(queryByRole('button', { name: 'Mark done' })).toBeNull()
  })

  // ── BR-FS-5/EC-6: per-stage state threading — loading skeleton ─────────────────────────────
  it('a loading stage renders an aria-busy skeleton (not the body)', () => {
    const stages: FlowStage[] = [{ id: 'x', label: 'Stage 1', title: 'X', status: 'current', state: 'loading' }]
    const { container, queryByText } = renderUI(<FlowSessionView title="F" stages={stages} renderStage={renderStage} />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(queryByText('BODY:x')).toBeNull()
  })

  // ── BR-FS-5/EC-6: per-stage state threading — errored stage is a calm role=status ──────────
  it('an errored stage renders a calm role=status (not the body)', () => {
    const stages: FlowStage[] = [{ id: 'x', label: 'Stage 1', title: 'X', status: 'current', state: 'error' }]
    const { getByRole, queryByText } = renderUI(<FlowSessionView title="F" stages={stages} renderStage={renderStage} />)
    expect(getByRole('status')).not.toBeNull()
    expect(queryByText('BODY:x')).toBeNull()
  })

  // ── BR-FS-5: the current stage renders the consumer's body via renderStage ──────────────────
  it('current stage renders the consumer body via renderStage', () => {
    const { getByText } = renderUI(<FlowSessionView title="F" stages={STAGES} renderStage={renderStage} />)
    expect(getByText('BODY:s2')).not.toBeNull()
  })

  // ── BR-FS-6/EC-4: the effect-rail log renders entries when effects provided ─────────────────
  it('renders the effect-rail log with entries', () => {
    const { getByText } = renderUI(<FlowSessionView title="F" stages={STAGES} effects={EFFECTS} />)
    expect(getByText('Effect rail')).not.toBeNull()
    expect(getByText('Logged time')).not.toBeNull()
    expect(getByText('25 min to the task')).not.toBeNull()
  })

  // ── BR-FS-6/EC-4: empty effect log is a teaching EmptyState ─────────────────────────────────
  it('an empty effect log shows a teaching EmptyState', () => {
    const { getByText } = renderUI(<FlowSessionView title="F" stages={STAGES} effects={[]} effectsState="empty" />)
    expect(getByText('Nothing logged yet')).not.toBeNull()
  })

  // ── BR-FS-6: no effect rail when `effects` is omitted ───────────────────────────────────────
  it('omits the effect rail entirely when effects is not provided', () => {
    const { queryByText } = renderUI(<FlowSessionView title="F" stages={STAGES} />)
    expect(queryByText('Effect rail')).toBeNull()
  })

  // ── EC-9: a single-stage flow renders sanely ───────────────────────────────────────────────
  it('single-stage flow renders the one current stage + its affordances', () => {
    const one: FlowStage[] = [{ id: 'o', label: 'Today', title: 'Evening check-in', status: 'current' }]
    const { getByText, getByRole } = renderUI(<FlowSessionView title="Check-in" stages={one} onMarkDone={() => {}} />)
    expect(getByText('Evening check-in')).not.toBeNull()
    expect(getByRole('button', { name: 'Mark done' })).not.toBeNull()
  })
})
