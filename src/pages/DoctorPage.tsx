import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Check, ChevronDown, Copy, HeartPulse, Plus,
  Send, Sparkles, Square, Trash2,
} from 'lucide-react'
import { FormattedAnswer } from '../components/FormattedAnswer'
import { streamMedicalAssistant } from '../geminiClient'
import type { ClassPrediction } from '../imageClassifier'
import { MEDICAL_MODELS, type ModelId } from '../modelRegistry'
import { findMedicalTool, isFormTool, isImageTool, MEDICAL_CHAT_TOOLS } from '../medicalTools'
import type { MedicalToolId } from '../server/geminiCore'
import { classifyTabular, getTabularInputSchema } from '../tabularClassifier'

interface ChatTurn {
  id: number
  text: string
  toolId: MedicalToolId
  imageUrl?: string
  result?: { modelId: ModelId; predictions: ClassPrediction[] }
  assistantText?: string
  cancelled?: boolean
}

interface MedicalGeminiRequest {
  mode: 'chat' | 'explain'
  tool: MedicalToolId
  language: 'ar' | 'en'
  message: string
  history: Array<{ role: 'user' | 'assistant'; text: string }>
  result?: { modelId: ModelId; className: string; score: number }
}

function classLabel(label: string, t: (key: string) => string): string {
  const keys: Record<string, string> = {
    COVID: 'modelClassCovid',
    Lung_Opacity: 'modelClassOpacity',
    Normal: 'modelClassNormal',
    'Viral Pneumonia': 'modelClassViral',
    Tuberculosis: 'modelClassTb',
  }
  return t(keys[label] ?? label)
}

function getErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof TypeError && /fetch/i.test(error.message)) return t('networkUnavailable')
  return error instanceof Error ? error.message : t('assistantUnavailable')
}

