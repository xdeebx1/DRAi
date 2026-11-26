import { MEDICAL_MODELS, type ModelId } from '../src/modelRegistry.js'

export type MedicalToolId =
  | 'health-chat'
  | 'symptom-guidance'
  | 'lab-explanation'
  | 'medication-information'
  | ModelId

export interface GeminiHistoryMessage {
  role: 'user' | 'assistant'
  text: string
}

export interface MedicalResultContext {
  modelId: ModelId
  className: string
  score: number
}

export interface MedicalGeminiRequest {
  mode: 'chat' | 'explain'
  tool: MedicalToolId
  language: 'ar' | 'en'
  message: string
  history: GeminiHistoryMessage[]
  result?: MedicalResultContext
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  error?: { message?: string }
}

const MODEL_NAMES = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemini-3-flash-preview',
]
const MAX_MESSAGE_LENGTH = 3000
const MAX_HISTORY_ITEMS = 12
const MAX_REQUEST_LENGTH = 24000
const TOOL_IDS: MedicalToolId[] = [
  'health-chat',
  'symptom-guidance',
  'lab-explanation',
  'medication-information',
  ...MEDICAL_MODELS.map(({ id }) => id),
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseResult(value: unknown): MedicalResultContext | undefined {
  if (!isRecord(value)) return undefined
  const { modelId, className, score } = value
  if (
    typeof modelId !== 'string' ||
    !MEDICAL_MODELS.some((model) => model.id === modelId) ||
    typeof className !== 'string' ||
    className.length > 100 ||
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 1
  ) {
    throw new Error('بيانات نتيجة التحليل غير صالحة.')
  }
  return { modelId: modelId as ModelId, className, score }
}

export function validateGeminiRequest(value: unknown): MedicalGeminiRequest {
  if (!isRecord(value) || JSON.stringify(value).length > MAX_REQUEST_LENGTH) {
    throw new Error('صيغة الطلب غير صالحة أو أكبر من الحد المسموح.')
  }

  const mode = value.mode
  const tool = value.tool
  const language = value.language
  const message = value.message
  if (
    (mode !== 'chat' && mode !== 'explain') ||
    typeof tool !== 'string' ||
    !TOOL_IDS.includes(tool as MedicalToolId) ||
    (language !== 'ar' && language !== 'en') ||
    typeof message !== 'string' ||
    message.trim().length === 0 ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    throw new Error('أدخل رسالة وأداة صالحتين قبل الإرسال.')
  }

  const historyValue = value.history ?? []
  if (!Array.isArray(historyValue) || historyValue.length > MAX_HISTORY_ITEMS) {
    throw new Error('سجل المحادثة غير صالح.')
  }
  const history = historyValue.map((item): GeminiHistoryMessage => {
    if (
      !isRecord(item) ||
      (item.role !== 'user' && item.role !== 'assistant') ||
      typeof item.text !== 'string' ||
      item.text.length > MAX_MESSAGE_LENGTH
    ) {
      throw new Error('سجل المحادثة غير صالح.')
    }
    return { role: item.role, text: item.text }
  })

  const result = parseResult(value.result)
  if (
    mode === 'explain' &&
    (!result || (tool !== result.modelId))
  ) {
    throw new Error('اختر نموذجًا متاحًا قبل طلب شرح النتيجة.')
  }

  return {
    mode,
    tool: tool as MedicalToolId,
    language,
    message: message.trim(),
    history,
    ...(result ? { result } : {}),
  }
}

function toolInstruction(tool: MedicalToolId): string {
  switch (tool) {
    case 'symptom-guidance':
      return 'For symptom questions, help the user organize symptoms and urgency. Ask one focused follow-up only if necessary. Do not diagnose from symptoms.'
    case 'lab-explanation':
      return 'Explain laboratory terms and reference ranges only when supplied. Do not infer missing values or diagnose from a single result.'
    case 'medication-information':
      return 'Give general medication information, common safety cautions, and questions for a pharmacist or clinician. Never prescribe or invent an individualized dose.'
    case 'covid-chest-xray':
    case 'tuberculosis-chest-xray':
      return 'Stay within the selected image model’s supported classes. A model output is not a diagnosis and cannot rule out other conditions.'
    default:
      if (MEDICAL_MODELS.some(({ id }) => id === tool)) {
        return 'Explain only the supplied on-device model label and score. Do not treat either as a diagnosis, a clinical probability, or a reason to delay professional care.'
      }
      return 'Answer general health questions directly, carefully, and in a clear structure.'
  }
}

function modelName(modelId: ModelId): string {
  return MEDICAL_MODELS.find((model) => model.id === modelId)?.shortName ?? modelId
}

function buildSystemInstruction(request: MedicalGeminiRequest): string {
  const language =
    request.language === 'ar'
      ? 'Reply in natural, clear Arabic.'
      : 'Reply in natural, clear English.'
  return [
    'You are Mueen, a warm and professional health-information assistant. Never mention Gemini or any underlying model provider.',
    'You are not a physician. Do not diagnose, prescribe, claim certainty, or replace a licensed clinician. Distinguish general education from individualized medical advice.',
    'Give the direct answer first, then use concise headings or practical bullet points when useful. Avoid filler, generic greetings, and repeating disclaimers.',
    'Never ask for names, contact details, medical record numbers, or other identifying information.',
    'If the user reports severe or sudden symptoms such as difficulty breathing, chest pain, stroke signs, severe bleeding, or loss of consciousness, advise contacting local emergency services now.',
    'Never infer findings from an image: image bytes are processed locally and are not available to you.',
    toolInstruction(request.tool),
    language,
  ].join('\n')
}

function buildUserContent(request: MedicalGeminiRequest): string {
  if (request.mode === 'explain' && request.result) {
    const model = MEDICAL_MODELS.find(({ id }) => id === request.result?.modelId)
    return [
      request.message,
      `On-device model: ${modelName(request.result.modelId)}; selected class=${request.result.className}; model score=${Math.round(request.result.score * 100)}%.`,
      `The model’s recorded held-out accuracy is ${model?.testAccuracy ?? 'unknown'}% on its own dataset, not clinical validation.`,
      model ? `Model scope and limitations: ${model.limitation}` : '',
      'Explain what the selected class means in general, what the score does and does not mean, and a reasonable next step. Do not add findings not supplied.',
    ].filter(Boolean).join('\n')
  }
  return request.message
}

function buildContents(request: MedicalGeminiRequest) {
  const history = request.mode === 'chat'
    ? request.history
        .slice(-MAX_HISTORY_ITEMS)
        .map(({ role, text }) => ({
          role: role === 'assistant' ? 'model' : 'user',
          parts: [{ text }],
        }))
    : []

  return [
    ...history,
    { role: 'user', parts: [{ text: buildUserContent(request) }] },
  ]
}

function requestBody(request: MedicalGeminiRequest, modelNameValue: string) {
  return {
    systemInstruction: {
      parts: [{ text: buildSystemInstruction(request) }],
    },
    contents: buildContents(request),
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 1100,
      thinkingConfig: modelNameValue.startsWith('gemini-3')
        ? { thinkingLevel: 'low' }
        : { thinkingBudget: 0 },
    },
  }
}

