// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { useFlowSession } from './use-flow-session'

// Pure function in M1 (no React hooks) — safe to call directly (the use-note-entity precedent).
describe('useFlowSession (M1 stub)', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/') // reset the query string between cases
  })

  it('M1 default (no ?sample) is honest-empty, null source, with a present port', () => {
    const r = useFlowSession('any-id')
    expect(r.state).toBe('empty')
    expect(r.source).toBeNull()
    expect(typeof r.port.transition).toBe('function')
    expect(typeof r.port.attach).toBe('function')
  })

  it('?sample (DEV) seeds a single-stage, current FlowSource with its effect log', () => {
    window.history.pushState({}, '', '/?sample')
    const r = useFlowSession('any-id')
    expect(r.state).toBe('success')
    expect(r.source).not.toBeNull()
    expect(r.source?.stages).toHaveLength(1)
    expect(r.source?.stages[0].status).toBe('current')
    expect(r.source?.effects).toHaveLength(2)
  })

  it('the no-op port is call-safe (no throw, mutates nothing)', () => {
    const { port } = useFlowSession('any-id')
    expect(() => port.transition('s', 'complete')).not.toThrow()
    expect(() => port.attach('s', 'page', 'p1')).not.toThrow()
  })
})
