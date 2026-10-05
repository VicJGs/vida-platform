import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type ReactElement,
  type Ref,
  type RefAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { styled, Text, Theme, View } from '@tamagui/core'
import { ensureSelectStyles } from '../internal/select-styles'

// UI-1 · Select (primitive 4/10, first molecular + first floating/portalled) — implements
// ds-5-primitive-contracts/select.md against Tamagui v2. Reconcile: ui-1-vida-ui-primitives/u4-select.md.
// - WAI-ARIA 1.2 APG "select-only combobox": a real <button role="combobox"> trigger (render:'button', ref target =
//   HTMLButtonElement) whose keyboard is 100% hand-handled; a listbox panel PORTALLED to document.body (zIndex.dropdown).
// - Focus STAYS on the trigger the whole time; the highlighted option is tracked in state + surfaced via
//   aria-activedescendant → so "focus returns to the trigger on close" is automatic (focus never left). No focus trap.
// - name:'Select' scopes the light_/dark_Select sub-theme ($background/$border/$borderError/$text/$placeholder/$radius +
//   the --panelBackground var). The portal detaches the panel from that scope, so it is re-wrapped in <Theme name="Select">.
// - Motion (B12): panel opacity+translateY, chevron rotate — transform/opacity ONLY; highlight/border are instant swaps.
//   Delivered via injected CSS reading motion.ts (the shipped interaction/checkbox precedent), reduced-motion via @media.

type SelectSize = 'sm' | 'md' | 'lg'

