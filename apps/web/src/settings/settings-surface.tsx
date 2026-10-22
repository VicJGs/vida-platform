import { useState } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Input } from '@vida/ui'
import { AppearancePane } from './appearance-pane'
import { ModulesPane } from './modules-pane'
import { LocalePane } from './locale-pane'
import { NotificationsPane } from './notifications-pane'
import { DelegatedPane, DELEGATED_PANES } from './delegated-pane'
import { SettingsSearchResults } from './settings-search-results'
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './settings-model'
import { usePreferences } from '../preferences/use-preferences'

// fe-settings S3 — the Settings surface: a two-pane System archetype (EC-1) at /settings. Left category rail + right
// pane (search chrome on top + the active category's content). Composes shipped primitives; DIRECT semantic tokens.
// Responsive (EC-10): stacks to a single column below 768 (nav above the pane) via the $tablet media token. Reachability
// (EC-8): the shell + ⌘K already register a Settings entry (nav/module-map.ts:104); this is its route target.
// Honest states (EC-7): threads usePreferences().state — loading → skeleton; error → defaults read-only + calm flag;
// success → the panes. The read is LIVE (preferences-rescope R2: React Query over SQLite); R3 rebuilds these states.

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
  const { state } = usePreferences()
  const searching = query.trim() !== ''

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
        <Input
          placeholder="Search settings…"
          aria-label="Search settings"
          value={query}
          onChangeText={setQuery}
        />

        {state === 'error' ? (
          <View role="status" paddingVertical="$24">
            <Text fontFamily="$body" fontSize="$body" color="$colorTextMuted">
              Couldn’t load your saved settings — showing defaults, read-only. Your data is safe on this device.
            </Text>
          </View>
        ) : searching ? (
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
    </View>
  )
}

export default SettingsSurface
