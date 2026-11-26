import modelSchemas from './modelSchemas.json'
import type { ModelId } from './modelRegistry'

const SCHEMA_KEYS: Partial<Record<ModelId, keyof typeof modelSchemas>> = {
  'diabetes-risk': 'diabetes',
  'heart-risk': 'heart',
  'kidney-risk': 'kidney',
  'liver-disease': 'liver',
  'symptom-classifier': 'symptoms',
}

export type TabularModelSchema = (typeof modelSchemas)[keyof typeof modelSchemas]

export function getTabularInputSchema(modelId: ModelId): TabularModelSchema | undefined {
  const schemaKey = SCHEMA_KEYS[modelId]
  return schemaKey ? modelSchemas[schemaKey] : undefined
}