export interface SelectProps<T extends string = string> {
  /** Controlled value. */
  value?: T
  /** Uncontrolled initial value. */
  defaultValue?: T
  /** Fires on selection, in both controlled + uncontrolled modes. */
  onValueChange?: (v: T) => void
  /** The closed, known list of choices. */
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>
  /** Shown (muted) when there is no value. */
  placeholder?: string
  disabled?: boolean
  /** Semantic error state — danger border + `aria-invalid`. */
  invalid?: boolean
  required?: boolean
  /** Control size. Default 'md'. */
  size?: SelectSize
  /** Hidden-input name for form participation. */
  name?: string
  /** For the label association / accessible name (mirrored to the listbox). */
  id?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

// Trigger — visually like Input (border/bg/padding/radius, size scale $32/$40/$48), semantically a button.
const SelectTrigger = styled(View, {
  name: 'Select',
  render: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  backgroundColor: '$colorSurfacePrimary',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  // radius.control (md) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$md',
  cursor: 'pointer',
  // §VIII focus ring — the trigger IS the focusable element (unlike Input), so its own :focus-visible fires (Button precedent).
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
  hoverStyle: { borderColor: '$colorTextMuted' },
  variants: {
    size: {
      sm: { height: '$32', paddingHorizontal: '$12', gap: '$4' },
      md: { height: '$40', paddingHorizontal: '$16', gap: '$8' },
      lg: { height: '$48', paddingHorizontal: '$20', gap: '$8' },
    },
    // Danger border via a Tamagui VARIANT (U3 lesson: injected CSS loses the specificity race vs Tamagui border classes).
    invalid: { true: { borderColor: '$borderError', hoverStyle: { borderColor: '$borderError' } } },
    disabled: { true: { opacity: 0.5, cursor: 'not-allowed', hoverStyle: { borderColor: '$colorBorderDefault' } } },
  } as const,
  defaultVariants: { size: 'md' },
})

const TRIGGER_TEXT: Record<SelectSize, string> = { sm: '$caption', md: '$small', lg: '$body' }

// One listbox option row. name:'Select' keeps it in the sub-theme scope (under the portal's <Theme>).
const SelectOption = styled(View, {
  name: 'Select',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$8',
  cursor: 'pointer',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
})

/** Chevron — rotates 180° on open (CSS, transform only). */
function Chevron() {
  return (
    <View className="vida-select-chevron" color="$colorTextMuted" pointerEvents="none">
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </View>
  )
}

/** Check on the selected option — communicates selection beyond colour (a11y: not colour-only). */
function Check() {
  return (
    <View color="$colorTextPrimary" pointerEvents="none">
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </View>
  )
}

// Position with a SINGLE `top` (never top+bottom together) — Tamagui's style handling does not clear a stale inline
// `top` when a later render omits it, so mixing top/bottom squished the flipped panel. One property = no stale key.
type PanelPos = { left: number; minWidth: number; maxWidth: number; maxHeight: number; top: number }

const SelectInner = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, defaultValue, onValueChange, options, placeholder, disabled, invalid, required, size = 'md', name, id, ...rest },
  ref,
) {
  ensureSelectStyles()

  const uid = useId()
  const listboxId = `${uid}-listbox`
  const optId = (i: number) => `${uid}-opt-${i}`

  const isControlled = value !== undefined
  const [innerValue, setInnerValue] = useState<string | undefined>(defaultValue)
  const current = isControlled ? value : innerValue

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [pos, setPos] = useState<PanelPos | null>(null)
  const [entered, setEntered] = useState(false)

  // Callback-merged ref: keep an internal HTMLButtonElement for positioning/focus while forwarding the consumer ref.
  const innerRef = useRef<HTMLButtonElement | null>(null)
  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )
  const panelRef = useRef<HTMLDivElement | null>(null)
  const optionEls = useRef<(HTMLElement | null)[]>([])
  const typeahead = useRef<{ buffer: string; timer: number }>({ buffer: '', timer: 0 })

  const r = rest as Record<string, unknown>
  const accessibleName = {
    'aria-label': r['aria-label'] as string | undefined,
    'aria-labelledby': r['aria-labelledby'] as string | undefined,
  }

  if (process.env.NODE_ENV !== 'production') {
    const named = id != null || accessibleName['aria-label'] != null || accessibleName['aria-labelledby'] != null
    if (!named) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Select: provide an `aria-label`/`aria-labelledby`, or an `id` with a matching `<label htmlFor>`, for an accessible name.',
      )
    }
  }

  const selectedLabel = options.find((o) => o.value === current)?.label

  // ── option navigation helpers (skip disabled; NO wrap) ──────────────────────────────────────────────
  const firstEnabled = () => options.findIndex((o) => !o.disabled)
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i]?.disabled) return i
    return -1
  }
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (!options[i]?.disabled) return i
    return from // no-wrap: stay put at the ends
  }

  const commit = useCallback(
    (v: string) => {
      if (!isControlled) setInnerValue(v)
      onValueChange?.(v)
      setOpen(false)
      innerRef.current?.focus()
    },
    [isControlled, onValueChange],
  )

  const openPanel = (active: number) => {
    const t = innerRef.current
    if (t) {
      const rect = t.getBoundingClientRect()
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
        maxWidth: window.innerWidth - rect.left - 8,
        maxHeight: 320,
      })
    }
    setActiveIndex(active)
    setOpen(true)
  }

  // ── keyboard (WAI-ARIA combobox; all keys hand-handled, focus stays on the trigger) ─────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled === true) return
    const key = e.key
    if (!open) {
      if (key === 'ArrowDown' || key === 'Enter' || key === ' ' || key === 'Spacebar') {
        e.preventDefault()
        openPanel(current != null ? Math.max(0, options.findIndex((o) => o.value === current)) : firstEnabled())
      } else if (key === 'ArrowUp') {
        e.preventDefault()
        openPanel(lastEnabled())
      } else if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Closed type-ahead → commit in place, do NOT open (native <select> / APG behaviour).
        const match = matchTypeahead(key)
        if (match >= 0) commit(options[match]!.value) // safe: guarded by `match >= 0` (matchTypeahead returns a valid index or -1)
      }
      return
    }
    // open:
    if (key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => step(i < 0 ? -1 : i, 1))
    } else if (key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => step(i < 0 ? options.length : i, -1))
    } else if (key === 'Home') {
      e.preventDefault()
      setActiveIndex(firstEnabled())
    } else if (key === 'End') {
      e.preventDefault()
      setActiveIndex(lastEnabled())
    } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault()
      const o = options[activeIndex]
      if (o && !o.disabled) commit(o.value)
    } else if (key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      innerRef.current?.focus() // APG: Esc dismisses + returns focus to the combobox (explicit, not just "never left")
    } else if (key === 'Tab') {
      setOpen(false) // do not trap — let the native Tab move focus
    } else if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const match = matchTypeahead(key)
      if (match >= 0) setActiveIndex(match)
    }
  }

  // type-ahead: buffer chars (reset ~500ms), match an enabled option-label prefix (case-insensitive).
  const matchTypeahead = (ch: string): number => {
    const ta = typeahead.current
    if (ta.timer) window.clearTimeout(ta.timer)
    ta.buffer += ch.toLowerCase()
    ta.timer = window.setTimeout(() => (ta.buffer = ''), 500)
    return options.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(ta.buffer))
  }

  // ── positioning: refine after mount (measure the panel → flip up + clamp) ───────────────────────────
  useLayoutEffect(() => {
    if (!open) {
      setEntered(false)
      return
    }
    const t = innerRef.current
    const panel = panelRef.current
    if (!t || !panel) return
    const rect = t.getBoundingClientRect()
    const gap = 4
    const vh = window.innerHeight
    const vw = window.innerWidth
    const natural = panel.offsetHeight // content height at the provisional (maxHeight 320) position
    const spaceBelow = vh - rect.bottom - gap
    const spaceAbove = rect.top - gap
    const openUp = natural > spaceBelow && spaceAbove > spaceBelow
    const maxHeight = Math.min(320, openUp ? spaceAbove : spaceBelow)
    const height = Math.min(natural, maxHeight)
    const left = Math.min(rect.left, Math.max(8, vw - rect.width - 8)) // shift left if it would overflow right
    setPos({
      left,
      minWidth: rect.width,
      maxWidth: vw - left - 8,
      maxHeight,
      top: openUp ? rect.top - height - gap : rect.bottom + gap, // single positioning property (see PanelPos note)
    })
    setEntered(true) // triggers the injected enter transition (opacity/translateY)
  }, [open])

  // active option scrolled into view (block:'nearest' only scrolls the panel's overflow, never the page).
  // `?.scrollIntoView?.` — the method is absent in jsdom; the optional call keeps the test env from throwing.
  useEffect(() => {
    if (open && activeIndex >= 0) optionEls.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  // dismiss: outside pointerdown · capture-phase scroll (catches NESTED scroll containers) · resize reposition.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (innerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onScroll = () => setOpen(false)
    const onResize = () => setOpen(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, { capture: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const toggle = () => {
    if (disabled === true) return
    if (open) setOpen(false)
    else openPanel(current != null ? Math.max(0, options.findIndex((o) => o.value === current)) : firstEnabled())
  }

  return (
    <>
      <SelectTrigger
        ref={setTriggerRef}
        className={invalid === true ? 'vida-select-trigger vida-select-invalid' : 'vida-select-trigger'}
        {...rest}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optId(activeIndex) : undefined}
        aria-invalid={invalid === true ? true : undefined}
        aria-required={required === true ? true : undefined}
        id={id}
        size={size}
        invalid={invalid === true}
        disabled={disabled === true}
        onClick={toggle}
        onKeyDown={onKeyDown}
      >
        <Text
          fontFamily="$body"
          fontSize={TRIGGER_TEXT[size]}
          color={selectedLabel != null ? '$colorTextPrimary' : '$colorTextMuted'}
          numberOfLines={1}
        >
          {selectedLabel ?? placeholder ?? ''}
        </Text>
        <Chevron />
      </SelectTrigger>

      {/* Hidden input → the Select participates in native form submit. */}
      {name != null && <input type="hidden" name={name} value={current ?? ''} readOnly />}

      {open &&
        pos != null &&
        typeof document !== 'undefined' &&
        createPortal(
          // <Theme name="Select"> re-establishes the sub-theme scope the portal detached from `body`
          // (the base light/dark theme crosses via <html>, but the _Select scope does not).
          <Theme name="Select">
            <View
              ref={panelRef}
              className={entered ? 'vida-select-panel is-open' : 'vida-select-panel'}
              role="listbox"
              id={listboxId}
              aria-multiselectable="false"
              aria-label={accessibleName['aria-label']}
              aria-labelledby={accessibleName['aria-labelledby']}
              position="fixed"
              zIndex="$dropdown"
              backgroundColor="$colorSurfacePrimary"
              borderWidth={1}
              borderColor="$colorBorderDefault"
              borderRadius="$md"
              paddingVertical="$4"
              style={{
                left: pos.left,
                top: pos.top,
                minWidth: pos.minWidth,
                maxWidth: pos.maxWidth,
                maxHeight: pos.maxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {options.map((o, i) => {
                const selected = o.value === current
                return (
                  <SelectOption
                    key={o.value}
                    ref={(node) => {
                      optionEls.current[i] = node as HTMLElement | null // narrow the Tamagui ref to a DOM node (scrollIntoView)
                    }}
                    className={i === activeIndex ? 'vida-select-option is-active' : 'vida-select-option'}
                    role="option"
                    id={optId(i)}
                    aria-selected={selected}
                    aria-disabled={o.disabled === true ? true : undefined}
                    onPointerMove={() => !o.disabled && setActiveIndex(i)}
                    onClick={() => !o.disabled && commit(o.value)}
                  >
                    <Text fontFamily="$body" fontSize={TRIGGER_TEXT[size]} color="$colorTextPrimary" numberOfLines={1}>
                      {o.label}
                    </Text>
                    {selected && <Check />}
                  </SelectOption>
                )
              })}
            </View>
          </Theme>,
          document.body,
        )}
    </>
  )
})

// forwardRef erases the generic; re-expose a generic call signature intersected with the exotic type so `T` narrows
// at the call site (onValueChange:(v:T)) while displayName/assignability survive. One justified `as unknown`, no `any`.
type SelectComponent = ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLButtonElement>> &
  (<T extends string = string>(props: SelectProps<T> & { ref?: Ref<HTMLButtonElement> }) => ReactElement)

export const Select = SelectInner as unknown as SelectComponent
