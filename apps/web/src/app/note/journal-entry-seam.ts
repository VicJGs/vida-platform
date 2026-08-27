// ============================================================================
// journal-entry-seam — MOD-notes ② · B7 (LIF-131). The journal `entry` editor
// MOUNT SEAM the UX-6 Home (section-model.ts:33 entry renderHint 'editor-seam')
// consumes. Home's rendered `/` screen is Phase-1b (home/CLAUDE.md), so B7 ships
// the typed resolver — NOT a screen: resolve-or-create today's `journal` page and
// hand its id to the B2 editor mount (/note/$id). Idempotent + client-deterministic
// (NP-2 — one journal per date; resolve-first so JournalExistsError never fires).
// `[FACT: b7-summary-block.md BR-B7-5; home/section-model.ts:28-34; home/CLAUDE.md;
//  business-rules NP-2; service.ts getPageByJournalDate/createPage]`
// ============================================================================

import type { NotesService } from '@vida/core'

/**
 * Resolve today's journal `pages` row id, creating it on first open (NP-2 idempotent). The result feeds the B2
 * editor mount at `/note/$id`. `today` is a `YYYY-MM-DD` calendar date (the caller injects it — no `Date.now()` in a
 * pure seam, ZK-1). `[FACT: service.ts getPageByJournalDate/createPage; validators/note.ts:25-45 (minimal journal input)]`
 */
export async function resolveTodayJournalPageId(svc: NotesService, today: string): Promise<string> {
  const existing = await svc.getPageByJournalDate(today)
  if (existing != null) return existing.id
  const created = await svc.createPage({ type: 'journal', journal_date: today })
  return created.id
}
