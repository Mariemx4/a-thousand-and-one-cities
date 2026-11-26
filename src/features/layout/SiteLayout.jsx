import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useSession } from '../../hooks/useApi.js'
import { useToast } from '../../ui/Toast.jsx'
import { Icon } from '../../ui/Icon.jsx'
import SearchSheet from './SearchSheet.jsx'

/** Storefront chrome: header, footer and the search sheet around every page. */
export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { account } = useSession()

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const openLibrary = () => navigate('/', { state: { doors: 'open' } })
  const surprise = async () => {
    setMenuOpen(false)
    try {
      const { volume, chapter } = await api.library.random()
      navigate(`/books/${volume.slug}/${chapter.slug}`)
    } catch {
      toast('No published city chapters yet.')
    }
  }
  const openSearch = () => {
    setMenuOpen(false)
    setSearchOpen(true)
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="A Thousand and One Cities, home">
          <img src="/media/alf-madina-logo.png" alt="" />
          <span>
            <span className="brand-ar" lang="ar">ألف مدينة ومدينة</span>
            <span className="brand-en">A Thousand and One Cities</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Main">
          <button className="nav-link" onClick={openLibrary}>The Library</button>
          <NavLink className="nav-link" to="/our-story">Our Story</NavLink>
          <button className="nav-link surprise" onClick={surprise}><Icon name="dice" size={16} /> Surprise Me</button>
        </nav>
        <div className="head-actions">
          <button className="surprise-pill" onClick={surprise} aria-label="Surprise me: open a random city"><Icon name="dice" size={15} /><span>Surprise</span></button>
          <button className="icon-btn" onClick={openSearch} aria-label="Search the library"><Icon name="search" /></button>
          <Link className={`icon-btn account ${account ? 'is-signed-in' : ''}`} to="/account" aria-label={account ? `Your account, ${account.displayName}` : 'Contributor account: sign in or register'}>
            {account ? <span className="avatar-dot">{initials(account.displayName)}</span> : <Icon name="user" />}
          </Link>
          <Link className="btn-primary" to="/share-a-story">Share a Story <Icon name="arrow" size={15} /></Link>
          <button className="icon-btn mobile-only" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-menu" id="mobile-menu" aria-label="Menu">
            <button onClick={openLibrary}>The Library</button>
            <button onClick={surprise}>Surprise Me</button>
            <button onClick={openSearch}>Search</button>
            <Link to="/our-story">Our Story</Link>
            <Link to="/share-a-story">Share a Story</Link>
            <Link to="/account">{account ? `Your account · ${account.displayName}` : 'Sign in · Register'}</Link>
          </nav>
        )}
      </header>

      <main id="main">
        <Outlet />
      </main>

      {!location.pathname.startsWith('/books/') && <Footer />}
      {searchOpen && <SearchSheet onClose={() => setSearchOpen(false)} />}
    </>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="ft-row">
        <div className="ft-brand">
          <span lang="ar">ألف مدينة ومدينة</span>
          <small>A Thousand and One Cities</small>
        </div>
        <nav className="ft-links" aria-label="Footer">
          <Link to="/contact">Contact</Link>
          <Link to="/suggest-a-city">Suggest a city</Link>
          <Link to="/share-a-story">Share a story</Link>
          <Link to="/our-story">Our story</Link>
          <Link to="/account">Contributor account</Link>
        </nav>
      </div>
      <div className="ft-bottom">
        <span>© 2026 · A living library of places, people and memories.</span>
        <span>Photographs and prints are credited where they appear.</span>
      </div>
    </footer>
  )
}

const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
