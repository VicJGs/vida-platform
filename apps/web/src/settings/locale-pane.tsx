import { Text, View } from '@tamagui/core'
import { Card, Select } from '@vida/ui'
import { usePreferencesStore, type TimeFormat, type WeekStartsOn } from '../stores/preferences-store'
import { OptionRow } from './option-row'

// fe-settings S6 — the Locale pane (EC-4). Option-rows over the existing user_preferences locale fields
// (date_format · time_format · week_starts_on), dispatching to the in-session preferences-store; live DB persist is the
// deferred seam (§A0). Controls carry their own accessible name; DIRECT semantic tokens.

const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
] as const
const TIME_FORMAT_OPTIONS: ReadonlyArray<{ value: TimeFormat; label: string }> = [
  { value: '24h', label: '24-hour' },
  { value: '12h', label: '12-hour' },
]
// week_starts_on is 0|1 (numeric); Select carries string values, mapped at the boundary.
const WEEK_START_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
] as const
type WeekStartValue = (typeof WEEK_START_OPTIONS)[number]['value']
const toWeekValue = (d: WeekStartsOn): WeekStartValue => (d === 0 ? 'sunday' : 'monday')
const fromWeekValue = (v: WeekStartValue): WeekStartsOn => (v === 'sunday' ? 0 : 1)

export function LocalePane() {
  const dateFormat = usePreferencesStore((s) => s.dateFormat)
  const setDateFormat = usePreferencesStore((s) => s.setDateFormat)
  const timeFormat = usePreferencesStore((s) => s.timeFormat)
  const setTimeFormat = usePreferencesStore((s) => s.setTimeFormat)
  const weekStartsOn = usePreferencesStore((s) => s.weekStartsOn)
  const setWeekStartsOn = usePreferencesStore((s) => s.setWeekStartsOn)

  return (
    <Card
      padding="spacious"
      header={
        <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
          Locale
        </Text>
      }
    >
      <View>
        <OptionRow
          label="Date format"
          description="How dates are written across the app"
          control={
            <Select
              aria-label="Date format"
              value={dateFormat}
              options={DATE_FORMAT_OPTIONS}
              onValueChange={setDateFormat}
            />
          }
        />
        <OptionRow
          label="Time format"
          description="12-hour or 24-hour clock"
          control={
            <Select<TimeFormat>
              aria-label="Time format"
              value={timeFormat}
              options={TIME_FORMAT_OPTIONS}
              onValueChange={setTimeFormat}
            />
          }
        />
        <OptionRow
          label="Week starts on"
          description="The first day of the week in calendars"
          last
          control={
            <Select<WeekStartValue>
              aria-label="Week starts on"
              value={toWeekValue(weekStartsOn)}
              options={WEEK_START_OPTIONS}
              onValueChange={(v) => setWeekStartsOn(fromWeekValue(v))}
            />
          }
        />
      </View>
    </Card>
  )
}
