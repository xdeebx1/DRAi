import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Clock3, FileImage, GraduationCap, LayoutGrid,
  MessageSquarePlus, Search, Settings, Sparkles,
} from 'lucide-react'

export function Layout() {
  const { t, i18n } = useTranslation()
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith('ar')
  const location = useLocation()
  const isChatRoute = location.pathname === '/chat'
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    document.documentElement.lang = isArabic ? 'ar' : 'en'
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
    localStorage.setItem('mueen-language', isArabic ? 'ar' : 'en')
  }, [isArabic, location.pathname])

  return (
    <div className={`app-shell premium-app-shell ${isChatRoute ? 'chat-mode' : ''}`}>
      <aside className="premium-rail" aria-label={isArabic ? 'التنقل الرئيسي' : 'Primary navigation'}>
        <Link className="rail-brand" to="/" aria-label="Mueen">
          <Sparkles size={21} />
        </Link>
        <nav className="rail-nav">
          <Link
            className={`rail-icon ${isChatRoute ? 'active' : ''}`}
            to="/chat"
            aria-label={isArabic ? 'محادثة جديدة' : 'New chat'}
            title={isArabic ? 'محادثة جديدة' : 'New chat'}
          >
            <MessageSquarePlus size={18} />
          </Link>
          <button
            className="rail-icon"
            type="button"
            aria-label={isArabic ? 'بحث' : 'Search'}
            title={isArabic ? 'بحث' : 'Search'}
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>('.search-field input')
              input?.focus()
            }}
          >
            <Search size={18} />
          </button>
          <Link
            className={`rail-icon ${isActive('/encyclopedia') ? 'active' : ''}`}
            to="/encyclopedia"
            aria-label={t('navLibrary')}
            title={t('navLibrary')}
          >
            <LayoutGrid size={18} />
          </Link>
          <Link
            className="rail-icon"
            to="/chat?tool=covid-chest-xray"
            aria-label={t('libraryCategoryImage')}
            title={t('libraryCategoryImage')}
          >
            <FileImage size={18} />
          </Link>
          <button
            className="rail-icon"
            type="button"
            aria-label={isArabic ? 'سجل المحادثة' : 'Conversation history'}
            title={isArabic ? 'سجل المحادثة' : 'Conversation history'}
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
          >
            <Clock3 size={18} />
          </button>
          <Link
            className={`rail-icon ${isActive('/guidelines') ? 'active' : ''}`}
            to="/guidelines"
            aria-label={t('navGuidelines')}
            title={t('navGuidelines')}
          >
            <GraduationCap size={18} />
          </Link>
        </nav>
        <div className="rail-bottom">
          <Link
            className={`rail-icon ${isActive('/guidelines') ? 'active' : ''}`}
            to="/guidelines"
            aria-label={t('navGuidelines')}
            title={t('navGuidelines')}
          >
            <Settings size={18} />
          </Link>
          <Link
            className="rail-avatar"
            to="/about"
            aria-label={isArabic ? 'حسابي' : 'My account'}
            title={isArabic ? 'حسابي' : 'My account'}
          >
            م
          </Link>
        </div>
      </aside>
      <main className="premium-page-content"><Outlet /></main>
    </div>
  )
}
