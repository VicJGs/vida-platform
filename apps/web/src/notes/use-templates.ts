// ============================================================================
// useTemplates — the templates picker/save DATA seam (fe-notes #27, S8; NOT-51/EC-13).
// Consumes the ADR-009 templates substrate: `listTemplates` IS built, so the list is a
// normal honest stub (M1 default empty / `?sample`; live = RQ over listTemplates — same
// data-plane defer as every slice). The ACTIONS degrade: apply (instantiate-fork) and
// saveCurrent (captureFromSpace) are UNBUILT @vida/core first-consumer-pull seams
// (service-tier, NOT-51 SPLIT → outside fe-notes' ② boundary) → stubbed no-op in M1 (F-S8-1).
//
// Live swap (zero signature change):
//   const { data } = useQuery({ queryKey: ['templates'], queryFn: () => templates.listTemplates() })
//   templates = toTemplateItems(data ?? [])
//   apply       → the instantiate-fork seam → navigate to the forked page
//   saveCurrent → capture(pageId) → templates.createTemplate({ name, bundle }); invalidate ['templates']
// ============================================================================

// Structural over `TemplateRow` (not re-exported from @vida/core — the PageLike/NoteAttachmentLike precedent).
export interface TemplateLike {
  id: string
  name: string
}
export interface TemplateItem {
  id: string
  name: string
}

/** 1:1 projection — the picker shows `name` only; `bundle` is opaque (D-S8-5). */
export function toTemplateItems(rows: readonly TemplateLike[]): TemplateItem[] {
  return rows.map((r) => ({ id: r.id, name: r.name }))
}

export type TemplatesState = 'loading' | 'error' | 'empty' | 'populated'
export interface TemplatesResult {
  templates: readonly TemplateItem[]
  state: TemplatesState
  apply: (templateId: string) => Promise<void>
  saveCurrent: () => Promise<void>
}

// --- DEV/gate sample (NOT live data). Live-block layouts (ADR-009); names are [E] (M1 plaintext pass-through). ---
const SAMPLE_ROWS: readonly TemplateLike[] = [
  { id: 'tpl-1', name: 'Daily journal' },
  { id: 'tpl-2', name: 'Meeting notes' },
]

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** M1 default (empty) + the DEV/gate sample. `_pageId` is unused in the stub; the live swap un-prefixes it for
 *  `saveCurrent` (capture the current page). `apply` INSTANTIATES a NEW fork → never reads `pageId` (N1). */
export function useTemplates(_pageId: string): TemplatesResult {
  const templates = devSampleActive() ? toTemplateItems(SAMPLE_ROWS) : []
  const state: TemplatesState = templates.length > 0 ? 'populated' : 'empty'
  // M1: no live store + the instantiate-fork/capture seams are unbuilt (F-S8-1) → no-ops. `_templateId` unused in the stub.
  const apply = async (_templateId: string): Promise<void> => {}
  const saveCurrent = async (): Promise<void> => {}
  return { templates, state, apply, saveCurrent }
}
