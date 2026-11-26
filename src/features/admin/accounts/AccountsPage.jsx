import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useAction } from '../../../hooks/useAction.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { categoryName } from '../../../domain/constants.js'
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../../ui/kit.jsx'
import { formatDate, timeAgo } from '../../../ui/format.js'
import { BackToQueue } from '../shared/review.jsx'

export default function AccountsPage() {
  useTitle('Accounts · Admin')
  const { id } = useParams()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const { data: rows, error, reload } = useApi(() => api.accounts.list({ q, status: status || undefined }), [q, status])

  return (
    <div className={`queue-page ${id ? 'has-detail' : ''}`}>
      <section className="queue" aria-label="Accounts">
        <header className="adm-head compact">
          <span className="adm-eyebrow">Accounts</span>
          <h1>People</h1>
        </header>
        <div className="queue-tools">
          <label htmlFor="acc-q" className="sr-only">Search accounts</label>
          <input id="acc-q" className="input" type="search" placeholder="Search name, email, phone, organization…" value={q} onChange={(e) => setQ(e.target.value)} />
          <label htmlFor="acc-status" className="sr-only">Status</label>
          <select id="acc-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        {error ? <ErrorState error={error} onRetry={reload} /> : !rows ? <Skeleton lines={6} /> : rows.length ? (
          <ul className="queue-list">
            {rows.map((a) => (
              <li key={a.id}>
                <Link className={`queue-row ${a.id === id ? 'active' : ''}`} to={`/admin/accounts/${a.id}`}>
                  <span className="q-main"><b>{a.displayName}</b><span>{a.email} · {a.phone}{a.organization ? ` · ${a.organization}` : ''}</span></span>
                  <span className="q-side"><StatusBadge status={a.status} /><small>{a.role === 'editor' ? 'Editor' : `${a.storyCount} stories · ${a.suggestionCount} cities`}</small></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="No accounts match." />}
      </section>
      <section className="detail" aria-label="Account">
        {id ? <AccountDetail id={id} /> : <EmptyState title="Choose an account." />}
      </section>
    </div>
  )
}

function AccountDetail({ id }) {
  const { data: a, error, reload } = useApi(() => api.accounts.get(id), [id])
  const [run, pending] = useAction()
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!a) return <Skeleton lines={8} />
  const toggle = () => {
    const next = a.status === 'active' ? 'suspended' : 'active'
    if (next === 'suspended' && !window.confirm(`Suspend ${a.displayName}? They will not be able to sign in or submit.`)) return
    run(() => api.accounts.setStatus(a.id, next), { success: next === 'active' ? 'Account reactivated.' : 'Account suspended.' })
  }
  return (
    <article className="review">
      <BackToQueue to="/admin/accounts" label="All accounts" />
      <header className="review-head">
        <div>
          <span className="adm-eyebrow">{a.role === 'editor' ? 'Editor' : 'Contributor'} · since {formatDate(a.createdAt)}</span>
          <h2>{a.displayName}</h2>
          <p className="adm-muted">{a.email} · {a.phone || 'no phone'}</p>
          <p className="adm-muted">{[a.organization, [a.city, a.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
          {a.bio && <p className="account-bio">{a.bio}</p>}
        </div>
        <StatusBadge status={a.status} />
      </header>
      {a.role !== 'editor' && (
        <div className="review-actions">
          <button className={`adm-btn ghost ${a.status === 'active' ? 'danger' : ''}`} onClick={toggle} disabled={pending}>
            {a.status === 'active' ? 'Suspend account' : 'Reactivate account'}
          </button>
          <span className="adm-muted">Demo status only. Access control arrives with the backend.</span>
        </div>
      )}
      <div className="review-grid">
        <div className="review-main">
          <section className="panel">
            <h3>Stories ({a.stories.length})</h3>
            {a.stories.length ? (
              <ul className="link-list">
                {a.stories.map((s) => <li key={s.id}><Link className="link-row" to={`/admin/stories/${s.id}`}><span><b>{s.title}</b><small>{categoryName(s.category)} · {formatDate(s.createdAt)}</small></span><StatusBadge status={s.status} /></Link></li>)}
              </ul>
            ) : <p className="adm-muted">No stories.</p>}
          </section>
          <section className="panel">
            <h3>City suggestions ({a.suggestions.length})</h3>
            {a.suggestions.length ? (
              <ul className="link-list">
                {a.suggestions.map((s) => <li key={s.id}><Link className="link-row" to={`/admin/suggestions/${s.id}`}><span><b>{s.city}, {s.country}</b><small>{formatDate(s.createdAt)}</small></span><StatusBadge status={s.status} /></Link></li>)}
              </ul>
            ) : <p className="adm-muted">No suggestions.</p>}
          </section>
          {a.messages.length > 0 && (
            <section className="panel">
              <h3>Messages ({a.messages.length})</h3>
              <ul className="link-list">
                {a.messages.map((m) => <li key={m.id}><Link className="link-row" to={`/admin/inbox/${m.id}`}><span><b>{m.subject}</b><small>{formatDate(m.createdAt)}</small></span><StatusBadge status={m.status} /></Link></li>)}
              </ul>
            </section>
          )}
        </div>
        <aside className="review-side">
          <section className="panel">
            <h3>Recent activity</h3>
            {a.activity.length ? (
              <ul className="activity">{a.activity.map((x) => <li key={x.id}><span>{x.verb} <i>{x.target?.label}</i></span><time dateTime={x.at}>{timeAgo(x.at)}</time></li>)}</ul>
            ) : <p className="adm-muted">No recorded activity.</p>}
          </section>
        </aside>
      </div>
    </article>
  )
}
