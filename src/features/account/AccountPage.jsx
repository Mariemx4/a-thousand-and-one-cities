import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/index.js'
import { useApi, useSession } from '../../hooks/useApi.js'
import { useAction } from '../../hooks/useAction.js'
import { useTitle } from '../../hooks/useTitle.js'
import { categoryName } from '../../domain/constants.js'
import { Field, bind, EmptyState, Skeleton, Spinner, StatusBadge } from '../../ui/kit.jsx'
import { formatDate, reference } from '../../ui/format.js'
import { Icon } from '../../ui/Icon.jsx'
import { SignInForm } from './SignInForm.jsx'
import { RegisterForm } from './RegisterForm.jsx'

export default function AccountPage() {
  const { account, loading } = useSession()
  useTitle(account ? 'Your account' : 'Sign in')
  if (loading) return <section className="page-narrow"><Spinner /></section>
  return account ? <AccountArea account={account} /> : <SignInArea />
}

function SignInArea() {
  const [params, setParams] = useSearchParams()
  const mode = params.get('mode') === 'register' ? 'register' : 'signin'
  const setMode = (m) => setParams(m === 'register' ? { mode: 'register' } : {}, { replace: true })
  return (
    <section className={`account-page auth-page ${mode}`}>
      <header className="account-head">
        <span className="eyebrow">Contributor space</span>
        <h1>{mode === 'signin' ? 'Welcome back.' : 'Join the collection.'}</h1>
        <p>{mode === 'signin'
          ? 'Sign in to share stories, suggest cities and follow what the editors decide.'
          : 'Create a contributor account to share stories from your city. Reading the library never needs an account.'}</p>
      </header>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'signin'} onClick={() => setMode('signin')}>Sign in</button>
        <button role="tab" aria-selected={mode === 'register'} onClick={() => setMode('register')}>Register</button>
      </div>
      {mode === 'signin' ? <SignInForm onSwitchToRegister={() => setMode('register')} /> : <RegisterForm onSwitchToSignIn={() => setMode('signin')} />}
    </section>
  )
}

function AccountArea({ account }) {
  const { data, loading } = useApi(() => api.me.submissions(), [account.id])
  const [run] = useAction()
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState({ displayName: account.displayName, phone: account.phone ?? '', organization: account.organization ?? '', city: account.city ?? '', country: account.country ?? '', bio: account.bio ?? '' })
  const [errors, setErrors] = useState({})
  const b = (k) => bind(profile, setProfile, errors, k)

  const save = async (e) => {
    e.preventDefault()
    const res = await run(() => api.auth.updateProfile(profile), { success: 'Profile saved.' })
    if (res.ok) setEditing(false)
    else if (res.fieldErrors) setErrors(res.fieldErrors)
  }

  return (
    <section className="account-page">
      <header className="account-head row">
        <div>
          <span className="eyebrow">Your account</span>
          <h1>{account.displayName}</h1>
          <p className="account-meta">{account.email} · contributor since {formatDate(account.createdAt)}{account.organization ? ` · ${account.organization}` : ''}</p>
        </div>
        <div className="account-actions">
          <Link className="btn-primary" to="/share-a-story">Share a story</Link>
          <button className="btn-ghost" onClick={() => run(() => api.auth.signOut(), { success: 'Signed out.' })}>Sign out</button>
        </div>
      </header>

      {account.status !== 'active' && <div className="notice tone-terracotta">This account is suspended. You can read the library but not submit. <Link to="/contact">Contact us</Link>.</div>}

      <div className="account-grid">
        <aside className="profile-card">
          <h2>Profile</h2>
          {editing ? (
            <form className="form" onSubmit={save} noValidate>
              <Field id="f-displayName" label="Name" error={errors.displayName}><input className="input" {...b('displayName')} /></Field>
              <Field id="f-phone" label="Phone number" error={errors.phone}><input className="input" type="tel" inputMode="tel" autoComplete="tel" {...b('phone')} /></Field>
              <Field id="f-organization" label="Organization" optional><input className="input" {...b('organization')} /></Field>
              <Field id="f-city" label="City" error={errors.city}><input className="input" {...b('city')} /></Field>
              <Field id="f-country" label="Country" error={errors.country}><input className="input" {...b('country')} /></Field>
              <Field id="f-bio" label="About you" optional><textarea className="input" rows={2} maxLength={280} {...b('bio')} /></Field>
              <div className="form-actions"><button className="btn-primary" type="submit">Save</button><button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
            </form>
          ) : (
            <>
              <dl className="meta-list">
                <div><dt>Name</dt><dd>{account.displayName}</dd></div>
                <div><dt>Email</dt><dd>{account.email}</dd></div>
                <div><dt>Phone</dt><dd>{account.phone || '—'}</dd></div>
                <div><dt>Organization</dt><dd>{account.organization || '—'}</dd></div>
                <div><dt>City</dt><dd>{[account.city, account.country].filter(Boolean).join(', ') || '—'}</dd></div>
                {account.bio && <div><dt>About</dt><dd>{account.bio}</dd></div>}
                {account.interests?.length > 0 && <div><dt>Interests</dt><dd>{account.interests.map(categoryName).join(', ')}</dd></div>}
                <div><dt>Status</dt><dd><StatusBadge status={account.status} /></dd></div>
              </dl>
              <button className="btn-ghost" onClick={() => setEditing(true)}>Edit profile</button>
            </>
          )}
        </aside>

        <div className="submissions">
          <h2>Your stories</h2>
          {loading ? <Skeleton lines={4} /> : data.stories.length ? (
            <ul className="record-list">{data.stories.map((s) => <SubmissionItem key={s.id} r={s} title={s.title} sub={`${categoryName(s.category)} · ${s.cityLabel}`} />)}</ul>
          ) : (
            <EmptyState title="No stories yet." action={<Link className="btn-ghost" to="/share-a-story">Be the first to share one</Link>} />
          )}
          <h2>Your city suggestions</h2>
          {loading ? <Skeleton lines={2} /> : data.suggestions.length ? (
            <ul className="record-list">{data.suggestions.map((s) => <SubmissionItem key={s.id} r={s} title={`${s.city}, ${s.country}`} sub="City suggestion" />)}</ul>
          ) : (
            <EmptyState title="No suggestions yet." action={<Link className="btn-ghost" to="/suggest-a-city">Suggest a city</Link>} />
          )}
        </div>
      </div>
    </section>
  )
}

/** One submission as its contributor sees it: status and editors' messages, never internal notes. */
function SubmissionItem({ r, title, sub }) {
  const lastMessage = r.messages?.at(-1)
  return (
    <li className="record">
      <div className="record-main">
        <b>{title}</b>
        <span className="record-sub">{sub} · sent {formatDate(r.createdAt)} · ref. {reference(r.id)}</span>
        {lastMessage && <p className="editor-message"><span>Message from the editors</span>{lastMessage.text}</p>}
      </div>
      <div className="record-status">
        {r.published ? <StatusBadge status="published" label="Published" /> : <StatusBadge status={r.status} />}
      </div>
    </li>
  )
}
