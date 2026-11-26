import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useAction } from '../../../hooks/useAction.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { categoryName, STORY_STATUS } from '../../../domain/constants.js'
import { detectVideo } from '../../../domain/media.js'
import { Dialog, EmptyState, ErrorState, Field, Skeleton, StatusBadge } from '../../../ui/kit.jsx'
import { formatDateTime, reference } from '../../../ui/format.js'
import { Icon } from '../../../ui/Icon.jsx'
import { BackToQueue, NotesPanel, QueueFilters, QueueRow, ReviewActions, Timeline } from '../shared/review.jsx'

const STATUSES = Object.values(STORY_STATUS)

/** Story submissions: a filterable queue beside the review screen. */
export default function StoriesPage() {
  useTitle('Story submissions · Admin')
  const { id } = useParams()
  const [filter, setFilter] = useState(null)
  const { data: rows, error, reload } = useApi(() => api.stories.list(), [])
  const visible = (rows ?? []).filter((r) => !filter || r.status === filter)

  return (
    <div className={`queue-page ${id ? 'has-detail' : ''}`}>
      <section className="queue" aria-label="Story submissions">
        <header className="adm-head compact">
          <span className="adm-eyebrow">Story submissions</span>
          <h1>Stories</h1>
        </header>
        {error ? <ErrorState error={error} onRetry={reload} /> : !rows ? <Skeleton lines={6} /> : (
          <>
            <QueueFilters statuses={STATUSES} value={filter} onChange={setFilter} rows={rows} />
            {visible.length ? (
              <ul className="queue-list">
                {visible.map((s) => <QueueRow key={s.id} to={`/admin/stories/${s.id}`} active={s.id === id} title={s.title} sub={`${s.contributorName} · ${s.cityLabel}`} status={s.status} at={s.createdAt} />)}
              </ul>
            ) : <EmptyState title="No stories with this status." />}
          </>
        )}
      </section>
      <section className="detail" aria-label="Review">
        {id ? <StoryReview id={id} /> : <EmptyState title="Choose a story to review." />}
      </section>
    </div>
  )
}

function StoryReview({ id }) {
  const { data: s, error, reload } = useApi(() => api.stories.get(id), [id])
  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!s) return <Skeleton lines={8} />
  const video = detectVideo(s.material.videoUrl)

  return (
    <article className="review">
      <BackToQueue to="/admin/stories" label="All stories" />
      <header className="review-head">
        <div>
          <span className="adm-eyebrow">Story · ref. {reference(s.id)} · sent {formatDateTime(s.createdAt)}</span>
          <h2>{s.title}</h2>
          <p className="adm-muted">{categoryName(s.category)} · {s.cityLabel}</p>
        </div>
        <StatusBadge status={s.status} />
      </header>

      <ReviewActions kind="story" record={s} onChange={(status, opts) => api.stories.setStatus(s.id, status, opts)} />

      <div className="review-grid">
        <div className="review-main">
          <section className="panel material">
            <h3>Submitted material</h3>
            <p className="excerpt">{s.excerpt}</p>
            {s.format === 'text' && s.material.body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
            {s.format === 'image' && (
              <figure className="material-image">
                <img src={s.material.imageSrc} alt={s.material.alt} />
                <figcaption><b>Alt text:</b> {s.material.alt}{s.material.caption && <><br /><b>Caption:</b> {s.material.caption}</>}</figcaption>
              </figure>
            )}
            {s.format === 'video' && (
              <p><a className="video-link" href={s.material.videoUrl} target="_blank" rel="noreferrer"><Icon name="video" size={16} /> {video?.label ?? 'Video'} link <Icon name="external" size={13} /></a></p>
            )}
          </section>
          <DraftPanel story={s} />
          <Timeline history={s.history} messages={s.messages} names={{ [s.contributorId]: s.contributor?.displayName, acc_editor: 'Library editor' }} />
        </div>
        <aside className="review-side">
          <section className="panel">
            <h3>Contributor</h3>
            {s.contributor ? (
              <dl className="meta-list">
                <div><dt>Name</dt><dd><Link to={`/admin/accounts/${s.contributor.id}`}>{s.contributor.displayName}</Link></dd></div>
                <div><dt>Email</dt><dd>{s.contributor.email}</dd></div>
                <div><dt>Phone</dt><dd>{s.contributor.phone || '—'}</dd></div>
                <div><dt>Organization</dt><dd>{s.contributor.organization || '—'}</dd></div>
                <div><dt>Account</dt><dd><StatusBadge status={s.contributor.status} /></dd></div>
              </dl>
            ) : <p className="adm-muted">Account removed.</p>}
          </section>
          <NotesPanel notes={s.notes} onAdd={(text) => api.stories.addNote(s.id, text)} />
        </aside>
      </div>
    </article>
  )
}

