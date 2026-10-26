import { useEffect, useMemo, useRef, useState } from 'react'
import { styled, Text, View, type TamaguiElement } from '@tamagui/core'
import { Button, Input, SyncStatus } from '@vida/ui'
import { AppearancePane } from './appearance-pane'
import { ModulesPane } from './modules-pane'
import { LocalePane } from './locale-pane'
import { NotificationsPane } from './notifications-pane'
import { DelegatedPane, DELEGATED_PANES } from './delegated-pane'
import { SettingsSearchResults } from './settings-search-results'
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './settings-model'
import { usePreferences, useUpdatePreferences } from '../preferences/use-preferences'
import { SettingsContext } from './settings-context'
import { SettingsSkeleton } from './settings-skeleton'
import { SETTINGS_COPY } from './settings-copy'

// fe-settings S3 — the Settings surface: a two-pane System archetype (EC-1) at /settings. Left category rail + right
// pane (search chrome on top + the active category's content). Composes shipped primitives; DIRECT semantic tokens.
// Responsive (EC-10): stacks to a single column below 768 (nav above the pane) via the $tablet media token. Reachability
// (EC-8): the shell + ⌘K already register a Settings entry (nav/module-map.ts:104); this is its route target.
// Honest states (EC-7, preferences-rescope R3 / D1): on usePreferences().state — loading → the §3.1 skeleton; error →
// every pane READ-ONLY (SettingsContext) over the view + a calm line whose copy matches what's shown (defaults on a
// first-read error, the last loaded values on a later one); success → editable. Saves (C5 UI): the surface owns the ONE
// `useUpdatePreferences`, shared via SettingsContext, so one `SyncStatus` ("Saved on this device", the P4 copy-honesty
// primitive — no "Saving…" state) reflects every pane. A failed save is reverted + reported by the WRITER (one toast per
// failed batch), so the status just clears — the failure is announced once, never twice.
// Recovery (PLAN-R3 rev 2.2, state-conventions §3): the error state carries a Retry — the ONE live control while the
// panes are read-only — that re-reads only the errored key(s). Nothing re-reads on mount (`retryOnMount: false`). A Retry
// on a first-read error unmounts the button (the pane becomes the skeleton), so focus is placed, never dropped: skeleton →
// pane on success / Retry on a repeat error. A Retry ENDS when its re-reads settle, so a later unrelated refetch (e.g. the
// writer's invalidate) never moves focus. Each failed Retry re-keys the status line, so a repeat failure is re-announced.

const RailItem = styled(View, {
  name: 'SettingsRailItem',
  render: 'button',
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: '$8',
  paddingHorizontal: '$12',
  // reset the native <button> UA border (render:'button'); the active state adds only a LEFT accent tick.
  borderWidth: 0,
  borderStyle: 'solid',
  borderLeftWidth: 3,
  borderLeftColor: 'transparent',
  borderRadius: '$sm',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
  variants: {
    active: {
      // accent left-tick + secondary-surface fill (the list-view tick + the greybox rail). DIRECT tokens.
      true: { borderLeftColor: '$colorBrandPrimary', backgroundColor: '$colorSurfaceSecondary' },
    },
  } as const,
})

// All six categories are built (S3 Appearance · S5 Modules · S6 Locale/Notifications + delegated Data/Account).
function renderPane(active: SettingsCategoryId) {
  switch (active) {
    case 'appearance':
      return <AppearancePane />
    case 'modules':
      return <ModulesPane />
    case 'locale':
      return <LocalePane />
    case 'notifications':
      return <NotificationsPane />
    case 'data':
      return <DelegatedPane {...DELEGATED_PANES.data} />
    case 'account':
      return <DelegatedPane {...DELEGATED_PANES.account} />
  }
}

