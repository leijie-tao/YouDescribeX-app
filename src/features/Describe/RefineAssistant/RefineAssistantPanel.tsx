// xiao1009 The RefineAD panel: preset buttons, a free-text box, and the Current/Suggestion pair with
// Accept / Reject / Try again. It owns the request and its own loading and error state, and knows
// nothing about how the suggestion is applied — that is the parent's job, via onAccept.
//
// Accessibility rules this panel has to keep (they are requirements, not preferences):
//   - every clickable thing is a real <button type="button"> with a readable name
//   - one permanently mounted role="status" region announces progress, errors go to role="alert"
//   - when a suggestion arrives, focus moves to Accept
//   - Reject hands focus back to the parent's "AI Assistant" button, via onFocusTrigger
//   - Escape closes the panel, via onClose
// Structure follows the inline panel at EditClip.tsx:854-886; the live regions follow
// RatingPopup.tsx:454-460.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import '@/assets/css/refineAssistant.css'
import {
  MAX_INSTRUCTION_CHARS,
  RefineRequestError,
  requestRefineSuggestion,
} from './refineApi'
import { REFINE_PRESETS, RefinePresetButton } from './refinePresets'
import { RefinePresetId, RefineSuggestion } from '@/shared/types/refine'

// Leijie The edit presets render as a plain row; the Style options get their own labelled group so a
// screen reader announces "Style" when focus enters it.
const EDIT_PRESETS = REFINE_PRESETS.filter((preset) => preset.group === 'edit')
const STYLE_PRESETS = REFINE_PRESETS.filter(
  (preset) => preset.group === 'style',
)

interface Props {
  audioDescriptionId: string
  clipId: string
  currentText: string
  onAccept: (suggestion: string) => void
  onClose: () => void
  onFocusTrigger: () => void
}

interface PendingRequest {
  presetId?: RefinePresetId
  instruction?: string
}

