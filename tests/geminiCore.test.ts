import { describe, expect, it } from 'vitest'
import { validateGeminiRequest } from '../src/server/geminiCore.js'

describe('validateGeminiRequest', () => {
  it('accepts a chat request with a short conversation history', () => {
    expect(
      validateGeminiRequest({
        mode: 'chat',
        tool: 'health-chat',
        language: 'ar',
        message: 'ما أسباب الصداع؟',
        history: [{ role: 'user', text: 'مرحبا' }],
      }).message,
    ).toBe('ما أسباب الصداع؟')
  })

  it('rejects an oversized message and invalid model score', () => {
    expect(() =>
      validateGeminiRequest({
        mode: 'chat',
        tool: 'health-chat',
        language: 'ar',
        message: 'x'.repeat(3001),
      }),
    ).toThrow()

    expect(() =>
      validateGeminiRequest({
        mode: 'explain',
        tool: 'covid-chest-xray',
        language: 'ar',
        message: 'اشرح النتيجة',
        result: { modelId: 'covid-chest-xray', className: 'COVID', score: 1.5 },
      }),
    ).toThrow()
  })

  it('requires an image model that matches the result being explained', () => {
    expect(() =>
      validateGeminiRequest({
        mode: 'explain',
        tool: 'tuberculosis-chest-xray',
        language: 'ar',
        message: 'اشرح النتيجة',
        result: { modelId: 'covid-chest-xray', className: 'COVID', score: 0.8 },
      }),
    ).toThrow()
  })

  it('accepts a tabular model explanation without transmitting entered form values', () => {
    expect(
      validateGeminiRequest({
        mode: 'explain',
        tool: 'diabetes-risk',
        language: 'ar',
        message: 'اشرح النتيجة',
        result: { modelId: 'diabetes-risk', className: 'diabetes', score: 0.8 },
      }).result,
    ).toEqual({ modelId: 'diabetes-risk', className: 'diabetes', score: 0.8 })
  })
})
