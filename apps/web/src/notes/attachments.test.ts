import { describe, expect, it } from 'vitest'
import { formatBytes, toAttachmentItems, type NoteAttachmentLike } from './attachments'

describe('toAttachmentItems (NOT-30 — attachments list view-model)', () => {
  it('maps rows → items (id/filename/mime/size)', () => {
    const rows: NoteAttachmentLike[] = [
      { id: 'a', filename: 'spec.pdf', mime_type: 'application/pdf', size_bytes: 2048 },
      { id: 'b', filename: 'shot.png', mime_type: 'image/png', size_bytes: 500 },
    ]
    expect(toAttachmentItems(rows)).toEqual([
      { id: 'a', filename: 'spec.pdf', mime: 'application/pdf', sizeBytes: 2048 },
      { id: 'b', filename: 'shot.png', mime: 'image/png', sizeBytes: 500 },
    ])
  })
  it('empty → []', () => {
    expect(toAttachmentItems([])).toEqual([])
  })
})

describe('formatBytes', () => {
  it('bytes under 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })
  it('KB (1 decimal)', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })
  it('MB (1 decimal)', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    expect(formatBytes(Math.round(2.3 * 1024 * 1024))).toBe('2.3 MB')
  })
})