function getProviderError(status: number): string {
  if (status === 401 || status === 403) {
    return 'مفتاح Gemini غير صالح أو لا يملك صلاحية الاستخدام.'
  }
  if (status === 429) return 'تم تجاوز حد طلبات Gemini مؤقتًا. حاول بعد قليل.'
  if (status === 503) return 'خدمة Gemini مشغولة الآن. حاول بعد قليل.'
  return `تعذر على Gemini إكمال الطلب (${status}).`
}

async function consumeGeminiStream(
  response: Response,
  onText: (text: string) => void,
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Gemini stream is unavailable')

  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''

  const readEvent = (event: string) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (!data || data === '[DONE]') return

    const parsed = JSON.parse(data) as GeminiResponse
    if (parsed.error) throw new Error('Gemini stream returned an error')
    const text = parsed.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
    if (!text) return

    answer += text
    onText(text)
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''
    events.forEach(readEvent)
    if (done) break
  }
  if (buffer.trim()) readEvent(buffer)
  if (!answer.trim()) throw new Error('Gemini returned an empty answer')
  return answer
}

export async function streamGeminiAnswer(
  requestBodyValue: MedicalGeminiRequest,
  apiKey: string,
  onText: (text: string) => void,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<string> {
  if (!apiKey) throw new Error('Gemini غير مُعدّ على الخادم.')
  let lastError = 'تعذر على Gemini الرد الآن. حاول مرة أخرى.'

  for (const modelNameValue of MODEL_NAMES) {
    let response: Response
    try {
      response = await request(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelNameValue}:streamGenerateContent?alt=sse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody(requestBodyValue, modelNameValue)),
          signal,
        },
      )
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = 'تعذر الاتصال بخدمة Gemini. تحقق من الاتصال وحاول مجددًا.'
      continue
    }

    if (!response.ok) {
      lastError = getProviderError(response.status)
      if ([400, 404, 429, 503].includes(response.status)) continue
      throw new Error(lastError)
    }

    let emittedText = false
    try {
      return await consumeGeminiStream(response, (text) => {
        emittedText = true
        onText(text)
      })
    } catch (error) {
      if (signal?.aborted) throw error
      if (emittedText) throw new Error('انقطع رد Gemini. يمكنك إيقافه أو إعادة المحاولة.')
      lastError = 'تعذر على Gemini تكوين رد صالح. حاول مرة أخرى.'
    }
  }

  throw new Error(lastError)
}
