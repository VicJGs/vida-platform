import { styled, Text, View } from '@tamagui/core'
import { EmptyState } from '@vida/ui'
import { SETTINGS_CATEGORIES, type SettingsCategoryId } from './settings-model'
import { groupResults, searchSettings } from './settings-search'

// fe-settings S4 — the search-results view (EC-6, the greybox `SearchMatches`/`SearchNoMatch`). Matches grouped by
// category with an uppercase category eyebrow + a count header; each result row navigates to its category (clearing the
// query). No match → a calm EmptyState in a role="status" region (NOT an error). DIRECT semantic tokens.

const categoryLabel = (id: SettingsCategoryId): string =>
  SETTINGS_CATEGORIES.find((c) => c.id === id)?.label ?? id

const ResultRow = styled(View, {
  name: 'SettingsResultRow',
  render: 'button',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: '$4',
  paddingVertical: '$12',
  paddingHorizontal: '$8',
  borderWidth: 0,
  borderRadius: '$sm',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  hoverStyle: { backgroundColor: '$colorSurfaceSecondary' },
})

export interface SettingsSearchResultsProps {
  query: string
  /** Navigate to a matched setting's category (and clear the query). */
  onNavigate: (category: SettingsCategoryId) => void
}

export function SettingsSearchResults({ query, onNavigate }: SettingsSearchResultsProps) {
  const matches = searchSettings(query)

  if (matches.length === 0) {
    return (
      <View role="status">
        <EmptyState title={`No setting matches “${query.trim()}”`}>
          <Text fontFamily="$body" fontSize="$body" color="$colorTextMuted">
            Try a different word — e.g. “theme”, “motion”, or “density”.
          </Text>
        </EmptyState>
      </View>
    )
  }

  const groups = groupResults(matches)
  const count = matches.length

  return (
    <View role="region" aria-label="Search results" gap="$16">
      <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
        {count} {count === 1 ? 'setting' : 'settings'}
      </Text>
      {groups.map((g) => (
        <View key={g.category} role="list" aria-label={categoryLabel(g.category)} gap="$4">
          <Text
            fontFamily="$body"
            fontSize="$caption"
            color="$colorTextMuted"
            textTransform="uppercase"
            letterSpacing={0.8}
          >
            {categoryLabel(g.category)}
          </Text>
          {g.entries.map((e) => (
            // role="listitem" on a wrapper so the button keeps its native button role (don't clobber it — critique NIT).
            <View key={e.id} role="listitem">
              <ResultRow onPress={() => onNavigate(e.category)}>
                <Text fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
                  {e.label}
                </Text>
                <Text fontFamily="$body" fontSize="$small" color="$colorTextMuted">
                  {e.description}
                </Text>
              </ResultRow>
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
