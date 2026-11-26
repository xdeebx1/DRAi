import type { MedicalGeminiRequest } from '../api/geminiCore'

export async function streamMedicalAssistant(
  request: MedicalGeminiRequest,
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<void> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string }
    throw new Error(payload.error ?? 'تعذر الاتصال بالمساعد الطبي.')
  }
  if (!response.body) throw new Error('المتصفح لا يدعم عرض الرد المتدفق.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''

    for (const event of events) {
      const eventType = event
        .split(/\r?\n/)
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim()
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n')
      if (!data || data === '[DONE]') continue
      const payload = JSON.parse(data) as { text?: string; message?: string }
      if (eventType === 'error') {
        throw new Error(payload.message ?? 'تعذر إكمال رد Gemini.')
      }
      if (payload.text) onText(payload.text)
    }

    if (done) break
  }
}
