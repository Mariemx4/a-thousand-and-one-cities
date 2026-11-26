import { useMemo } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi } from '../../hooks/useApi.js'
import { useTitle } from '../../hooks/useTitle.js'
import { EmptyState, Spinner } from '../../ui/kit.jsx'
import Reader from './Reader.jsx'

/**
 * /books/:volumeSlug            → opens at the cover
 * /books/:volumeSlug/:chapter   → opens at that city's chapter opener
 * ?at=<page key>                → opens at a specific page (admin preview)
 * ?preview=1                    → drafts visible (admin preview only)
 */
export default function ReaderRoute() {
  const { volumeSlug, chapterSlug } = useParams()
  const [params] = useSearchParams()
  const preview = params.get('preview') === '1'
  const at = params.get('at')
  const navigate = useNavigate()
  const { data, error, loading } = useApi(() => api.library.readingOrder(volumeSlug, { preview }), [volumeSlug, preview])

  const startIndex = useMemo(() => {
    if (!data) return 0
    const { pages } = data
    const i = at
      ? pages.findIndex((p) => p.key === at)
      : chapterSlug
        ? pages.findIndex((p) => p.kind === 'chapter' && p.chapter.slug === chapterSlug)
        : 0
    return Math.max(0, i)
    // only recompute when the requested position changes, not on every data refresh
  }, [Boolean(data), volumeSlug, chapterSlug, at]) // eslint-disable-line react-hooks/exhaustive-deps

  const chapter = data?.pages.find((p) => p.kind === 'chapter' && p.chapter.slug === chapterSlug)?.chapter
  useTitle(chapter ? chapter.cityName : data?.volume.countryName)

  if (loading) {
    return (
      <section className="reader is-loading" aria-busy="true">
        <div className="desk"><Spinner label="Opening the book" /></div>
      </section>
    )
  }
  if (error || !data) {
    return (
      <section className="page-narrow">
        <EmptyState title="This book is not on the shelves yet." action={<Link className="btn-primary" to="/" state={{ doors: 'open' }}>Back to the library</Link>}>
          It may still be in preparation. Browse the published volumes instead.
        </EmptyState>
      </section>
    )
  }

  return (
    <Reader
      key={`${volumeSlug}:${chapterSlug ?? ''}:${at ?? ''}:${preview}`}
      pages={data.pages}
      startIndex={startIndex}
      preview={preview}
      backLabel={preview ? 'Back to Admin' : 'Back to shelves'}
      onBack={() => (preview ? navigate(-1) : navigate('/', { state: { doors: 'open' } }))}
      onShare={() => navigate('/share-a-story')}
    />
  )
}
