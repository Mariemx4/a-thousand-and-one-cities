import { useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon.jsx'
import { Postmark } from '../../ui/Postmark.jsx'
import { cropStyle } from '../../domain/media.js'

export const ENTRANCE_PLATES = ['media_gabes_oasis_path', 'media_latakia_aquatint']
// back-panel colour of each shelf, in continent order
const TONES = ['teal', 'terracotta', 'plum', 'ink', 'teal', 'terracotta']

/** Left leaf: the Gabès and Latakia prints as a pair, tied by one postmark. */
function LeftLeaf({ g, l }) {
  return (
    <div className="leaf-inner" aria-hidden="true">
      <div className="m-lockup m-ar" lang="ar" dir="rtl">ألف مدينة<br />ومدينة</div>
      <div className="pair">
        <figure className="postcard pc-gabes">
          <div className="pc-img"><img src={g?.src} alt="" /></div>
          <figcaption className="m-cap">Gabès · 1923</figcaption>
          <figcaption className="pc-caption d-only">
            <span>Plate I · Volume I</span>
            <b>Gabès, Tunisia</b>
            Oasis path, 1923 · Leo Wehrli
          </figcaption>
        </figure>
        <figure className="postcard pc-latakia d-only">
          <div className="pc-img"><img src={l?.src} alt="" /></div>
          <figcaption className="pc-caption">
            <span>Plate II · Volume II</span>
            <b>Latakia, Syria</b>
            The harbour, 1810 · Luigi Mayer
          </figcaption>
        </figure>
        <Postmark id="pm-pair" className="pm-pair d-only" top="ALF MADINA" bottom="VOL · I — II" date="1001" />
      </div>
    </div>
  )
}

/** Right leaf: the masthead on wide screens; the second print on phones. */
function RightLeaf({ l, live, onEnter }) {
  return (
    <div className="leaf-inner">
      <div className="m-lockup m-en" aria-hidden="true">A Thousand<br />and One Cities</div>
      <figure className="postcard pc-latakia m-only" aria-hidden="true">
        <div className="pc-img"><img src={l?.src} alt="" /></div>
        <figcaption className="m-cap">Latakia · 1810</figcaption>
      </figure>
      <div className="masthead">
        <div className="lockup">
          <span className="lockup-ar" lang="ar" dir="rtl">ألف مدينة ومدينة</span>
          <span className="lockup-en">A Thousand and One Cities</span>
        </div>
        <h1>Every city<br />leaves a <em>story.</em></h1>
        <p>A living library of places and voices, gathered like postcards and passed from one person to another.</p>
        <div className="enter-row">
          <button className="btn-enter" tabIndex={live ? 0 : -1} onClick={(e) => { e.stopPropagation(); onEnter() }}>
            Enter the library <Icon name="arrow" size={17} />
          </button>
          <span className="enter-note">or open the doors</span>
        </div>
        <div className="masthead-foot">
          <span>Volume I · Tunisia</span>
          <span>Volume II · Syria</span>
        </div>
      </div>
    </div>
  )
}

/** Phones: the title and the way in hang on a sign across both doors. */
function DoorSign({ live, onEnter }) {
  return (
    <div className="door-sign" onClick={onEnter}>
      <svg className="sign-cord" viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true">
        <path d="M150 6 L26 68 M150 6 L274 68" />
      </svg>
      <span className="sign-hook" aria-hidden="true" />
      <div className="sign-card">
        <span className="sign-k">Gabès · Latakia</span>
        <h2 className="sign-title">Every city<br />leaves a <em>story.</em></h2>
        <p>A living library of places and voices, passed from one person to another.</p>
        <button className="btn-enter" tabIndex={live ? 0 : -1} onClick={(e) => { e.stopPropagation(); onEnter() }}>
          Enter the library <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  )
}

function Volume({ v, onOpen }) {
  return (
    <button
      className="volume"
      data-cloth={v.cloth}
      data-volume={v.id}
      onClick={(e) => onOpen(v.id, e.currentTarget.getBoundingClientRect())}
      aria-label={`Open the ${v.countryName} volume${v.firstChapter ? `, starting with ${v.firstChapter.cityName}` : ''}`}
    >
      <span className="volume-cast" aria-hidden="true" />
      <ClothCover v={v} cover={v.cover} />
    </button>
  )
}

export function ClothCover({ v, cover }) {
  return (
    <span className="cloth-cover">
      <span className="ar" lang="ar">{v.nameAr}</span>
      {cover && <span className="plate"><img src={cover.src} alt="" style={cropStyle(cover)} /></span>}
      <span className="en">{v.countryName}</span>
    </span>
  )
}

/**
 * The landing entrance: a double door that opens onto the reading room,
 * where every continent shelf is visible at once.
 */
export default function Entrance({ open, setOpen, rows, plates, onOpenVolume, onSuggest }) {
  const roomRef = useRef(null)
  const [g, l] = plates

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => roomRef.current?.querySelector('.volume')?.focus({ preventScroll: true }), 1300)
      return () => clearTimeout(t)
    }
  }, [open])

  const onDoorKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
    }
  }

  return (
    <section className={`vestibule ${open ? 'is-open' : ''}`} id="library" aria-label="The library entrance">
      <div className="room" ref={roomRef} aria-hidden={!open} inert={!open ? '' : undefined}>
        <div className="lamp" />
        <header className="room-head">
          <span className="eyebrow">The reading room <span lang="ar">قاعة القراءة</span></span>
          <h2>Choose your next <em>chapter.</em></h2>
          <p>One shelf per continent. One book per country. Countless stories to tell.</p>
        </header>
        <div className="shelves">
          {rows.map(({ continent, volumes }, i) => (
            <article className="shelf" key={continent.id} data-tone={TONES[i % TONES.length]} aria-label={`${continent.name} shelf`}>
              <div className="shelf-label">
                <strong>{continent.name}</strong>
                <span lang="ar">{continent.nameAr}</span>
                <span className="num">{volumes.length ? `${volumes.length} volume${volumes.length > 1 ? 's' : ''}` : 'Shelf ' + String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="niche">
                {volumes.length ? (
                  <>
                    {volumes.map((v) => (
                      <Volume key={v.id} v={v} onOpen={onOpenVolume} />
                    ))}
                    <div className="more-tag"><span className="dot" />More volumes coming soon<small>Starts with {volumes[0].firstChapter?.cityName}</small></div>
                  </>
                ) : (
                  <div className="niche-empty">
                    <span>Coming soon</span>
                    <small>This shelf is waiting for its first book.</small>
                    <button onClick={onSuggest}>Suggest a city</button>
                  </div>
                )}
                <div className="shelf-edge" />
              </div>
            </article>
          ))}
        </div>
        <button className="close-doors" onClick={() => setOpen(false)}><Icon name="close" size={13} /> Close the doors</button>
      </div>
      <div className="seam-light" />
      <div className="doors" onClick={() => !open && setOpen(true)}>
        <div className="door left" role="button" tabIndex={open ? -1 : 0} aria-label="Open the library doors" onClick={() => setOpen(true)} onKeyDown={onDoorKey}>
          <div className="door-face">
            <div className="leaf-panel"><LeftLeaf g={g} l={l} /></div>
            <span className="door-pull" />
            <span className="hinge h1" /><span className="hinge h2" /><span className="hinge h3" />
            <div className="door-shade" />
          </div>
          <div className="door-edge" />
        </div>
        <div className="door right" onClick={() => setOpen(true)}>
          <div className="door-face">
            <div className="leaf-panel"><RightLeaf l={l} live={!open} onEnter={() => setOpen(true)} /></div>
            <span className="door-pull" />
            <span className="hinge h1" /><span className="hinge h2" /><span className="hinge h3" />
            <div className="door-shade" />
          </div>
          <div className="door-edge" />
        </div>
      </div>
      <DoorSign live={!open} onEnter={() => setOpen(true)} />
    </section>
  )
}
