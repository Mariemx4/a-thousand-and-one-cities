// A printed atlas: Equal Earth projection, land in a light plum tint,
// published city chapters marked and linked to their chapter openers.
import { geoEqualEarth, geoPath, geoGraticule10 } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import { Icon } from '../../ui/Icon.jsx'

const W = 1000
const H = 487
const projection = geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], { type: 'Sphere' })
const path = geoPath(projection)
const SPHERE = path({ type: 'Sphere' })
const GRATICULE = path(geoGraticule10())
const LAND = path(feature(world, world.objects.land))
const BORDERS = path(mesh(world, world.objects.countries, (a, b) => a !== b))

// where each label card sits relative to its marker (in map units)
const LABEL_OFFSET = { ch_gabes: [-215, 92], ch_latakia: [120, -96] }

/** @param {{ chapters: {volume, chapter}[], onOpen(volume, chapter): void }} props */
export default function Atlas({ chapters, onOpen }) {
  const pins = chapters
    .filter(({ chapter }) => chapter.coordinates)
    .map(({ volume, chapter }, i) => {
      const [x, y] = projection([chapter.coordinates.lng, chapter.coordinates.lat])
      const [dx, dy] = LABEL_OFFSET[chapter.id] || (i % 2 ? [110, -80] : [-200, 80])
      return { volume, chapter, x, y, lx: x + dx, ly: y + dy, accent: volume.cloth === 'harbour' ? 'teal' : 'terracotta' }
    })
  const pct = (v, total) => `${(v / total) * 100}%`

  return (
    <section className="atlas" id="atlas" aria-labelledby="atlas-title">
      <div className="section-head">
        <span className="eyebrow">The atlas</span>
        <h2 id="atlas-title">Two cities to begin <em>a worldwide collection.</em></h2>
        <p>Gabès and Latakia open the first volumes. The rest of the map is waiting for the cities you know.</p>
      </div>
      <figure className="atlas-sheet">
        <div className="atlas-map">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="World map with Gabès in Tunisia and Latakia in Syria marked">
            <path d={SPHERE} className="a-sea" />
            <path d={GRATICULE} className="a-grat" />
            <path d={LAND} className="a-land" />
            <path d={BORDERS} className="a-border" />
            <path d={SPHERE} className="a-rim" />
            {pins.length > 1 && (
              <ellipse
                className="a-ring"
                cx={(pins[0].x + pins[1].x) / 2}
                cy={(pins[0].y + pins[1].y) / 2}
                rx={Math.abs(pins[0].x - pins[1].x) / 2 + 26}
                ry={34}
              />
            )}
            {pins.map((p) => (
              <g key={p.chapter.id}>
                <path className="a-leader" d={`M${p.x} ${p.y} L${p.lx} ${p.ly}`} />
                <circle className={`a-dot ${p.accent}`} cx={p.x} cy={p.y} r="5" />
                <circle className="a-halo" cx={p.x} cy={p.y} r="11" />
              </g>
            ))}
          </svg>
          {pins.map((p) => (
            <button
              key={p.chapter.id}
              className={`a-label ${p.accent}`}
              style={{ left: pct(p.lx, W), top: pct(p.ly, H) }}
              onClick={() => onOpen(p.volume, p.chapter)}
            >
              <span className="a-k">City chapter · {p.volume.countryName}</span>
              <span className="a-city">{p.chapter.cityName} <span lang="ar">{p.chapter.nameAr}</span></span>
              <span className="a-go">Read the chapter <Icon name="arrow" size={13} /></span>
            </button>
          ))}
        </div>
        <div className="atlas-list">
          {pins.map((p) => (
            <button key={p.chapter.id} className={`a-label ${p.accent}`} onClick={() => onOpen(p.volume, p.chapter)}>
              <span className="a-k">City chapter · {p.volume.countryName}</span>
              <span className="a-city">{p.chapter.cityName} <span lang="ar">{p.chapter.nameAr}</span></span>
              <span className="a-go">Read the chapter <Icon name="arrow" size={13} /></span>
            </button>
          ))}
        </div>
        <figcaption>
          <span><i className="lg-dot" /> Published city chapter</span>
          <span>Equal Earth projection · Natural Earth data</span>
        </figcaption>
      </figure>
    </section>
  )
}
