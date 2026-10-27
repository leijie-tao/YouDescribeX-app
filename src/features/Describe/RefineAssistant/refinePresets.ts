// xiao1009 The preset buttons the panel renders. Only id, label and the UI-facing text live here: the
// full instruction text stays on the backend (api/src/prompts/refinePresets.ts), so wording can be
// changed without releasing the frontend.
//
// The ids and the labels below are copied from that file and must match it exactly. The backend
// answers 400 with the list of valid ids if they ever drift apart.
//
// Leijie `description` is the preview shown on hover and keyboard focus, and read by screen readers
// through aria-describedby (option A in refinead-button-pipeline.md section 2). When a prompt changes
// on the backend, check that its description here still says what the button does.
import { RefinePresetId } from '@/shared/types/refine'

export type RefinePresetGroup = 'edit' | 'style'

// Leijie Buttons that are shown but not wired to the backend yet. Their ids are deliberately not in
// RefinePresetId, so the type system stops them from ever being sent as a presetId.
export type PlannedPresetId = 'fix-timing'

export interface RefinePresetButton {
  id: RefinePresetId | PlannedPresetId
  label: string
  description: string
  group: RefinePresetGroup
  comingSoon?: boolean
}

// xiao1009 The panel renders this array in a loop, so adding a preset is one entry here plus one
// entry in the backend file. Order is the order the buttons appear in.
export const REFINE_PRESETS: RefinePresetButton[] = [
  {
    id: 'make-concise',
    label: 'Make concise',
    description:
      'Cuts extra details and keeps only what listeners need right now: who, what happens, and key on-screen text.',
    group: 'edit',
  },
  {
    id: 'polish',
    label: 'Polish',
    description:
      'Rewrites sentences so they sound natural when read aloud, and fixes grammar. Keeps all information and technical terms.',
    group: 'edit',
  },
  // Leijie Phase 2 (refinead-button-pipeline.md section 6.5). Frontend only for now: the button is
  // rendered so the layout is final, but it does not send a request.
  {
    id: 'fix-timing',
    label: 'Fix timing',
    description:
      'Makes the description fit before the next dialogue: shortens it, suggests a better start time, or suggests pausing the video for it. Coming soon.',
    group: 'edit',
    comingSoon: true,
  },
  {
    id: 'style-character-focus',
    label: 'Character focus',
    description:
      'Puts the people first: who they are, their expressions, and their reactions. The facts stay the same.',
    group: 'style',
  },
  {
    id: 'style-action-focus',
    label: 'Action focus',
    description:
      'Puts the action first, in the order it happens. Trims appearance and setting details.',
    group: 'style',
  },
  {
    id: 'style-environment-focus',
    label: 'Environment focus',
    description:
      'Puts the setting first: the place, time, lighting, and where things are. Then the action.',
    group: 'style',
  },
  {
    id: 'style-simple-language',
    label: 'Simple language',
    description:
      'Uses everyday words and short sentences. Explains technical terms instead of removing them.',
    group: 'style',
  },
]
