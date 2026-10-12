import { describe, expect, it } from 'vitest'
import type { Notification } from '@vida/types'
import { relFuture, relPast, toAttentionModel, type UpcomingItem } from './attention-model'

const NOW = 1_760_000_000_000

function row(over: Partial<Notification> & Pick<Notification, 'id' | 'type' | 'title'>): Notification {
  return {
    message: null,
    action_url: null,
    action_label: null,
    entity_type: null,
    entity_id: null,
    is_read: false,
    read_at: null,
    is_archived: false,
    archived_at: null,
    expires_at: null,
    delivered_in_app: true,
    delivered_push: false,
    delivered_email: false,
    metadata: null,
    effect_event_id: null,
    created_at: NOW - 3_600_000,
    ...over,
  }
}

describe('relPast / relFuture', () => {
  it('bucket boundaries', () => {
    expect(relPast(NOW - 10 * 60_000, NOW)).toBe('just now')
    expect(relPast(NOW - 5 * 3_600_000, NOW)).toBe('5h ago')
    expect(relPast(NOW - 2 * 86_400_000, NOW)).toBe('2d ago')
    expect(relFuture(NOW + 10 * 60_000, NOW)).toBe('soon')
    expect(relFuture(NOW + 6 * 3_600_000, NOW)).toBe('in 6h')
    expect(relFuture(NOW + 2 * 86_400_000, NOW)).toBe('in 2d')
  })
})

describe('toAttentionModel', () => {
  it('splits settled (rows, newest-first) from anticipated (upcoming, soonest-first)', () => {
    const rows = [row({ id: 'a', type: 'info', title: 'older', created_at: NOW - 2 * 86_400_000 }), row({ id: 'b', type: 'info', title: 'newer', created_at: NOW - 3_600_000 })]
    const upcoming: UpcomingItem[] = [
      { id: 'u2', type: 'reminder', title: 'later', voice: null, entity: null, dueAt: NOW + 6 * 3_600_000 },
      { id: 'u1', type: 'reminder', title: 'sooner', voice: null, entity: null, dueAt: NOW + 2 * 3_600_000 },
    ]
    const m = toAttentionModel(rows, upcoming, NOW)
    expect(m.settled.map((e) => e.id)).toEqual(['b', 'a']) // newest-first
    expect(m.anticipated.map((e) => e.id)).toEqual(['u1', 'u2']) // soonest-first
    expect(m.anticipated.every((e) => e.anticipated)).toBe(true)
    expect(m.settled.every((e) => !e.anticipated)).toBe(true)
  })

  it('error/warning are warm; the other four are quiet (EC-5)', () => {
    const rows = (['info', 'success', 'reminder', 'achievement', 'warning', 'error'] as const).map((t) => row({ id: t, type: t, title: t }))
    const m = toAttentionModel(rows, [], NOW)
    const warm = Object.fromEntries(m.settled.map((e) => [e.type, e.warm]))
    expect(warm).toMatchObject({ error: true, warning: true, info: false, success: false, reminder: false, achievement: false })
  })

  it('NOT-25: a dangling-flagged action_url resolves to dangling; a live one does not', () => {
    const dangling = row({ id: 'd', type: 'success', title: 'gone', action_url: '/x', metadata: JSON.stringify({ _dangling: true }) })
    const live = row({ id: 'l', type: 'success', title: 'here', action_url: '/x', metadata: null })
    const m = toAttentionModel([dangling, live], [], NOW)
    expect(m.settled.find((e) => e.id === 'd')?.dangling).toBe(true)
    expect(m.settled.find((e) => e.id === 'l')?.dangling).toBe(false)
  })

  it('groups settled by life-area (entity_type → label; unmapped → General)', () => {
    const rows = [row({ id: '1', type: 'info', title: 'h', entity_type: 'habit' }), row({ id: '2', type: 'info', title: 't', entity_type: 'task' }), row({ id: '3', type: 'info', title: 'x', entity_type: 'weird_thing' })]
    const m = toAttentionModel(rows, [], NOW)
    const areas = Object.fromEntries(m.byArea.map((a) => [a.area, a.entries.length]))
    expect(areas).toMatchObject({ Habits: 1, Tasks: 1, General: 1 })
  })
})
