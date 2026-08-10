import { styled, Text } from '@tamagui/core'

// UI-2 · shared data-view spine — extracted at V3 (rule of three: list-view + gallery-view + timeline). Holds the
// pieces that are byte-identical across the data-driven platform views; the per-view container/wrapper/skeleton
// layout GENUINELY differs, so only the error-prone shared logic lives here (NOT a mega-component).
// Spec: docs/specs/components/ui-2-platform-views/v3-timeline.md §2.

/** The four rendered terminal states (BR-2). LOCAL union — @vida/ui deps are Tamagui-only, so importing
 *  @vida/core's `TerminalState` would be a wrong-direction edge; structural typing makes the app's
 *  deriveTerminalState() value assignable to this with no import. (Canonical home for the type across the views.) */
export type ViewState = 'loading' | 'empty' | 'error' | 'success'

/** Default empty/error copy — a muted, centered, full-width message for the `role="status"` region. `width:'100%'`
 *  keeps it a full-row status region in a grid (gallery) and fills the cross-axis harmlessly in a column. */
export const Message = styled(Text, {
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
  paddingVertical: '$24',
  paddingHorizontal: '$12',
  textAlign: 'center',
  width: '100%',
})

/** Dev-only warn when a rendered named region has no accessible name. Extracted (V4) so calendar-view can reuse it
 *  WITHOUT `resolveDataViewState`'s list-shaped role/empty logic. The STATE GATE (when a name is required) stays with
 *  the CALLER — this function only does the null-name check + the (regression-critical 'accessible name') warn. */
export function warnMissingName(name: string, ariaLabel?: string, ariaLabelledby?: string): void {
  if (process.env.NODE_ENV !== 'production' && ariaLabel == null && ariaLabelledby == null)
    // eslint-disable-next-line no-console
    console.warn(`[vida/ui] ${name}: needs an accessible name (\`aria-label\` or \`aria-labelledby\`).`)
}

/** Resolve a data-view's container role + empty-ness, and fire the dev-only contract warnings. A PLAIN function
 *  (not a hook — no state/effects; it computes + warns during render, exactly as the components did inline). The
 *  per-view 4-branch body switch (which element renders per phase) stays local — only this shared logic is here. */
export function resolveDataViewState(args: {
  state: ViewState
  itemCount: number
  ariaLabel?: string
  ariaLabelledby?: string
  /** Component name for the warning prefix, e.g. 'ListView'. */
  name: string
}): { role: 'list' | 'status'; effectiveEmpty: boolean } {
  const { state, itemCount, ariaLabel, ariaLabelledby, name } = args
  // An empty success list self-heals to the empty render; role + body follow this EFFECTIVE state.
  const effectiveEmpty = state === 'empty' || (state === 'success' && itemCount === 0)

  // Dev-time contract guards (DCE'd in prod, per card.tsx). Warn substrings are regression-critical (DV-2):
  // 'empty `items`', 'stale render', 'accessible name' are asserted by the list/gallery tests.
  if (process.env.NODE_ENV !== 'production') {
    if (state === 'success' && itemCount === 0)
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] ${name}: state="success" with empty \`items\` — pass state="empty" (the app derives it).`)
    if (state === 'loading' && itemCount > 0)
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] ${name}: state="loading" with \`items\` present — a stale render (loading should have no items).`)
    // State gate STAYS here (a name is required only when a list/loading region actually renders); warnMissingName
    // does the null-name check + warn. Extracting the gate too would fire in empty/error and break the no-warn tests.
    if (state === 'loading' || (state === 'success' && !effectiveEmpty)) warnMissingName(name, ariaLabel, ariaLabelledby)
  }

  // empty + error render as a polite role="status" region (a role="list" with zero items trips axe); error is polite
  // (statically rendered, not a live insertion — the Toast contrast).
  const role: 'list' | 'status' = state === 'error' || effectiveEmpty ? 'status' : 'list'
  return { role, effectiveEmpty }
}
