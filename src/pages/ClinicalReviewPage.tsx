import { Activity, ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MEDICAL_MODELS, type MedicalModel, type ModelId } from '../modelRegistry'

const modelNames: Record<ModelId, { ar: string; en: string }> = {
  'covid-chest-xray': { ar: 'أشعة صدر · كوفيد-19', en: 'Chest X-ray · COVID-19' },
  'tuberculosis-chest-xray': { ar: 'أشعة صدر · السل', en: 'Chest X-ray · Tuberculosis' },
  'skin-lesions': { ar: 'تصنيف صور الجلد', en: 'Skin lesion classification' },
  'diabetes-risk': { ar: 'تصنيف بيانات السكري', en: 'Diabetes data classification' },
  'heart-risk': { ar: 'تصنيف بيانات القلب', en: 'Heart data classification' },
  'kidney-risk': { ar: 'تصنيف بيانات الكلى', en: 'Kidney data classification' },
  'liver-disease': { ar: 'تصنيف بيانات الكبد', en: 'Liver data classification' },
  'symptom-classifier': { ar: 'تصنيف ميزات الأعراض', en: 'Symptom feature classification' },
}

const modalityKeys: Record<MedicalModel['kind'], string> = {
  image: 'clinicalReviewModalityImage',
  tabular: 'clinicalReviewModalityTabular',
  symptoms: 'clinicalReviewModalitySymptoms',
}

const classLabelKeys: Record<string, string> = {
  COVID: 'modelClassCovid',
  Lung_Opacity: 'modelClassOpacity',
  Normal: 'modelClassNormal',
  'Viral Pneumonia': 'modelClassViral',
  Tuberculosis: 'modelClassTb',
}

const englishScopeNotes: Record<ModelId, string> = {
  'covid-chest-xray': 'Limited to the four labels in its source dataset; it does not assess conditions outside those labels.',
  'tuberculosis-chest-xray': 'Distinguishes its dataset’s normal and tuberculosis labels; it does not assess other conditions.',
  'skin-lesions': 'Research classifier for eight lesion classes; its output requires clinical assessment and is not a cancer diagnosis.',
  'diabetes-risk': 'Research classification only; the recorded positive-class performance is limited and is not a clinical risk estimate.',
  'heart-risk': 'Recorded test set contains 184 cases; this result is not a diagnosis or an exclusion of heart disease.',
  'kidney-risk': 'Recorded test set contains 80 cases; the reported accuracy requires independent validation.',
  'liver-disease': 'Recorded performance is limited; the output is not suitable for diagnosis or treatment decisions.',
  'symptom-classifier': 'Covers 527 labels with class imbalance; overall accuracy may not reflect performance on rare classes.',
}

function classLabel(label: string, t: (key: string) => string): string {
  const translationKey = classLabelKeys[label]
  return translationKey ? t(translationKey) : label.replaceAll('_', ' ')
}

export function ClinicalReviewPage() {
  const { t, i18n } = useTranslation()
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith('ar')
  const locale = isArabic ? 'ar' : 'en'
  const modalityCount = new Set(MEDICAL_MODELS.map(({ kind }) => kind)).size

  return (
    <div className="clinical-review-page">
      <header className="clinical-review-header">
        <div className="clinical-review-kicker">
          <span className="clinical-review-mark"><Activity size={19} aria-hidden="true" /></span>
          <span>{t('clinicalReviewKicker')}</span>
        </div>
        <h1>{t('clinicalReviewTitle')}</h1>
        <p>{t('clinicalReviewIntro')}</p>
        <div className="clinical-review-status">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>{t('clinicalReviewStatusLabel')}</span>
          <strong>{t('clinicalReviewStatus')}</strong>
        </div>
      </header>

      <section className="clinical-review-stats" aria-label={t('clinicalReviewTitle')}>
        <article>
          <span>{t('clinicalReviewModels')}</span>
          <strong>{new Intl.NumberFormat(locale).format(MEDICAL_MODELS.length)}</strong>
        </article>
        <article>
          <span>{t('clinicalReviewExecution')}</span>
          <strong>{t('clinicalReviewExecutionValue')}</strong>
        </article>
        <article>
          <span>{t('clinicalReviewModalities')}</span>
          <strong>{new Intl.NumberFormat(locale).format(modalityCount)}</strong>
        </article>
      </section>

      <section className="clinical-review-section" aria-labelledby="clinical-models-title">
        <div className="clinical-review-section-heading">
          <h2 id="clinical-models-title">{t('clinicalReviewInventoryTitle')}</h2>
          <p>{t('clinicalReviewInventoryIntro')}</p>
        </div>
        <div className="clinical-model-grid">
          {MEDICAL_MODELS.map((model) => (
            <article className="clinical-model-card" key={model.id}>
              <div className="clinical-model-card-top">
                <span className="clinical-modality">{t(modalityKeys[model.kind])}</span>
                <code>{model.id}</code>
              </div>
              <h3>{modelNames[model.id][isArabic ? 'ar' : 'en']}</h3>
              <div className="clinical-model-metric">
                <span>{t('clinicalReviewMetric')}</span>
                <strong>{new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(model.testAccuracy)}%</strong>
              </div>
              <div className="clinical-model-detail">
                <h4>{t('clinicalReviewClasses')}</h4>
                <ul className="clinical-class-list">
                  {model.classes.map((label) => (
                    <li key={label}>{classLabel(label, t)}</li>
                  ))}
                </ul>
              </div>
              <div className="clinical-model-detail clinical-model-scope">
                <h4>{t('clinicalReviewScope')}</h4>
                <p>{isArabic ? model.limitation : englishScopeNotes[model.id]}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="clinical-review-evidence">
        <div className="clinical-review-section-heading">
          <span className="clinical-review-section-icon"><ClipboardCheck size={19} aria-hidden="true" /></span>
          <h2>{t('clinicalReviewValidationTitle')}</h2>
          <p>{t('clinicalReviewValidationIntro')}</p>
        </div>
        <ol>
          {[1, 2, 3, 4, 5].map((item) => (
            <li key={item}>{t(`clinicalReviewValidation${item}`)}</li>
          ))}
        </ol>
        <div className="clinical-review-evidence-status">
          <strong>{t('clinicalReviewEvidenceTitle')}</strong>
          <p>{t('clinicalReviewEvidenceBody')}</p>
        </div>
      </section>

      <section className="clinical-review-privacy">
        <span className="clinical-review-section-icon"><LockKeyhole size={19} aria-hidden="true" /></span>
        <div>
          <h2>{t('clinicalReviewPrivacyTitle')}</h2>
          <p>{t('clinicalReviewPrivacyBody')}</p>
          <div className="clinical-review-links">
            <Link to="/guidelines">{t('clinicalReviewPrivacyLink')}</Link>
            <Link to="/encyclopedia">{t('clinicalReviewLibraryLink')}</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
