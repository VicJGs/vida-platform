// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { PomodoroWidget, type PomodoroWidgetProps } from './pomodoro-widget'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function renderUI(props: PomodoroWidgetProps) {
  return render(<UIProvider>{<PomodoroWidget {...props} />}</UIProvider>)
}
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
const fillWidth = (c: HTMLElement) => (c.querySelector('.vida-pomo-fill') as HTMLElement | null)?.style.width

describe('PomodoroWidget', () => {
  it('idle: role="timer", shows the formatted duration + a Start control', () => {
    const { getByRole, getByText } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    expect(getByRole('timer')).not.toBeNull()
    expect(getByText('01:00')).not.toBeNull()
    expect(getByText('Start')).not.toBeNull()
  })

  it('counts down after Start (drift-free); shows Pause/Skip while running', () => {
    const { getByText, queryByText } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(1000)
    expect(getByText('00:59')).not.toBeNull()
    expect(getByText('Pause')).not.toBeNull()
    expect(getByText('Skip')).not.toBeNull()
    expect(queryByText('Start')).toBeNull()
  })

  it('B1: the interval is created ONCE per run (not re-armed per tick)', () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    const { getByText } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(2000) // 8 ticks
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('B2: onComplete fires EXACTLY once, advancing multiple ticks past 0', () => {
    const onComplete = vi.fn()
    const { getByText } = renderUI({ durationMs: 1000, onComplete, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(3000) // well past 0, many ticks
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(getByText('00:00')).not.toBeNull()
    expect(getByText('Start')).not.toBeNull() // back to idle
  })

  it('pause freezes the countdown; resume continues', () => {
    const { getByText } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(1000)
    fireEvent.click(getByText('Pause'))
    advance(5000)
    expect(getByText('00:59')).not.toBeNull() // frozen
    expect(getByText('Resume')).not.toBeNull()
  })

  it('reset restores the duration + idle', () => {
    const { getByText } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(3000)
    fireEvent.click(getByText('Pause'))
    fireEvent.click(getByText('Reset'))
    expect(getByText('01:00')).not.toBeNull()
    expect(getByText('Start')).not.toBeNull()
  })

  it('B3: durationMs change resets atomically (idle → no warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByText, rerender } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    rerender(<UIProvider><PomodoroWidget durationMs={30_000} aria-label="Focus" /></UIProvider>)
    expect(getByText('00:30')).not.toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('B3: durationMs change MID-RUN dev-warns + discards the run', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByText, rerender } = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(1000)
    rerender(<UIProvider><PomodoroWidget durationMs={30_000} aria-label="Focus" /></UIProvider>)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('mid-run'))
    expect(getByText('00:30')).not.toBeNull()
    expect(getByText('Start')).not.toBeNull() // idle
  })

  it('M4: progress clamps [0,1]; durationMs<=0 dev-warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderUI({ durationMs: 0, 'aria-label': 'Focus' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('must be > 0'))
    expect(fillWidth(container)).toBe('0%') // guarded (no NaN)
  })

  it('progress fill grows as time elapses', () => {
    const { getByText, container } = renderUI({ durationMs: 10_000, 'aria-label': 'Focus' })
    expect(fillWidth(container)).toBe('0%')
    fireEvent.click(getByText('Start'))
    advance(5000)
    expect(fillWidth(container)).toBe('50%')
  })

  it('controls fire their lifecycle-intent callbacks', () => {
    const cbs = { onStart: vi.fn(), onPause: vi.fn(), onSkip: vi.fn() }
    const { getByText } = renderUI({ durationMs: 60_000, ...cbs, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    expect(cbs.onStart).toHaveBeenCalledTimes(1)
    fireEvent.click(getByText('Pause'))
    expect(cbs.onPause).toHaveBeenCalledTimes(1)
    fireEvent.click(getByText('Resume'))
    fireEvent.click(getByText('Skip'))
    expect(cbs.onSkip).toHaveBeenCalledTimes(1)
  })

  it('Skip does NOT fire onComplete', () => {
    const onComplete = vi.fn()
    const { getByText } = renderUI({ durationMs: 60_000, onComplete, 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    fireEvent.click(getByText('Skip'))
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('leak: interval cleared on unmount, on pause-then-unmount, and on mid-run durationMs change', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    // unmount while running
    const a = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(a.getByText('Start'))
    a.unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockClear()
    // pause then unmount
    const b = renderUI({ durationMs: 60_000, 'aria-label': 'Focus' })
    fireEvent.click(b.getByText('Start'))
    fireEvent.click(b.getByText('Pause'))
    b.unmount()
    expect(clearSpy).toHaveBeenCalled()
  })

  it('M2: polite completion region gets text at 0 AND clears on the next Start', () => {
    const { getByText, getByRole, queryByText } = renderUI({ durationMs: 1000, phase: 'focus', 'aria-label': 'Focus' })
    fireEvent.click(getByText('Start'))
    advance(2000)
    expect(getByRole('status').textContent).toContain('focus complete')
    fireEvent.click(getByText('Start')) // restart
    expect(queryByText(/focus complete/i)).toBeNull() // cleared (no re-announce)
  })

  it('forwards ref + composes an aria-label; works standalone (no callbacks)', () => {
    const ref = createRef<HTMLDivElement>()
    const { getByText } = render(
      <UIProvider>
        <PomodoroWidget ref={ref} durationMs={1000} phase="short-break" />
      </UIProvider>,
    )
    expect(ref.current?.getAttribute('role')).toBe('timer')
    expect(ref.current?.getAttribute('aria-label')).toContain('short-break timer')
    fireEvent.click(getByText('Start'))
    advance(2000) // completes with no onComplete wired — must not throw
    expect(getByText('00:00')).not.toBeNull()
  })
})
