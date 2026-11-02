// @vitest-environment jsdom
// LIF-354 (bullet 2) — the app side of the live-body seam: the DEV `?testblock` flag mounts the task block's test body.
import { afterEach, describe, expect, it } from 'vitest'
import { TestTaskBlock, blockRenderers, resetBlockRenderers } from './block-renderers'

afterEach(() => {
  window.history.replaceState({}, '', '/')
  resetBlockRenderers()
})

describe('blockRenderers (LIF-354)', () => {
  it('ships no module body by default', () => {
    expect(blockRenderers()).toEqual({})
  })

  it('?testblock registers the test body for the task block (taskChecklist) only', () => {
    window.history.replaceState({}, '', '/?testblock')
    expect(blockRenderers()).toEqual({ taskChecklist: TestTaskBlock })
  })

  it('keeps one identity per document load (node-views do not re-render on every host render)', () => {
    expect(blockRenderers()).toBe(blockRenderers())
  })
})
