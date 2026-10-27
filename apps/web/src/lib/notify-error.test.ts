// notes-rescope R1 · F-7 / BR-R1-7 — the shared mutation-error toast (IMPLEMENTATION-PLAN-R1 R-1, test A7 base).
import { afterEach, describe, expect, it, vi } from 'vitest'

const toast = vi.fn()
vi.mock('@vida/ui', () => ({ toast: (o: unknown) => toast(o) }))

import { notifyError } from './notify-error'

afterEach(() => {
  toast.mockReset()
  vi.restoreAllMocks()
})

describe('notifyError (F-7)', () => {
  it('raises ONE danger toast naming the action — never the raw error text (R-1)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    notifyError('create the note', new Error('PageNotFoundError: p1'))
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith({ intent: 'danger', title: 'Couldn’t create the note' })
  })

  it('logs the error itself to the console (the debugging surface)', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const e = new Error('boom')
    notifyError('save “Kickoff”', e)
    expect(log).toHaveBeenCalledWith('[save “Kickoff” failed]', e)
  })
})
