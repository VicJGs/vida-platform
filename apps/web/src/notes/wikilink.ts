// ============================================================================
// wikilink — the pure core for the `[[` wiki-link picker (fe-notes-and-pages #27,
// S4). resolveWikiLink returns title-LIKE candidate PageRows (id-bound, NP-7); the
// picker maps them to a view-model + offers an EXPLICIT "+ Create '<query>'" row,
// and create-on-miss is the explicit two-call compose (createPage→createPageLink,
// IR-4 — never a bundled service method). PURE: no React, no @vida/core.
//
// The editor-side `[[` TRIGGER (the suggestion surface) is a ui-3 @vida/editor
// concern (e4-slash-menu.md:31), NOT built here — fe-notes owns the picker + compose.
// ============================================================================
import type { PageType } from '@vida/types'

/** Structural projection of a resolveWikiLink `PageRow` (the PageLike precedent, page-binding.ts:16). */
export interface PageRowLike {
  id: string
  type: PageType | string
  title: string | null
  icon?: string | null
}

export interface WikiCandidate {
  id: string
  type: PageType | string
  title: string
  icon: string | null
}

/** The "+ Create '<query>'" row model (NOT-19 — create-on-miss, always explicit). */
export interface CreateRow {
  query: string
}

/** Map resolver rows → candidates. Defensively drops null/blank titles (resolveWikiLink already excludes null). */
export function toCandidates(rows: PageRowLike[]): WikiCandidate[] {
  const out: WikiCandidate[] = []
  for (const r of rows) {
    if (r.title === null || r.title.trim() === '') continue
    out.push({ id: r.id, type: r.type, title: r.title, icon: r.icon ?? null })
  }
  return out
}

/** The create-on-miss row: present iff the query is non-blank (a typo still offers Create; blank offers nothing). */
export function createRowFor(query: string): CreateRow | null {
  const q = query.trim()
  return q === '' ? null : { query: q }
}

/**
 * Create-on-miss two-call compose (IR-4) — explicit, order-guaranteed. Pure over injected fns (testable with mocks;
 * the live hook passes `notes.createPage`/`notes.createPageLink`). Creates a stub `note` page THEN links to it; a
 * failed create never links. Typed errors (JournalExistsError/UnregisteredEntityTypeError) PROPAGATE — the caller
 * surfaces them (IR-8); this never swallows. Returns the new page id.
 */
export async function createAndLink(
  createPage: (input: { type: 'note'; title: string }) => Promise<{ id: string }>,
  createPageLink: (sourcePageId: string, targetPageId: string) => Promise<unknown>,
  sourcePageId: string,
  title: string,
): Promise<string> {
  const page = await createPage({ type: 'note', title })
  await createPageLink(sourcePageId, page.id)
  return page.id
}
