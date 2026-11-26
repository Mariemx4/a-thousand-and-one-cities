import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReaderPage from './ReaderPage.jsx'
import { Icon } from '../../ui/Icon.jsx'
import { toRoman } from '../../ui/format.js'

const SINGLE_QUERY = '(max-width: 760px)'
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function useSingle() {
  const [single, setSingle] = useState(() => window.matchMedia(SINGLE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(SINGLE_QUERY)
    const on = () => setSingle(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return single
}

// Desktop spreads: slot 0 is empty (left of the closed cover).
const spreadOf = (i) => Math.floor((i + 1) / 2)
const leftOf = (s) => 2 * s - 1
const rightOf = (s) => 2 * s

/**
 * The book reader. Desktop shows two-page spreads, phones one page at a time;
 * both read the same `pages` (see domain/library.js → buildReadingOrder).
 */
export default function Reader({ pages, startIndex = 0, preview = false, backLabel = 'Back to shelves', onBack, onShare, onIndexChange }) {
  const single = useSingle()
  const [index, setIndex] = useState(startIndex)
  const [turn, setTurn] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [swapKey, setSwapKey] = useState(0)
  const timer = useRef(null)
  const n = pages.length

  useEffect(() => setIndex(startIndex), [startIndex])
  useEffect(() => onIndexChange?.(index), [index]) // eslint-disable-line react-hooks/exhaustive-deps
  // keep the index valid if pages were removed/unpublished meanwhile
  useEffect(() => {
    if (index > n - 1) setIndex(Math.max(0, n - 1))
  }, [n, index])

  // On phones the endpaper is skipped.
  const mobileIndex = (i) => (pages[i]?.desktopOnly ? i + 1 : i)
  const cur = single ? mobileIndex(index) : index
  const spread = spreadOf(cur)
  const maxSpread = spreadOf(n - 1)
  const mobileList = useMemo(() => pages.filter((p) => !p.desktopOnly).map((p) => p.index), [pages])
  const mPos = mobileList.indexOf(cur)

  const canPrev = single ? mPos > 0 : spread > 0
  const canNext = single ? mPos < mobileList.length - 1 : spread < maxSpread

  const finish = useCallback((target) => {
    clearTimeout(timer.current)
    setIndex(target)
    setTurn(null)
  }, [])

  const goTo = useCallback(
    (target) => {
      if (turn || target === cur || target < 0 || target >= n) return
      if (reduceMotion()) {
        setIndex(target)
        setSwapKey((k) => k + 1)
        return
      }
      if (single) {
        setTurn({ mode: 'single', dir: target > cur ? 'fwd' : 'back', from: cur, to: target })
      } else {
        const s = spreadOf(cur)
        const t = spreadOf(target)
        if (s === t) return setIndex(target)
        setTurn({ mode: 'spread', dir: t > s ? 'fwd' : 'back', s, t, to: target })
      }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => finish(target), 1150)
    },
    [turn, cur, n, single, finish]
  )

  const next = useCallback(() => {
    if (!canNext) return
    if (single) goTo(mobileList[mPos + 1])
    else goTo(Math.max(0, leftOf(spread + 1)))
  }, [canNext, single, goTo, mobileList, mPos, spread])
  const prev = useCallback(() => {
    if (!canPrev) return
    if (single) goTo(mobileList[mPos - 1])
    else goTo(spread - 1 === 0 ? 0 : leftOf(spread - 1))
  }, [canPrev, single, goTo, mobileList, mPos, spread])
  const jump = useCallback(
    (i) => {
      setDrawer(false)
      goTo(single ? mobileIndex(i) : i)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [goTo, single, pages]
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Escape') return setDrawer(false)
      if (drawer) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, drawer])

  const touch = useRef(null)
  const onTouchStart = (e) => (touch.current = e.touches.length === 1 ? e.touches[0].clientX : null)
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    touch.current = null
    if (Math.abs(dx) > 60 && !e.target.closest('button, a')) (dx < 0 ? next : prev)()
  }

  if (!n) {
    return (
      <section className="reader">
        <div className="reader-top">
          <button className="text-btn" onClick={onBack}><Icon name="back" size={16} /> {backLabel}</button>
        </div>
        <div className="desk"><p style={{ color: '#f0e0c2' }}>This volume has no published pages yet.</p></div>
      </section>
    )
  }

  const volume = pages[0].volume
  const here = pages[cur]
  const contents = pages.find((p) => p.kind === 'contents')
  const P = (i, side) => (i >= 0 && i < n ? <ReaderPage page={pages[i]} side={side} onJump={jump} /> : null)

  // what sits under the turning leaf
  let baseL, baseR, leafFront, leafBack, closed
  if (single) {
    const shownIndex = turn ? (turn.dir === 'fwd' ? turn.to : turn.from) : cur
    baseR = P(shownIndex, 'right')
    if (turn) {
      leafFront = turn.dir === 'fwd' ? P(turn.from, 'right') : P(turn.to, 'right')
      leafBack = <div className="pg" />
    }
  } else if (turn) {
    const { s, t, dir } = turn
    if (dir === 'fwd') {
      baseL = P(leftOf(s), 'left'); baseR = P(rightOf(t), 'right')
      leafFront = P(rightOf(s), 'right'); leafBack = P(leftOf(t), 'left')
    } else {
      baseL = P(leftOf(t), 'left'); baseR = P(rightOf(s), 'right')
      leafFront = P(leftOf(s), 'left'); leafBack = P(rightOf(t), 'right')
    }
    closed = false
  } else {
    baseL = P(leftOf(spread), 'left'); baseR = P(rightOf(spread), 'right')
    closed = spread === 0
  }

  // Click the left page to go back, the right page to go forward.
  // Links and buttons inside a page (contents, video, credits) keep their own behaviour.
  const onBookClick = (e) => {
    if (turn || e.target.closest('a, button, input, select, textarea')) return
    if (window.getSelection?.().toString()) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    if (single) (x < 0.35 ? prev : next)()
    else (x < 0.5 ? prev : next)()
  }

  const progress = single ? `${mPos + 1} / ${mobileList.length}` : `${spread + 1} / ${maxSpread + 1}`
  const crumbChapter = here?.chapter ? here.chapter.cityName : null
  const crumbSection = here?.section ? here.section.title : null

  return (
    <section className="reader" data-cloth={volume.cloth} aria-label={`${volume.countryName}, volume ${volume.volumeNumber}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="reader-top">
        <button className="text-btn" onClick={onBack}><Icon name="back" size={16} /> {backLabel}</button>
        <span className="crumb" aria-live="polite">
          <b>{volume.countryName}</b><span className="c-vol"> · Vol. {String(volume.volumeNumber).padStart(2, '0')}</span>
          {crumbChapter && <> · <b>{crumbChapter}</b></>}
          {crumbSection && <> › {crumbSection}</>}
        </span>
      </div>
      {preview && <div className="draft-banner">Admin preview · drafts visible</div>}
      <div className="desk">
        <div className={`book ${single ? 'single' : ''} ${closed ? 'is-closed' : ''}`}>
          <div className="book-boards" />
          <div className="book-block" key={swapKey} onClick={onBookClick} data-can-prev={canPrev} data-can-next={canNext}>
            {!single && <div className="half left">{baseL}</div>}
            <div className={`half right ${swapKey ? 'fade-swap' : ''}`}>{baseR}</div>
            {turn && (
              <>
                <div className={`turn-shade ${turn.dir}`} />
                <div className={`leaf ${turn.dir}`} onAnimationEnd={(e) => e.target === e.currentTarget && finish(turn.to)}>
                  <div className="leaf-face front">{leafFront}</div>
                  <div className="leaf-face reverse">{leafBack}</div>
                </div>
              </>
            )}
            <div className="gutter" />
          </div>
        </div>
        {drawer && (
          <>
            <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
            <aside className="drawer" role="dialog" aria-modal="true" aria-label="Contents">
              <button className="close-x" onClick={() => setDrawer(false)} aria-label="Close contents">×</button>
              <span className="eyebrow">{volume.countryName} · Contents</span>
              <h2>The cities</h2>
              <div className="drawer-list">
                {contents.entries.map((e) => (
                  <button key={e.chapter.id} onClick={() => jump(e.index)} autoFocus={e.chapterNumber === 1}>
                    <span className="n">{toRoman(e.chapterNumber)}.</span>
                    <span className="city">{e.chapter.cityName}<span lang="ar">{e.chapter.nameAr}</span></span>
                    <span className="f">p. {e.folio}</span>
                  </button>
                ))}
              </div>
              <div className="minor">
                <button onClick={() => jump(0)}>Cover</button>
                <button onClick={() => jump(contents.index)}>Contents page</button>
                <button onClick={() => { setDrawer(false); onShare?.() }}>Share a story for this volume →</button>
              </div>
            </aside>
          </>
        )}
      </div>
      <nav className="reader-bar" aria-label="Page controls">
        <button className="bar-btn" onClick={prev} disabled={!canPrev}><Icon name="back" size={15} /> Previous</button>
        <button className="bar-btn contents" onClick={() => setDrawer(true)}>Contents</button>
        <span className="progress" aria-label={`View ${progress}`}>{progress}</span>
        <button className="bar-btn" onClick={next} disabled={!canNext}>Next <Icon name="arrow" size={15} /></button>
      </nav>
    </section>
  )
}
