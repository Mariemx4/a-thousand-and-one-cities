import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../ui/Toast.jsx'
import { Spinner } from '../ui/kit.jsx'
import SiteLayout from '../features/layout/SiteLayout.jsx'
import HomePage from '../features/home/HomePage.jsx'
import ReaderRoute from '../features/reader/ReaderRoute.jsx'
import NotFound from './NotFound.jsx'

// Secondary pages and the whole admin are split into their own chunks.
const OurStoryPage = lazy(() => import('../features/about/OurStoryPage.jsx'))
const ShareStoryPage = lazy(() => import('../features/forms/ShareStoryPage.jsx'))
const SuggestCityPage = lazy(() => import('../features/forms/SuggestCityPage.jsx'))
const ContactPage = lazy(() => import('../features/forms/ContactPage.jsx'))
const AccountPage = lazy(() => import('../features/account/AccountPage.jsx'))
const AdminRoutes = lazy(() => import('../features/admin/AdminRoutes.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Suspense fallback={<div className="page-loading"><Spinner /></div>}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="books/:volumeSlug" element={<ReaderRoute />} />
              <Route path="books/:volumeSlug/:chapterSlug" element={<ReaderRoute />} />
              <Route path="our-story" element={<OurStoryPage />} />
              <Route path="share-a-story" element={<ShareStoryPage />} />
              <Route path="suggest-a-city" element={<SuggestCityPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="admin/*" element={<AdminRoutes />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  )
}
