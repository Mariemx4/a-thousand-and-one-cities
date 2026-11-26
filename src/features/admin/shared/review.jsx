// Building blocks shared by the review screens (stories, suggestions, inbox).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAction } from '../../../hooks/useAction.js'
import { nextStatuses } from '../../../domain/workflow.js'
import { STATUS_META } from '../../../domain/constants.js'
import { Dialog, Field, StatusBadge } from '../../../ui/kit.jsx'
import { formatDateTime, timeAgo } from '../../../ui/format.js'

/** Status filter chips with counts; "All" first. */
export function QueueFilters({ statuses, value, onChange, rows }) {
  const count = (s) => rows.filter((r) => !s || r.status === s).length
  return (
    <div className="chips" role="tablist" aria-label="Filter by status">
      {[null, ...statuses].map((s) => (
        <button key={s ?? 'all'} role="tab" aria-selected={value === s} className={value === s ? 'on' : ''} onClick={() => onChange(s)}>
          {s ? STATUS_META[s].label : 'All'} <em>{count(s)}</em>
        </button>
      ))}
    </div>
  )
}

const ACTION_LABEL = {
  in_review: 'Start review',
  changes_requested: 'Request changes',
  needs_info: 'Request more information',
  accepted: 'Accept',
  declined: 'Decline',
  open: 'Reopen',
  resolved: 'Mark resolved',
}

/** Buttons for every status the record may move to next. */
export function ReviewActions({ kind, record, onChange }) {
  const [run, pending] = useAction()
  const [asking, setAsking] = useState(null)
  const next = nextStatuses(kind, record.status)
  const needsMessage = (s) => s === 'changes_requested' || s === 'needs_info'
  const optionalMessage = (s) => s === 'declined'

  const go = async (status, message) => {
    const res = await run(() => onChange(status, { message }), { success: `${STATUS_META[status].label}.` })
    if (res.ok) setAsking(null)
  }

  return (
    <div className="review-actions">
      {next.map((s) => (
        <button
          key={s}
          className={`adm-btn ${s === 'accepted' ? '' : 'ghost'} ${s === 'declined' ? 'danger' : ''}`}
          disabled={pending}
          onClick={() => (needsMessage(s) || optionalMessage(s) ? setAsking(s) : go(s))}
        >
          {ACTION_LABEL[s] ?? STATUS_META[s].label}
        </button>
      ))}
      {asking && <MessageDialog status={asking} required={needsMessage(asking)} pending={pending} onClose={() => setAsking(null)} onSend={(m) => go(asking, m)} />}
    </div>
  )
}

function MessageDialog({ status, required, pending, onClose, onSend }) {
  const [text, setText] = useState('')
  return (
    <Dialog title={ACTION_LABEL[status]} onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSend(text) }}>
        <Field id="rv-msg" label={required ? 'Message to the contributor' : 'Reason (optional)'} hint="The contributor sees this in their account. It is not emailed from this demo.">
          <textarea id="rv-msg" className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="form-actions">
          <button className="adm-btn" disabled={pending || (required && !text.trim())}>{ACTION_LABEL[status]}</button>
          <button type="button" className="adm-btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Dialog>
  )
}

/** Internal notes: visible to editors only. */
export function NotesPanel({ notes, onAdd }) {
  const [text, setText] = useState('')
  const [run, pending] = useAction()
  const add = async (e) => {
    e.preventDefault()
    const res = await run(() => onAdd(text))
    if (res.ok) setText('')
  }
  return (
    <section className="panel" aria-labelledby="notes-h">
      <h3 id="notes-h">Internal notes <span className="panel-hint">Editors only</span></h3>
      {notes.length ? (
        <ul className="notes">
          {notes.map((n, i) => <li key={i}><p>{n.text}</p><span>{n.author} · {formatDateTime(n.at)}</span></li>)}
        </ul>
      ) : <p className="adm-muted">No notes yet.</p>}
      <form className="note-form" onSubmit={add}>
        <label htmlFor="note-new" className="sr-only">Add an internal note</label>
        <textarea id="note-new" className="input" rows={2} placeholder="Add an internal note…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="adm-btn ghost" disabled={pending || !text.trim()}>Add note</button>
      </form>
    </section>
  )
}

/** History of status changes and messages to the contributor. */
export function Timeline({ history = [], messages = [], names = {} }) {
  const items = [
    ...history.map((h) => ({ at: h.at, kind: 'status', text: STATUS_META[h.status]?.label ?? h.status, by: names[h.by] ?? (h.by === 'visitor' ? 'Visitor' : 'Editor') })),
    ...messages.map((m) => ({ at: m.at, kind: 'message', text: m.text, by: m.from === 'editor' ? 'Message to contributor' : 'Contributor' })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  return (
    <section className="panel" aria-labelledby="tl-h">
      <h3 id="tl-h">History</h3>
      <ol className="timeline">
        {items.map((it, i) => (
          <li key={i} className={`tl-${it.kind}`}>
            <span className="tl-when">{formatDateTime(it.at)}</span>
            {it.kind === 'status' ? <span><b>{it.text}</b> · {it.by}</span> : <span><b>{it.by}:</b> {it.text}</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A row in a queue list. */
export function QueueRow({ to, title, sub, status, at, active }) {
  return (
    <li>
      <Link className={`queue-row ${active ? 'active' : ''}`} to={to} aria-current={active ? 'page' : undefined}>
        <span className="q-main"><b>{title}</b><span>{sub}</span></span>
        <span className="q-side"><StatusBadge status={status} /><time dateTime={at}>{timeAgo(at)}</time></span>
      </Link>
    </li>
  )
}

export const BackToQueue = ({ to, label }) => <Link className="back-link" to={to}>← {label}</Link>
