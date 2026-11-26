import { useMemo, useState } from 'react'
import { ArrowUpLeft, BookOpen, HeartPulse, MessageCircle, Pill, ScanLine, Search, Stethoscope } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { UNAVAILABLE_TOOLS, MEDICAL_CHAT_TOOLS } from '../medicalTools'

type Category = 'all' | 'models' | 'gemini' | 'upcoming'

const icons = [MessageCircle, Stethoscope, BookOpen, Pill, ScanLine, ScanLine]

export function EncyclopediaPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const items = useMemo(() => [
    ...MEDICAL_CHAT_TOOLS.map((tool, index) => ({
      ...tool,
      upcoming: false,
      icon: icons[index] ?? HeartPulse,
    })),
    ...UNAVAILABLE_TOOLS.map((tool) => ({
      ...tool,
      upcoming: true,
      kind: 'upcoming' as const,
      icon: HeartPulse,
    })),
  ], [])
  const filtered = items.filter((item) => {
    const text = `${t(item.nameKey)} ${t(item.descriptionKey)}`.toLowerCase()
    const matchesCategory =
      category === 'all' ||
      (category === 'models' && (item.kind === 'image' || item.kind === 'form')) ||
      (category === 'gemini' && item.kind === 'gemini') ||
      (category === 'upcoming' && item.upcoming)
    return matchesCategory && text.includes(query.toLowerCase())
  })

  return (
    <div className="encyclopedia-page">
      <header className="library-header">
        <h1>{t('libraryTitle')}</h1>
        <p>{t('libraryHint')}</p>
      </header>

      <label className="search-field">
        <Search size={19} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchTools')} aria-label={t('searchTools')} />
      </label>

      <div className="filter-row" aria-label={t('toolFilters')}>
        {([
          ['all', t('allTools')],
          ['models', t('filterModels')],
          ['gemini', t('filterGemini')],
          ['upcoming', t('libraryComingSoon')],
        ] as const).map(([value, label]) => (
          <button className={`filter-chip ${category === value ? 'active' : ''}`} type="button" key={value} onClick={() => setCategory(value)}>{label}</button>
        ))}
      </div>

      <div className="tool-library-grid">
        {filtered.map((item) => {
          const Icon = item.icon
          const content = (
            <>
              <span className="tool-library-icon"><Icon size={22} /></span>
              <div className="tool-card-content">
                <span className={`tool-status ${item.upcoming ? 'upcoming' : 'active'}`}>
                  {item.upcoming ? t('libraryComingSoon') : t('libraryActive')}
                </span>
                <h2>{t(item.nameKey)}</h2>
                <p>{t(item.descriptionKey)}</p>
                <span className="tool-card-action">{item.upcoming ? t('toolComingSoon') : t('featureAction')} <ArrowUpLeft size={15} /></span>
              </div>
            </>
          )
          return item.kind === 'upcoming' ? (
            <article className="tool-library-card disabled" key={item.nameKey}>{content}</article>
          ) : (
            <Link className="tool-library-card" to={`/encyclopedia/${item.id}`} key={item.id}>{content}</Link>
          )
        })}
      </div>

      <aside className="library-privacy-note">
        <ShieldCheckIcon />
        <div><strong>{t('libraryDataTitle')}</strong><p>{t('libraryDataBody')}</p></div>
      </aside>
    </div>
  )
}

function ShieldCheckIcon() {
  return <HeartPulse size={20} aria-hidden="true" />
}
