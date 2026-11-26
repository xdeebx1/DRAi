import * as ort from 'onnxruntime-web/wasm'
import { MEDICAL_MODELS, type MedicalModel, type ModelId } from './modelRegistry'
import { prepareImageTensor } from './imagePreprocessing'

const MAX_IMAGE_PIXELS = 25_000_000

export interface ClassPrediction {
  label: string
  score: number
}

const sessions = new Map<ModelId, Promise<ort.InferenceSession>>()

ort.env.wasm.numThreads = 1

function getSession(model: MedicalModel): Promise<ort.InferenceSession> {
  const existing = sessions.get(model.id)
  if (existing) return existing

  const loading = ort.InferenceSession.create(model.file, {
    executionProviders: ['wasm'],
  }).catch((error: unknown) => {
    sessions.delete(model.id)
    throw error
  })
  sessions.set(model.id, loading)
  return loading
}

async function decodeImage(file: File): Promise<Float32Array> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'none' })
  try {
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      throw new Error('أبعاد الصورة كبيرة جدًا للتحليل الآمن على هذا الجهاز.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('تعذر تجهيز الصورة للتحليل.')

    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height)
    return prepareImageTensor(data, bitmap.width, bitmap.height)
  } finally {
    bitmap.close()
  }
}

function softmax(logits: Float32Array | number[]): number[] {
  const max = Math.max(...logits)
  const exponentials = Array.from(logits, (value) => Math.exp(value - max))
  const total = exponentials.reduce((sum, value) => sum + value, 0)
  return exponentials.map((value) => value / total)
}

export async function classifyImage(
  file: File,
  modelId: ModelId,
): Promise<ClassPrediction[]> {
  const model = MEDICAL_MODELS.find(({ id }) => id === modelId)
  if (!model || model.kind !== 'image') throw new Error('النموذج المحدد غير متاح.')

  const [session, imageTensor] = await Promise.all([
    getSession(model),
    decodeImage(file),
  ])
  const input = new ort.Tensor('float32', imageTensor, [1, 3, 224, 224])
  const output = await session.run({ [session.inputNames[0]]: input })
  const logits = output[session.outputNames[0]].data
  if (!(logits instanceof Float32Array) || logits.length !== model.classes.length) {
    throw new Error('صيغة نتيجة النموذج غير متوافقة مع أسماء الفئات.')
  }

  const probabilities = softmax(logits)
  return model.classes
    .map((label, index) => ({ label, score: probabilities[index] }))
    .sort((left, right) => right.score - left.score)
}
