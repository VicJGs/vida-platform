import type { ReactNode } from 'react'
import { useArgs } from 'storybook/preview-api'

/**
 * Keeps a controlled prop interactive in a Playground. While the control holds a value, the component's change handler
 * writes the new value back into that control (so a set `checked` still toggles on click); while it's unset, the
 * component runs uncontrolled and no handler is passed. Remount on `controlKey` so React never sees the prop switch
 * between controlled and uncontrolled mid-life.
 */
export function useWriteBack<V>(name: string, value: V | undefined): ((next: V) => void) | undefined {
  const [, updateArgs] = useArgs()
  return value === undefined ? undefined : (next: V) => updateArgs({ [name]: next })
}

/** A remount key for a Playground: changes when a `default*` prop changes (it only applies on mount) or a controlled
 *  prop flips between set and unset. */
export function controlKey(...parts: unknown[]): string {
  return parts.map((p) => (p === undefined ? '∅' : String(p))).join('|')
}

// Controls for `ReactNode` props. Storybook infers a raw JSON editor for them, and JSON can't describe an element, so
// anything typed there renders nothing or throws ("Objects are not valid as a React child"). `slot` turns the prop into
// a select of named samples instead; Storybook swaps the chosen name for its element through `mapping`.

export function slot(samples: Record<string, ReactNode>) {
  return { control: { type: 'select' as const }, options: Object.keys(samples), mapping: samples }
}

const svg = (path: ReactNode) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
)

/** Icon samples for leading/trailing slots. Stroke icons on `currentColor`, so they tint per intent and theme. */
export const ICONS = {
  none: null,
  plus: svg(<path d="M12 5v14M5 12h14" />),
  arrow: svg(<path d="M5 12h14M13 6l6 6-6 6" />),
  check: svg(<path d="M5 12l5 5L20 7" />),
  search: svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>,
  ),
} satisfies Record<string, ReactNode>

/** Text samples: a short one, a long one that must wrap or truncate, and none. */
export function texts(short: string): Record<string, ReactNode> {
  return {
    short,
    long: `${short}, with a much longer label that has to wrap or truncate somewhere sensible`,
    none: null,
  }
}
