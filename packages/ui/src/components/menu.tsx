import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { styled, Text, Theme, View } from '@tamagui/core'
import { ensureMenuStyles } from '../internal/menu-styles'

// UI-1 · Menu (primitive 7/10, 4th molecular · second floating/portalled) — implements
// ds-5-primitive-contracts/menu.md against Tamagui v2. Reconcile: ui-1-vida-ui-primitives/u7-menu.md.
// - WAI-ARIA APG "menu button": trigger role=button + aria-haspopup=menu + aria-expanded; a role=menu panel
//   PORTALLED to document.body (zIndex.dropdown), items role=menuitem. Unlike Select (a combobox), focus MOVES into
//   the panel — ROVING DOM FOCUS on items (only the active item tabIndex=0, real .focus()), Esc returns focus to the
//   trigger. NO aria-activedescendant.
// - The `trigger` is a consumer SLOT (usually a <Button>): cloneElement injects aria + open handlers + a composed ref.
// - name:'Menu' scopes the light_/dark_Menu sub-theme ($background/$border/$colorTextPrimary/$itemBackgroundHover/$radius).
//   The portal detaches that scope, so the panel is re-wrapped in <Theme name="Menu">.
// - Motion (B12): panel opacity + transform (translateY from the trigger edge) via injected CSS reading motion.ts; the
//   item highlight is an `active` VARIANT (instant, state-driven — not :focus-visible). Reduced-motion via @media.

type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export interface MenuItem {
  /** Stable identity (also the React key). */
  id: string
  label: ReactNode
  /** Fired on activation; the menu then closes. */
  onSelect?: () => void
  disabled?: boolean
  /** Destructive items render the label in the danger colour. */
  intent?: 'default' | 'danger'
  /** Icon slot, rendered before the label. */
  leading?: ReactNode
}

export interface MenuProps {
  /** The opener — a single focusable element (usually a `<Button>`); decorated via cloneElement. */
  trigger: ReactNode
  items: ReadonlyArray<MenuItem>
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Fires on every open/close, in both controlled + uncontrolled modes. */
  onOpenChange?: (open: boolean) => void
  /** Anchor corner. Default 'bottom-start'. Flips vertically when clipped. */
  placement?: Placement
  /**
   * Accessible name for the menu panel. The contract's slot API is silent on the name source, but a role=menu needs
   * one (engineering §XIV) — provide one of these (DEF-U7-d flags the contract gap).
   */
  'aria-label'?: string
  'aria-labelledby'?: string
}

type PanelPos = { left: number; top: number; minWidth: number; maxWidth: number; maxHeight: number }

// The floating command panel. name:'Menu' keeps it in the sub-theme scope (under the portal's <Theme>).
const MenuPanel = styled(View, {
  name: 'Menu',
  position: 'fixed',
  backgroundColor: '$colorSurfacePrimary',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  // radius.control (md) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$md',
  paddingVertical: '$4',
})

// One command row. The FILL (hover + roving-active) is a Tamagui variant/hoverStyle — instant, state-driven (NOT
// :focus-visible, which is unreliable for a programmatically-focused element). focusVisibleStyle carries only the ring.
const MenuItemRow = styled(View, {
  name: 'Menu',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  cursor: 'pointer',
  // Resting text colour for the row's `leading`/`trailing` icon slots (lucide `currentColor`) — else a raw icon inherits
  // document black (invisible in dark). MenuItemLabel sets its OWN colour (default/danger), so the label is unchanged;
  // this only tints un-wrapped icon slots. The Button-frame-colour precedent (fe-shell-scope #15 S3 Visual-Gate fix).
  color: '$colorTextPrimary',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  borderRadius: '$md', // radius.control via the token scale (see CLAUDE.md — sub-theme radius key inert for dimensions)
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: -2 },
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  variants: {
    // Roving highlight = the active item (keyboard focus / pointer hover both set activeIndex). Instant swap (B12).
    active: { true: { backgroundColor: '$colorSurfaceSecondary' } },
    disabled: { true: { opacity: 0.5, cursor: 'not-allowed', hoverStyle: { backgroundColor: 'transparent' } } },
  } as const,
})

