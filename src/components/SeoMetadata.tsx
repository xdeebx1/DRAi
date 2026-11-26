import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const pageKeys: Record<string, { title: string; description: string }> = {
  '/': { title: 'shareTitle', description: 'shareDescription' },
  '/chat': { title: 'doctorTitle', description: 'homeCopy' },
  '/encyclopedia': { title: 'libraryTitle', description: 'libraryHint' },
  '/about': { title: 'aboutTitle', description: 'aboutBody' },
  '/clinical-review': { title: 'clinicalReviewTitle', description: 'clinicalReviewIntro' },
  '/guidelines': { title: 'guidelinesTitle', description: 'guidelinesIntro' },
}

function updateMeta(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.name = name
    document.head.append(element)
  }
  element.content = content
}

export function SeoMetadata() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()

  useEffect(() => {
    const keys = pageKeys[pathname] ?? pageKeys['/']
    const title = t(keys.title)
    const description = t(keys.description)
    document.title = `${title} | ${i18n.language.startsWith('ar') ? 'ميديكس' : 'Medix'}`
    updateMeta('description', description)
    updateMeta('og:title', document.title)
    updateMeta('og:description', description)
    updateMeta('twitter:title', document.title)
    updateMeta('twitter:description', description)
  }, [i18n.language, pathname, t])

  return null
}
