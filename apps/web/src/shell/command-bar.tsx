// UI-4 · S3 (LIF-89) — the ⌘K command-bar overlay (the render host UX-2 designed against). COMPOSES UI-1 `Dialog`
// (modal envelope: self-portal, scrim, inert background, focus-into/return, Esc/backdrop) + UI-1 `Input` (the
// combobox field) — no new `@vida/ui` component, no `packages/ui` edit (BR-1). The command/result UI is hand-rolled
// inside the Dialog (the v6 export-dialog precedent — a specialized ARIA widget UI-1 doesn't ship).
//
// Interaction = the SELECT pattern, not a Tab-trap (S3-BR-b): one tab stop (the input, `role="combobox"`), the
// options are non-focusable `role="option"` divs, `↑/↓` move a VIRTUAL active option (`aria-activedescendant`),
// `Enter` executes it, `Esc` bubbles to the Dialog. Two modes are STORE-driven (S3-BR-c): empty query → the ranked
// command list; non-empty → the search outcome (`search-unavailable` in M1.0 — DB-8 seam).
import { useEffect, useId, useMemo, useState } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Dialog, Input } from '@vida/ui'
import { Search } from 'lucide-react'
import type { Command, CommandRunContext, SearchOutcome } from '../command-bar/types'
import { createCommandRegistry, navProvider, shellActionsProvider } from '../command-bar/registry'
import { notesCommandProvider } from '../app/notes/commands'
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

  // Build the registry + the visible command list ONCE (stable in M1.0: empty history, no flags on). Filter by
  // `visibleWhen` (S3-BR-g) — `gamification` fails closed (isFeatureEnabled → false), no default-open surface (BR-6).
  const commands = useMemo<Command[]>(() => {
    const registry = createCommandRegistry()
    registry.register(navProvider)
    registry.register(shellActionsProvider)
    registry.register(notesCommandProvider) // MOD-notes ②b — the "New note" action (M1.1 module contribution)
    return registry
      .collect([], Date.now())
      .filter((c) => c.visibleWhen == null || isFeatureEnabled(c.visibleWhen))
  }, [])

  const search = useCommandSearch(mode === 'search' ? query : '', stubSearchProvider)

  // The active option list. Command mode → the commands; search mode → the result options (EMPTY in M1.0 — the
  // grouped `results` UI is a DB-8 seam, FOLD-2). So M1.0 search mode always renders the status region, never a list.
  const options = mode === 'command' ? commands : []

  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    setActiveIndex(0) // reset when the mode or the active list changes (B2)
  }, [mode, options.length])

  const activeIndexClamped = options.length > 0 ? Math.min(activeIndex, options.length - 1) : -1
  const activeOption = activeIndexClamped >= 0 ? options[activeIndexClamped] : undefined
  const hasListbox = options.length > 0

  const listboxId = useId()

  function execute(command: Command | undefined) {
    if (command == null) return
    command.run(ctx) // run THEN close (S3-BR-e) — navigate must fire before the store resets query/mode
    close()
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (options.length === 0) return // no-op on an empty list; Esc still bubbles to the Dialog panel
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + options.length) % options.length)
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
          onKeyDown={onInputKeyDown}
        />

        {mode === 'command' ? (
          <View role="listbox" id={listboxId} aria-label="Commands">
            {options.map((command, i) => (
              <CommandOption
                key={command.id}
                id={optionDomId(command.id)}
                role="option"
                aria-selected={i === activeIndexClamped}
                active={i === activeIndexClamped || undefined}
                onPress={() => execute(command)}
                onHoverIn={() => setActiveIndex(i)}
              >
                <Text color="$colorTextPrimary" fontFamily="$body" fontSize="$small" numberOfLines={1}>
                  {command.label}
                </Text>
              </CommandOption>
            ))}
          </View>
        ) : (
          <SearchStatusRegion outcome={search} />
        )}
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