// The label. Danger colour lives HERE (on the Text that owns the colour), not on the row View — a <Text> with its own
// `color` does not inherit the parent View's colour (button.tsx/select.tsx precedent).
const MenuItemLabel = styled(Text, {
  name: 'Menu',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextPrimary',
  variants: {
    intent: { default: {}, danger: { color: '$colorSignalDanger' } },
  } as const,
  defaultVariants: { intent: 'default' },
})

// ── ref/handler composition (module-level, pure) ───────────────────────────────────────────────────────
function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MutableRefObject.current is readonly in the Ref type; assignment is the documented ref-callback contract
  else (ref as { current: T | null }).current = node
}

// Merge the consumer's own handler with ours; ours is skipped if the consumer called preventDefault.
function composeHandlers<E extends { defaultPrevented: boolean }>(
  theirs: ((e: E) => void) | undefined,
  ours: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    theirs?.(e)
    if (!e.defaultPrevented) ours(e)
  }
}

export const Menu = forwardRef<HTMLButtonElement, MenuProps>(function Menu(
  {
    trigger,
    items,
    open,
    defaultOpen,
    onOpenChange,
    placement = 'bottom-start',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  },
  ref,
) {
  ensureMenuStyles()

  const uid = useId()
  const menuId = `${uid}-menu`
  const itemId = (i: number) => `${uid}-item-${i}`

  const isOpenControlled = open !== undefined
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false)
  const isOpen = isOpenControlled ? open : innerOpen

  const [activeIndex, setActiveIndex] = useState(-1)
  const [pos, setPos] = useState<PanelPos | null>(null)
  const [entered, setEntered] = useState(false)
  const [resolvedSide, setResolvedSide] = useState<'top' | 'bottom'>('bottom')

  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const itemEls = useRef<(HTMLElement | null)[]>([])
  const typeahead = useRef<{ buffer: string; timer: number }>({ buffer: '', timer: 0 })

  // The consumer's element + its own props (onClick/onKeyDown to compose, ref to preserve — React 19: ref-as-prop).
  const triggerEl = isValidElement(trigger) ? (trigger as ReactElement<Record<string, unknown>>) : null
  const triggerProps = (triggerEl?.props ?? {}) as {
    onClick?: (e: ReactMouseEvent) => void
    onKeyDown?: (e: ReactKeyboardEvent) => void
    ref?: Ref<HTMLElement>
  }
  const ownRef = triggerProps.ref

  if (process.env.NODE_ENV !== 'production') {
    if (!isValidElement(trigger)) {
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] Menu: `trigger` must be a single valid React element (it receives a ref + ARIA state).')
    }
    if (ariaLabel == null && ariaLabelledby == null) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Menu: provide an `aria-label` or `aria-labelledby` — a role="menu" needs an accessible name.',
      )
    }
    if (items.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Menu: `items` is empty — rendering a disabled "No actions" row (usually a call-site bug).',
      )
    }
    const ids = items.map((it) => it.id)
    if (new Set(ids).size !== ids.length) {
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] Menu: duplicate `items[].id` — ids must be unique.')
    }
  }

  // ── enabled-item navigation (skip disabled; stepWrap WRAPS — menu convention, unlike Select's no-wrap) ──
  const firstEnabled = useCallback(() => items.findIndex((it) => !it.disabled), [items])
  const lastEnabled = useCallback(() => {
    for (let i = items.length - 1; i >= 0; i--) if (!items[i]?.disabled) return i
    return -1
  }, [items])
  const stepWrap = useCallback(
    (from: number, dir: 1 | -1) => {
      const n = items.length
      if (n === 0) return -1
      let i = from
      for (let c = 0; c < n; c++) {
        i = (i + dir + n) % n
        if (!items[i]?.disabled) return i
      }
      return from
    },
    [items],
  )

  const setOpenState = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [isOpenControlled, onOpenChange],
  )

  const openMenu = (active: number) => {
    setActiveIndex(active)
    setOpenState(true)
  }
  const closeMenu = (returnFocus: boolean) => {
    setOpenState(false)
    if (returnFocus) triggerRef.current?.focus?.()
  }
  const toggle = () => (isOpen ? closeMenu(false) : openMenu(firstEnabled()))

  const activate = (i: number) => {
    const it = items[i]
    if (!it || it.disabled) return
    it.onSelect?.()
    setOpenState(false)
    triggerRef.current?.focus?.()
  }

  // type-ahead: buffer chars (reset ~500ms), match an enabled STRING-label prefix (case-insensitive). Non-string
  // labels are skipped (inert, no error) — the contract allows a ReactNode label.
  const matchTypeahead = (ch: string): number => {
    const ta = typeahead.current
    if (ta.timer) window.clearTimeout(ta.timer)
    ta.buffer += ch.toLowerCase()
    ta.timer = window.setTimeout(() => (ta.buffer = ''), 500)
    return items.findIndex(
      (it) => !it.disabled && typeof it.label === 'string' && it.label.toLowerCase().startsWith(ta.buffer),
    )
  }

  // ── keyboard ────────────────────────────────────────────────────────────────────────────────────────
  const onTriggerKeyDown = (e: ReactKeyboardEvent) => {
    const key = e.key
    // preventDefault is REQUIRED: a native <button> synthesizes a click on Enter-keydown / Space-keyup — without it,
    // Enter would fire the keydown handler AND the composed onClick (toggle) → open-then-close double-fire.
    if (key === 'ArrowDown' || key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault()
      openMenu(firstEnabled())
    } else if (key === 'ArrowUp') {
      e.preventDefault()
      openMenu(lastEnabled())
    }
  }

  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    const key = e.key
    if (key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => stepWrap(i, 1))
    } else if (key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => stepWrap(i, -1))
    } else if (key === 'Home') {
      e.preventDefault()
      setActiveIndex(firstEnabled())
    } else if (key === 'End') {
      e.preventDefault()
      setActiveIndex(lastEnabled())
    } else if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault()
      activate(activeIndex)
    } else if (key === 'Escape') {
      e.preventDefault()
      closeMenu(true) // APG: Esc dismisses + returns focus to the trigger
    } else if (key === 'Tab') {
      closeMenu(false) // do not trap — let native Tab move focus
    } else if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const match = matchTypeahead(key)
      if (match >= 0) setActiveIndex(match)
    }
  }

  // ── open: seed a provisional position + active item (any source, incl. a controlled `open`) ───────────
  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null)
      setEntered(false)
      return
    }
    const t = triggerRef.current
    if (!t) return
    const rect = t.getBoundingClientRect()
    setPos(
      (prev) =>
        prev ?? {
          left: rect.left,
          top: placement.startsWith('top') ? rect.top : rect.bottom + 4, // refined once the panel measures
          minWidth: 0,
          maxWidth: window.innerWidth - rect.left - 8,
          maxHeight: window.innerHeight,
        },
    )
    setActiveIndex((idx) => (idx >= 0 ? idx : firstEnabled()))
  }, [isOpen, placement, firstEnabled])

  // ── refine after the panel mounts: flip, align (start/end), clamp; then reveal. useLayoutEffect runs BEFORE paint,
  //    so the provisional (start-aligned) frame is never painted — no flash, even under reduced-motion. ──
  useLayoutEffect(() => {
    if (!isOpen || entered) return
    const t = triggerRef.current
    const panel = panelRef.current
    if (!t || !panel) return
    const rect = t.getBoundingClientRect()
    const gap = 4
    const vh = window.innerHeight
    const vw = window.innerWidth
    const naturalH = panel.offsetHeight
    const panelW = panel.offsetWidth
    const wantTop = placement.startsWith('top')
    const spaceBelow = vh - rect.bottom - gap
    const spaceAbove = rect.top - gap
    let openUp = wantTop
    if (!wantTop && naturalH > spaceBelow && spaceAbove > spaceBelow) openUp = true
    if (wantTop && naturalH > spaceAbove && spaceBelow > spaceAbove) openUp = false
    const maxHeight = Math.min(openUp ? spaceAbove : spaceBelow, vh - 2 * gap)
    const height = Math.min(naturalH, maxHeight)
    const left0 = placement.endsWith('end') ? rect.right - panelW : rect.left
    const left = Math.min(Math.max(8, left0), Math.max(8, vw - panelW - 8))
    setResolvedSide(openUp ? 'top' : 'bottom')
    setPos({
      left,
      top: openUp ? rect.top - height - gap : rect.bottom + gap, // single positioning property (never top+bottom)
      minWidth: 0,
      maxWidth: vw - 8 - left,
      maxHeight,
    })
    setEntered(true) // flips `.is-open` → the injected enter transition
    // `pos` is a dep so this re-runs after the SEED commit sets the provisional pos (which mounts the panel — on the
    // first open commit `panelRef` is still null and this returns early). The `entered` guard makes the re-entry idempotent.
  }, [isOpen, entered, placement, pos])

  // ── roving DOM focus: the SINGLE focus authority — moves real focus to the active item ────────────────
  // `entered` is a dep so the FIRST focus lands after the panel actually mounts (on open, the seed commit renders no
  // panel yet — pos is null — so the item ref isn't set; entered flips true once mounted+measured → re-run → focus).
  useLayoutEffect(() => {
    if (!isOpen || !entered || activeIndex < 0) return
    itemEls.current[activeIndex]?.focus?.()
    itemEls.current[activeIndex]?.scrollIntoView?.({ block: 'nearest' }) // absent in jsdom → optional-call
  }, [isOpen, entered, activeIndex])

  // ── dismiss: outside pointerdown · capture-phase scroll (nested containers) · resize ──────────────────
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpenState(false)
    }
    const onScroll = () => setOpenState(false)
    const onResize = () => setOpenState(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, { capture: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [isOpen, setOpenState])

  // Compose the consumer's own ref (React 19 ref-as-prop) with the forwarded ref + our internal one.
  const setTriggerRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node
      assignRef(ref as Ref<HTMLElement> | undefined, node)
      assignRef(ownRef, node)
    },
    [ref, ownRef],
  )

  const wiredTrigger =
    triggerEl != null
      ? cloneElement(triggerEl, {
          ref: setTriggerRef,
          'aria-haspopup': 'menu',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? menuId : undefined,
          onClick: composeHandlers(triggerProps.onClick, toggle),
          onKeyDown: composeHandlers(triggerProps.onKeyDown, onTriggerKeyDown),
        })
      : trigger

  return (
    <>
      {wiredTrigger}

      {isOpen &&
        pos != null &&
        typeof document !== 'undefined' &&
        createPortal(
          // <Theme name="Menu"> re-establishes the sub-theme scope the portal detached from `body`.
          <Theme name="Menu">
            <MenuPanel
              ref={panelRef}
              className={entered ? 'vida-menu-panel is-open' : 'vida-menu-panel'}
              role="menu"
              id={menuId}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              data-side={resolvedSide}
              zIndex="$dropdown"
              onKeyDown={onMenuKeyDown}
              style={{
                left: pos.left,
                top: pos.top,
                minWidth: pos.minWidth,
                maxWidth: pos.maxWidth,
                maxHeight: pos.maxHeight,
                overflowY: 'auto',
                overflowX: 'hidden',
                // SINGLE transform-origin authority = inline, from the RESOLVED side; menu-styles.ts sets none.
                transformOrigin: resolvedSide === 'top' ? 'bottom' : 'top',
              }}
            >
              {items.length === 0 ? (
                <MenuItemRow role="menuitem" aria-disabled="true" tabIndex={-1} disabled>
                  <MenuItemLabel color="$colorTextMuted">No actions</MenuItemLabel>
                </MenuItemRow>
              ) : (
                items.map((it, i) => (
                  <MenuItemRow
                    key={it.id}
                    ref={(node) => {
                      itemEls.current[i] = node as HTMLElement | null // narrow the Tamagui ref to a DOM node
                    }}
                    role="menuitem"
                    id={itemId(i)}
                    tabIndex={i === activeIndex ? 0 : -1}
                    aria-disabled={it.disabled || undefined}
                    active={i === activeIndex}
                    disabled={it.disabled}
                    onPointerMove={() => !it.disabled && setActiveIndex(i)}
                    onClick={() => !it.disabled && activate(i)}
                  >
                    {it.leading != null && (
                      <View className="vida-menu-leading" pointerEvents="none">
                        {it.leading}
                      </View>
                    )}
                    <MenuItemLabel intent={it.intent ?? 'default'} numberOfLines={1}>
                      {it.label}
                    </MenuItemLabel>
                  </MenuItemRow>
                ))
              )}
            </MenuPanel>
          </Theme>,
          document.body,
        )}
    </>
  )
})
