// UI-4 · S3 (LIF-89) — the ⌘K command-bar overlay (the render host UX-2 designed against). COMPOSES UI-1 `Dialog`
// (modal envelope: self-portal, scrim, inert background, focus-into/return, Esc/backdrop) + UI-1 `Input` (the
// combobox field) — no new `@vida/ui` component, no `packages/ui` edit (BR-1). The command/result UI is hand-rolled
// inside the Dialog (the v6 export-dialog precedent — a specialized ARIA widget UI-1 doesn't ship).
//
// Interaction = the SELECT pattern, not a Tab-trap (S3-BR-b): one tab stop (the input, `role="combobox"`), the
// options are non-focusable `role="option"` divs, `↑/↓` move a VIRTUAL active option (`aria-activedescendant`),
// `Enter` executes it, `Esc` bubbles to the Dialog. Two modes are STORE-driven (S3-BR-c): empty query → the ranked
// command list; non-empty → the search outcome (`search-unavailable` in M1.0 — DB-8 seam).
//
// preferences-rescope R5 (PLAN-R5 R5-BR-5…8): the list honors the user's module visibility + names (the shared
// `applyNavPrefs`, via `createNavProvider`) and is ranked by the persisted ⌘K history (pinned → frecency), both
// reactive. Running a command records it AFTER `run()` (best-effort, `preferences/command-history`). Alt+P (matched by
// `e.code` — mac Option+P types "π") pins the active option; the result is announced in an always-mounted polite
// region, and the hint under the input is the combobox's description. The active option is tracked by command ID, so a re-rank
// never moves the highlight to another command.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { styled, Text, View } from '@tamagui/core'
import { Dialog, Input } from '@vida/ui'
import { Pin, Search } from 'lucide-react'
import type { Command, CommandHistoryEntry, CommandRunContext, SearchOutcome } from '../command-bar/types'
import { createCommandRegistry, createNavProvider, shellActionsProvider } from '../command-bar/registry'
import { commandHistory } from '../preferences/command-history'
import { commandHistoryQuery } from '../preferences/preferences-queries'
import { usePreferences } from '../preferences/use-preferences'
import { SETTINGS_COPY } from '../settings/settings-copy'
import { detectPlatform } from '../lib/platform'
import { stubSearchProvider } from '../command-bar/search-provider'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { isFeatureEnabled } from './feature-flags'
import { useShellNavigate } from './nav-link'
import { useCommandKeybind } from './use-command-keybind'
import { useCommandSearch } from './use-command-search'
import { TOUCH_TARGET } from './breakpoints'

// A command row — a non-focusable `role="option"` div (no tabindex) so Dialog's `getFocusable` stays `[the input]`
// (B1). The active-option highlight is an `active`-state VARIANT (keyed to the virtual active index), NOT
// `:focus-visible` — the option is never DOM-focused (the Menu/Select lesson). ≥44×44, DS tokens only (S3-BR-j).
const CommandOption = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  gap: '$8',
  minHeight: TOUCH_TARGET.minSize,
  paddingHorizontal: '$12',
  borderRadius: '$md',
  cursor: 'pointer',
  variants: {
    active: { true: { backgroundColor: '$colorSurfaceSecondary' } },
  } as const,
})

/** Visually hidden but announced — the NG-5 recipe (`packages/ui/src/internal/calendar-shared.ts`, not exported). */
const SR_ONLY: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
}

/** Clear, then set after this gap, so two identical announcements in a row are both read. */
const ANNOUNCE_GAP_MS = 50

/** Plain Alt+P — by key POSITION (`code`): on mac Option+P yields `key === 'π'` (and differs again on ABNT2). */
function isPinKey(e: React.KeyboardEvent): boolean {
  return e.code === 'KeyP' && e.altKey && !e.ctrlKey && !e.metaKey
}

/** Stable, querySelector-safe DOM id for an option (FOLD-1): raw command ids hold `:`/`/` (`nav:/people`). */
function optionDomId(commandId: string): string {
  return `cmdbar-opt-${commandId.replace(/[^A-Za-z0-9_-]/g, '-')}`
}

/** Default copy for the states the stub can't message (unreachable in M1.0; DB-8 may yield empty/error). */
function statusMessage(outcome: SearchOutcome): string {
  if (outcome.message != null && outcome.message !== '') return outcome.message
  if (outcome.status === 'empty') return 'No results.'
  if (outcome.status === 'error') return 'Search failed.'
  return 'Search is unavailable.'
}

