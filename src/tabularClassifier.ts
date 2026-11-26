import * as ort from 'onnxruntime-web/wasm'
import modelSchemas from './modelSchemas.json'
import { MEDICAL_MODELS, type ModelId } from './modelRegistry'
import type { ClassPrediction } from './imageClassifier'

const SCHEMA_KEYS: Partial<Record<ModelId, keyof typeof modelSchemas>> = {
  'diabetes-risk': 'diabetes',
  'heart-risk': 'heart',
  'kidney-risk': 'kidney',
  'liver-disease': 'liver',
  'symptom-classifier': 'symptoms',
}

export type TabularModelSchema = (typeof modelSchemas)[keyof typeof modelSchemas]

const sessions = new Map<ModelId, Promise<ort.InferenceSession>>()

ort.env.wasm.numThreads = 1

export function getTabularInputSchema(modelId: ModelId): TabularModelSchema | undefined {
  const schemaKey = SCHEMA_KEYS[modelId]
  return schemaKey ? modelSchemas[schemaKey] : undefined
}

function getSession(modelId: ModelId, file: string): Promise<ort.InferenceSession> {
  const existing = sessions.get(modelId)
  if (existing) return existing

  const loading = ort.InferenceSession.create(file, {
    executionProviders: ['wasm'],
  }).catch((error: unknown) => {
    sessions.delete(modelId)
    throw error
  })
  sessions.set(modelId, loading)
  return loading
}

function buildFeatureVector(
  modelId: ModelId,
  values: Record<string, string>,
): Float32Array {
  const schema = getTabularInputSchema(modelId)
  if (!schema) throw new Error('النموذج المحدد لا يقبل بيانات جدولية.')
  const features: number[] = []

  if (schema.kind === 'binaryFeatures') {
    features.push(...schema.featureNames.map((name) => values[name] === '1' ? 1 : 0))
  } else {
    for (const name of schema.numericFeatures) {
      const rawValue = values[name]
      const value = rawValue === undefined || rawValue.trim() === '' ? Number.NaN : Number(rawValue)
      if (!Number.isFinite(value)) throw new Error(`أدخل قيمة رقمية صالحة للحقل ${name}.`)
      features.push(value)
    }

    features.push(...schema.missingIndicators.map(() => 0))

    for (const field of schema.categoricalFeatures) {
      const selected = values[field.name]
      if (!selected || !field.categories.includes(selected)) {
        throw new Error(`اختر قيمة صالحة للحقل ${field.name}.`)
      }
      features.push(...field.categories.map((category) => category === selected ? 1 : 0))
    }
  }

  if (features.length !== schema.inputSize) {
    throw new Error('مخطط مدخلات النموذج غير متوافق مع ملفه.')
  }

  return Float32Array.from(
    schema.zeroMeansMissing
      ? features.map((value) => value === 0 ? Number.NaN : value)
      : features,
  )
}

export async function classifyTabular(
  modelId: ModelId,
  values: Record<string, string>,
): Promise<ClassPrediction[]> {
  const model = MEDICAL_MODELS.find(({ id }) => id === modelId)
  const schema = getTabularInputSchema(modelId)
  if (!model || model.kind === 'image' || !schema) {
    throw new Error('النموذج المحدد غير متاح.')
  }

  const features = buildFeatureVector(modelId, values)
  const session = await getSession(modelId, schema.file)
  const output = await session.run({
    [session.inputNames[0]]: new ort.Tensor('float32', features, [1, schema.inputSize]),
  })
  const probabilityTensor = output[session.outputNames[1]]
  const probabilities = probabilityTensor?.data
  if (!(probabilities instanceof Float32Array) || probabilities.length !== schema.classes.length) {
    throw new Error('صيغة نتيجة النموذج غير متوافقة مع أسماء الفئات.')
  }

  return schema.classes
    .map((label, index) => ({ label, score: probabilities[index] }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
}