export function DoctorPage() {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const requestControllerRef = useRef<AbortController | null>(null)
  const activeTurnIdRef = useRef<number | null>(null)
  const nextTurnIdRef = useRef(1)
  const objectUrlsRef = useRef(new Set<string>())
  const [draft, setDraft] = useState('')
  const [preview, setPreview] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [toolId, setToolId] = useState<MedicalToolId>(() => {
    const requestedTool = findMedicalTool(searchParams.get('tool') ?? '')
    return requestedTool?.id ?? 'health-chat'
  })
  const [loading, setLoading] = useState(false)
  const [streamingTurnId, setStreamingTurnId] = useState<number | null>(null)
  const [copiedTurnId, setCopiedTurnId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [toolMenuOpen, setToolMenuOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const toolMenuRef = useRef<HTMLDivElement>(null)
  const imageTool = isImageTool(toolId)
  const formTool = isFormTool(toolId)
  const tabularSchema = formTool ? getTabularInputSchema(toolId as ModelId) : undefined
  const isArabic = i18n.language.startsWith('ar')

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, loading])

  useEffect(() => () => {
    requestControllerRef.current?.abort()
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current.clear()
  }, [])

  useEffect(() => {
    if (!toolMenuOpen) return

    function closeOnOutside(event: PointerEvent) {
      if (!toolMenuRef.current?.contains(event.target as Node)) {
        setToolMenuOpen(false)
      }
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setToolMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [toolMenuOpen])

  function setTurn(turnId: number, update: (turn: ChatTurn) => ChatTurn) {
    setTurns((current) => current.map((turn) => turn.id === turnId ? update(turn) : turn))
  }

  function removePreview() {
    if (preview) {
      URL.revokeObjectURL(preview)
      objectUrlsRef.current.delete(preview)
    }
    setPreview('')
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function selectTool(value: string) {
    const nextTool = findMedicalTool(value)
    if (!nextTool) return
    if (nextTool.kind !== 'image' && preview) removePreview()
    setFormValues({})
    setToolId(nextTool.id)
    setError('')
  }

  function selectFile(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('unsupportedImage'))
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError(t('imageTooLarge'))
      return
    }
    removePreview()
    const imageUrl = URL.createObjectURL(file)
    objectUrlsRef.current.add(imageUrl)
    setPreview(imageUrl)
    setSelectedFile(file)
    setError('')
  }

  function buildHistory(): MedicalGeminiRequest['history'] {
    return turns.flatMap((turn) => {
      const history: MedicalGeminiRequest['history'] = []
      if (turn.text.trim()) history.push({ role: 'user', text: turn.text })
      if (turn.assistantText) history.push({ role: 'assistant', text: turn.assistantText })
      return history
    }).slice(-12)
  }

  async function streamAnswer(turnId: number, request: MedicalGeminiRequest) {
    const controller = new AbortController()
    requestControllerRef.current = controller
    activeTurnIdRef.current = turnId
    setStreamingTurnId(turnId)
    setLoading(true)
    try {
      await streamMedicalAssistant(request, controller.signal, (chunk) => {
        if (controller.signal.aborted) return
        setTurn(turnId, (turn) => ({ ...turn, assistantText: (turn.assistantText ?? '') + chunk }))
      })
    } catch (caught) {
      if (controller.signal.aborted) {
        setTurn(turnId, (turn) => ({ ...turn, cancelled: true }))
      } else {
        setError(getErrorMessage(caught, t))
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null
        activeTurnIdRef.current = null
        setStreamingTurnId(null)
        setLoading(false)
      }
    }
  }

  async function explainResult(turn: ChatTurn) {
    const first = turn.result?.predictions[0]
    if (!turn.result || !first) return
    const model = MEDICAL_MODELS.find(({ id }) => id === turn.result?.modelId)
    if (!model) {
      setError(t('modelNotFound'))
      return
    }
    setError('')
    await streamAnswer(turn.id, {
      mode: 'explain',
      tool: model.id,
      language: isArabic ? 'ar' : 'en',
      message: turn.text.trim() || t('explainPrompt'),
      history: buildHistory(),
      result: { modelId: model.id, className: first.label, score: first.score },
    })
  }

  async function send(prompt?: string) {
    if (requestControllerRef.current) return
    const text = (prompt ?? draft).trim()
    if (!text && !preview) {
      setError(t('noChatInput'))
      return
    }
    if (imageTool && !selectedFile) {
      setError(t('attachXrayFirst'))
      return
    }
    if (formTool && tabularSchema) {
      const missingField = tabularSchema.kind === 'binaryFeatures'
        ? tabularSchema.featureNames.find((name) => formValues[name] !== '0' && formValues[name] !== '1')
        : [
            ...tabularSchema.numericFeatures.filter((name) => !formValues[name]),
            ...tabularSchema.categoricalFeatures
              .filter((field) => !formValues[field.name])
              .map((field) => field.name),
          ][0]
      if (missingField) {
        setError(t('completeModelFields'))
        return
      }
    }
    nextTurnIdRef.current += 1
    const turnId = nextTurnIdRef.current
    const turn: ChatTurn = {
      id: turnId,
      text,
      toolId,
      imageUrl: preview || undefined,
    }
    const file = selectedFile
    const history = buildHistory()
    setTurns((current) => [...current, turn])
    setDraft('')
    setError('')
    setPreview('')
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''

    if (imageTool && file) {
      const model = MEDICAL_MODELS.find(({ id }) => id === toolId)
      if (!model) {
        setError(t('modelNotFound'))
        return
      }
      const controller = new AbortController()
      requestControllerRef.current = controller
      activeTurnIdRef.current = turnId
      setLoading(true)
      setStreamingTurnId(null)
      try {
        const { classifyImage } = await import('../imageClassifier')
        if (controller.signal.aborted) return
        const predictions = await classifyImage(file, model.id)
        if (controller.signal.aborted) return
        setTurn(turnId, (current) => ({ ...current, result: { modelId: model.id, predictions } }))
        if (predictions[0]) {
          await streamAnswer(turnId, {
            mode: 'explain',
            tool: model.id,
            language: isArabic ? 'ar' : 'en',
            message: text || t('explainPrompt'),
            history,
            result: {
              modelId: model.id,
              className: predictions[0].label,
              score: predictions[0].score,
            },
          })
        }
      } catch (caught) {
        if (controller.signal.aborted) {
          setTurn(turnId, (current) => ({ ...current, cancelled: true }))
        } else {
          setError(getErrorMessage(caught, t))
        }
      } finally {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null
          activeTurnIdRef.current = null
          setStreamingTurnId(null)
          setLoading(false)
        }
      }
      return
    }

    if (formTool) {
      const turnText = text || t('tabularAnalysisPrompt')
      setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, text: turnText } : turn))
      setLoading(true)
      setStreamingTurnId(null)
      try {
        const predictions = await classifyTabular(toolId as ModelId, formValues)
        setTurn(turnId, (current) => ({ ...current, text: turnText, result: { modelId: toolId as ModelId, predictions } }))
        if (predictions[0]) {
          await streamAnswer(turnId, {
            mode: 'explain',
            tool: toolId,
            language: isArabic ? 'ar' : 'en',
            message: turnText,
            history,
            result: {
              modelId: toolId as ModelId,
              className: predictions[0].label,
              score: predictions[0].score,
            },
          })
        }
      } catch (caught) {
        setError(getErrorMessage(caught, t))
      } finally {
        setLoading(false)
        setStreamingTurnId(null)
      }
      return
    }

    await streamAnswer(turnId, {
      mode: 'chat',
      tool: toolId,
      language: isArabic ? 'ar' : 'en',
      message: text,
      history,
    })
  }

  function stopResponse() {
    const controller = requestControllerRef.current
    const turnId = activeTurnIdRef.current
    if (!controller) return
    controller.abort()
    requestControllerRef.current = null
    activeTurnIdRef.current = null
    setLoading(false)
    setStreamingTurnId(null)
    if (turnId !== null) setTurn(turnId, (turn) => ({ ...turn, cancelled: true }))
  }

  function clearChat() {
    requestControllerRef.current?.abort()
    requestControllerRef.current = null
    activeTurnIdRef.current = null
    turns.forEach((turn) => {
      if (turn.imageUrl) {
        URL.revokeObjectURL(turn.imageUrl)
        objectUrlsRef.current.delete(turn.imageUrl)
      }
    })
    removePreview()
    setLoading(false)
    setStreamingTurnId(null)
    setTurns([])
    setError('')
  }

  async function copyResponse(turnId: number, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedTurnId(turnId)
      window.setTimeout(() => setCopiedTurnId((current) => current === turnId ? null : current), 1800)
    } catch {
      setError(t('copyFailed'))
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  return (
    <div className="doctor-page premium-chat">
      <div className="chat-column">
        {turns.length > 0 && (
          <div className="chat-toolbar">
            <button className="clear-chat-button" type="button" onClick={clearChat}>
              <Trash2 size={15} />{t('clearChat')}
            </button>
          </div>
        )}

        {turns.length === 0 && (
          <section className="doctor-empty">
            <h1>{t('doctorTitle')}</h1>
            <p>{t('doctorEmptyCopy')}</p>
            <div className="prompt-grid">
              {(t('prompts', { returnObjects: true }) as string[]).map((prompt) => (
                <button className="prompt-chip" type="button" key={prompt} onClick={() => setDraft(prompt)}>{prompt}</button>
              ))}
            </div>
          </section>
        )}

        {turns.map((turn) => {
          const turnTool = findMedicalTool(turn.toolId)
          const isStreaming = streamingTurnId === turn.id
          const copied = copiedTurnId === turn.id
          return (
            <div className="chat-turn" key={turn.id}>
              <article className="user-bubble">
                <span className="user-tool-label">{turnTool ? t(turnTool.nameKey) : ''}</span>
                {turn.imageUrl && <img src={turn.imageUrl} alt={t('xrayPreview')} />}
                <p>{turn.text || t('attachedXray')}</p>
              </article>

              {turn.result && (
                <MedicalReport
                  result={turn.result}
                  explanation={turn.assistantText}
                  isStreaming={isStreaming}
                  copied={copied}
                  onCopy={(value) => void copyResponse(turn.id, value)}
                  onExplain={() => void explainResult(turn)}
                />
              )}

              {turn.assistantText && !turn.result && (
                <article className="assistant-chat-bubble">
                  <AssistantLabel
                    copied={copied}
                    disabled={isStreaming}
                    onCopy={() => void copyResponse(turn.id, turn.assistantText ?? '')}
                    t={t}
                  />
                  <FormattedAnswer text={turn.assistantText} streaming={isStreaming} />
                </article>
              )}
              {isStreaming && !turn.assistantText && !turn.result && (
                <article className="assistant-chat-bubble streaming-placeholder" role="status">
                  <LoadingDots />
                  <span>{t('loadingChat')}</span>
                </article>
              )}
              {turn.cancelled && <p className="cancelled-note" role="status">{t('responseStopped')}</p>}
            </div>
          )
        })}
        {loading && streamingTurnId === null && (
          <div className="loading-row" role="status"><LoadingDots /><span>{t('loadingModel')}</span></div>
        )}
        {error && <p className="chat-error" role="alert">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="composer-wrap">
        {preview && (
          <div className="composer-preview">
            <img src={preview} alt={t('xrayPreview')} />
            <button className="icon-button" type="button" aria-label={t('remove')} onClick={removePreview}>
              <Trash2 size={16} />
            </button>
          </div>
        )}
        {tabularSchema && !toolMenuOpen && (
          <section className="model-form-panel" aria-label={t('modelFormTitle')}>
            <div className="model-form-heading">
              <strong>{t('modelFormTitle')}</strong>
              <span>{t('modelFormLocalNote')}</span>
            </div>
            {tabularSchema.kind === 'binaryFeatures' ? (
              <div className="symptom-input-grid">
                {tabularSchema.featureNames.map((name) => (
                  <label className="symptom-check" key={name}>
                    <input
                      type="checkbox"
                      checked={formValues[name] === '1'}
                      onChange={(event) => setFormValues((current) => ({
                        ...current,
                        [name]: event.target.checked ? '1' : '0',
                      }))}
                      disabled={loading}
                    />
                    <span>{name.replaceAll('_', ' ')}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="model-form-grid">
                {tabularSchema.numericFeatures.map((name) => (
                  <label className="model-field" key={name}>
                    <span>{name}</span>
                    <input
                      type="number"
                      step="any"
                      value={formValues[name] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [name]: event.target.value }))}
                      disabled={loading}
                    />
                  </label>
                ))}
                {tabularSchema.categoricalFeatures.map((field) => (
                  <label className="model-field" key={field.name}>
                    <span>{field.name}</span>
                    <select
                      value={formValues[field.name] ?? ''}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                      disabled={loading}
                    >
                      <option value="">—</option>
                      {field.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
          </section>
        )}
        <div className="composer">
          <button
            className="attach-button"
            type="button"
            aria-label={t('attach')}
            disabled={loading || !imageTool}
            title={!imageTool ? t('imageToolOnly') : t('attach')}
            onClick={() => inputRef.current?.click()}
          >
            <Plus size={20} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={loading || !imageTool}
            onChange={handleFileChange}
          />
          <div className="premium-tool-wrap" ref={toolMenuRef}>
            <button
              type="button"
              className="premium-tool-button"
              aria-expanded={toolMenuOpen}
              aria-label={t('toolSelectionLabel')}
              onClick={() => setToolMenuOpen((open) => !open)}
              disabled={loading}
            >
              <span>{t(findMedicalTool(toolId)?.nameKey ?? 'toolHealthChat')}</span>
              <ChevronDown size={15} />
            </button>
            {toolMenuOpen && (
              <div className="premium-tool-menu" role="menu">
                <div className="premium-menu-label">{t('geminiToolsGroup')}</div>
                {MEDICAL_CHAT_TOOLS.filter((tool) => tool.kind === 'gemini').map((tool) => (
                  <button
                    type="button"
                    role="menuitem"
                    className={tool.id === toolId ? 'active' : ''}
                    key={tool.id}
                    onClick={() => { selectTool(tool.id); setToolMenuOpen(false) }}
                  >
                    <span>{t(tool.nameKey)}</span>
                    {tool.id === toolId && <Check size={16} />}
                  </button>
                ))}
                <div className="premium-menu-label">{t('localToolsGroup')}</div>
                {MEDICAL_CHAT_TOOLS.filter((tool) => tool.kind === 'image').map((tool) => (
                  <button
                    type="button"
                    role="menuitem"
                    className={tool.id === toolId ? 'active' : ''}
                    key={tool.id}
                    onClick={() => { selectTool(tool.id); setToolMenuOpen(false) }}
                  >
                    <span>{t(tool.nameKey)}</span>
                    {tool.id === toolId && <Check size={16} />}
                  </button>
                ))}
                <div className="premium-menu-label">{t('formToolsGroup')}</div>
                {MEDICAL_CHAT_TOOLS.filter((tool) => tool.kind === 'form').map((tool) => (
                  <button
                    type="button"
                    role="menuitem"
                    className={tool.id === toolId ? 'active' : ''}
                    key={tool.id}
                    onClick={() => { selectTool(tool.id); setToolMenuOpen(false) }}
                  >
                    <span>{t(tool.nameKey)}</span>
                    {tool.id === toolId && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            className="chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('chatPlaceholder')}
            aria-label={t('chatPlaceholder')}
            disabled={loading}
          />
          {loading ? (
            <button className="stop-button" type="button" onClick={stopResponse} aria-label={t('stopGeneration')}>
              <Square size={15} fill="currentColor" /><span>{t('stopGeneration')}</span>
            </button>
          ) : (
            <button className="send-button" type="button" onClick={() => void send()} disabled={(!draft.trim() && !preview && !formTool)}>
              <Send size={17} /><span>{t('send')}</span>
            </button>
          )}
        </div>
        <p className="composer-data-note">{t(imageTool ? 'imageDataNotice' : 'chatDataNotice')}</p>
      </div>
    </div>
  )
}

function LoadingDots() {
  return <><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></>
}

function AssistantLabel({
  copied,
  disabled,
  onCopy,
  t,
}: {
  copied: boolean
  disabled: boolean
  onCopy: () => void
  t: (key: string) => string
}) {
  return (
    <div className="assistant-message-label">
      <span><Sparkles size={15} aria-hidden="true" /></span>
      <strong>{t('mueenAssistant')}</strong>
      <button className="copy-response" type="button" disabled={disabled} onClick={onCopy} aria-label={t('copyResponse')}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span>{copied ? t('copiedResponse') : t('copyResponse')}</span>
      </button>
    </div>
  )
}

function MedicalReport({
  result,
  explanation,
  isStreaming,
  copied,
  onCopy,
  onExplain,
}: {
  result: NonNullable<ChatTurn['result']>
  explanation?: string
  isStreaming: boolean
  copied: boolean
  onCopy: (text: string) => void
  onExplain: () => void
}) {
  const { t } = useTranslation()
  const model = MEDICAL_MODELS.find(({ id }) => id === result.modelId)
  const predictions = result.predictions
  const top = predictions[0]
  if (!model || !top) return null
  const statusClass = top.label === 'Normal' ? 'healthy' : 'diseased'
  const reportText = [
    `${t('modelExpected')}: ${classLabel(top.label, t)}`,
    `${t('modelScore')}: ${Math.round(top.score * 100)}%`,
    explanation,
  ].filter(Boolean).join('\n\n')

  return (
    <article className="assistant-report">
      <div className="report-top">
        <div className="report-status">
          <span className={`status-pill ${statusClass}`}>{top.label === 'Normal' ? t('statusHealthy') : t('statusFlagged')}</span>
        </div>
        <div className="report-actions">
          <span className="report-kind"><HeartPulse size={15} aria-hidden="true" />{t('imageAnalysis')}</span>
          <button className="copy-response" type="button" disabled={isStreaming} onClick={() => onCopy(reportText)} aria-label={t('copyResponse')}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span>{copied ? t('copiedResponse') : t('copyResponse')}</span>
          </button>
        </div>
      </div>

      <div className="diagnosis-heading">
        <p className="plant-label">{t('modelExpected')}: <strong>{t(model.id === 'covid-chest-xray' ? 'modelCovid' : 'modelTb')}</strong></p>
        <h2>{classLabel(top.label, t)}</h2>
      </div>

      <section className={`score-panel ${statusClass}`}>
        <div className="confidence-label">
          <div><span>{t('modelScore')}</span></div>
          <strong>{Math.round(top.score * 100)}%</strong>
        </div>
        <div className={`confidence-track ${statusClass}`} role="meter" aria-label={t('modelScore')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(top.score * 100)}>
          <span style={{ width: `${top.score * 100}%` }} />
        </div>
        <p className="model-result-disclaimer">{t('resultDisclaimer')}</p>
      </section>

      {predictions.length > 1 && (
        <section className="alternatives">
          <div className="alternatives-heading"><h3>{t('modelAlternatives')}</h3><span>{t('modelAlternativesHint')}</span></div>
          {predictions.slice(1).map(({ label, score }) => (
            <div className="alternative-row" key={label}>
              <div className="alternative-label"><span>{classLabel(label, t)}</span><strong>{Math.round(score * 100)}%</strong></div>
              <div className="alternative-track" aria-hidden="true"><span style={{ width: `${score * 100}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      {explanation && (
        <section className="interpretation-panel" aria-busy={isStreaming}>
          <div className="interpretation-heading">
            <span className="interpretation-icon"><Sparkles size={17} aria-hidden="true" /></span>
            <h3>{t('mueenAssistant')}</h3>
            <button className="copy-response" type="button" disabled={isStreaming} onClick={() => onCopy(explanation)} aria-label={t('copyResponse')}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <FormattedAnswer text={explanation} streaming={isStreaming} />
        </section>
      )}
      {isStreaming && !explanation && (
        <div className="streaming-placeholder" role="status"><LoadingDots /><span>{t('loadingExplanation')}</span></div>
      )}
      {!explanation && !isStreaming && (
        <button className="button secondary report-explain-button" type="button" onClick={onExplain}>
          <Sparkles size={16} />{t('explainResult')}
        </button>
      )}
    </article>
  )
}