export function CommandBar() {
  const isOpen = useCommandBarUIStore((s) => s.isOpen)
  const query = useCommandBarUIStore((s) => s.query)
  const mode = useCommandBarUIStore((s) => s.mode)
  const close = useCommandBarUIStore((s) => s.close)
  const setQuery = useCommandBarUIStore((s) => s.setQuery)

  useCommandKeybind() // the global ⌘K listener (S3-BR-f)

  // The run-context is rebuilt per render (M3) — it must close over the LIVE navigate; execute reads it at call time.
  const navigate = useShellNavigate()
  const ctx: CommandRunContext = { navigate }

  // R5: the list follows the live module prefs + the persisted history (R5-BR-5). While history loads or after a
  // failed read it's unranked — usable, never an error (business-rules.md:34). `pendingPins` overlays pins in flight,
  // so the row moves at once and a second press toggles from the pending value, not the stale cache. Filter by
  // `visibleWhen` (S3-BR-g) — `gamification` fails closed (isFeatureEnabled → false), no default-open surface (BR-6).
  const { view } = usePreferences()
  const history = useQuery(commandHistoryQuery())
  const [pendingPins, setPendingPins] = useState<ReadonlyMap<string, boolean>>(() => new Map())
  const prefs = useMemo(
    () => ({ visibility: view.moduleVisibility, names: view.moduleNames }),
    [view.moduleVisibility, view.moduleNames],
  )
  const ranking = useMemo<CommandHistoryEntry[]>(() => {
    const rows = history.data ?? []
    if (pendingPins.size === 0) return rows
    const byKey = new Map(rows.map((r) => [r.command_key, r]))
    for (const [id, pinned] of pendingPins) {
      const row = byKey.get(id)
      byKey.set(
        id,
        row
          ? { ...row, is_pinned: pinned ? 1 : 0 }
          : { command_key: id, command_label: id, command_category: null, use_count: 0, last_used_at: null, is_pinned: pinned ? 1 : 0 },
      )
    }
    return [...byKey.values()]
  }, [history.data, pendingPins])
  const commands = useMemo<Command[]>(() => {
    const registry = createCommandRegistry()
    registry.register(createNavProvider(prefs))
    registry.register(shellActionsProvider)
    return registry
      .collect(ranking, Date.now())
      .filter((c) => c.visibleWhen == null || isFeatureEnabled(c.visibleWhen))
  }, [prefs, ranking])
  const isPinned = useCallback(
    (id: string) => ranking.some((r) => r.command_key === id && r.is_pinned === 1),
    [ranking],
  )

  // Drop a pending pin once ITS OWN latest write has resolved AND the refetched history agrees with it — not merely when
  // the history happens to agree (a pin→unpin pair would otherwise settle at once on the old value, and a third press
  // in the refetch window would read a stale pin).
  const pinWrites = useRef(new Map<string, { seq: number; done: boolean }>())
  useEffect(() => {
    if (pendingPins.size === 0 || history.data === undefined) return
    const settled = [...pendingPins].filter(
      ([id, pinned]) =>
        pinWrites.current.get(id)?.done === true &&
        history.data.some((r) => r.command_key === id && (r.is_pinned === 1) === pinned),
    )
    if (settled.length === 0) return
    setPendingPins((prev) => {
      const next = new Map(prev)
      for (const [id] of settled) next.delete(id)
      return next
    })
  }, [history.data, pendingPins])

  const search = useCommandSearch(mode === 'search' ? query : '', stubSearchProvider)

  // The active option list. Command mode → the commands; search mode → the result options (EMPTY in M1.0 — the
  // grouped `results` UI is a DB-8 seam, FOLD-2). So M1.0 search mode always renders the status region, never a list.
  const options = mode === 'command' ? commands : []

  // R5-BR-8: the active option is a command ID, so a re-rank (a pin, history arriving) keeps the same command active.
  // Reset on a mode change (B2) and on open — the bar stays mounted and `close()` leaves `mode` at 'command'.
  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    setActiveId(null)
  }, [mode, isOpen])

  const foundIndex = activeId == null ? -1 : options.findIndex((o) => o.id === activeId)
  const activeIndexClamped = options.length > 0 ? Math.max(0, foundIndex) : -1
  const activeOption = activeIndexClamped >= 0 ? options[activeIndexClamped] : undefined
  const hasListbox = options.length > 0

  const listboxId = useId()
  const hintId = useId()

  // The pin announcement (R5-BR-7): cleared on close; clear-then-set so a repeat is re-read.
  const [announcement, setAnnouncement] = useState('')
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const announce = useCallback((text: string) => {
    // A write that settles after the bar closed is not announced (R5-BR-7: the region is cleared on close).
    if (!useCommandBarUIStore.getState().isOpen) return
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setAnnouncement('')
    announceTimer.current = setTimeout(() => {
      if (useCommandBarUIStore.getState().isOpen) setAnnouncement(text)
    }, ANNOUNCE_GAP_MS)
  }, [])
  useEffect(() => {
    if (isOpen) return
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setAnnouncement('')
  }, [isOpen])
  useEffect(() => () => {
    if (announceTimer.current) clearTimeout(announceTimer.current)
  }, [])

  async function togglePin(command: Command) {
    const pinned = pendingPins.get(command.id) ?? isPinned(command.id)
    const next = !pinned
    const seq = (pinWrites.current.get(command.id)?.seq ?? 0) + 1
    pinWrites.current.set(command.id, { seq, done: false })
    setPendingPins((prev) => new Map(prev).set(command.id, next))
    const ok = await commandHistory.pin(command, next)
    const latest = pinWrites.current.get(command.id)?.seq === seq
    if (latest) pinWrites.current.set(command.id, { seq, done: true })
    if (!ok && latest) {
      setPendingPins((prev) => {
        const map = new Map(prev)
        map.delete(command.id)
        return map
      })
    } else if (latest) {
      setPendingPins((prev) => new Map(prev)) // re-run the settle check now that this write is done
    }
    announce(
      ok
        ? next
          ? SETTINGS_COPY.cmdPinned(command.label)
          : SETTINGS_COPY.cmdUnpinned(command.label)
        : next
          ? SETTINGS_COPY.cmdPinFailed(command.label)
          : SETTINGS_COPY.cmdUnpinFailed(command.label),
    )
  }

  function execute(command: Command | undefined) {
    if (command == null) return
    command.run(ctx) // run THEN close (S3-BR-e) — navigate must fire before the store resets query/mode
    close()
    commandHistory.record(command) // R5-BR-6 — best-effort, AFTER the command ran; never throws
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    // R5: Alt+P above the empty-list return, so no "π" ever lands in the field (any mode).
    if (isPinKey(e)) {
      e.preventDefault()
      if (activeOption) void togglePin(activeOption)
      return
    }
    if (options.length === 0) return // no-op on an empty list; Esc still bubbles to the Dialog panel
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveId(options[(activeIndexClamped + 1) % options.length]!.id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveId(options[(activeIndexClamped - 1 + options.length) % options.length]!.id)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      execute(activeOption)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) close()
      }}
      title="Command menu"
      size="lg"
    >
      <View gap="$12">
        <Input
          aria-label="Search and run commands"
          placeholder="Search or jump to…"
          leading={<Search size={18} aria-hidden="true" />}
          value={query}
          onChangeText={setQuery}
          role="combobox"
          aria-expanded={hasListbox}
          aria-controls={hasListbox ? listboxId : undefined}
          aria-activedescendant={activeOption != null ? optionDomId(activeOption.id) : undefined}
          aria-autocomplete="list"
          aria-describedby={hasListbox ? hintId : undefined}
          onKeyDown={onInputKeyDown}
        />

        {/* R5: the pin hint sits UNDER the input — the Dialog body scrolls, so a footer after ~22 rows is never seen. */}
        {mode === 'command' && hasListbox ? (
          <Text id={hintId} paddingHorizontal="$12" fontFamily="$body" fontSize="$caption" color="$colorTextMuted">
            {detectPlatform() === 'mac' ? SETTINGS_COPY.cmdHintMac : SETTINGS_COPY.cmdHintOther}
          </Text>
        ) : null}

        {mode === 'command' ? (
          <View role="listbox" id={listboxId} aria-label="Commands">
            {options.map((command, i) => {
              const pinned = isPinned(command.id)
              return (
                <CommandOption
                  key={command.id}
                  id={optionDomId(command.id)}
                  role="option"
                  aria-selected={i === activeIndexClamped}
                  aria-label={pinned ? command.label + SETTINGS_COPY.cmdPinnedSuffix : undefined}
                  active={i === activeIndexClamped || undefined}
                  onPress={() => execute(command)}
                  onHoverIn={() => setActiveId(command.id)}
                >
                  <Text flex={1} color="$colorTextPrimary" fontFamily="$body" fontSize="$small" numberOfLines={1}>
                    {command.label}
                  </Text>
                  {pinned ? (
                    <Text color="$colorTextMuted" aria-hidden>
                      <Pin size={16} aria-hidden="true" />
                    </Text>
                  ) : null}
                </CommandOption>
              )
            })}
          </View>
        ) : (
          <SearchStatusRegion outcome={search} />
        )}

        {/* R5-BR-7: always mounted while open, so the first pin is announced (a region inserted on demand isn't). */}
        <span role="status" aria-live="polite" data-cmdbar-announcer="" style={SR_ONLY}>
          {announcement}
        </span>
      </View>
    </Dialog>
  )
}

/**
 * The search-mode surface. `loading` → an `aria-busy` status; `results` → a DB-8 seam (unbuilt in M1.0 — the stub
 * never yields it, so this renders nothing); every other status (`search-unavailable`/`empty`/`error`, and defensively
 * `idle`) → ONE loud `role="status"` message (S3-BR-d, FOLD-2). Never a silent blank list (BR-4).
 */
function SearchStatusRegion({ outcome }: { outcome: SearchOutcome }) {
  if (outcome.status === 'loading') {
    return (
      <View role="status" aria-busy="true" paddingHorizontal="$12" paddingVertical="$8">
        <Text color="$colorTextMuted" fontFamily="$body" fontSize="$small">
          Searching…
        </Text>
      </View>
    )
  }
  if (outcome.status === 'results') {
    // DB-8 seam — the grouped, keyboard-navigable results listbox lands with FTS5 (M1.4). Nothing to render in M1.0.
    return null
  }
  return (
    <View role="status" paddingHorizontal="$12" paddingVertical="$8">
      <Text color="$colorTextPrimary" fontFamily="$body" fontSize="$small">
        {statusMessage(outcome)}
      </Text>
    </View>
  )
}
