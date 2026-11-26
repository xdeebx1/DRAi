import { BookOpenCheck, CircleAlert, FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const guidanceSections = [
  { icon: CircleAlert, title: 'guidelinesResultsTitle', body: 'guidelinesResultsBody' },
  { icon: FlaskConical, title: 'guidelinesScoreTitle', body: 'guidelinesScoreBody' },
  { icon: BookOpenCheck, title: 'guidelinesChatTitle', body: 'guidelinesChatBody' },
  { icon: ShieldCheck, title: 'guidelinesDataTitle', body: 'guidelinesDataBody' },
  { icon: LockKeyhole, title: 'guidelinesPrivacyTitle', body: 'guidelinesPrivacyBody' },
]

export function GuidelinesPage() {
  const { t } = useTranslation()

  return (
    <div className="guidelines-page">
      <header className="guidelines-header">
        <span className="guidelines-kicker">{t('guidelinesKicker')}</span>
        <h1>{t('guidelinesTitle')}</h1>
        <p>{t('guidelinesIntro')}</p>
      </header>

      <div className="guidelines-grid">
        {guidanceSections.map(({ icon: Icon, title, body }) => (
          <section className="guideline-card" key={title}>
            <span className="guideline-icon"><Icon size={20} aria-hidden="true" /></span>
            <h2>{t(title)}</h2>
            <p>{t(body)}</p>
          </section>
        ))}
      </div>

      <aside className="guidelines-note">
        <strong>{t('guidelinesUrgentTitle')}</strong>
        <p>{t('guidelinesUrgentBody')}</p>
      </aside>
    </div>
  )
}
