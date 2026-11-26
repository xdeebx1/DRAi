import { motion } from 'framer-motion'
import { BookOpen, HeartPulse, MessageCircle, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MEDICAL_MODELS } from '../modelRegistry'

export function HomePage() {
  const { t } = useTranslation()
  const features = [
    { href: '/chat?tool=covid-chest-xray', icon: ScanLine, title: t('featureImageTitle'), body: t('featureImageBody') },
    { href: '/chat', icon: MessageCircle, title: t('featureChatTitle'), body: t('featureChatBody') },
    { href: '/encyclopedia', icon: BookOpen, title: t('featureLibraryTitle'), body: t('featureLibraryBody') },
  ]

  return (
    <div className="home-page">
      <section className="home-hero">
        <motion.div
          className="home-copy"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <span className="assistant-pill"><Sparkles size={16} aria-hidden="true" />{t('homePill')}</span>
          <h1>{t('homeTitle1')}<br />{t('homeTitle2')}</h1>
          <p>{t('homeCopy')}</p>
          <div className="hero-actions">
            <Link className="button primary" to="/chat">{t('start')}</Link>
            <Link className="button secondary" to="/encyclopedia">{t('browse')}</Link>
          </div>
        </motion.div>

        <motion.aside
          className="home-showcase"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <div className="showcase-icon"><HeartPulse size={34} strokeWidth={1.6} aria-hidden="true" /></div>
          <span className="showcase-kicker">{t('homePanelKicker')}</span>
          <h2>{t('homePanelTitle')}</h2>
          <div className="showcase-stat">
            <strong>{MEDICAL_MODELS.length}</strong>
            <span>{t('homePanelNumberLabel')}</span>
          </div>
          <p>{t('homePanelCopy')}</p>
        </motion.aside>
      </section>

      <section className="home-features" aria-labelledby="home-features-title">
        <div className="home-features-heading">
          <span className="assistant-pill">{t('homeFeaturesKicker')}</span>
          <h2 id="home-features-title">{t('homeFeaturesTitle')}</h2>
          <p>{t('homeFeaturesCopy')}</p>
        </div>
        <div className="home-feature-grid">
          {features.map(({ href, icon: Icon, title, body }) => (
            <Link className="home-feature-card" to={href} key={title}>
              <span className="home-feature-icon"><Icon size={21} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className="home-feature-action">{t('featureAction')}</span>
            </Link>
          ))}
        </div>
        <p className="home-emergency"><ShieldCheck size={16} />{t('homeEmergency')}</p>
      </section>
    </div>
  )
}
