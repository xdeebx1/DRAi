import { HeartPulse, MessageCircle, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AboutPage() {
  const { t } = useTranslation()
  const sections = [
    { icon: HeartPulse, title: t('aboutTitle'), body: t('aboutBody') },
    { icon: MessageCircle, title: t('howTitle'), body: t('aboutHowBody') },
    { icon: ShieldCheck, title: t('recognizeTitle'), body: t('recognizeBody') },
    { icon: ShieldCheck, title: t('privacyTitle'), body: t('privacyBody') },
  ]

  return (
    <div className="about-page">
      <header className="about-header">
        <p className="about-kicker">MEDIX / ميديكس</p>
        <h1>{t('aboutTitle')}</h1>
      </header>
      <div className="about-grid">
        {sections.map(({ icon: Icon, title, body }) => (
          <section key={title}>
            <span className="about-icon"><Icon size={21} /></span>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
