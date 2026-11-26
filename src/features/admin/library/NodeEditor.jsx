import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useAction } from '../../../hooks/useAction.js'
import { CATEGORIES } from '../../../domain/constants.js'
import { checkImageUrl, detectVideo } from '../../../domain/media.js'
import { Field } from '../../../ui/kit.jsx'
import { Icon } from '../../../ui/Icon.jsx'
import { useToast } from '../../../ui/Toast.jsx'

/**
 * Local edits that save shortly after typing stops. The draft is keyed to the
 * record id, so refreshed data from the API never overwrites what you type.
 */
function useAutosave(kind, row) {
  const toast = useToast()
  const [draft, setDraft] = useState(row)
  const [state, setState] = useState('saved')
  const pending = useRef({})
  const timer = useRef(null)

  const flush = async () => {
    const patch = pending.current
    pending.current = {}
    if (!Object.keys(patch).length) return
    try {
      await api.library.update(kind, row.id, patch)
      setState('saved')
    } catch (e) {
      setState('error')
      toast(e.message, { tone: 'error' })
      if ('status' in patch) setDraft((d) => ({ ...d, status: row.status }))
    }
  }
  const set = (field, value, { now = false } = {}) => {
    setDraft((d) => ({ ...d, [field]: value }))
    pending.current[field] = value
    setState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, now ? 0 : 400)
  }
  useEffect(() => () => {
    clearTimeout(timer.current)
    flush()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return [draft, set, state]
}

const SaveState = ({ state }) => (
  <span className={`save ${state}`} aria-live="polite">{state === 'saving' ? 'Saving…' : state === 'error' ? 'Not saved' : 'Saved'}</span>
)

function PublicationControl({ value, onChange, blockers, kind }) {
  return (
    <div className="status-box">
      <div className="seg" role="radiogroup" aria-label="Publication status">
        {['draft', 'published'].map((s) => (
          <button key={s} type="button" role="radio" aria-checked={value === s} onClick={() => onChange(s)} className={value === s ? `on ${s}` : ''}>
            {s === 'draft' ? 'Draft' : 'Published'}
          </button>
        ))}
      </div>
      <p>
        {value === 'draft'
          ? 'Drafts are visible in Admin preview only.'
          : blockers.length
            ? `Marked published, but hidden until its ${blockers.map((b) => b.kind).join(' and ')} ${blockers.length > 1 ? 'are' : 'is'} published.`
            : kind === 'page' ? 'Visible in the public reader.' : 'Visible in the public reader, contents and search.'}
      </p>
    </div>
  )
}

function DeleteDraft({ kind, row, onDeleted }) {
  const [run, pending] = useAction()
  if (row.status !== 'draft') return null
  const remove = async () => {
    if (!window.confirm(`Delete this draft ${kind}? This cannot be undone.`)) return
    const res = await run(() => api.library.remove(kind, row.id), { success: `Draft ${kind} deleted.` })
    if (res.ok) onDeleted()
  }
  return <button type="button" className="adm-btn danger ghost" onClick={remove} disabled={pending}><Icon name="trash" size={14} /> Delete draft</button>
}

const Source = ({ row }) =>
  row.sourceSubmissionId ? <p className="ed-source">Created from story submission <Link to={`/admin/stories/${row.sourceSubmissionId}`}>{row.sourceSubmissionId}</Link></p>
  : row.sourceSuggestionId ? <p className="ed-source">Created from city suggestion <Link to={`/admin/suggestions/${row.sourceSuggestionId}`}>{row.sourceSuggestionId}</Link></p>
  : null

export default function NodeEditor({ kind, row, lib, blockers, folio, lineage, onSelect }) {
  const [d, set, state] = useAutosave(kind, row)
  const head = (eyebrow, title) => (
    <div className="ed-head">
      <div><span className="adm-eyebrow">{eyebrow}{folio ? ` · p. ${folio}` : ''}</span><h2>{title || 'Untitled'}</h2></div>
      <SaveState state={state} />
    </div>
  )
  const publication = <PublicationControl value={d.status} onChange={(v) => set('status', v, { now: true })} blockers={blockers} kind={kind} />
  const parent = { volume: null, chapter: ['volume', lineage.volume?.id], section: ['chapter', lineage.chapter?.id], page: ['section', lineage.section?.id] }[kind]
  const footer = (
    <div className="ed-foot">
      <Source row={row} />
      <DeleteDraft kind={kind} row={d} onDeleted={() => (parent ? onSelect(...parent) : onSelect('volume', lib.volumes[0].id))} />
    </div>
  )
  const input = (field, props = {}) => ({ id: `ed-${field}`, className: 'input', value: d[field] ?? '', onChange: (e) => set(field, e.target.value), ...props })

  if (kind === 'volume') {
    return (
      <div className="ed">
        {head('Country volume', d.countryName)}
        {publication}
        <div className="form-row">
          <Field id="ed-countryName" label="Country name"><input {...input('countryName')} /></Field>
          <Field id="ed-nameAr" label="Arabic name"><input {...input('nameAr', { dir: 'rtl', lang: 'ar' })} /></Field>
        </div>
        <Field id="ed-description" label="Description" hint="Printed on the frontispiece."><textarea rows={4} {...input('description')} /></Field>
        <div className="form-row">
          <Field id="ed-cover" label="Cover image"><MediaSelect id="ed-cover" lib={lib} value={d.coverMediaId} onChange={(v) => set('coverMediaId', v, { now: true })} /></Field>
          <Field id="ed-cloth" label="Bookcloth">
            <select {...input('cloth')} onChange={(e) => set('cloth', e.target.value, { now: true })}>
              <option value="oasis">Terracotta</option>
              <option value="harbour">Teal</option>
            </select>
          </Field>
        </div>
        {footer}
      </div>
    )
  }

  if (kind === 'chapter') {
    return (
      <div className="ed">
        {head('City chapter · opening page', d.cityName)}
        {publication}
        <div className="form-row">
          <Field id="ed-cityName" label="City name"><input {...input('cityName')} /></Field>
          <Field id="ed-nameAr" label="Arabic name"><input {...input('nameAr', { dir: 'rtl', lang: 'ar' })} /></Field>
        </div>
        <Field id="ed-openingTitle" label="Opening title"><input {...input('openingTitle')} /></Field>
        <Field id="ed-openingText" label="Opening text"><textarea rows={5} {...input('openingText')} /></Field>
        <div className="form-row">
          <Field id="ed-ocover" label="Opening image"><MediaSelect id="ed-ocover" lib={lib} value={d.coverMediaId} onChange={(v) => set('coverMediaId', v, { now: true })} /></Field>
          <Field id="ed-postmark" label="Postmark" optional hint="Town · country, as stamped on the photo."><input {...input('postmark')} /></Field>
        </div>
        <Coordinates value={d.coordinates} onChange={(v) => set('coordinates', v)} />
        <p className="ed-note">The contents page, search and the atlas update from this chapter automatically. Reorder chapters in the structure list.</p>
        {footer}
      </div>
    )
  }

  if (kind === 'section') {
    return (
      <div className="ed">
        {head('Section · welcome page', d.title)}
        {publication}
        <div className="form-row">
          <Field id="ed-title" label="Section title"><input {...input('title')} /></Field>
          <Field id="ed-titleAr" label="Arabic title" optional><input {...input('titleAr', { dir: 'rtl', lang: 'ar' })} /></Field>
        </div>
        <Field id="ed-category" label="Category" hint="Every section is filed under one of the seven story categories.">
          <select {...input('category')} onChange={(e) => set('category', e.target.value, { now: true })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.hint}</option>)}
          </select>
        </Field>
        <Field id="ed-welcomeText" label="Welcome text" hint="The welcome page is generated from this and appears directly before the section’s pages."><textarea rows={5} {...input('welcomeText')} /></Field>
        {footer}
      </div>
    )
  }

  // content page
  const video = detectVideo(d.videoUrl)
  return (
    <div className="ed">
      {head('Content page', d.title)}
      {publication}
      <div className="seg type" role="radiogroup" aria-label="Page type">
        {[['text', 'Text page'], ['image', 'Image page']].map(([t, l]) => (
          <button key={t} type="button" role="radio" aria-checked={d.type === t} className={d.type === t ? 'on' : ''} onClick={() => set('type', t, { now: true })}>
            <Icon name={t} size={14} /> {l}
          </button>
        ))}
      </div>
      <Field id="ed-title" label="Title"><input {...input('title')} /></Field>
      {d.type === 'text'
        ? <Field id="ed-body" label="Body" hint="Leave a blank line between paragraphs."><textarea rows={10} {...input('body', { className: 'input input-prose' })} /></Field>
        : <ImageFields d={d} set={set} lib={lib} />}
      <Field id="ed-byline" label="Contributor credit" optional hint="Shown as “Shared by …” on the page."><input {...input('byline')} /></Field>
      <Field id="ed-videoUrl" label="Video link" optional error={video?.error} hint={video && !video.error ? `Shown as “Watch on ${video.label}”.` : 'YouTube, Instagram Reel or Facebook Reel. Leave empty for none.'}>
        <input {...input('videoUrl', { type: 'url', inputMode: 'url', placeholder: 'https://www.youtube.com/watch?v=…', onChange: (e) => set('videoUrl', e.target.value.trim()) })} />
      </Field>
      {footer}
    </div>
  )
}

