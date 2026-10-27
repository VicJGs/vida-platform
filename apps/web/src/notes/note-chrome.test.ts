// ============================================================================
// notes-rescope R1 · E-3 / BR-R1-2 — `pageLabel`: a page never has an empty name (PLAN-R1 G2, test A2).
// ============================================================================
import { describe, expect, it } from 'vitest'
import { pageLabel, typeLabel } from './note-chrome'

describe('pageLabel (BR-R1-2)', () => {
  it('a non-empty title wins (trimmed)', () => {
    expect(pageLabel({ type: 'note', title: 'Project kickoff' })).toBe('Project kickoff')
    expect(pageLabel({ type: 'task_note', title: '  Ship it  ' })).toBe('Ship it')
  })

  it.each([
    ['task_note', 'Task note'],
    ['task_group_note', 'Task group note'],
    ['milestone_note', 'Milestone note'],
    ['deliverable_note', 'Deliverable note'],
  ])('an untitled %s → "%s" (the seed H1 already carries the parent title)', (type, label) => {
    expect(pageLabel({ type, title: null })).toBe(label)
    expect(pageLabel({ type, title: '   ' })).toBe(label)
  })

  it('an untitled freeform note → "Untitled note"', () => {
    expect(pageLabel({ type: 'note', title: null })).toBe('Untitled note')
    expect(pageLabel({ type: 'note', title: '' })).toBe('Untitled note')
  })

  it('a parent name (fed by R7 — A-33) names the *_note page', () => {
    expect(pageLabel({ type: 'task_note', title: null }, 'Buy milk')).toBe(`${typeLabel('task_note')} · Buy milk`)
    expect(pageLabel({ type: 'task_note', title: null }, '  ')).toBe('Task note')
    expect(pageLabel({ type: 'task_note', title: 'Own title' }, 'Buy milk')).toBe('Own title')
  })
})
