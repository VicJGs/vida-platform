import { describe, it, expect, beforeEach } from 'vitest'
import { useCommandBarUIStore } from './command-bar-ui-store'

describe('useCommandBarUIStore', () => {
  beforeEach(() => {
    useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
  })

  it('open() sets isOpen', () => {
    useCommandBarUIStore.getState().open()
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('setQuery() with text switches mode to search', () => {
    useCommandBarUIStore.getState().setQuery('tasks')
    expect(useCommandBarUIStore.getState().mode).toBe('search')
  })

  it('setQuery() cleared returns mode to command', () => {
    useCommandBarUIStore.getState().setQuery('tasks')
    useCommandBarUIStore.getState().setQuery('')
    expect(useCommandBarUIStore.getState().mode).toBe('command')
  })

  it('close() resets open, query, and mode (the closed signal)', () => {
    const s = useCommandBarUIStore.getState()
    s.open()
    s.setQuery('x')
    s.close()
    expect(useCommandBarUIStore.getState()).toMatchObject({ isOpen: false, query: '', mode: 'command' })
  })
})
