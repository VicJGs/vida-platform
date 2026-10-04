// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { SyncStatus, HonestProgress } from './sync-status'

afterEach(cleanup)
const r = (ui: React.ReactElement) => render(<UIProvider>{ui}</UIProvider>)

describe('SyncStatus', () => {
  it('is a polite status live region', () => {
    const { getByRole } = r(<SyncStatus state="saved" />)
    const el = getByRole('status')
    expect(el.getAttribute('aria-live')).toBe('polite')
  })

  it('saved → stage-honest on-device copy (never "synced to cloud", never "saving")', () => {
    const { getByText } = r(<SyncStatus state="saved" />)
    const el = getByText('Saved on this device')
    expect(el).not.toBeNull()
    expect(el.textContent).not.toMatch(/sync|cloud|saving/i)
  })

  it('error → a calm local-failure copy (no cloud claim)', () => {
    const { getByText } = r(<SyncStatus state="error" />)
    expect(getByText(/Couldn't save on this device/)).not.toBeNull()
  })

  it('honours a label override', () => {
    const { getByText } = r(<SyncStatus state="saved" label="All caught up, locally" />)
    expect(getByText('All caught up, locally')).not.toBeNull()
  })

  it('forwards the ref', () => {
    const ref = createRef<HTMLDivElement>()
    r(<SyncStatus ref={ref} state="saved" />)
    expect(ref.current).not.toBeNull()
  })
})

describe('HonestProgress', () => {
  it('determinate → role=progressbar with aria-valuenow/min/max', () => {
    const { getByRole } = r(<HonestProgress label="Rebuilding…" value={0.35} />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('35')
    expect(bar.getAttribute('aria-valuemin')).toBe('0')
    expect(bar.getAttribute('aria-valuemax')).toBe('100')
  })

  it('clamps value to [0,1]', () => {
    const { getByRole } = r(<HonestProgress label="x" value={1.5} />)
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('indeterminate → role=progressbar with NO aria-valuenow (the APG indeterminate signal) + valuetext', () => {
    const { getByRole } = r(<HonestProgress label="Unlocking…" indeterminate />)
    const bar = getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBeNull()
    expect(bar.getAttribute('aria-valuetext')).toBe('Working…')
  })

  it('no value and not indeterminate → treated as indeterminate (no fake determinate bar)', () => {
    const { getByRole } = r(<HonestProgress label="Working…" />)
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBeNull()
  })

  it('warns in dev when indeterminate AND value are both passed (a contradiction)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    r(<HonestProgress label="x" indeterminate value={0.5} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('contradiction'))
    warn.mockRestore()
  })
})
