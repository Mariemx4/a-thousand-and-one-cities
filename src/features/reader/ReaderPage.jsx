// One page of a volume. Cover, contents, chapter opener and section welcome
// are distinct layouts; ordinary content pages are text or image.
import { Icon } from '../../ui/Icon.jsx'
import { Postmark } from '../../ui/Postmark.jsx'
import { toRoman } from '../../ui/format.js'
import { cropStyle, detectVideo } from '../../domain/media.js'
import { categoryName } from '../../domain/constants.js'

function Credit({ media, override }) {
  if (override) return <div className="credit">{override}</div>
  if (!media) return null
  return (
    <div className="credit">
      {media.attribution}
      {media.license ? ` · ${media.license}` : ''}
      {media.sourceUrl ? (
        <>
          {' · '}
          <a href={media.sourceUrl} target="_blank" rel="noreferrer">source</a>
        </>
      ) : null}
    </div>
  )
}

function Foot({ page, side }) {
  return (
    <div className="pg-foot">
      <span lang="ar">ألف مدينة ومدينة</span>
      <span>{page.folio ?? ''}</span>
    </div>
  )
}

function Head({ left, right }) {
  return (
    <div className="pg-head">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

export default function ReaderPage({ page, side = 'right', onJump }) {
  if (!page) return <div className={`pg side-${side}`} />
  const { volume } = page
  const sideCls = `side-${side}`

  switch (page.kind) {
    case 'cover':
      return (
        <article className={`pg cover ${sideCls}`} aria-label={`${volume.countryName}, cover`}>
          <div className="cover-frame" />
          <div className="cover-inner gilt">
            <span className="series">A Thousand and One Cities</span>
            <span className="ar" lang="ar">{volume.nameAr}</span>
            <h2>{volume.countryName}</h2>
            {page.cover && (
              <div className="cover-plate">
                <img src={page.cover.src} alt="" style={cropStyle(page.cover)} />
              </div>
            )}
            <span className="vol">VOLUME {String(volume.volumeNumber).padStart(2, '0')}</span>
          </div>
        </article>
      )

    case 'endpaper':
      return (
        <article className={`pg endpaper ${sideCls}`} aria-label="Endpaper">
          <div className="bookplate">
            <img src="/media/alf-madina-logo.png" alt="" />
            <small>Ex libris</small>
            <b lang="ar">ألف مدينة ومدينة</b>
            <i>This volume belongs to everyone who has a story to add to it.</i>
          </div>
        </article>
      )

    case 'frontis':
      return (
        <article className={`pg frontis ${sideCls}`}>
          <Head left={`Volume ${String(volume.volumeNumber).padStart(2, '0')}`} right={volume.countryName} />
          <div className="pg-body">
            <span className="k-label">A Thousand and One Cities</span>
            <h2 className="k-title">{volume.countryName}</h2>
            <span className="k-ar" lang="ar" dir="rtl">{volume.nameAr}</span>
            <p className="k-text">{volume.description}</p>
            <dl className="meta">
              <div><dt>Volume</dt><dd>{String(volume.volumeNumber).padStart(2, '0')}</dd></div>
              <div><dt>Shelf</dt><dd>{page.continentName}</dd></div>
              <div><dt>Status</dt><dd>A living volume — new city chapters are added as they are written.</dd></div>
            </dl>
          </div>
          <Foot page={page} side={side} />
        </article>
      )

    case 'contents':
      return (
        <article className={`pg contents ${sideCls}`}>
          <Head left={volume.countryName} right="Contents" />
          <div className="pg-body">
            <span className="k-label" style={{ marginTop: '6cqw' }}>Contents</span>
            <h2 className="k-title" style={{ fontSize: 'clamp(30px, 10cqw, 58px)' }}>The cities</h2>
            <ol className="toc">
              {page.entries.map((e) => (
                <li key={e.chapter.id}>
                  <button type="button" onClick={() => onJump?.(e.index)} aria-label={`Go to chapter ${e.chapterNumber}, ${e.chapter.cityName}, page ${e.folio}`}>
                    <span className="num">{toRoman(e.chapterNumber)}.</span>
                    <span className="city">
                      {e.chapter.cityName}
                      <span lang="ar">{e.chapter.nameAr}</span>
                    </span>
                    <span className="dots" />
                    <span className="f">{e.folio}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="toc-note">More city chapters are being gathered for this volume.</p>
          </div>
          <Foot page={page} side={side} />
        </article>
      )

    case 'chapter': {
      const c = page.chapter
      const [pmTop, pmBottom] = (c.postmark || c.cityName.toUpperCase()).split('·').map((s) => s.trim())
      return (
        <article className={`pg chapter ${sideCls}`}>
          {page.cover && (
            <div className="chapter-photo">
              <figure className="postcard">
                <div className="pc-img"><img src={page.cover.src} alt={`${c.cityName}: ${page.cover.title}`} style={cropStyle(page.cover)} /></div>
              </figure>
              <Postmark id={`pm-${c.id}`} top={pmTop} bottom={pmBottom || volume.countryName.toUpperCase()} />
            </div>
          )}
          <div className="pg-body">
            <div className="chapter-mark">
              <span className="k-label">Chapter {toRoman(page.chapterNumber)}</span>
              <span className="k-ar" lang="ar" dir="rtl">{c.nameAr}</span>
            </div>
            <h2 className="k-title">{c.cityName}</h2>
            {c.openingTitle && <p className="k-sub">{c.openingTitle}</p>}
            <p className="k-text">{c.openingText}</p>
            {page.cover && <span className="credit">{page.cover.title} · {page.cover.attribution}</span>}
          </div>
          <Foot page={page} side={side} />
        </article>
      )
    }

    case 'section': {
      const s = page.section
      return (
        <article className={`pg section ${sideCls}`}>
          <Head left={`${volume.countryName} · ${page.chapter.cityName}`} right={`Section ${toRoman(page.sectionNumber)}`} />
          <div className="pg-body">
            <span className="k-label">{categoryName(s.category)} · Section {toRoman(page.sectionNumber)}</span>
            <h2 className="k-title">{s.title}</h2>
            {s.titleAr && <span className="k-ar" lang="ar" dir="rtl">{s.titleAr}</span>}
            <p className="k-text">{s.welcomeText}</p>
            {page.items.length > 0 && (
              <div className="in-section">
                <b>In this section</b>
                <ol>
                  {page.items.map((it, i) => (
                    <li key={it.id}><span>{String(i + 1).padStart(2, '0')}</span>{it.title}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
          <Foot page={page} side={side} />
        </article>
      )
    }

    case 'text': {
      const p = page.page
      const paras = (p.body || '').split(/\n\s*\n/).filter(Boolean)
      return (
        <article className={`pg text ${sideCls}`}>
          <Head left={page.chapter.cityName} right={page.section.title} />
          <div className="pg-body">
            <h3 className="k-title">{p.title}</h3>
            {paras.length ? paras.map((t, i) => <p key={i} className={`k-text ${i === 0 ? 'dropcap' : ''}`}>{t}</p>) : <p className="k-text is-empty">No text yet.</p>}
            {p.byline && <p className="byline">Shared by {p.byline}</p>}
            <VideoLink url={p.videoUrl} />
          </div>
          <Foot page={page} side={side} />
        </article>
      )
    }

    case 'image': {
      const p = page.page
      const m = page.media
      return (
        <article className={`pg image ${sideCls}`}>
          <Head left={page.chapter.cityName} right={page.section.title} />
          <div className="pg-body">
            <h3 className="k-title">{p.title}</h3>
            <div className="plate">
              <figure className="postcard">
                <div className="pc-img">
                  {m?.src ? <img src={m.src} alt={p.alt || ''} style={cropStyle(m)} /> : <div className="no-img">No image yet</div>}
                </div>
              </figure>
            </div>
            {p.caption && <p className="caption">{p.caption}</p>}
            <Credit media={m} override={p.credit} />
            <VideoLink url={p.videoUrl} />
          </div>
          <Foot page={page} side={side} />
        </article>
      )
    }

    case 'colophon':
      return (
        <article className={`pg colophon ${sideCls}`}>
          <Head left={volume.countryName} right="The next page" />
          <div className="pg-body">
            <span className="k-label">The next page</span>
            <h2 className="k-title">This volume is still being written.</h2>
            <p className="k-text">Share a memory, a photograph, a tradition, or a place that deserves to be remembered. Every contribution is read by an editor before it joins a chapter.</p>
          </div>
          <Foot page={page} side={side} />
        </article>
      )
    default:
      return <div className={`pg ${sideCls}`} />
  }
}

function VideoLink({ url }) {
  const v = detectVideo(url)
  if (!v || v.error) return null
  return (
    <a className="video-chip" href={v.url} target="_blank" rel="noreferrer">
      <span className="play"><Icon name="play" size={10} /></span>
      Watch on {v.label}
      <Icon name="external" size={13} />
    </a>
  )
}
