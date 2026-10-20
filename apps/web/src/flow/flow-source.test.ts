// Pure assembler — no window/DOM → default node env.
import { describe, expect, it, vi } from 'vitest'
import { toFlowSource } from './flow-source'

describe('toFlowSource (fe-session-runtime S1)', () => {
  it('single-stage default: in_progress → one current stage titled by the deliverable', () => {
    const src = toFlowSource({
      session: { id: 's1', sub_type: 'work', status: 'in_progress' },
      deliverable: { title: 'Draft the outline', description: 'skeleton' },
    })
    expect(src.stages).toHaveLength(1)
    expect(src.stages[0]).toMatchObject({ id: 's1', label: 'Stage 1', title: 'Draft the outline', status: 'current' })
    expect(src.stages[0].proof).toBeUndefined()
    expect(src.title).toBe('Work session')
    expect(src.context).toBe('skeleton')
  })

  it('completed with attachments → done stage with an attachment-count proof', () => {
    const src = toFlowSource({
      session: { id: 's2', sub_type: 'reading', status: 'completed' },
      deliverable: { title: 'Read ch.1' },
      attachments: [
        { id: 'a', filename: 'notes.md' },
        { id: 'b', filename: 'p.png' },
      ],
    })
    expect(src.stages[0].status).toBe('done')
    expect(src.stages[0].proof).toBe('2 attachments')
  })

  it('completed with one attachment → singular proof wording', () => {
    const src = toFlowSource({
      session: { id: 's', sub_type: 'work', status: 'completed' },
      attachments: [{ id: 'a', filename: 'x' }],
    })
    expect(src.stages[0].proof).toBe('1 attachment')
  })

  it('skipped → done + honest "Skipped" proof', () => {
    const src = toFlowSource({ session: { id: 's3', sub_type: 'work', status: 'skipped' } })
    expect(src.stages[0]).toMatchObject({ status: 'done', proof: 'Skipped' })
  })

  it('missed → done + honest "Missed" proof', () => {
    const src = toFlowSource({ session: { id: 's4', sub_type: 'work', status: 'missed' } })
    expect(src.stages[0]).toMatchObject({ status: 'done', proof: 'Missed' })
  })

  it('scheduled / planned / rescheduled → upcoming', () => {
    for (const status of ['scheduled', 'planned', 'rescheduled']) {
      expect(toFlowSource({ session: { id: 's', sub_type: 'work', status } }).stages[0].status).toBe('upcoming')
    }
  })

  it('unknown status → upcoming + a dev-warn (degrade, never a crash)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const src = toFlowSource({ session: { id: 's5', sub_type: 'work', status: 'bogus' } })
    expect(src.stages[0].status).toBe('upcoming')
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('no deliverable → stage + hero titles fall back to the humanized sub_type', () => {
    const src = toFlowSource({ session: { id: 's6', sub_type: 'focus_block', status: 'in_progress' } })
    expect(src.stages[0].title).toBe('Focus block session')
    expect(src.title).toBe('Focus block session')
    expect(src.context).toBeUndefined()
  })

  it('unknown effect type falls through to its raw key (never dropped)', () => {
    const src = toFlowSource({
      session: { id: 's7', sub_type: 'work', status: 'in_progress' },
      effects: [
        { id: 'e1', effectType: 'log_time' },
        { id: 'e2', effectType: 'mystery_effect' },
      ],
    })
    expect(src.effects).toHaveLength(2)
    expect(src.effects?.[0].kind).toBe('Logged time')
    expect(src.effects?.[1].kind).toBe('mystery_effect')
  })

  it('completed but no attachments → no fabricated proof', () => {
    const src = toFlowSource({ session: { id: 's8', sub_type: 'work', status: 'completed' } })
    expect(src.stages[0].status).toBe('done')
    expect(src.stages[0].proof).toBeUndefined()
  })
})
