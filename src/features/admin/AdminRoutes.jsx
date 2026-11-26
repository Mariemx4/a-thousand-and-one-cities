import { Route, Routes } from 'react-router-dom'
import AdminLayout from './AdminLayout.jsx'
import AdminLoginPage from './AdminLoginPage.jsx'
import OverviewPage from './overview/OverviewPage.jsx'
import LibraryPage from './library/LibraryPage.jsx'
import StoriesPage from './stories/StoriesPage.jsx'
import SuggestionsPage from './suggestions/SuggestionsPage.jsx'
import InboxPage from './inbox/InboxPage.jsx'
import AccountsPage from './accounts/AccountsPage.jsx'

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="stories/:id" element={<StoriesPage />} />
        <Route path="suggestions" element={<SuggestionsPage />} />
        <Route path="suggestions/:id" element={<SuggestionsPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox/:id" element={<InboxPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountsPage />} />
      </Route>
    </Routes>
  )
}
