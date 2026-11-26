import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen, BookOpenCheck, ClipboardCheck, HeartPulse, Info,
  MessageSquarePlus, ScanLine,
} from 'lucide-react'

export function Layout() {
  const { t, i18n } = useTranslation()
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith('ar')
  const location = useLocation()
  const isChatRoute = location.pathname === '/chat'
  const imageAnalysisActive =
    isChatRoute && new URLSearchParams(location.search).get('tool') === 'covid-chest-xray'
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`)

  useEffect(() => {
    document.documentElement.lang = isArabic ? 'ar' : 'en'
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
    localStorage.setItem('sana-language', isArabic ? 'ar' : 'en')
  }, [isArabic, location.pathname])

  return (
    <div className={`app-shell premium-app-shell ${isChatRoute ? 'chat-mode' : ''}`}>
      <aside className="premium-rail">
        <Link
          className="rail-brand"
          to="/"
          aria-label={t('navHome')}
          title={t('navHome')}
        >
          <span className="rail-brand-mark" aria-hidden="true">س</span>
          <span className="rail-brand-copy">
            <strong>{isArabic ? 'سَنا' : 'Sana'}</strong>
            <small>{t('homePill')}</small>
          </span>
        </Link>
        <div className="rail-section-label">{isArabic ? 'القائمة الرئيسية' : 'MAIN MENU'}</div>
        <nav className="rail-nav" aria-label={isArabic ? 'التنقل الرئيسي' : 'Primary navigation'}>
          <Link
            className={`rail-link ${isChatRoute && !imageAnalysisActive ? 'active' : ''}`}
            to="/chat"
          >
            <span className="rail-link-icon"><MessageSquarePlus size={18} /></span>
            <span className="rail-link-label">{t('newChat')}</span>
          </Link>
          <Link
            className={`rail-link ${isActive('/encyclopedia') ? 'active' : ''}`}
            to="/encyclopedia"
          >
            <span className="rail-link-icon"><BookOpen size={18} /></span>
            <span className="rail-link-label">{t('navLibrary')}</span>
          </Link>
          <Link
            className={`rail-link ${imageAnalysisActive ? 'active' : ''}`}
            to="/chat?tool=covid-chest-xray"
          >
            <span className="rail-link-icon"><ScanLine size={18} /></span>
            <span className="rail-link-label">{t('libraryCategoryImage')}</span>
          </Link>
          <Link
            className={`rail-link ${isActive('/guidelines') ? 'active' : ''}`}
            to="/guidelines"
          >
            <span className="rail-link-icon"><BookOpenCheck size={18} /></span>
            <span className="rail-link-label">{t('navGuidelines')}</span>
          </Link>
          <Link
            className={`rail-link ${isActive('/clinical-review') ? 'active' : ''}`}
            to="/clinical-review"
          >
            <span className="rail-link-icon"><ClipboardCheck size={18} /></span>
            <span className="rail-link-label">{t('navClinicalReview')}</span>
          </Link>
        </nav>
        <div className="rail-bottom">
          <div className="rail-privacy-note">
            <span className="rail-privacy-icon"><HeartPulse size={18} /></span>
            <span>{isArabic ? 'معلومات صحية بخصوصية' : 'Private health information'}</span>
          </div>
          <Link
            className={`rail-link ${isActive('/about') ? 'active' : ''}`}
            to="/about"
          >
            <span className="rail-link-icon"><Info size={18} /></span>
            <span className="rail-link-label">{t('navAbout')}</span>
          </Link>
        </div>
      </aside>
      <main className="premium-page-content"><Outlet /></main>
    </div>
  )
}
