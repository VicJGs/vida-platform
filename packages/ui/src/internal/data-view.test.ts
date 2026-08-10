import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveDataViewState } from './data-view'

// Unit-tests the shared pure logic at the source (not only via the list/gallery/timeline consumers). Pure function,
// no JSX/DOM → a `.test.ts` (never renders `Message`).

afterEach(() => vi.restoreAllMocks())
const silence = () => vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('resolveDataViewState', () => {
  // ── role ────────────────────────────────────────────────────────────────────
  it('role="list" for loading and success-with-items', () => {
    expect(resolveDataViewState({ state: 'loading', itemCount: 0, name: 'X', ariaLabel: 'x' }).role).toBe('list')
    expect(resolveDataViewState({ state: 'success', itemCount: 3, name: 'X', ariaLabel: 'x' }).role).toBe('list')
  })

  it('role="status" for empty, error, and success-with-zero (self-heal)', () => {
    silence()
    expect(resolveDataViewState({ state: 'empty', itemCount: 0, name: 'X' }).role).toBe('status')
    expect(resolveDataViewState({ state: 'error', itemCount: 0, name: 'X' }).role).toBe('status')
    expect(resolveDataViewState({ state: 'success', itemCount: 0, name: 'X' }).role).toBe('status')
  })

  // ── effectiveEmpty ──────────────────────────────────────────────────────────
  it('effectiveEmpty: true for empty + success-zero; false for error + success-with-items', () => {
    silence()
    expect(resolveDataViewState({ state: 'empty', itemCount: 0, name: 'X' }).effectiveEmpty).toBe(true)
    expect(resolveDataViewState({ state: 'success', itemCount: 0, name: 'X' }).effectiveEmpty).toBe(true)
    expect(resolveDataViewState({ state: 'error', itemCount: 0, name: 'X' }).effectiveEmpty).toBe(false)
    expect(resolveDataViewState({ state: 'success', itemCount: 2, name: 'X', ariaLabel: 'x' }).effectiveEmpty).toBe(false)
  })

  // ── dev-warns (substrings are regression-critical — the consumers assert them) ─
  it('warns on success+empty items, with the name prefix + the "empty `items`" substring', () => {
    const warn = silence()
    resolveDataViewState({ state: 'success', itemCount: 0, name: 'ListView' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty `items`'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ListView'))
  })

  it('warns "stale render" on loading+items', () => {
    const warn = silence()
    resolveDataViewState({ state: 'loading', itemCount: 2, name: 'X', ariaLabel: 'x' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale render'))
  })

  it('warns "accessible name" on a rendered list with no name', () => {
    const warn = silence()
    resolveDataViewState({ state: 'success', itemCount: 2, name: 'X' })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
  })

  it('does NOT warn about a name in the empty/error states (no list rendered)', () => {
    const warn = silence()
    resolveDataViewState({ state: 'empty', itemCount: 0, name: 'X' })
    resolveDataViewState({ state: 'error', itemCount: 0, name: 'X' })
    expect(warn).not.toHaveBeenCalled()
  })

  it('does NOT warn for a well-formed named list (aria-label or aria-labelledby)', () => {
    const warn = silence()
    resolveDataViewState({ state: 'success', itemCount: 2, name: 'X', ariaLabel: 'Rows' })
    resolveDataViewState({ state: 'success', itemCount: 2, name: 'X', ariaLabelledby: 'h1' })
    expect(warn).not.toHaveBeenCalled()
  })
})
