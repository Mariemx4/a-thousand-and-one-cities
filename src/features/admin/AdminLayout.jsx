import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi } from '../../hooks/useApi.js'
import { Icon } from '../../ui/Icon.jsx'
import { Spinner } from '../../ui/kit.jsx'
import { useToast } from '../../ui/Toast.jsx'

/** The library desk: a quiet workspace with a sidebar (top tabs on phones). */
export default function AdminLayout() {
  const location = useLocation()
  const { data: editor, loading } = useApi(() => api.editorAuth.me(), [])
  if (loading) return <div className="page-loading"><Spinner label="Checking your session" /></div>
  if (!editor) return <Navigate to={`/admin/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Desk editor={editor} />
}

function Desk({ editor }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data } = useApi(() => api.overview.get(), [])
  const signOut = async () => {
    await api.editorAuth.signOut()
    navigate('/admin/login', { replace: true })
  }
  const reset = async () => {
    if (!window.confirm('Reset all demo data? Submissions and edits made in this browser will be replaced by the sample data.')) return
    await api.resetDemo()
    toast('Demo data reset.')
  }
  const c = data?.counts
  const areas = [
    { to: '/admin', end: true, label: 'Overview', icon: 'grid' },
    { to: '/admin/library', label: 'Library', icon: 'book', count: c?.drafts, countLabel: 'drafts' },
    { to: '/admin/stories', label: 'Story submissions', icon: 'story', count: c?.stories, countLabel: 'awaiting review' },
    { to: '/admin/suggestions', label: 'City suggestions', icon: 'pin', count: c?.suggestions, countLabel: 'awaiting review' },
    { to: '/admin/inbox', label: 'Contact inbox', icon: 'inbox', count: c?.messages, countLabel: 'open' },
    { to: '/admin/accounts', label: 'Accounts', icon: 'users' },
  ]
  return (
    <div className="adm">
      <aside className="adm-side" aria-label="Admin">
        <NavLink to="/admin" className="adm-brand" end>
          <img src="/media/alf-madina-logo.png" alt="" />
          <div><b lang="ar">ألف مدينة ومدينة</b><span>Library desk</span></div>
        </NavLink>
        <nav className="adm-nav">
          {areas.map((a) => (
            <NavLink key={a.to} to={a.to} end={a.end}>
              <Icon name={a.icon} size={16} />
              <span>{a.label}</span>
              {a.count ? <em aria-label={`${a.count} ${a.countLabel}`}>{a.count}</em> : null}
            </NavLink>
          ))}
        </nav>
        <div className="adm-who">
          <span className="avatar-dot">{editor.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
          <span className="adm-who-text"><b>{editor.displayName}</b><small>{editor.email}</small></span>
          <div className="adm-who-actions">
            <button className="adm-link" onClick={signOut}>Sign out</button>
            <button className="adm-link" onClick={reset}>Reset demo data</button>
            <a className="adm-link" href="/" target="_blank" rel="noreferrer">View website ↗</a>
          </div>
        </div>
      </aside>
      <div className="adm-main">
        <Outlet />
      </div>
    </div>
  )
}
