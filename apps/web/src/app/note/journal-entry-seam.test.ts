// MOD-notes ② · B7 — resolveTodayJournalPageId (the Home entry mount seam). Resolve-or-create today's journal page,
// idempotent (NP-2). Spec: b7-summary-block.md BR-B7-5.
import { describe, expect, it, vi } from 'vitest'
import type { NotesService, PageRow } from '@vida/core'
import { resolveTodayJournalPageId } from './journal-entry-seam'

const journalRow = (over: Partial<PageRow> = {}): PageRow =>
  ({ id: 'j-2026-08-26', type: 'journal', journal_date: '2026-08-26', ...over }) as unknown as PageRow

function svcWith(over: Partial<NotesService>): NotesService {
  return over as unknown as NotesService
}

describe('resolveTodayJournalPageId (BR-B7-5)', () => {
  it('returns the EXISTING journal id when one exists for the date — no create (idempotent)', async () => {
    const getPageByJournalDate = vi.fn().mockResolvedValue(journalRow())
    const createPage = vi.fn()
    const id = await resolveTodayJournalPageId(svcWith({ getPageByJournalDate, createPage }), '2026-08-26')
    expect(id).toBe('j-2026-08-26')
    expect(getPageByJournalDate).toHaveBeenCalledWith('2026-08-26')
    expect(createPage).not.toHaveBeenCalled()
  })

  it('creates {type:journal, journal_date} once on first open, returns the new id', async () => {
    const getPageByJournalDate = vi.fn().mockResolvedValue(null)
    const createPage = vi.fn().mockResolvedValue(journalRow({ id: 'new-j' }))
    const id = await resolveTodayJournalPageId(svcWith({ getPageByJournalDate, createPage }), '2026-08-26')
    expect(id).toBe('new-j')
    expect(createPage).toHaveBeenCalledWith({ type: 'journal', journal_date: '2026-08-26' })
    expect(createPage).toHaveBeenCalledTimes(1)
  })
})
