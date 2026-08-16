// UI-4 · S1 — the D5 drift guard. `@vida/ui`'s `config.media` (the runtime source of truth, authored in
// tamagui.config.ts) and this app's `TAMAGUI_MEDIA` (the UX-3 reserved mirror) must stay byte-identical, or a
// breakpoint added on one side silently diverges from the other. This test is the only thing binding them across
// the package boundary (packages/ui cannot import apps/web).
import { describe, expect, it } from 'vitest'
import { media } from '@vida/ui'
import { TAMAGUI_MEDIA } from './breakpoints'

describe('shell media parity (D5)', () => {
  it('@vida/ui config media mirrors the shell TAMAGUI_MEDIA', () => {
    expect(media).toEqual(TAMAGUI_MEDIA)
  })
})