function ImageFields({ d, set, lib }) {
  const [mode, setMode] = useState(d.mediaId ? 'library' : d.imageUrl ? 'url' : 'library')
  const [run, busy] = useAction()
  const media = d.mediaId ? lib.media.find((m) => m.id === d.mediaId) : null
  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const res = await run(() => api.library.uploadImage(file), { success: 'Image uploaded.' })
    if (res.ok) {
      set('mediaId', res.result.id, { now: true })
      set('imageUrl', '', { now: true })
    }
  }
  return (
    <div className="img-fields">
      <div className="seg small" role="radiogroup" aria-label="Image source">
        {[['library', 'Media library'], ['upload', 'Upload'], ['url', 'Image URL']].map(([m, l]) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{l}</button>
        ))}
      </div>
      {mode === 'library' && <MediaSelect id="ed-media" lib={lib} value={d.mediaId} onChange={(v) => { set('mediaId', v, { now: true }); set('imageUrl', '', { now: true }) }} />}
      {mode === 'upload' && (
        <label className="drop">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
          <span>{busy ? 'Uploading…' : media?.sourceKind === 'upload' ? `Uploaded: ${media.fileName ?? media.title}` : 'Choose a JPG, PNG or WebP (up to 2 MB)'}</span>
          <small>Stored in this browser for the demo.</small>
        </label>
      )}
      {mode === 'url' && (
        <Field id="ed-imageUrl" label="Image URL" error={checkImageUrl(d.imageUrl)}>
          <input id="ed-imageUrl" className="input" type="url" placeholder="https://…" value={d.imageUrl || ''} onChange={(e) => { set('imageUrl', e.target.value.trim()); if (d.mediaId) set('mediaId', null) }} />
        </Field>
      )}
      {media && (
        <div className="media-card">
          <img src={media.src} alt="" />
          <div><b>{media.title}</b><span>{media.attribution}{media.license ? ` · ${media.license}` : ''}</span></div>
        </div>
      )}
      <Field id="ed-alt" label="Alt text" hint="Describe what is in the picture for people who can’t see it." error={!d.alt?.trim() ? 'Required before publishing.' : null}>
        <textarea id="ed-alt" className="input" rows={2} value={d.alt ?? ''} onChange={(e) => set('alt', e.target.value)} />
      </Field>
      <div className="form-row">
        <Field id="ed-caption" label="Caption" optional><input id="ed-caption" className="input" value={d.caption ?? ''} onChange={(e) => set('caption', e.target.value)} /></Field>
        <Field id="ed-credit" label="Credit" optional hint={media ? 'Overrides the media credit.' : ''}><input id="ed-credit" className="input" value={d.credit ?? ''} onChange={(e) => set('credit', e.target.value)} /></Field>
      </div>
    </div>
  )
}

function Coordinates({ value, onChange }) {
  const [lat, setLat] = useState(value?.lat ?? '')
  const [lng, setLng] = useState(value?.lng ?? '')
  const commit = (a, b) => {
    const la = parseFloat(a)
    const lo = parseFloat(b)
    onChange(Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lng: lo } : null)
  }
  return (
    <div className="form-row">
      <Field id="ed-lat" label="Latitude" optional hint="Places the city on the atlas."><input id="ed-lat" className="input" inputMode="decimal" value={lat} onChange={(e) => { setLat(e.target.value); commit(e.target.value, lng) }} /></Field>
      <Field id="ed-lng" label="Longitude" optional><input id="ed-lng" className="input" inputMode="decimal" value={lng} onChange={(e) => { setLng(e.target.value); commit(lat, e.target.value) }} /></Field>
    </div>
  )
}

function MediaSelect({ id, lib, value, onChange }) {
  return (
    <select id={id} className="input" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— none —</option>
      {lib.media.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
    </select>
  )
}
