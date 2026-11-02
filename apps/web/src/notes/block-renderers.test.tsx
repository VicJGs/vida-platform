// @vitest-environment jsdom
// LIF-354 (bullet 2) — the app side of the live-body seam: the DEV `?testblock` flag mounts the task block's test body.
// LIF-339 (bullet 1) — the live tasks body is registered for `taskChecklist` by default.
import { afterEach, describe, expect, it } from 'vitest'
import { TestTaskBlock, blockRenderers, resetBlockRenderers } from './block-renderers'
import { TaskChecklistBlock } from '../tasks/task-checklist-block'

afterEach(() => {
  window.history.replaceState({}, '', '/')
  resetBlockRenderers()
})

describe('blockRenderers (LIF-354)', () => {
  it('LIF-339 #1 — without ?testblock the task block (taskChecklist) gets the live tasks body', () => {
    expect(blockRenderers()).toEqual({ taskChecklist: TaskChecklistBlock })
  })

  it('?testblock registers the test body for the task block (taskChecklist) only', () => {
    window.history.replaceState({}, '', '/?testblock')
    expect(blockRenderers()).toEqual({ taskChecklist: TestTaskBlock })
  })

  it('keeps one identity per document load (node-views do not re-render on every host render)', () => {
    expect(blockRenderers()).toBe(blockRenderers())
  })
})
