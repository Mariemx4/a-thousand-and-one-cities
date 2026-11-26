import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useAction } from '../../../hooks/useAction.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { SUGGESTION_STATUS } from '../../../domain/constants.js'
import { Dialog, EmptyState, ErrorState, Field, Skeleton, StatusBadge } from '../../../ui/kit.jsx'
import { formatDateTime, reference } from '../../../ui/format.js'
import { Icon } from '../../../ui/Icon.jsx'
import { BackToQueue, NotesPanel, QueueFilters, QueueRow, ReviewActions, Timeline } from '../shared/review.jsx'

const STATUSES = Object.values(SUGGESTION_STATUS)

export default function SuggestionsPage() {
  useTitle('City suggestions · Admin')
  const { id } = useParams()
  const [filter, setFilter] = useState(null)
  const { data: rows, error, reload } = useApi(() => api.suggestions.list(), [])
  const visible = (rows ?? []).filter((r) => !filter || r.status === filter)

  return (
    <div className={`queue-page ${id ? 'has-detail' : ''}`}>
      <section className="queue" aria-label="City suggestions">
        <header className="adm-head compact">
          <span className="adm-eyebrow">City suggestions</span>
          <h1>Suggestions</h1>
        </header>
        {error ? <ErrorState error={error} onRetry={reload} /> : !rows ? <Skeleton lines={6} /> : (
          <>
            <QueueFilters statuses={STATUSES} value={filter} onChange={setFilter} rows={rows} />
            {visible.length ? (
              <ul className="queue-list">
                {visible.map((s) => <QueueRow key={s.id} to={`/admin/suggestions/${s.id}`} active={s.id === id} title={`${s.city}, ${s.country}`} sub={s.reporter.name + (s.reporter.organization ? ` · ${s.reporter.organization}` : '')} status={s.status} at={s.createdAt} />)}
              </ul>
            ) : <EmptyState title="No suggestions with this status." />}
          </>
        )}
      </section>
      <section className="detail" aria-label="Review">
        {id ? <SuggestionReview id={id} /> : <EmptyState title="Choose a suggestion to review." />}
      </section>
    </div>
  )
}

function SuggestionReview({ id }) {
  const { data: s, error, reload } = useApi(() => api.suggestions.get(id), [id])
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!s) return <Skeleton lines={8} />
  return (
    <article className="review">
      <BackToQueue to="/admin/suggestions" label="All suggestions" />
      <header className="review-head">
        <div>
          <span className="adm-eyebrow">City suggestion · ref. {reference(s.id)} · sent {formatDateTime(s.createdAt)}</span>
          <h2>{s.city}, {s.country}</h2>
        </div>
        <StatusBadge status={s.status} />
      </header>
      <ReviewActions kind="suggestion" record={s} onChange={(status, opts) => api.suggestions.setStatus(s.id, status, opts)} />
      <div className="review-grid">
        <div className="review-main">
          <section className="panel material">
            <h3>Why it belongs in the library</h3>
            <p>{s.reason}</p>
            {s.links.length > 0 && (
              <ul className="links">{s.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer">{l} <Icon name="external" size={12} /></a></li>)}</ul>
            )}
          </section>
          <ChapterPanel s={s} />
          <Timeline history={s.history} messages={s.messages} names={{ acc_editor: 'Library editor', [s.contributorId]: s.reporter.name }} />
        </div>
        <aside className="review-side">
          <section className="panel">
            <h3>Suggested by</h3>
            <dl className="meta-list">
              <div><dt>Name</dt><dd>{s.contributor ? <Link to={`/admin/accounts/${s.contributor.id}`}>{s.reporter.name}</Link> : s.reporter.name}</dd></div>
              <div><dt>Email</dt><dd>{s.reporter.email}</dd></div>
              <div><dt>Organization</dt><dd>{s.reporter.organization || '—'}</dd></div>
              <div><dt>Account</dt><dd>{s.contributor ? <StatusBadge status={s.contributor.status} /> : 'Visitor (no account)'}</dd></div>
            </dl>
          </section>
          <NotesPanel notes={s.notes} onAdd={(text) => api.suggestions.addNote(s.id, text)} />
        </aside>
      </div>
    </article>
  )
}

function ChapterPanel({ s }) {
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  if (s.draftChapter) {
    return (
      <section className="panel draft-panel">
        <h3>Draft chapter</h3>
        <p><b>{s.draftChapter.cityName}</b> in the {s.draftChapter.volume?.countryName} volume <StatusBadge status={s.draftChapter.status} /></p>
        <div className="review-actions">
          <button className="adm-btn" onClick={() => navigate(`/admin/library?node=chapter:${s.draftChapter.id}`)}>Open in Library</button>
        </div>
      </section>
    )
  }
  return (
    <section className="panel draft-panel">
      <h3>Draft chapter</h3>
      {s.status === 'accepted' ? (
        <>
          <p className="adm-muted">Accepted. Create a draft chapter for {s.city}. It joins the contents and search only once you publish it.</p>
          <button className="adm-btn" onClick={() => setChoosing(true)}>Create draft chapter</button>
          {choosing && <CreateChapterDialog s={s} onClose={() => setChoosing(false)} />}
        </>
      ) : <p className="adm-muted">Accept the suggestion to create a draft chapter.</p>}
    </section>
  )
}

function CreateChapterDialog({ s, onClose }) {
  const navigate = useNavigate()
  const { data: lib } = useApi(() => api.library.snapshot(), [])
  const [volumeId, setVolumeId] = useState(s.matchingVolume?.id ?? 'new')
  const [continentId, setContinentId] = useState('cont_africa')
  const [countryName, setCountryName] = useState(s.country)
  const [run, pending] = useAction()
  const create = async (e) => {
    e.preventDefault()
    const body = volumeId === 'new' ? { newVolume: { continentId, countryName } } : { volumeId }
    const res = await run(() => api.suggestions.createDraftChapter(s.id, body), { success: (r) => (r.created ? 'Draft chapter created.' : 'This suggestion already has a chapter — opening it.') })
    if (res.ok) navigate(`/admin/library?node=chapter:${res.result.chapter.id}`)
  }
  return (
    <Dialog title={`Create a draft chapter for ${s.city}`} onClose={onClose}>
      {!lib ? <Skeleton /> : (
        <form className="form" onSubmit={create}>
          <Field id="cc-volume" label="Country volume">
            <select id="cc-volume" className="input" value={volumeId} onChange={(e) => setVolumeId(e.target.value)}>
              {lib.volumes.map((v) => <option key={v.id} value={v.id}>{v.countryName}{v.status === 'draft' ? ' — draft' : ''}</option>)}
              <option value="new">New country volume…</option>
            </select>
          </Field>
          {volumeId === 'new' && (
            <div className="form-row">
              <Field id="cc-country" label="Country"><input id="cc-country" className="input" value={countryName} onChange={(e) => setCountryName(e.target.value)} /></Field>
              <Field id="cc-continent" label="Shelf (continent)">
                <select id="cc-continent" className="input" value={continentId} onChange={(e) => setContinentId(e.target.value)}>
                  {lib.continents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            </div>
          )}
          <div className="form-actions"><button className="adm-btn" disabled={pending}>Create draft chapter</button></div>
        </form>
      )}
    </Dialog>
  )
}
