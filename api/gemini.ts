import {
  streamGeminiAnswer,
  validateGeminiRequest,
} from '../src/server/geminiCore.js'

interface ApiRequest {
  method?: string
  body?: unknown
  on(event: 'close', listener: () => void): void
}

interface ApiResponse {
  status(code: number): ApiResponse
  setHeader(name: string, value: string): void
  write(chunk: string): void
  end(chunk?: string): void
  headersSent: boolean
  writableEnded: boolean
  on(event: 'close', listener: () => void): void
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
    return
  }

  const controller = new AbortController()
  res.on('close', () => controller.abort())

  try {
    const request = validateGeminiRequest(req.body)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no')

    await streamGeminiAnswer(
      request,
      process.env.GEMINI_API_KEY ?? '',
      (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`),
      fetch,
      controller.signal,
    )
    if (!res.writableEnded) res.end('data: [DONE]\n\n')
  } catch (error) {
    if (controller.signal.aborted) return
    const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع.'
    if (res.headersSent) {
      if (!res.writableEnded) {
        res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
        res.end()
      }
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.status(400).end(JSON.stringify({ error: message }))
    }
  }
}
