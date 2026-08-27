// @vitest-environment jsdom
// MOD-notes ② · B7 — the dailySummary block body: one card per enabled row, each degrading to the inert 'empty' state;
// the block never blanks (sections from the attr, else the A7 config fallback, else an explicit non-blank surface).
// Real @vida/ui; getSummaryConfig mocked via getNotesService. Spec: b7-summary-block.md BR-B7-1/3/4.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import type { JournalSummaryConfig } from '@vida/types'

const h = vi.hoisted(() => ({ getSummaryConfig: vi.fn() }))
vi.mock('../notes/notes-service', () => ({ getNotesService: () => ({ getSummaryConfig: h.getSummaryConfig }) }))

import { DailySummaryBody } from './daily-summary-body'

afterEach(() => {
  cleanup()
  h.getSummaryConfig.mockReset()
})

function renderBody(attrs: { date: string | null; sections: string[] }, config: JournalSummaryConfig | null = null) {
  h.getSummaryConfig.mockResolvedValue(config)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, createElement(UIProvider, null, children))
  return render(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- attrs mirror ctx.attrs (loosely typed)
    createElement(DailySummaryBody, { attrs: attrs as any, pageId: 'p1' }),
    { wrapper },
  )
}

describe('DailySummaryBody (BR-B7-1/3/4)', () => {
  it('renders one card per section from the block attr, each in the inert "empty" state (never blanks)', async () => {
    renderBody({ date: '2026-08-26', sections: ['habits', 'tasks'] })
    expect(await screen.findByText('Habits')).toBeTruthy()
    expect(screen.getByText('Tasks')).toBeTruthy()
    // both degrade to the inert message, not an error
    expect(screen.getAllByText('available when Journals ships').length).toBe(2)
  })

  it('falls back to the A7 summary_config when the block attr sections is empty (BR-B7-4)', async () => {
    renderBody({ date: null, sections: [] }, { showStudySessions: true })
    expect(await screen.findByText('Study')).toBeTruthy()
    expect(screen.queryByText('Habits')).toBeNull()
  })

  it('renders an explicit non-blank surface when there are no sections AND no config (R2 — never a void)', async () => {
    renderBody({ date: null, sections: [] }, null)
    expect(await screen.findByText(/No summary sections configured/i)).toBeTruthy()
  })

  it('is an accessible named region (§XIV)', async () => {
    renderBody({ date: null, sections: ['habits'] })
    await screen.findByText('Habits')
    expect(screen.getByRole('note', { name: 'Daily summary' })).toBeTruthy()
  })
})
