import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi } from '../../hooks/useApi.js'
import { useTitle } from '../../hooks/useTitle.js'
import { cropStyle } from '../../domain/media.js'
import { Icon } from '../../ui/Icon.jsx'
import { ErrorState } from '../../ui/kit.jsx'
import Entrance, { ClothCover, ENTRANCE_PLATES } from './Entrance.jsx'

// The atlas carries the world map data, so it loads after the entrance.
const Atlas = lazy(() => import('./Atlas.jsx'))

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function HomePage() {
  useTitle(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [doorsOpen, setDoorsOpen] = useState(location.state?.doors === 'open')
  const [flying, setFlying] = useState(null)

  const { data, error, reload } = useApi(
    () => Promise.all([api.library.shelves(), api.library.media([...ENTRANCE_PLATES, 'media_gabes_engraving']), api.library.publishedChapters()]),
    []
  )

  // Returning from a book ("Back to shelves") lands on the open shelves.
  useEffect(() => {
    if (location.state?.doors === 'open') {
      setDoorsOpen(true)
      requestAnimationFrame(() => document.getElementById('library')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    }
  }, [location.key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState error={error} onRetry={reload} />
  const [rows = [], media = [], chapters = []] = data ?? []
  const byId = (id) => media.find((m) => m.id === id)

  /** The volume lifts off the shelf and flies to where the reader shows its cover. */
  const openVolume = (volumeId, rect) => {
    const volume = rows.flatMap((r) => r.volumes).find((v) => v.id === volumeId)
    const go = () => navigate(`/books/${volume.slug}`)
    if (reduceMotion() || !rect) return go()
    setFlying({ volume, rect, stage: 0 })
    requestAnimationFrame(() => requestAnimationFrame(() => setFlying((f) => f && { ...f, stage: 1 })))
    setTimeout(go, 760)
  }

  return (
    <>
      {data ? (
        <Entrance
          open={doorsOpen}
          setOpen={setDoorsOpen}
          rows={rows}
          plates={ENTRANCE_PLATES.map(byId)}
          onOpenVolume={openVolume}
          onSuggest={() => navigate('/suggest-a-city')}
        />
      ) : (
        <section className="vestibule is-loading" aria-busy="true" />
      )}
      <Intro plate={byId('media_gabes_engraving')} />
      <Suspense fallback={<section className="atlas" id="atlas" aria-busy="true" />}>
        <Atlas chapters={chapters} onOpen={(v, c) => navigate(`/books/${v.slug}/${c.slug}`)} />
      </Suspense>
      <Contribute />
      {flying && <FlyingBook {...flying} />}
    </>
  )
}

function FlyingBook({ volume, rect, stage }) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const head = document.querySelector('.site-header')?.offsetHeight ?? 72
  const single = vw <= 760
  const ph = single ? Math.min(vw - 34, (vh - head - 162) * 0.7) / 0.7 : Math.max(360, Math.min(vh - head - 200, 700, (0.46 * vw) / 0.7))
  const pw = ph * 0.7
  const target = { left: single ? (vw - pw) / 2 : vw / 2, top: head + 64 + (vh - head - 64 - 76 - ph) / 2, width: pw, height: ph }
  const r = stage ? target : rect
  return (
    <div
      className="flying"
      data-cloth={volume.cloth}
      style={{ left: r.left, top: r.top, width: r.width, height: r.height, transform: stage ? 'none' : 'translateY(-14px)' }}
      aria-hidden="true"
    >
      <ClothCover v={volume} cover={volume.cover} />
    </div>
  )
}

function Intro({ plate }) {
  return (
    <section className="intro" id="our-story-intro">
      <div className="section-head">
        <span className="eyebrow">Beyond the guidebook</span>
        <h2>Not just places. <em>People, memories, meaning.</em></h2>
        <p>Inspired by One Thousand and One Nights, this is a collaborative collection of cultural voices. Every page begins with a place; every chapter grows through the people who know it best.</p>
        <p>We begin with Gabès in Tunisia and Latakia in Syria. Visitors read freely; contributors send stories, photographs and films, and an editor reads every one before it joins a chapter.</p>
        <Link className="btn-ghost" to="/our-story">Read our story <Icon name="arrow" size={15} /></Link>
      </div>
      {plate && (
        <figure className="postcard pc-feature">
          <div className="pc-img"><img src={plate.src} alt="An 1887 engraving of the oasis of Gabès: tall palms over a walled path." style={cropStyle(plate)} loading="lazy" /></div>
          <figcaption><b>The oasis of Gabès</b> Engraving, 1887 · Public domain</figcaption>
        </figure>
      )}
    </section>
  )
}

function Contribute() {
  const items = [
    ['01', 'Share a story', 'A memory, a photograph, a recipe or a short film from a city you know. Write it in your own words.', 'Share a story', '/share-a-story'],
    ['02', 'Suggest a city', 'Tell us which city the library should open next, and why it belongs in the collection.', 'Suggest a city', '/suggest-a-city'],
    ['03', 'Write to us', 'Questions, corrections, partnerships. A person reads every message.', 'Contact the project', '/contact'],
  ]
  return (
    <section className="contribute" id="contribute" aria-labelledby="contrib-title">
      <div className="section-head">
        <span className="eyebrow">The next chapter begins with you</span>
        <h2 id="contrib-title">Every city has <em>another story to tell.</em></h2>
        <p>Contributions are read by an editor before they appear in a chapter. Accepted stories are credited to the people who sent them.</p>
      </div>
      <div className="contrib-grid">
        {items.map(([n, title, body, cta, to], i) => (
          <article key={n} className={`contrib-card ${i === 0 ? 'lead' : ''}`}>
            <span className="num">{n}</span>
            <h3>{title}</h3>
            <p>{body}</p>
            <Link className={i === 0 ? 'btn-primary' : 'btn-ghost'} to={to}>{cta} <Icon name="arrow" size={15} /></Link>
          </article>
        ))}
      </div>
    </section>
  )
}