/** Accepted stories can become a draft page — once. Publishing happens in the Library. */
function DraftPanel({ story }) {
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  if (story.draftPage) {
    const { lineage } = story.draftPage
    return (
      <section className="panel draft-panel">
        <h3>Draft page</h3>
        <p>
          <b>{story.draftPage.title}</b> in {lineage.volume?.countryName} → {lineage.chapter?.cityName} → {lineage.section?.title}{' '}
          <StatusBadge status={story.draftPage.status} />
          {story.draftPage.status === 'published' && !story.draftPage.public && <span className="adm-muted"> (hidden until its parents are published)</span>}
        </p>
        <div className="review-actions">
          <button className="adm-btn" onClick={() => navigate(`/admin/library?node=page:${story.draftPage.id}`)}>Open in Library</button>
          <button className="adm-btn ghost" onClick={() => navigate(`/books/${lineage.volume.slug}?preview=1&at=${encodeURIComponent(`pg:${story.draftPage.id}`)}`)}><Icon name="eye" size={14} /> Preview</button>
        </div>
      </section>
    )
  }
  return (
    <section className="panel draft-panel">
      <h3>Draft page</h3>
      {story.status === 'accepted' ? (
        <>
          <p className="adm-muted">Accepted. Turn it into a draft page in a chapter section. It stays a draft until you publish it in the Library.</p>
          <button className="adm-btn" onClick={() => setChoosing(true)}>Create draft page</button>
          {choosing && <CreatePageDialog story={story} onClose={() => setChoosing(false)} />}
        </>
      ) : (
        <p className="adm-muted">Accept the story to turn it into a draft page. Reviewing never publishes anything.</p>
      )}
    </section>
  )
}

function CreatePageDialog({ story, onClose }) {
  const navigate = useNavigate()
  const { data: lib } = useApi(() => api.library.snapshot(), [])
  const [chapterId, setChapterId] = useState(story.cityId ?? '')
  const [sectionId, setSectionId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [run, pending] = useAction()
  const sections = lib?.sections.filter((s) => s.chapterId === chapterId).sort((a, b) => a.displayOrder - b.displayOrder) ?? []
  const suggested = sections.find((s) => s.category === story.category)

  const create = async (e) => {
    e.preventDefault()
    const target = sectionId || suggested?.id || 'new'
    const res = await run(
      () => api.stories.createDraftPage(story.id, target === 'new' ? { chapterId, newSectionTitle: newTitle || categoryName(story.category) } : { sectionId: target }),
      { success: (r) => (r.created ? 'Draft page created.' : 'This story already has a draft page — opening it.') }
    )
    if (res.ok) navigate(`/admin/library?node=page:${res.result.page.id}`)
  }

  return (
    <Dialog title="Create a draft page" onClose={onClose}>
      {!lib ? <Skeleton /> : (
        <form className="form" onSubmit={create}>
          {story.proposedCity && <p className="notice tone-terracotta">The contributor proposed a new city ({story.proposedCity.city}). Choose an existing chapter, or accept a city suggestion first to create one.</p>}
          <Field id="cp-chapter" label="City chapter">
            <select id="cp-chapter" className="input" value={chapterId} onChange={(e) => { setChapterId(e.target.value); setSectionId('') }} required>
              <option value="">Choose…</option>
              {lib.chapters.map((c) => <option key={c.id} value={c.id}>{c.cityName} ({lib.volumes.find((v) => v.id === c.volumeId)?.countryName}){c.status === 'draft' ? ' — draft' : ''}</option>)}
            </select>
          </Field>
          {chapterId && (
            <Field id="cp-section" label="Section" hint={`The story is filed under ${categoryName(story.category)}.`}>
              <select id="cp-section" className="input" value={sectionId || suggested?.id || 'new'} onChange={(e) => setSectionId(e.target.value)}>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title} · {categoryName(s.category)}</option>)}
                <option value="new">New {categoryName(story.category)} section…</option>
              </select>
            </Field>
          )}
          {chapterId && (sectionId || suggested?.id || 'new') === 'new' && (
            <Field id="cp-newtitle" label="New section title"><input id="cp-newtitle" className="input" value={newTitle} placeholder={categoryName(story.category)} onChange={(e) => setNewTitle(e.target.value)} /></Field>
          )}
          <div className="form-actions"><button className="adm-btn" disabled={pending || !chapterId}>Create draft page</button></div>
        </form>
      )}
    </Dialog>
  )
}
