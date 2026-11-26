import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi } from '../../hooks/useApi.js'
import { Dialog } from '../../ui/kit.jsx'
import { Icon } from '../../ui/Icon.jsx'

/** Search published city chapters by city or country, in English or Arabic. */
export default function SearchSheet({ onClose }) {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { data: results = [] } = useApi(() => api.library.search(q), [q])

  const open = (volume, chapter) => {
    onClose()
    navigate(`/books/${volume.slug}/${chapter.slug}`)
  }

  return (
    <Dialog onClose={onClose} labelledBy="search-title">
      <span className="eyebrow">Search the collection</span>
      <h2 id="search-title" className="dialog-title">Find a city.</h2>
      <input
        className="input input-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try Gabès, قابس, Syria…"
        aria-label="Search cities and countries"
      />
      <ul className="results" aria-live="polite">
        {results.map(({ volume, chapter }) => (
          <li key={chapter.id}>
            <button className="result" onClick={() => open(volume, chapter)}>
              <span>
                <strong>{chapter.cityName}</strong> <span lang="ar" className="result-ar">{chapter.nameAr}</span>
                <span className="result-meta">City chapter · {volume.countryName}, Vol. {String(volume.volumeNumber).padStart(2, '0')}</span>
              </span>
              <Icon name="arrow" />
            </button>
          </li>
        ))}
      </ul>
      {!results.length && <p className="results-empty">No published chapter matches “{q}” yet.</p>}
    </Dialog>
  )
}
