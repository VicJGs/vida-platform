// Form factory — AR-4 (LIF-75). Standardizes TanStack Form + Zod: a Zod schema
// is passed straight into `validators.onChange` (Zod 4 is a Standard Schema — no
// separate adapter package, BR-RT-9/10). One validator vocabulary shared with
// DB records and route params (data-flow.md §9).
import { useForm } from '@tanstack/react-form'
import type { z } from 'zod'

/**
 * A TanStack Form pre-wired to a Zod schema for on-change validation.
 * `defaultValues` are the schema's input type; `onSubmit` receives the parsed output.
 */
export function useZodForm<S extends z.ZodType>(config: {
  schema: S
  defaultValues: z.input<S>
  onSubmit: (value: z.output<S>) => void | Promise<void>
}) {
  return useForm({
    defaultValues: config.defaultValues,
    // zod v4 schemas ARE Standard Schemas that TanStack validates at runtime (the
    // forms test proves it end-to-end). The generic wrapper can't prove that to
    // TanStack's `RejectPromiseValidator<S>` position, so this one field is cast;
    // the public API stays fully typed via `S` (defaultValues + onSubmit output).
    validators: { onChange: config.schema as never },
    onSubmit: ({ value }) => config.onSubmit(value as z.output<S>),
  })
}
