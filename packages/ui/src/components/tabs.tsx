import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { styled, Text, View } from '@tamagui/core'
import { ensureTabsStyles } from '../internal/tabs-styles'

// UI-1 · Tabs (primitive 6/10, molecular) — implements ds-5-primitive-contracts/tabs.md against Tamagui v2.
// Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u6-tabs.md.
// - name:'Tabs' scopes the light_/dark_Tabs sub-theme ($text/$colorTextPrimary/$colorBrandPrimary/$border) over the whole subtree.
// - The tab strip is generated from `items`; the panels are supplied as <Tabs.Panel value> children (the ARIA
//   contract forces a Tabs-owned role="tabpanel" wrapper — DEF-U6-a). Only the active panel is mounted (D5).
// - WAI-ARIA APG tablist: roving tabindex, AUTOMATIC activation (arrow moves selection + panel; Tab → into panel),
//   arrows WRAP + skip disabled, Home/End clamp to first/last enabled.
// - Indicator is the B12 showcase: transform-only slide (animated), width/height resize is an INSTANT inline swap.
//   Motion via injected CSS reading motion.ts (select/card precedent); reduced-motion via @media.

type TabsSize = 'sm' | 'md' | 'lg'
type Orientation = 'horizontal' | 'vertical'

export interface TabsProps {
  /** Controlled active tab value. */
  value?: string
  /** Uncontrolled initial value (clamped to an enabled tab; else the first enabled — D8). */
  defaultValue?: string
  /** Fires on change, in both controlled + uncontrolled modes. */
  onValueChange?: (v: string) => void
  /** The tabs. `label` is any node; a `disabled` tab is muted + skipped in arrow nav. */
  items: ReadonlyArray<{ value: string; label: ReactNode; disabled?: boolean }>
  /** Axis. Default 'horizontal' (←/→); 'vertical' uses ↑/↓. */
  orientation?: Orientation
  /** Control size. Default 'md'. */
  size?: TabsSize
  /** The panels — one <Tabs.Panel value> per tab. */
  children: ReactNode
}

/** A panel. `value` must match an `items[].value`. Extra props (e.g. `aria-busy` for the loading state, DEF-U6-c)
 *  pass through to the Tabs-owned role="tabpanel" wrapper. */
export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string
}

/** Marker component. Tabs intercepts `<Tabs.Panel>` and renders its children into a role="tabpanel" wrapper, so the
 *  marker never self-renders (returns null) — this is why panel content mounts only when active. */
export function TabsPanel(_props: TabsPanelProps): null {
  return null
}
TabsPanel.displayName = 'Tabs.Panel'

// ── styled hosts (all name:'Tabs' → the sub-theme scope) ──────────────────────────────────────────────
const TabsRoot = styled(View, { name: 'Tabs' })

const TabList = styled(View, {
  name: 'Tabs',
  position: 'relative', // the indicator is absolutely positioned against this (offsetLeft/Top measured relative to it)
  variants: {
    orientation: {
      // horizontal: the STRIP scrolls when the tabs can't fit (a scrollable tab bar) — the tabs keep their size
      // (Tab flexShrink:0) and the list scrolls, instead of overflowing the viewport. overflow:auto only engages
      // when needed, so 2-tab consumers never see a scrollbar. The panel is a sibling (unaffected). maxWidth:100%
      // bounds the list to its container so the scroll is contained, not a document overflow.
      horizontal: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '$colorBorderDefault', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden' },
      vertical: { flexDirection: 'column', borderLeftWidth: 1, borderColor: '$colorBorderDefault' },
    },
  } as const,
  defaultVariants: { orientation: 'horizontal' },
})

// A tab — a real <button role="tab">. NOTE: the visual "disabled" is the `muted` variant, NOT a native `disabled`
// attribute (a disabled tab stays in the a11y tree + announced via aria-disabled; contract "muted … skipped").
const Tab = styled(View, {
  name: 'Tabs',
  render: 'button',
  position: 'relative',
  backgroundColor: 'transparent',
  borderWidth: 0,
  cursor: 'pointer',
  userSelect: 'none',
  flexShrink: 0, // keep each tab its natural size so the STRIP scrolls (TabList overflowX) rather than squishing
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: -2 },
  variants: {
    size: {
      sm: { paddingVertical: '$8', paddingHorizontal: '$12' },
      md: { paddingVertical: '$12', paddingHorizontal: '$16' },
      lg: { paddingVertical: '$16', paddingHorizontal: '$20' },
    },
    muted: { true: { opacity: 0.5, cursor: 'not-allowed' } },
  } as const,
  defaultVariants: { size: 'md' },
})

