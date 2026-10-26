import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, Card, Input, Switch } from '@vida/ui'
import { usePreferencesStore } from '../stores/preferences-store'
import { HIDEABLE_MODULES, MANAGEABLE_SURFACES, type HideableModule } from './settings-model'
import { OptionRow } from './option-row'
import { useSettings } from './settings-context'

// fe-settings S5 — the Modules pane (EC-4 module controls · EC-8 escape hatch · EC-12 inline rename). Per-module nav
// show/hide (Switch) + inline rename (pencil → Input + save/cancel), over the DOCK module list MINUS the always-reachable
// surfaces (settings-model HIDEABLE_MODULES enforces the escape hatch in-UI — the service doesn't guard it). Plus a
// "Surfaces" subsection toggling the discovered global surfaces (Feature Atlas · Sync log). State lives in the in-session
// preferences-store; persistence is the deferred seam (§A0: → module_visibility + dashboard_layout.moduleNames). DIRECT tokens.

function PencilIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z M13.5 6.5l3 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function ModuleRow({ module, last }: { module: HideableModule; last: boolean }) {
  const visible = usePreferencesStore((s) => s.moduleVisibility[module.key] ?? true)
  const setModuleVisible = usePreferencesStore((s) => s.setModuleVisible)
  const customName = usePreferencesStore((s) => s.moduleNames[module.key])
  const setModuleName = usePreferencesStore((s) => s.setModuleName)
  const displayName = customName ?? module.label

  const [editing, setEditing] = useState(false)
  const { readOnly } = useSettings()
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(displayName)
    setEditing(true)
  }
  const save = () => {
    const v = draft.trim()
    if (v.length > 0) setModuleName(module.key, v)
    setEditing(false)
  }
  const cancel = () => setEditing(false)

  return (
    <View
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      gap="$16"
      paddingVertical="$12"
      borderBottomWidth={last ? 0 : 1}
      borderBottomColor="$colorBorderDefault"
    >
      {editing ? (
        <View flexDirection="row" alignItems="center" gap="$8" flexShrink={1} flexGrow={1}>
          <Input
            value={draft}
            onChangeText={setDraft}
            aria-label={`Rename ${module.label}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              else if (e.key === 'Escape') cancel()
            }}
          />
          <Button size="sm" intent="ghost" aria-label={`Save name for ${module.label}`} leading={<CheckIcon />} onPress={save} />
          <Button size="sm" intent="ghost" aria-label={`Cancel renaming ${module.label}`} leading={<XIcon />} onPress={cancel} />
        </View>
      ) : (
        <Text flexShrink={1} fontFamily="$body" fontSize="$body" color="$colorTextPrimary">
          {displayName}
        </Text>
      )}
      <View flexDirection="row" alignItems="center" gap="$8" flexShrink={0}>
        {/* R3 (EC-7): read-only hides rename (an inline editor can't be "disabled" meaningfully) and disables the switch. */}
        {!editing && !readOnly && (
          <Button size="sm" intent="ghost" aria-label={`Rename ${module.label}`} leading={<PencilIcon />} onPress={startEdit} />
        )}
        <Switch
          disabled={readOnly}
          aria-label={`Show ${displayName} in the nav`}
          checked={visible}
          onCheckedChange={(v) => setModuleVisible(module.key, v)}
        />
      </View>
    </View>
  )
}

export function ModulesPane() {
  const { readOnly } = useSettings()
  const moduleVisibility = usePreferencesStore((s) => s.moduleVisibility)
  const setModuleVisible = usePreferencesStore((s) => s.setModuleVisible)

  return (
    <View gap="$16">
      <Card
        padding="spacious"
        header={
          <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
            Modules
          </Text>
        }
      >
        <View>
          {HIDEABLE_MODULES.map((m, i) => (
            <ModuleRow key={m.key} module={m} last={i === HIDEABLE_MODULES.length - 1} />
          ))}
        </View>
      </Card>

      <Card
        padding="spacious"
        header={
          <Text fontFamily="$display" fontSize="$subheading" fontWeight="600" color="$colorTextPrimary">
            Surfaces
          </Text>
        }
      >
        <View>
          {MANAGEABLE_SURFACES.map((s, i) => (
            <OptionRow
              key={s.key}
              label={s.label}
              description={s.description}
              last={i === MANAGEABLE_SURFACES.length - 1}
              control={
                <Switch
                  disabled={readOnly}
                  aria-label={s.label}
                  checked={moduleVisibility[s.key] ?? true}
                  onCheckedChange={(v) => setModuleVisible(s.key, v)}
                />
              }
            />
          ))}
        </View>
      </Card>
    </View>
  )
}
