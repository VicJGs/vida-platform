// @vitest-environment jsdom
// AR-4 form factory — Zod validation flows through TanStack Form's onChange
// (Standard Schema). Renders a field, drives an invalid then a valid value.
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useZodForm } from './forms'

const schema = z.object({ name: z.string().min(2, 'too short') })

function TestForm() {
  const form = useZodForm({
    schema,
    defaultValues: { name: '' },
    onSubmit: () => {},
  })
  return (
    <form.Field name="name">
      {(field) => (
        <>
          <input aria-label="name" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
          <span data-testid="err">
            {field.state.meta.errors
              .map((e) => (e as unknown as { message?: string } | undefined)?.message ?? '')
              .join(',')}
          </span>
        </>
      )}
    </form.Field>
  )
}

describe('useZodForm (TanStack Form + Zod)', () => {
  it('surfaces a Zod error for an invalid value and clears it for a valid one', async () => {
    render(<TestForm />)
    const input = screen.getByLabelText('name')

    fireEvent.change(input, { target: { value: 'a' } })
    await waitFor(() => expect(screen.getByTestId('err').textContent).toMatch(/too short/))

    fireEvent.change(input, { target: { value: 'abcd' } })
    await waitFor(() => expect(screen.getByTestId('err').textContent).toBe(''))
  })
})
