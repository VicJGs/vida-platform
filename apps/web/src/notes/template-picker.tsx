// ============================================================================
// TemplatePicker — the templates picker/save UI (fe-notes #27, S8; NOT-51 / EC-13). Split
// (the PickerView/AttachmentsView precedent): TemplatePickerView is pure presentational
// (state-as-prop); TemplatePicker is the hook shell. Lists saved templates (each with an
// Apply affordance) + a "Save current as template" action.
//
// Apply (instantiate-fork) + Save (captureFromSpace) are UNBUILT @vida/core service seams
// (F-S8-1) → the affordances call injected deferred fns (stubbed in M1). Mounted via a
// `?templates` DEV gate (the S4 `?picker` precedent) — a visible production button whose
// pure action no-ops would be a DEAD affordance, so it stays gated until the seam lands (D-S8-4).
// ============================================================================
import type { KeyboardEvent, ReactNode } from 'react'
import { Text, View } from '@tamagui/core'
import { FilePlus, LayoutTemplate, type LucideIcon } from 'lucide-react'
import { Icon, Row } from './note-chrome'
import { useTemplates, type TemplateItem, type TemplatesState } from './use-templates'

/** Local muted line (the attachments-list idiom; not shared via note-chrome — per-file house idiom). */
function Muted({ children, role, busy }: { children: ReactNode; role?: 'status'; busy?: boolean }) {
  return (
    <Text role={role} aria-busy={busy ? true : undefined} fontSize="$small" color="$colorTextMuted">
      {children}
    </Text>
  )
}

/** A labeled pressable (role=button) with keyboard activation + focus ring (the AddButton/PressIcon idiom). */
function ActionButton({ icon, label, onPress }: { icon?: LucideIcon; label: string; onPress: () => void }) {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPress()
    }
  }
  return (
    <View
      role="button"
      aria-label={label}
      tabIndex={0}
      onPress={onPress}
      onKeyDown={onKeyDown}
      cursor="pointer"
      alignSelf="flex-start"
      paddingVertical="$4"
      paddingHorizontal="$8"
      borderRadius="$sm"
      hoverStyle={{ backgroundColor: '$colorSurfaceSecondary' }}
      focusStyle={{ outlineColor: '$colorFocusRing', outlineStyle: 'solid', outlineWidth: 2 }}
    >
      <Row>
        {icon != null && <Icon icon={icon} />}
        <Text fontSize="$small" color="$colorTextPrimary">
          {label}
        </Text>
      </Row>
    </View>
  )
}

function SaveCurrentButton({ onSaveCurrent }: { onSaveCurrent: () => void }) {
  return <ActionButton icon={FilePlus} label="Save current as template" onPress={onSaveCurrent} />
}

/** Pure presentational — all 4 states as props (no hook, no env). */
export function TemplatePickerView({
  templates,
  state,
  onApply,
  onSaveCurrent,
}: {
  templates: readonly TemplateItem[]
  state: TemplatesState
  onApply: (id: string) => void
  onSaveCurrent: () => void
}) {
  const body = (() => {
    if (state === 'loading') return <Muted busy>Loading…</Muted>
    if (state === 'error') return <Muted role="status">Couldn’t load templates.</Muted>
    if (state === 'empty')
      return (
        <View gap="$8">
          <Muted>No templates yet.</Muted>
          <SaveCurrentButton onSaveCurrent={onSaveCurrent} />
        </View>
      )
    return (
      <View gap="$8">
        <View role="list" gap="$4">
          {templates.map((t) => (
            <Row key={t.id} role="listitem">
              <Icon icon={LayoutTemplate} />
              <Text flex={1} fontSize="$body" color="$colorTextPrimary">
                {t.name}
              </Text>
              <ActionButton label={`Apply ${t.name}`} onPress={() => onApply(t.id)} />
            </Row>
          ))}
        </View>
        <SaveCurrentButton onSaveCurrent={onSaveCurrent} />
      </View>
    )
  })()

  return (
    <View
      role="group"
      aria-label="Templates"
      gap="$8"
      padding="$8"
      backgroundColor="$colorSurfacePrimary"
      borderColor="$colorBorderDefault"
      borderWidth={1}
      borderRadius="$md"
      maxWidth={320}
    >
      {body}
    </View>
  )
}

/** The hook-wired shell: reads the data seam, delegates to the pure view. */
export function TemplatePicker({ pageId }: { pageId: string }) {
  const { templates, state, apply, saveCurrent } = useTemplates(pageId)
  return <TemplatePickerView templates={templates} state={state} onApply={apply} onSaveCurrent={saveCurrent} />
}
