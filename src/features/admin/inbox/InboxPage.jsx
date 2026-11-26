import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useAction } from '../../../hooks/useAction.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { MESSAGE_STATUS } from '../../../domain/constants.js'
import { EmptyState, ErrorState, Skeleton, StatusBadge } from '../../../ui/kit.jsx'
import { formatDateTime } from '../../../ui/format.js'
import { BackToQueue, NotesPanel, QueueFilters, QueueRow, ReviewActions } from '../shared/review.jsx'

const STATUSES = Object.values(MESSAGE_STATUS)

export default function InboxPage() {
  useTitle('Contact inbox · Admin')
  const { id } = useParams()
  const [filter, setFilter] = useState(null)
  const { data: rows, error, reload } = useApi(() => api.messages.list(), [])
  const visible = (rows ?? []).filter((r) => !filter || r.status === filter)

  return (
    <div className={`queue-page ${id ? 'has-detail' : ''}`}>
      <section className="queue" aria-label="Messages">
        <header className="adm-head compact">
          <span className="adm-eyebrow">Contact inbox</span>
          <h1>Messages</h1>
        </header>
        {error ? <ErrorState error={error} onRetry={reload} /> : !rows ? <Skeleton lines={6} /> : (
          <>
            <QueueFilters statuses={STATUSES} value={filter} onChange={setFilter} rows={rows} />
            {visible.length ? (
              <ul className="queue-list">
                {visible.map((m) => <QueueRow key={m.id} to={`/admin/inbox/${m.id}`} active={m.id === id} title={m.subject} sub={m.sender.name} status={m.status} at={m.createdAt} />)}
              </ul>
            ) : <EmptyState title="No messages with this status." />}
          </>
        )}
      </section>
      <section className="detail" aria-label="Message">
        {id ? <MessageDetail id={id} /> : <EmptyState title="Choose a message." />}
      </section>
    </div>
  )
}

function MessageDetail({ id }) {
  const { data: m, error, reload } = useApi(() => api.messages.get(id), [id])
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!m) return <Skeleton lines={8} />
  return (
    <article className="review">
      <BackToQueue to="/admin/inbox" label="All messages" />
      <header className="review-head">
        <div>
          <span className="adm-eyebrow">From {m.sender.name} · {m.sender.email} · {formatDateTime(m.createdAt)}</span>
          <h2>{m.subject}</h2>
          {m.accountId && <p className="adm-muted">Sent while signed in · <Link to={`/admin/accounts/${m.accountId}`}>view account</Link></p>}
        </div>
        <StatusBadge status={m.status} />
      </header>
      <ReviewActions kind="message" record={m} onChange={(status) => api.messages.setStatus(m.id, status)} />
      <div className="review-grid">
        <div className="review-main">
          <section className="panel material"><h3>Message</h3>{m.message.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}</section>
          <ReplyDraft key={m.id} message={m} />
        </div>
        <aside className="review-side">
          <NotesPanel notes={m.notes} onAdd={(text) => api.messages.addNote(m.id, text)} />
        </aside>
      </div>
    </article>
  )
}

/** A reply is only ever a draft in this frontend: nothing is sent. */
function ReplyDraft({ message }) {
  const [text, setText] = useState(message.replyDraft?.text ?? '')
  const [run, pending] = useAction()
  useEffect(() => setText(message.replyDraft?.text ?? ''), [message.replyDraft?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = text.trim() !== (message.replyDraft?.text ?? '')
  return (
    <section className="panel reply">
      <h3>Reply <span className="badge tone-terracotta">Draft · not sent</span></h3>
      <label htmlFor="reply" className="sr-only">Draft reply to {message.sender.name}</label>
      <textarea id="reply" className="input input-prose" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Hi ${message.sender.name.split(' ')[0]}, …`} />
      <div className="reply-foot">
        <span className="adm-muted">
          {message.replyDraft ? `Draft saved ${formatDateTime(message.replyDraft.updatedAt)}. ` : ''}
          Replies are saved as drafts here. Email delivery arrives with the backend.
        </span>
        <button className="adm-btn" disabled={pending || !dirty} onClick={() => run(() => api.messages.saveReplyDraft(message.id, text), { success: 'Draft saved. Nothing was sent.' })}>Save draft</button>
      </div>
    </section>
  )
}
