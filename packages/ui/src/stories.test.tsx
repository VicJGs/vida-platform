// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { composeStories } from '@storybook/react-vite'

// sigma reads WebGL2RenderingContext on import, which jsdom lacks. NeuralGraph's own no-WebGL guard renders its data
// fallback here, so the stub is never constructed.
vi.mock('sigma', () => ({ default: vi.fn() }))

// DSG-22 (LIF-866): every story of every component renders, one test per stories file. Lives in src/ because vitest
// skips dot folders; preview.tsx is applied once in .storybook/vitest.setup.ts, so each story gets the same
// UIProvider decorator it gets in Storybook.
const modules = import.meta.glob<Parameters<typeof composeStories>[0]>('./components/*.stories.tsx', {
  eager: true,
})

// One test renders every story of a file; year-view's twelve month grids pass 5 s when the suite runs in parallel
// (the canvas-reader precedent).
vi.setConfig({ testTimeout: 15000 })
afterEach(cleanup)

describe('Storybook stories', () => {
  for (const [path, module] of Object.entries(modules)) {
    const component = path.replace('./components/', '').replace('.stories.tsx', '')

    it(`DSG-22 ${component} stories render`, () => {
      const stories = Object.entries(composeStories(module))
      expect(stories.length).toBeGreaterThan(0)
      for (const [name, Story] of stories) {
        const { container } = render(<Story />)
        expect(container.childElementCount, `${component} / ${name}`).toBeGreaterThan(0)
        cleanup()
      }
    })
  }
})
