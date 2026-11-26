import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import {
  streamGeminiAnswer,
  validateGeminiRequest,
} from './api/geminiCore.ts'

function developmentGeminiEndpoint(apiKey: string): Plugin {
  return {
    name: 'development-gemini-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/gemini', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.end('Method not allowed')
          return
        }

        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => {
          body += chunk
          if (body.length > 24000) {
            res.statusCode = 413
            res.end(JSON.stringify({ error: 'حجم الطلب أكبر من الحد المسموح.' }))
            req.destroy()
          }
        })
        req.on('end', async () => {
          if (res.writableEnded) return
          const controller = new AbortController()
          res.on('close', () => controller.abort())
          try {
            const request = validateGeminiRequest(JSON.parse(body) as unknown)
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            await streamGeminiAnswer(
              request,
              apiKey,
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
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: message }))
            }
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), developmentGeminiEndpoint(env.GEMINI_API_KEY ?? '')],
  }
})
