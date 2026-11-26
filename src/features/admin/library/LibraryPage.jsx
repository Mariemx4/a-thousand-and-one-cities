import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../../api/index.js'
import { useApi } from '../../../hooks/useApi.js'
import { useTitle } from '../../../hooks/useTitle.js'
import { buildReadingOrder, lineageOf, publicBlockers } from '../../../domain/library.js'
import { ErrorState, Skeleton } from '../../../ui/kit.jsx'
import { Icon } from '../../../ui/Icon.jsx'
import ReaderPage from '../../reader/ReaderPage.jsx'
import StructureTree from './StructureTree.jsx'
import NodeEditor from './NodeEditor.jsx'

const COLLECTION = { volume: 'volumes', chapter: 'chapters', section: 'sections', page: 'pages' }
const nodeParam = (kind, id) => `${kind}:${id}`
const PREVIEW_KEY = { volume: () => 'cover', chapter: (id) => `ch:${id}`, section: (id) => `sec:${id}`, page: (id) => `pg:${id}` }

/** Library desk: structure (left), editor (centre), live page preview (right). */
export default function LibraryPage() {
  useTitle('Library · Admin')
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [treeOpen, setTreeOpen] = useState(false)
  const { data: lib, error, reload } = useApi(() => api.library.snapshot(), [])

  const [kind, id] = (params.get('node') ?? 'page:pg_gabes_planters').split(':')
  const row = lib?.[COLLECTION[kind]]?.find((x) => x.id === id) ?? null
  const select = (k, i) => {
    setParams({ node: nodeParam(k, i) }, { replace: false })
    setTreeOpen(false)
  }

  const lineage = useMemo(() => (lib && row ? lineageOf(lib, kind, id) : {}), [lib, row, kind, id])
  const order = useMemo(() => (lib && lineage.volume ? buildReadingOrder(lib, lineage.volume.id, { includeDrafts: true }) : []), [lib, lineage.volume])
  const previewPage = order.find((p) => p.key === PREVIEW_KEY[kind]?.(id))
  const blockers = lib && row ? publicBlockers(lib, kind, id) : []

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (!lib) return <div className="adm-pad"><Skeleton lines={8} /></div>

  const preview = () => navigate(`/books/${lineage.volume.slug}?preview=1&at=${encodeURIComponent(previewPage?.key ?? 'cover')}`)

  return (
    <div className="lib">
      <header className="lib-top">
        <div>
          <span className="adm-eyebrow">Library</span>
          <nav className="crumbs" aria-label="Current position">
            {lineage.volume && <button onClick={() => select('volume', lineage.volume.id)}>{lineage.volume.countryName}</button>}
            {lineage.chapter && <><i aria-hidden="true">→</i><button onClick={() => select('chapter', lineage.chapter.id)}>{lineage.chapter.cityName}</button></>}
            {lineage.section && <><i aria-hidden="true">→</i><button onClick={() => select('section', lineage.section.id)}>{lineage.section.title}</button></>}
            {lineage.page && <><i aria-hidden="true">→</i><b>{lineage.page.title}</b></>}
            {!row && <b>Choose an item in the structure</b>}
          </nav>
        </div>
        <div className="lib-actions">
          <button className="adm-btn ghost tree-toggle" onClick={() => setTreeOpen((o) => !o)} aria-expanded={treeOpen}>Structure</button>
          {lineage.volume && <button className="adm-btn ghost" onClick={preview}><Icon name="eye" size={15} /> Preview in reader</button>}
        </div>
      </header>

      <div className="lib-grid">
        <StructureTree lib={lib} selected={{ kind, id }} onSelect={select} open={treeOpen} />

        <section className="lib-edit" aria-label="Editor">
          {row ? (
            <NodeEditor key={nodeParam(kind, id)} kind={kind} row={row} lib={lib} blockers={blockers} folio={previewPage?.folio} lineage={lineage} onSelect={select} />
          ) : (
            <p className="adm-muted">This item no longer exists. Choose another in the structure.</p>
          )}
        </section>

        <aside className="lib-preview" aria-label="Page preview">
          <div className="pv-head">
            <b>Preview</b>
            <span>{previewPage?.folio ? `Page ${previewPage.folio} of ${order.at(-1)?.folio}` : kind === 'volume' ? 'Cover' : ''}</span>
          </div>
          <div className="pv-page" data-cloth={lineage.volume?.cloth}>
            {previewPage ? <ReaderPage page={previewPage} side="right" /> : <div className="pv-empty">Not in the reading order.</div>}
          </div>
          <p className="pv-note">
            {blockers.length
              ? <>Readers can’t see this yet: {blockers.map((b) => `${b.kind} “${b.name}”`).join(', ')} {blockers.length > 1 ? 'are' : 'is'} still a draft.</>
              : <>Live in the public reader{kind !== 'page' ? ', contents and search' : ''}.</>}
          </p>
        </aside>
      </div>
    </div>
  )
}
