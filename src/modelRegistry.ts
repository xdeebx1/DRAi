export type ModelId =
  | 'covid-chest-xray'
  | 'tuberculosis-chest-xray'
  | 'skin-lesions'
  | 'diabetes-risk'
  | 'heart-risk'
  | 'kidney-risk'
  | 'liver-disease'
  | 'symptom-classifier'

export interface MedicalModel {
  id: ModelId
  kind: 'image' | 'tabular' | 'symptoms'
  shortName: string
  description: string
  file: string
  classes: string[]
  testAccuracy: number
  limitation: string
}

export const MEDICAL_MODELS: MedicalModel[] = [
  {
    id: 'covid-chest-xray',
      kind: 'image',
      shortName: 'COVID-19',
    description: 'COVID-19، عتامة الرئة، طبيعي، التهاب رئوي فيروسي',
    file: '/models/covid19_radiography.onnx',
    classes: ['COVID', 'Lung_Opacity', 'Normal', 'Viral Pneumonia'],
    testAccuracy: 85.7,
    limitation:
      'مخصص لفئات مجموعة COVID-19 الظاهرة فقط. لا يشخّص السل أو الانخماص أو الأمراض غير الموجودة ضمن هذه الفئات.',
  },
  {
    id: 'tuberculosis-chest-xray',
    kind: 'image',
    shortName: 'Tuberculosis',
    description: 'طبيعي أو اشتباه بنمط السل في صور الأشعة',
    file: '/models/tb_chest_radiography.onnx',
    classes: ['Normal', 'Tuberculosis'],
    testAccuracy: 96.8,
    limitation:
      'مخصص للتمييز بين طبيعي والسل ضمن بياناته فقط، ولا يستبعد أمراضًا أخرى أو يغني عن قراءة اختصاصي الأشعة.',
  },
  {
    id: 'skin-lesions',
    kind: 'image',
    shortName: 'Skin lesions · 8 classes',
    description: 'تصنيف تجريبي لثماني فئات من صور الآفات الجلدية',
    file: '/models/skin_lesions_8class.onnx',
    classes: ['AK', 'BCC', 'BKL', 'DF', 'MEL', 'NV', 'SCC', 'VASC'],
    testAccuracy: 82.3,
    limitation:
      'نموذج تجريبي مدرّب على مجموعة محدودة من صور الجلد؛ لا يشخّص السرطان ولا يستبعده. يلزم تقييم طبيب جلدية لأي آفة مقلقة.',
  },
  {
    id: 'diabetes-risk',
    kind: 'tabular',
    shortName: 'Diabetes',
    description: 'تصنيف تجريبي اعتمادًا على بيانات صحية مدخلة',
    file: '/models/diabetes.onnx',
    classes: ['no_diabetes', 'diabetes'],
    testAccuracy: 91.3,
    limitation:
      'النتيجة البحثية لا تقدّر خطرًا طبيًا مؤكدًا؛ دقة الفئة الإيجابية المسجلة منخفضة نسبيًا ولا تصلح لاتخاذ قرار صحي.',
  },
  {
    id: 'heart-risk',
    kind: 'tabular',
    shortName: 'Heart disease',
    description: 'تصنيف تجريبي اعتمادًا على قياسات وبيانات قلبية',
    file: '/models/heart.onnx',
    classes: ['no_disease', 'disease'],
    testAccuracy: 86.4,
    limitation:
      'نتيجة بحثية من عينة اختبار صغيرة (184 حالة)، ولا تشخّص مرض القلب أو تستبعده.',
  },
  {
    id: 'kidney-risk',
    kind: 'tabular',
    shortName: 'Kidney disease',
    description: 'تصنيف تجريبي اعتمادًا على بيانات وفحوصات مدخلة',
    file: '/models/kidney.onnx',
    classes: ['no_kidney_disease', 'kidney_disease'],
    testAccuracy: 100,
    limitation:
      'الدقة المسجلة على 80 حالة اختبار فقط وليست تحققًا مستقلًا؛ لا تستخدم النتيجة لتشخيص مرض الكلى أو استبعاده.',
  },
  {
    id: 'liver-disease',
    kind: 'tabular',
    shortName: 'Liver disease',
    description: 'تصنيف تجريبي اعتمادًا على قياسات مخبرية مدخلة',
    file: '/models/liver.onnx',
    classes: ['liver_disease', 'no_liver_disease'],
    testAccuracy: 62.9,
    limitation:
      'أداء النموذج المسجل محدود؛ لا تستخدم النتيجة لاتخاذ قرار طبي أو لتفسير التحاليل دون مختص.',
  },
  {
    id: 'symptom-classifier',
    kind: 'symptoms',
    shortName: 'Symptoms · research model',
    description: 'نموذج بحثي واسع يصنّف مجموعات أعراض مدخلة',
    file: '/models/symptoms.onnx',
    classes: ['research_symptoms'],
    testAccuracy: 94,
    limitation:
      'يغطي 527 فئة مع تفاوت كبير في عدد الأمثلة لكل فئة؛ الدقة الإجمالية لا تعكس أداء الفئات النادرة ولا تمثل احتمالًا سريريًا.',
  },
]
