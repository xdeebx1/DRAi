import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { SeoMetadata } from './components/SeoMetadata'
import { AboutPage } from './pages/AboutPage'
import { DoctorPage } from './pages/DoctorPage'
import { EncyclopediaPage } from './pages/EncyclopediaPage'
import { GuidelinesPage } from './pages/GuidelinesPage'
import { HomePage } from './pages/HomePage'
import { MedicalToolPage } from './pages/MedicalToolPage'

export default function App() {
  return (
    <BrowserRouter>
      <SeoMetadata />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="/chat" element={<DoctorPage />} />
          <Route path="/doctor" element={<Navigate to="/chat" replace />} />
          <Route path="/encyclopedia" element={<EncyclopediaPage />} />
          <Route path="/encyclopedia/:slug" element={<MedicalToolPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
