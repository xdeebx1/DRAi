import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { SeoMetadata } from './components/SeoMetadata'

const AboutPage = lazy(() => import('./pages/AboutPage').then(({ AboutPage }) => ({ default: AboutPage })))
const ClinicalReviewPage = lazy(() => import('./pages/ClinicalReviewPage').then(({ ClinicalReviewPage }) => ({ default: ClinicalReviewPage })))
const DoctorPage = lazy(() => import('./pages/DoctorPage').then(({ DoctorPage }) => ({ default: DoctorPage })))
const EncyclopediaPage = lazy(() => import('./pages/EncyclopediaPage').then(({ EncyclopediaPage }) => ({ default: EncyclopediaPage })))
const GuidelinesPage = lazy(() => import('./pages/GuidelinesPage').then(({ GuidelinesPage }) => ({ default: GuidelinesPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(({ HomePage }) => ({ default: HomePage })))
const MedicalToolPage = lazy(() => import('./pages/MedicalToolPage').then(({ MedicalToolPage }) => ({ default: MedicalToolPage })))

function RouteLoading() {
  const { t } = useTranslation()
  return <div className="route-loading" role="status">{t('pageLoading')}</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <SeoMetadata />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/chat" element={<DoctorPage />} />
            <Route path="/doctor" element={<Navigate to="/chat" replace />} />
            <Route path="/encyclopedia" element={<EncyclopediaPage />} />
            <Route path="/encyclopedia/:slug" element={<MedicalToolPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/clinical-review" element={<ClinicalReviewPage />} />
            <Route path="/guidelines" element={<GuidelinesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
