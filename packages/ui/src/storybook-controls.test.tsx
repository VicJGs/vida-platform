import { describe, expect, it, vi } from 'vitest'

// useArgs only works inside a rendered story; outside Storybook it is a plain mock returning [args, updateArgs].
const updateArgs = vi.fn()
vi.mock('storybook/preview-api', () => ({ useArgs: () => [{}, updateArgs] }))

// Lives in src/ because vitest skips dot folders; the helpers it proves live in .storybook/.
const { slot, useWriteBack } = await import('../.storybook/controls')

describe('Storybook controls', () => {
  it('slot turns a ReactNode prop into a select of named samples', () => {
    const title = <b>Monthly report</b>
    const control = slot({ title, none: null })
    expect(control.control).toEqual({ type: 'select' })
    expect(control.options).toEqual(['title', 'none'])
    expect(control.mapping).toEqual({ title, none: null })
  })

  it('useWriteBack writes a controlled value back while its control is set', () => {
    updateArgs.mockClear()
    const onChange = useWriteBack<boolean>('checked', false)
    onChange?.(true)
    expect(updateArgs).toHaveBeenCalledWith({ checked: true })

    // Unset control: the component runs uncontrolled, so no handler is passed.
    expect(useWriteBack<boolean>('checked', undefined)).toBeUndefined()
  })
})
