import { ArrowLeft, ArrowRight, HeartPulse, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MEDICAL_MODELS } from '../modelRegistry'
import { findMedicalTool } from '../medicalTools'

function labelForClass(label: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    COVID: 'modelClassCovid',
    Lung_Opacity: 'modelClassOpacity',
    Normal: 'modelClassNormal',
    'Viral Pneumonia': 'modelClassViral',
    Tuberculosis: 'modelClassTb',
  }
  return t(labels[label] ?? label)
}

export function MedicalToolPage() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const tool = findMedicalTool(slug)
  const model = MEDICAL_MODELS.find((item) => item.id === slug)
  const isArabic = i18n.language.startsWith('ar')

  if (!tool) {
    return (
      <div className="detail-not-found">
        <h1>{t('modelNotFound')}</h1>
        <Link className="button primary" to="/encyclopedia">{t('navLibrary')}</Link>
      </div>
    )
  }

  const Icon = model ? HeartPulse : ShieldCheck
  const title = t(tool.nameKey)
  const description = t(tool.descriptionKey)
  const limitation = model
    ? t(model.id === 'covid-chest-xray' ? 'limitCovid' : 'limitTb')
    : description
  const Arrow = isArabic ? ArrowLeft : ArrowRight

  return (
    <article className="detail-page">
      <div className="medical-detail-hero">
        <div className="medical-detail-icon"><Icon size={64} strokeWidth={1.4} /></div>
        <div className="detail-heading">
          <span className="status-pill healthy">{model ? t('modelLocalProcessing') : t('libraryCategoryGemini')}</span>
          <p>{model ? t('libraryCategoryImage') : t('libraryCategoryGemini')}</p>
          <h1>{title}</h1>
          <small>{description}</small>
        </div>
      </div>

      <div className="detail-grid">
        <section className="detail-section">
          <h2>{t('modelScope')}</h2>
          <p>{description}</p>
        </section>
        <section className="detail-section">
          <h2>{t('modelLimitation')}</h2>
          <p>{limitation}</p>
        </section>
        {model && (
          <>
            <section className="detail-section">
              <h2>{t('modelLabel')}</h2>
              <ul className="model-label-list">
                {model.classes.map((label) => <li key={label}>{labelForClass(label, t)}</li>)}
              </ul>
            </section>
            <section className="detail-section">
              <h2>{t('modelDatasetAccuracy')}</h2>
              <p className="model-metric">{model.testAccuracy}%</p>
              <p>{t('notClinical')}</p>
            </section>
          </>
        )}
      </div>

      <Link className="button primary medical-tool-start" to={`/chat?tool=${tool.id}`}>
        {t('modelStart')} <Arrow size={17} />
      </Link>
    </article>
  )
}