const RefineAssistantPanel = ({
  audioDescriptionId,
  clipId,
  currentText,
  onAccept,
  onClose,
  onFocusTrigger,
}: Props) => {
  const [isWorking, setIsWorking] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [instruction, setInstruction] = useState('')
  const [suggestion, setSuggestion] = useState<RefineSuggestion | null>(null)
  const [lastRequest, setLastRequest] = useState<PendingRequest | null>(null)

  const acceptButtonRef = useRef<HTMLButtonElement>(null)
  const firstPresetRef = useRef<HTMLButtonElement>(null)
  // xiao1009 A clip can only be open once at a time, so its id makes the label ids unique without
  // needing React 18's useId.
  const instructionInputId = `refine-instruction-${clipId}`
  const styleGroupLabelId = `refine-style-label-${clipId}`

  // xiao1009 Focus enters the panel as soon as it opens. Two reasons: a keyboard user is put on the
  // new content instead of having to tab for it, and Escape only reaches the handler below when
  // focus is actually inside the panel — leaving focus on the trigger would make Escape do nothing.
  useEffect(() => {
    firstPresetRef.current?.focus()
  }, [])

  // xiao1009 Focus moves to Accept as soon as a suggestion renders, so a keyboard or screen-reader
  // user lands on the decision rather than having to hunt for it.
  useEffect(() => {
    if (suggestion) acceptButtonRef.current?.focus()
  }, [suggestion])

  const submit = useCallback(
    async (request: PendingRequest) => {
      setIsWorking(true)
      setErrorMessage('')
      setSuggestion(null)
      setStatusMessage('Working on a suggestion…')
      setLastRequest(request)

      try {
        const response = await requestRefineSuggestion({
          audioDescriptionId,
          clips: [{ clipId, currentText }],
          presetId: request.presetId,
          instruction: request.instruction,
        })
        const first = response.suggestions?.[0]

        if (!first) {
          setStatusMessage('')
          setErrorMessage(
            'The AI did not return a suggestion. Please try again.',
          )
          return
        }

        setSuggestion(first)
        setStatusMessage(
          first.unchanged
            ? 'No changes needed. The description already fits this request.'
            : 'Suggestion ready',
        )
      } catch (error) {
        const message =
          error instanceof RefineRequestError
            ? error.message
            : 'Could not get a suggestion. Please try again.'
        setStatusMessage('')
        setErrorMessage(message)
      } finally {
        setIsWorking(false)
      }
    },
    [audioDescriptionId, clipId, currentText],
  )

  const handleSendInstruction = () => {
    const trimmed = instruction.trim()
    if (!trimmed) return
    submit({ instruction: trimmed })
  }

  // xiao1009 The parent puts the text into the edit box; the panel only reports what happened and
  // gives focus back, so a keyboard user is never left with focus on a button that just disappeared.
  const handleAccept = () => {
    if (!suggestion) return
    onAccept(suggestion.suggestion)
    setSuggestion(null)
    setErrorMessage('')
    setStatusMessage(
      'Suggestion inserted into the description. Use TTS Record to save it.',
    )
    onFocusTrigger()
  }

  const handleReject = () => {
    setSuggestion(null)
    setErrorMessage('')
    setStatusMessage('Suggestion discarded.')
    onFocusTrigger()
  }

  const handleTryAgain = () => {
    if (lastRequest) submit(lastRequest)
  }

  // Leijie One preset button plus its preview. The preview is a real element referenced by
  // aria-describedby, so it is read on keyboard focus too, not only shown on mouse hover.
  const renderPreset = (preset: RefinePresetButton) => {
    const descriptionId = `refine-preset-desc-${clipId}-${preset.id}`
    return (
      <span key={preset.id} className="refine-assistant__preset-wrap">
        <button
          type="button"
          ref={preset.id === REFINE_PRESETS[0].id ? firstPresetRef : undefined}
          className="ydx-button ydx-button--tts-violet refine-assistant__preset"
          onClick={() => submit({ presetId: preset.id })}
          disabled={isWorking}
          aria-describedby={descriptionId}
        >
          {preset.label}
        </button>
        <span
          id={descriptionId}
          role="tooltip"
          className="refine-assistant__tooltip"
        >
          {preset.description}
        </span>
      </span>
    )
  }

  // xiao1009 Escape closes the panel. stopPropagation keeps it from also reaching the editor's own
  // key handlers further up the tree.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    }
  }

  return (
    <div
      className="refine-assistant"
      role="group"
      aria-label="AI Assistant"
      onKeyDown={handleKeyDown}
    >
      {/* xiao1009 Both live regions are mounted at all times, so a screen reader has registered
          them before they ever gain text. An empty region announces nothing. */}
      <div className="refine-assistant__sr-only" role="status">
        {statusMessage}
      </div>
      <div className="refine-assistant__error" role="alert">
        {errorMessage}
      </div>

      {!suggestion && (
        <>
          <div className="refine-assistant__presets">
            {EDIT_PRESETS.map(renderPreset)}
          </div>

          <div
            className="refine-assistant__presets refine-assistant__style-group"
            role="group"
            aria-labelledby={styleGroupLabelId}
          >
            <span
              id={styleGroupLabelId}
              className="refine-assistant__group-label"
            >
              Style
            </span>
            {STYLE_PRESETS.map(renderPreset)}
          </div>

          <div className="refine-assistant__free-text">
            <label
              className="refine-assistant__label"
              htmlFor={instructionInputId}
            >
              Or tell the AI what to change
            </label>
            <div className="refine-assistant__free-text-row">
              <input
                id={instructionInputId}
                type="text"
                className="refine-assistant__input"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                maxLength={MAX_INSTRUCTION_CHARS}
                disabled={isWorking}
              />
              <button
                type="button"
                className="ydx-button ydx-button--primary"
                onClick={handleSendInstruction}
                disabled={isWorking || !instruction.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}

      {isWorking && (
        <p className="refine-assistant__working">Working on a suggestion…</p>
      )}

      {suggestion && (
        <div className="refine-assistant__result">
          <div className="refine-assistant__block">
            <h6 className="refine-assistant__block-title">Current</h6>
            <p className="refine-assistant__text">{suggestion.original}</p>
          </div>
          <div className="refine-assistant__block">
            <h6 className="refine-assistant__block-title">
              Suggestion
              {suggestion.unchanged ? ' — no changes needed' : ''}
            </h6>
            <p className="refine-assistant__text">{suggestion.suggestion}</p>
          </div>
          <div className="refine-assistant__result-actions">
            <button
              type="button"
              ref={acceptButtonRef}
              className="ydx-button ydx-button--success"
              onClick={handleAccept}
            >
              Accept suggestion
            </button>
            <button
              type="button"
              className="ydx-button ydx-button--secondary"
              onClick={handleReject}
            >
              Reject suggestion
            </button>
            <button
              type="button"
              className="ydx-button ydx-button--tts-violet"
              onClick={handleTryAgain}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RefineAssistantPanel
