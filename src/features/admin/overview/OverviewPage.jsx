import { Link } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../../ui/kit.jsx'
import { timeAgo } from '../../../ui/format.js'

const TARGET_LINK = {
  story: (id) => `/admin/stories/${id}`,
  suggestion: (id) => `/admin/suggestions/${id}`,
  message: (id) => `/admin/inbox/${id}`,
  account: (id) => `/admin/accounts/${id}`,
  volume: (id) => `/admin/library?node=volume:${id}`,
  chapter: (id) => `/admin/library?node=chapter:${id}`,
  section: (id) => `/admin/library?node=section:${id}`,
  page: (id) => `/admin/library?node=page:${id}`,
}

export default function OverviewPage() {
  useTitle('Overview · Admin')
  const { data, error, reload } = useApi(() => api.overview.get(), [])
  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="adm-page">
      <header className="adm-head">
        <span className="adm-eyebrow">Overview</span>
        <h1>Good to see you at the desk.</h1>
        <p className="adm-muted">What needs attention across the library today.</p>
      </header>

      {!data ? <Skeleton lines={6} /> : (
        <>
          <div className="stat-grid">
            <Stat to="/admin/stories" n={data.counts.stories} label="Stories awaiting review" />
            <Stat to="/admin/suggestions" n={data.counts.suggestions} label="City suggestions awaiting review" />
            <Stat to="/admin/inbox" n={data.counts.messages} label="Unread or open messages" />
            <Stat to="/admin/library" n={data.counts.drafts} label="Draft items in the library" />
          </div>

          <div className="overview-grid">
            <section className="panel">
              <h2>Awaiting review</h2>
              {data.awaitingStories.length + data.awaitingSuggestions.length === 0 ? <EmptyState title="Nothing waiting. Well done." /> : (
                <ul className="link-list">
                  {data.awaitingStories.map((s) => <Row key={s.id} to={TARGET_LINK.story(s.id)} title={s.title} sub="Story" status={s.status} at={s.createdAt} />)}
                  {data.awaitingSuggestions.map((s) => <Row key={s.id} to={TARGET_LINK.suggestion(s.id)} title={`${s.city}, ${s.country}`} sub="City suggestion" status={s.status} at={s.createdAt} />)}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Messages</h2>
              {data.openMessages.length === 0 ? <EmptyState title="Inbox zero." /> : (
                <ul className="link-list">
                  {data.openMessages.map((m) => <Row key={m.id} to={TARGET_LINK.message(m.id)} title={m.subject} sub={m.sender.name} status={m.status} at={m.createdAt} />)}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Draft content</h2>
              {data.drafts.length === 0 ? <EmptyState title="No drafts." /> : (
                <ul className="link-list">
                  {data.drafts.map((d) => <Row key={`${d.kind}:${d.id}`} to={TARGET_LINK[d.kind](d.id)} title={d.label} sub={d.kind[0].toUpperCase() + d.kind.slice(1)} status="draft" />)}
                </ul>
              )}
            </section>

            <section className="panel">
              <h2>Recent activity</h2>
              <ul className="activity">
                {data.activity.map((a) => (
                  <li key={a.id}>
                    <span><b>{a.actor}</b> {a.verb} {a.target?.id && TARGET_LINK[a.target.kind] ? <Link to={TARGET_LINK[a.target.kind](a.target.id)}>{a.target.label}</Link> : <i>{a.target?.label}</i>}</span>
                    <time dateTime={a.at}>{timeAgo(a.at)}</time>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

const Stat = ({ to, n, label }) => (
  <Link className="stat" to={to}><b>{n}</b><span>{label}</span></Link>
)

const Row = ({ to, title, sub, status, at }) => (
  <li>
    <Link to={to} className="link-row">
      <span><b>{title}</b><small>{sub}</small></span>
      <span className="q-side"><StatusBadge status={status} />{at && <time dateTime={at}>{timeAgo(at)}</time>}</span>
    </Link>
  </li>
)