const TabText = styled(Text, {
  name: 'Tabs',
  fontFamily: '$body',
  fontWeight: '600',
  userSelect: 'none',
  variants: {
    selected: {
      true: { color: '$colorTextPrimary' },
      false: { color: '$colorTextMuted' }, // hover strengthen → injected CSS (.vida-tabs-label), B12 instant swap
    },
    size: {
      sm: { fontSize: '$caption' },
      md: { fontSize: '$small' },
      lg: { fontSize: '$body' },
    },
  } as const,
  defaultVariants: { selected: false, size: 'md' },
})

// The selection indicator — an absolute bar; position/size set via inline style (transform animates, width/height
// resize instantly — §12 D3). backgroundColor = $colorBrandPrimary.
const Indicator = styled(View, {
  name: 'Tabs',
  position: 'absolute',
  backgroundColor: '$colorBrandPrimary',
  pointerEvents: 'none',
})

const TabPanelFrame = styled(View, {
  name: 'Tabs',
  paddingTop: '$12',
  focusVisibleStyle: { outlineColor: '$colorFocusRing', outlineWidth: 2, outlineStyle: 'solid', outlineOffset: 2 },
})

const TabsInner = forwardRef<ComponentRef<typeof TabsRoot>, TabsProps>(function Tabs(
  { value, defaultValue, onValueChange, items, orientation = 'horizontal', size = 'md', children, ...rest },
  ref,
) {
  ensureTabsStyles()

  const uid = useId()
  const tabId = (i: number) => `${uid}-tab-${i}`
  const panelId = (v: string) => `${uid}-panel-${v}`

  // ── controlled / uncontrolled (Select precedent) + enabled-clamped seed (D1/D8) ─────────────────────
  const isControlled = value !== undefined
  const enabledValues = items.filter((it) => !it.disabled).map((it) => it.value)
  const seed =
    defaultValue !== undefined && enabledValues.includes(defaultValue) ? defaultValue : enabledValues[0]
  const [innerValue, setInnerValue] = useState<string | undefined>(seed)
  const current = isControlled ? value : innerValue

  let activeIndex = items.findIndex((it) => it.value === current)
  if (activeIndex < 0) activeIndex = items.findIndex((it) => !it.disabled) // fall back to first enabled

  // ── panels: collect <Tabs.Panel> children robustly (fragments/null/false dropped; type-guarded — M4) ─
  const panels = Children.toArray(children).filter(
    (c): c is ReactElement<TabsPanelProps> => isValidElement(c) && c.type === TabsPanel,
  )
  const activePanel = panels.find((p) => p.props.value === current)

  if (process.env.NODE_ENV !== 'production') {
    const itemValues = new Set(items.map((it) => it.value))
    const panelValues = new Set(panels.map((p) => p.props.value))
    for (const p of panels)
      if (!itemValues.has(p.props.value))
        // eslint-disable-next-line no-console
        console.warn(`[vida/ui] Tabs: <Tabs.Panel value="${p.props.value}"> matches no items[].value (orphan panel).`)
    for (const it of items)
      if (!panelValues.has(it.value))
        // eslint-disable-next-line no-console
        console.warn(`[vida/ui] Tabs: item "${it.value}" has no matching <Tabs.Panel> (a tab controlling nothing).`)
    const sel = value ?? defaultValue
    if (sel !== undefined && !itemValues.has(sel))
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] Tabs: value/defaultValue "${sel}" matches no items[].value (unreachable selection).`)
    if (sel !== undefined && items.find((it) => it.value === sel)?.disabled === true)
      // eslint-disable-next-line no-console
      console.warn(`[vida/ui] Tabs: value/defaultValue "${sel}" names a disabled tab (selection contradicts disabled).`)
  }

  // ── indicator measurement (offset* relative to the position:relative tablist) ────────────────────────
  const listRef = useRef<HTMLElement | null>(null)
  const setListRef = useCallback((node: unknown) => {
    listRef.current = (node as HTMLElement | null) ?? null
  }, [])
  const tabEls = useRef<(HTMLElement | null)[]>([])
  const setTabRef = (i: number) => (node: unknown) => {
    tabEls.current[i] = (node as HTMLElement | null) ?? null
  }
  const [ind, setInd] = useState<{ start: number; size: number } | null>(null)
  const [ready, setReady] = useState(false)

  const measure = useCallback(() => {
    const el = tabEls.current[activeIndex]
    if (!el) return
    setInd(
      orientation === 'horizontal'
        ? { start: el.offsetLeft, size: el.offsetWidth }
        : { start: el.offsetTop, size: el.offsetHeight },
    )
  }, [activeIndex, orientation])

  // Re-measure on every geometry change: current/orientation/items/SIZE (M3) all change tab boxes.
  useLayoutEffect(() => {
    measure()
  }, [measure, current, orientation, size, items])

  // Enable the transform transition only AFTER the first placement is painted → no slide-from-0 on mount (D3 `ready`).
  useEffect(() => {
    setReady(true)
  }, [])

  // Re-measure on container/label reflow + web-font swap (M3) — both jsdom-guarded (absent there → skipped).
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    if (listRef.current) ro.observe(listRef.current)
    return () => ro.disconnect()
  }, [measure])
  useEffect(() => {
    const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts
    fonts?.ready?.then(() => measure())
  }, [measure])

  // ── state + nav (automatic activation, D4; wrap + skip-disabled, D7) ─────────────────────────────────
  const select = useCallback(
    (v: string) => {
      if (!isControlled) setInnerValue(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange],
  )
  const activate = useCallback(
    (i: number) => {
      const it = items[i]
      if (!it || it.disabled === true) return
      tabEls.current[i]?.focus()
      select(it.value)
    },
    [items, select],
  )

  const enabledIdx = items.map((it, i) => (it.disabled === true ? -1 : i)).filter((i) => i >= 0)
  const stepIdx = (from: number, dir: 1 | -1) => {
    if (enabledIdx.length === 0) return from
    const pos = enabledIdx.indexOf(from)
    const at = pos < 0 ? (dir === 1 ? -1 : 0) : pos
    const next = (at + dir + enabledIdx.length) % enabledIdx.length // WRAP (tablist convention)
    return enabledIdx[next] ?? from
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const [prevKey, nextKey] = orientation === 'horizontal' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
    if (e.key === nextKey) {
      e.preventDefault()
      activate(stepIdx(activeIndex, 1))
    } else if (e.key === prevKey) {
      e.preventDefault()
      activate(stepIdx(activeIndex, -1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      if (enabledIdx[0] !== undefined) activate(enabledIdx[0])
    } else if (e.key === 'End') {
      e.preventDefault()
      const last = enabledIdx[enabledIdx.length - 1]
      if (last !== undefined) activate(last)
    }
  }

  const indicatorStyle: React.CSSProperties = ind
    ? orientation === 'horizontal'
      ? { transform: `translateX(${ind.start}px)`, width: ind.size, height: 2, bottom: 0, left: 0 }
      : { transform: `translateY(${ind.start}px)`, height: ind.size, width: 2, left: 0, top: 0 }
    : { opacity: 0 }

  // aria-controls / aria-labelledby only bind to the ACTIVE tab's panel (the only one mounted) so every referenced
  // id exists (axe-clean). Inactive tabs control no rendered panel (Radix default).
  const panelRest = activePanel
    ? (({ value: _v, children: _c, ...r }: TabsPanelProps) => r)(activePanel.props)
    : undefined

  return (
    <TabsRoot ref={ref} {...rest}>
      <TabList
        ref={setListRef}
        role="tablist"
        aria-orientation={orientation}
        orientation={orientation}
        onKeyDown={onKeyDown}
      >
        {items.map((it, i) => {
          const selected = it.value === current
          return (
            <Tab
              key={it.value}
              ref={setTabRef(i)}
              type="button"
              role="tab"
              id={tabId(i)}
              className="vida-tabs-tab"
              aria-selected={selected}
              aria-controls={selected ? panelId(it.value) : undefined}
              aria-disabled={it.disabled === true ? true : undefined}
              tabIndex={i === activeIndex ? 0 : -1}
              muted={it.disabled === true}
              size={size}
              onClick={() => activate(i)}
            >
              <TabText className="vida-tabs-label" selected={selected} size={size} numberOfLines={1}>
                {it.label}
              </TabText>
            </Tab>
          )
        })}
        <Indicator className="vida-tabs-indicator" aria-hidden data-ready={ready ? 'true' : 'false'} style={indicatorStyle} />
      </TabList>

      {activePanel && (
        <TabPanelFrame
          key={activePanel.props.value}
          className="vida-tabs-panel"
          role="tabpanel"
          id={panelId(activePanel.props.value)}
          aria-labelledby={tabId(activeIndex)}
          tabIndex={0}
          {...panelRest}
        >
          {activePanel.props.children}
        </TabPanelFrame>
      )}
    </TabsRoot>
  )
})

type TabsComponent = typeof TabsInner & { Panel: typeof TabsPanel }
export const Tabs = Object.assign(TabsInner, { Panel: TabsPanel }) as TabsComponent
