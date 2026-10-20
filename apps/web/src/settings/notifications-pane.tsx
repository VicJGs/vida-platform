import { Text, View } from '@tamagui/core'
import { Card, Switch } from '@vida/ui'
import { usePreferencesStore } from '../stores/preferences-store'
import { OptionRow } from './option-row'

// fe-settings S6 — the Notifications pane (EC-4). Channel toggles + quiet hours over the existing user_preferences
// notification fields, dispatching to the in-session preferences-store; live DB persist is the deferred seam (§A0).
// M1 scope: the channel on/off + quiet-hours toggle. Quiet-hours start/end time inputs are a follow-up (NF — the
// delivery-engine routing is M2); a single toggle row is honest for M1. Switches carry their own accessible name.

export function NotificationsPane() {
  const notifInApp = usePreferencesStore((s) => s.notifInApp)
  const setNotifInApp = usePreferencesStore((s) => s.setNotifInApp)
  const notifPush = usePreferencesStore((s) => s.notifPush)
  const setNotifPush = usePreferencesStore((s) => s.setNotifPush)
  const notifEmail = usePreferencesStore((s) => s.notifEmail)
  const setNotifEmail = usePreferencesStore((s) => s.setNotifEmail)
  const quietHours = usePreferencesStore((s) => s.quietHours)
  const setQuietHours = usePreferencesStore((s) => s.setQuietHours)

  return (
    <Card
      padding="spacious"
      header={
        <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
          Notifications
        </Text>
      }
    >
      <View>
        <OptionRow
          label="In-app"
          description="Show notifications inside Vida"
          control={<Switch aria-label="In-app notifications" checked={notifInApp} onCheckedChange={setNotifInApp} />}
        />
        <OptionRow
          label="Push"
          description="Send notifications to this device"
          control={<Switch aria-label="Push notifications" checked={notifPush} onCheckedChange={setNotifPush} />}
        />
        <OptionRow
          label="Email"
          description="Send notifications by email"
          control={<Switch aria-label="Email notifications" checked={notifEmail} onCheckedChange={setNotifEmail} />}
        />
        <OptionRow
          label="Quiet hours"
          description="Pause notifications overnight"
          last
          control={<Switch aria-label="Quiet hours" checked={quietHours} onCheckedChange={setQuietHours} />}
        />
      </View>
    </Card>
  )
}
