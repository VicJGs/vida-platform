// ============================================================================
// XS-ingestion #44 · S3 Verification Gate — reconcile-on-import engine (XCU-10/11)
//
// Pure engine + in-memory staging port (the durable import_staging table is M2 · U-4).
// Proves the slice-map S3 ledger:
//   • auto-match within tolerance / miss outside · per-row status assigned
//   • parse_error rows never matched + never committed (fail-loud, not silent)
//   • commit only confirmed rows · idempotent (re-commit ⇒ skipped)
//   • dedupeFeed marks is_ignored (never delete) · dedup by (feedId, uid) exact
//   • staging port round-trips (put → take → clear) — the persistence probe
// ============================================================================

import { describe, it, expect } from 'vitest'
import { autoMatch, commitStaged, dedupeFeed, createInMemoryStagingPort } from '../reconcile'
import type { StagedRow, MatchCandidate, MatchTolerance } from '../types'

const tol: MatchTolerance = { dateDays: 3, amountCents: 100 }
const row = (over: Partial<StagedRow> = {}): StagedRow => ({
  sourceRowId: 'r1',
  date: '2026-09-10',
  amountCents: 5000,
  parsed: { memo: 'coffee' },
  status: 'unmatched',
  ...over,
})

describe('autoMatch (XCU-10) — by date± / amount± tolerance', () => {
  it('matches within both tolerances → auto_matched + matchId', () => {
    const existing: MatchCandidate[] = [{ id: 'tx-1', date: '2026-09-12', amountCents: 5050 }]
    const [r] = autoMatch([row()], existing, tol)
    expect(r.status).toBe('auto_matched')
    expect(r.matchId).toBe('tx-1')
  })

  it('misses when the date is outside tolerance → unmatched', () => {
    const existing: MatchCandidate[] = [{ id: 'tx-1', date: '2026-09-20', amountCents: 5000 }]
    const [r] = autoMatch([row()], existing, tol)
    expect(r.status).toBe('unmatched')
    expect(r.matchId).toBeUndefined()
  })

  it('misses when the amount is outside tolerance → unmatched', () => {
    const existing: MatchCandidate[] = [{ id: 'tx-1', date: '2026-09-10', amountCents: 6000 }]
    expect(autoMatch([row()], existing, tol)[0].status).toBe('unmatched')
  })

  it('a parse_error row is NEVER auto-matched (fail-loud passes through untouched)', () => {
    const existing: MatchCandidate[] = [{ id: 'tx-1', date: '2026-09-10', amountCents: 5000 }]
    const [r] = autoMatch([row({ status: 'parse_error', error: 'bad OFX line 3' })], existing, tol)
    expect(r.status).toBe('parse_error')
    expect(r.matchId).toBeUndefined()
  })
})

describe('commitStaged (XCU-10) — user is final authority; idempotent; fail-loud', () => {
  it('commits confirmed non-error rows', () => {
    const res = commitStaged([row({ sourceRowId: 'a', status: 'auto_matched' }), row({ sourceRowId: 'b', status: 'unmatched' })])
    expect(res.committed).toEqual(['a', 'b'])
    expect(res.rejected).toEqual([])
  })

  it('rejects a parse_error row even if confirmed (fail-loud, never silently committed)', () => {
    const res = commitStaged([row({ sourceRowId: 'a', status: 'parse_error', error: 'bad' })])
    expect(res.committed).toEqual([])
    expect(res.rejected).toEqual([{ sourceRowId: 'a', reason: 'parse_error' }])
  })

  it('is idempotent — a re-commit of an already-committed row is skipped', () => {
    const rows = [row({ sourceRowId: 'a', status: 'auto_matched' })]
    const first = commitStaged(rows)
    expect(first.committed).toEqual(['a'])
    const second = commitStaged(rows, new Set(first.committed))
    expect(second.committed).toEqual([])
    expect(second.rejected).toEqual([{ sourceRowId: 'a', reason: 'already_committed' }])
  })
})

describe('dedupeFeed (XCU-11) — add-only, by (feedId, uid), mark is_ignored, never delete', () => {
  it('marks a duplicate is_ignored and keeps the row (no deletion)', () => {
    const seen = [{ feedId: 'ics-1', uid: 'evt-100' }]
    const out = dedupeFeed([{ feedId: 'ics-1', uid: 'evt-100' }, { feedId: 'ics-1', uid: 'evt-200' }], seen)
    expect(out).toHaveLength(2) // nothing deleted
    expect(out[0].isIgnored).toBe(true)
    expect(out[1].isIgnored).toBe(false)
  })

  it('dedups by the exact (feedId, uid) pair — same uid, different feed is NOT a dup', () => {
    const seen = [{ feedId: 'ics-1', uid: 'evt-100' }]
    const out = dedupeFeed([{ feedId: 'ics-2', uid: 'evt-100' }], seen)
    expect(out[0].isIgnored).toBe(false)
  })
})

describe('createInMemoryStagingPort (XCU-10) — the M1 staging seam · persistence probe', () => {
  it('round-trips staged rows by batch: put → take → clear', async () => {
    const port = createInMemoryStagingPort()
    const rows = [row({ sourceRowId: 'a' }), row({ sourceRowId: 'b' })]
    await port.put('batch-1', rows)
    expect(await port.take('batch-1')).toEqual(rows)
    await port.clear('batch-1')
    expect(await port.take('batch-1')).toEqual([])
  })
})
