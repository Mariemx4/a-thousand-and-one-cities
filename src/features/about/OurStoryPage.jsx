import { Link } from 'react-router-dom'
import { useTitle } from '../../hooks/useTitle.js'
import { Icon } from '../../ui/Icon.jsx'

const STEPS = [
  ['The campaign', 'JCI ENIG Gabès Sud and JCI Syria introduce two cities, Gabès and Latakia, through short posts and films: food, sounds, places, traditions and hidden corners.'],
  ['The reveal', 'A final film shows that the campaign was the beginning of something larger: a library with room for a thousand and one cities.'],
  ['The library', 'This website. Continents are shelves, countries are books, cities are chapters, and every contribution is a new page.'],
  ['The challenge', '“Does your city deserve a chapter?” Other chapters and organizations add their cities, one at a time.'],
]

export default function OurStoryPage() {
  useTitle('Our story')
  return (
    <article className="story-page">
      <header className="story-hero">
        <span className="eyebrow">Our story</span>
        <h1>Every city has a story <em>worth discovering.</em></h1>
        <p className="lede">Just as every night in <i>One Thousand and One Nights</i> has a story, every city has its own. “A Thousand and One Cities” invites you to discover cities as the people who live there experience them — not only as tourist guides describe them.</p>
      </header>

      <section className="story-cols">
        <div>
          <h2>A city is never just one story</h2>
          <p>A chapter is built from many small, specific things: a dish, a song, a place, a craft, a tradition, a trip on a budget, and the secrets locals keep. Each one is filed under one of seven categories — Taste, Listen, Discover, Create, Experience, Travel and Local Secret — so a city reveals itself from many sides.</p>
        </div>
        <div>
          <h2>Written by the people who know it</h2>
          <p>Anyone can read. Contributors share stories, photographs and video links, and suggest new cities. An editor reads everything before it joins a chapter, and every photograph is credited.</p>
        </div>
      </section>

      <section className="story-steps" aria-label="How the project grows">
        <h2>How it grows</h2>
        <ol>
          {STEPS.map(([t, d], i) => (
            <li key={t}><span className="step-n">{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></li>
          ))}
        </ol>
      </section>

      <section className="story-scale">
        <div><b>2</b><span>cities, 2 countries, 2 partnerships — the pilot</span></div>
        <div><b>10</b><span>cities and dozens of contributions — the next phase</span></div>
        <div><b>1,001</b><span>cities, thousands of stories — the long run</span></div>
      </section>

      <footer className="story-cta">
        <p>We begin with two cities and open the door to a thousand and one.</p>
        <div>
          <Link className="btn-primary" to="/" state={{ doors: 'open' }}>Enter the library <Icon name="arrow" size={15} /></Link>
          <Link className="btn-ghost" to="/suggest-a-city">Suggest your city</Link>
        </div>
      </footer>
    </article>
  )
}
