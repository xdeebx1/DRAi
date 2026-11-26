import type { MedicalToolId } from './server/geminiCore'

export interface MedicalChatTool {
  id: MedicalToolId
  nameKey: string
  descriptionKey: string
  kind: 'gemini' | 'image' | 'form'
}

export const MEDICAL_CHAT_TOOLS: MedicalChatTool[] = [
  {
    id: 'health-chat',
    nameKey: 'toolHealthChat',
    descriptionKey: 'toolHealthChatDescription',
    kind: 'gemini',
  },
  {
    id: 'symptom-guidance',
    nameKey: 'toolSymptomGuidance',
    descriptionKey: 'toolSymptomGuidanceDescription',
    kind: 'gemini',
  },
  {
    id: 'lab-explanation',
    nameKey: 'toolLabExplanation',
    descriptionKey: 'toolLabExplanationDescription',
    kind: 'gemini',
  },
  {
    id: 'medication-information',
    nameKey: 'toolMedicationInformation',
    descriptionKey: 'toolMedicationInformationDescription',
    kind: 'gemini',
  },
  {
    id: 'covid-chest-xray',
    nameKey: 'toolCovidXray',
    descriptionKey: 'toolCovidXrayDescription',
    kind: 'image',
  },
  {
    id: 'tuberculosis-chest-xray',
    nameKey: 'toolTuberculosisXray',
    descriptionKey: 'toolTuberculosisXrayDescription',
    kind: 'image',
  },
  {
    id: 'skin-lesions',
    nameKey: 'toolSkinModel',
    descriptionKey: 'toolSkinModelDescription',
    kind: 'image',
  },
  {
    id: 'diabetes-risk',
    nameKey: 'toolDiabetesModel',
    descriptionKey: 'toolDiabetesModelDescription',
    kind: 'form',
  },
  {
    id: 'heart-risk',
    nameKey: 'toolHeartModel',
    descriptionKey: 'toolHeartModelDescription',
    kind: 'form',
  },
  {
    id: 'kidney-risk',
    nameKey: 'toolKidneyModel',
    descriptionKey: 'toolKidneyModelDescription',
    kind: 'form',
  },
  {
    id: 'liver-disease',
    nameKey: 'toolLiverModel',
    descriptionKey: 'toolLiverModelDescription',
    kind: 'form',
  },
  {
    id: 'symptom-classifier',
    nameKey: 'toolSymptomsModel',
    descriptionKey: 'toolSymptomsModelDescription',
    kind: 'form',
  },
]

export const UNAVAILABLE_TOOLS = [
  { nameKey: 'toolSepsisUnavailable', descriptionKey: 'toolSepsisUnavailableDescription' },
  { nameKey: 'toolDdxUnavailable', descriptionKey: 'toolDdxUnavailableDescription' },
]

export function findMedicalTool(id: string): MedicalChatTool | undefined {
  return MEDICAL_CHAT_TOOLS.find((tool) => tool.id === id)
}

export function isImageTool(id: MedicalToolId): boolean {
  return MEDICAL_CHAT_TOOLS.some((tool) => tool.id === id && tool.kind === 'image')
}

export function isFormTool(id: MedicalToolId): boolean {
  return MEDICAL_CHAT_TOOLS.some((tool) => tool.id === id && tool.kind === 'form')
}