export function SettingsSurface() {
  const [active, setActive] = useState<SettingsCategoryId>('appearance')
  const [query, setQuery] = useState('')
  const { state, hasData, retry } = usePreferences()
  const save = useUpdatePreferences()
  const searching = query.trim() !== ''
  const readOnly = state === 'error'
  const context = useMemo(() => ({ readOnly, update: save.update }), [readOnly, save.update])

  // The last "saved" holds while a later save is in flight (no "Saving…" state, P4); a failure clears it.
  const shownSaved = useRef(false)
  if (save.saveState === 'saved') shownSaved.current = true
  else if (save.saveState === 'error') shownSaved.current = false
  const showSaved = shownSaved.current

  const retryRef = useRef<TamaguiElement>(null)
  const skeletonRef = useRef<TamaguiElement>(null)
  const paneRef = useRef<TamaguiElement>(null)
  const retryPressed = useRef(false)
  const [failedRetries, setFailedRetries] = useState(0)
  const onRetry = () => {
    retryPressed.current = true
    void retry().then((ok) => {
      if (ok) return // the `state` → success transition places focus (below) and ends the Retry
      retryPressed.current = false // a later error that fails again never changes `state` — end the Retry here
      setFailedRetries((n) => n + 1)
    })
  }
  const focus = (el: TamaguiElement | null) => (el as HTMLElement | null)?.focus()
  // Two focus triggers, only while a Retry is in flight: `state` transitions place loading → skeleton and success → pane;
  // a FAILED settle (which may never change `state` — a later error keeps `error`) focuses Retry via `failedRetries`.
  useEffect(() => {
    if (!retryPressed.current) return
    if (state === 'loading') focus(skeletonRef.current)
    else if (state === 'success') {
      retryPressed.current = false
      focus(paneRef.current)
    }
  }, [state])
  useEffect(() => {
    if (failedRetries > 0) focus(retryRef.current) // after the re-render: the button is mounted again
  }, [failedRetries])
  const activeLabel = SETTINGS_CATEGORIES.find((c) => c.id === active)?.label ?? 'Settings'

  return (
    <View
      role="region"
      aria-label="Settings"
      padding="$24"
      gap="$24"
      flexDirection="column"
      $tablet={{ flexDirection: 'row' }}
    >
      {/* Left rail — stacks above the pane below 768 (EC-10). */}
      <View
        role="navigation"
        aria-label="Settings categories"
        gap="$4"
        width="100%"
        $tablet={{ width: 220, flexShrink: 0 }}
      >
        <Text fontFamily="$display" fontSize="$heading" fontWeight="700" color="$colorTextPrimary" marginBottom="$8">
          Settings
        </Text>
        {SETTINGS_CATEGORIES.map((c) => (
          <RailItem
            key={c.id}
            active={c.id === active}
            aria-current={c.id === active ? 'page' : undefined}
            onPress={() => setActive(c.id)}
          >
            <Text
              fontFamily="$body"
              fontSize="$body"
              fontWeight={c.id === active ? '600' : '400'}
              color="$colorTextPrimary"
            >
              {c.label}
            </Text>
          </RailItem>
        ))}
      </View>

      {/* Right pane — search chrome (filtering = S4) + the active category content. */}
      <View flexGrow={1} flexShrink={1} gap="$16" minWidth={0}>
        {/* EC-6 — the search box filters the one index; a non-empty query replaces the pane with grouped results. */}
        <Input placeholder="Search settings…" aria-label="Search settings" value={query} onChangeText={setQuery} />

        {/* SyncStatus carries its own role="status" + aria-live — no wrapper live region (it would announce twice). */}
        {showSaved && !readOnly && (
          <View alignSelf="flex-start">
            <SyncStatus state="saved" />
          </View>
        )}

        {readOnly && (
          <View gap="$12" alignItems="flex-start">
            {/* polite, muted error text — the ratified rule (decisions.md:162); the write toast is the assertive one. */}
            <View role="status" key={failedRetries}>
              <Text fontFamily="$body" fontSize="$body" color="$colorTextMuted">
                {hasData ? SETTINGS_COPY.readErrorKept : SETTINGS_COPY.readErrorDefaults}
              </Text>
            </View>
            {/* state-conventions §3 retry affordance; lg = 48px (≥44, design.md:218 · decisions.md:138). */}
            <Button ref={retryRef} intent="secondary" size="lg" onPress={onRetry}>
              {SETTINGS_COPY.retry}
            </Button>
          </View>
        )}

        {state === 'loading' ? (
          <SettingsSkeleton ref={skeletonRef} />
        ) : (
          <SettingsContext.Provider value={context}>
            {/* tabIndex=-1: the focus target after a successful Retry (top of the content, state-conventions §3). */}
            <View ref={paneRef} tabIndex={-1} role="group" aria-label={activeLabel}>
              {searching ? (
                <SettingsSearchResults
                  query={query}
                  onNavigate={(category) => {
                    setActive(category)
                    setQuery('')
                  }}
                />
              ) : (
                renderPane(active)
              )}
            </View>
          </SettingsContext.Provider>
        )}
      </View>
    </View>
  )
}

export default SettingsSurface
