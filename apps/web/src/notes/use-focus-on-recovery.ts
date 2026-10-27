// ============================================================================
// useFocusOnRecovery — focus is never lost after a recovered read (notes-rescope R3, PLAN-R3 G14 · IMPL R-9 · BR-R3-7).
// A Retry button unmounts when the content replaces the error, which would drop focus to <body> (WCAG 2.4.3). When a
// surface leaves `error` for any SETTLED state (success OR empty — never loading, never error again) its heading takes
// focus: the note page's H1, the collection's title, Home's journal frame (each `tabIndex={-1}`). A first successful
// load never moves focus.
// ============================================================================
import { useEffect, useRef, type RefObject } from 'react'

export function useFocusOnRecovery(state: string, target: RefObject<HTMLElement | null>): void {
  const wasError = useRef(false)
  useEffect(() => {
    if (state === 'error') {
      wasError.current = true
    } else if (state !== 'loading' && wasError.current) {
      wasError.current = false
      target.current?.focus()
    }
  }, [state, target])
}
