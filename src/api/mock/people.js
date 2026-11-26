// Contact messages, accounts and the demo sign-in.
// There are no passwords anywhere in the frontend: sign-in is an explicit demo
// action. Real credentials and access control belong to the backend phase.
import { ACCOUNT_STATUS, MESSAGE_STATUS, ROLES } from '../../domain/constants.js'
import { assertTransition } from '../../domain/workflow.js'
import { validateContact, validateProfile, validateRegistration, normalizePhone } from '../../domain/validation.js'
import { ApiError, forbidden, invalid } from '../errors.js'
import { findOr404, logActivity, newId, now, EDITOR_NAME } from './helpers.js'
import { publicAccount } from './editorAuth.js'
import { hashPassword, verifyPassword } from './passwords.js'

export function messagesApi(store, session) {
  const db = () => store.read()
  return {
    /** POST /api/contact */
    send(form) {
      const errors = validateContact(form)
      if (Object.keys(errors).length) throw invalid(errors)
      return store.write((d) => {
        const row = {
          id: newId('msg'), sender: { name: form.name.trim(), email: form.email.trim() }, accountId: session.get() ?? null,
          subject: form.subject.trim(), message: form.message.trim(), status: MESSAGE_STATUS.NEW,
          notes: [], replyDraft: null, createdAt: now(), updatedAt: now(),
        }
        d.messages.unshift(row)
        logActivity(d, row.sender.name, 'sent a message', { kind: 'message', id: row.id, label: row.subject })
        return { id: row.id }
      })
    },
    /** GET /api/admin/messages?status= */
    list: ({ status } = {}) => db().messages.filter((m) => !status || m.status === status),
    /** GET /api/admin/messages/:id */
    get: (id) => findOr404(db().messages, id, 'That message'),
    /** PATCH /api/admin/messages/:id/status */
    setStatus(id, to) {
      return store.write((d) => {
        const m = findOr404(d.messages, id, 'That message')
        assertTransition('message', m.status, to)
        m.status = to
        m.updatedAt = now()
        logActivity(d, EDITOR_NAME, to === 'resolved' ? 'resolved' : 'reopened', { kind: 'message', id, label: m.subject })
        return m
      })
    },
    addNote(id, text) {
      if (!text?.trim()) throw new ApiError(422, 'The note is empty.')
      return store.write((d) => {
        const m = findOr404(d.messages, id, 'That message')
        m.notes.push({ at: now(), author: EDITOR_NAME, text: text.trim() })
        return m
      })
    },
    /**
     * PUT /api/admin/messages/:id/reply-draft
     * Saves a draft reply. Nothing is ever sent from the frontend demo.
     */
    saveReplyDraft(id, text) {
      return store.write((d) => {
        const m = findOr404(d.messages, id, 'That message')
        m.replyDraft = text?.trim() ? { text: text.trim(), updatedAt: now() } : null
        if (m.status === MESSAGE_STATUS.NEW) m.status = MESSAGE_STATUS.OPEN
        m.updatedAt = now()
        return m
      })
    },
  }
}

export function accountsApi(store, session, testAccess) {
  const db = () => store.read()
  const current = () => {
    const id = session.get()
    return id ? db().accounts.find((a) => a.id === id) ?? null : null
  }

  const begin = (account) => {
    if (account.status !== ACCOUNT_STATUS.ACTIVE) throw forbidden('This account is suspended. Write to us if you think this is a mistake.')
    session.set(account.id)
    store.reload()
    return publicAccount(account)
  }

  const auth = {
    /** GET /api/auth/me */
    me: () => publicAccount(current()),
    /** POST /api/auth/login */
    async signIn({ email, password } = {}) {
      if (!email?.trim() || !password) throw invalid({ ...(!email?.trim() && { email: 'Required.' }), ...(!password && { password: 'Required.' }) })
      const account = db().accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.role === ROLES.CONTRIBUTOR)
      if (!(await verifyPassword(account, password))) throw new ApiError(401, 'That email and password do not match a contributor account.')
      return begin(account)
    },
    /** Testing shortcut, only while TEST_ACCESS.enabled. Remove before launch. */
    signInAsTestUser() {
      if (!testAccess?.enabled) throw forbidden('Test access is turned off.')
      return begin(findOr404(db().accounts, testAccess.contributorId, 'The test user'))
    },
    /** POST /api/auth/register */
    async register(form) {
      const errors = validateRegistration(form)
      const email = (form.email ?? '').trim().toLowerCase()
      if (!errors.email && db().accounts.some((a) => a.email.toLowerCase() === email)) errors.email = 'An account with this email already exists. Sign in instead.'
      if (Object.keys(errors).length) throw invalid(errors)
      const secret = await hashPassword(form.password)
      const account = store.write((d) => {
        const row = {
          id: newId('acc'), displayName: form.displayName.trim(), email, phone: normalizePhone(form.phone), role: ROLES.CONTRIBUTOR, status: ACCOUNT_STATUS.ACTIVE,
          organization: (form.organization ?? '').trim(), city: (form.city ?? '').trim(), country: (form.country ?? '').trim(),
          bio: (form.bio ?? '').trim(), interests: form.interests ?? [], consentAt: now(), createdAt: now(), ...secret,
        }
        d.accounts.push(row)
        logActivity(d, row.displayName, 'registered', { kind: 'account', id: row.id, label: row.displayName })
        return row
      })
      return begin(account)
    },
    signOut() {
      session.set(null)
      store.reload()
    },
    /** PATCH /api/auth/me */
    updateProfile(patch) {
      const me = current()
      if (!me) throw forbidden('Sign in first.')
      const next = { ...me, ...patch }
      const errors = validateProfile(next)
      if (Object.keys(errors).length) throw invalid(errors)
      return store.write((d) => {
        const a = findOr404(d.accounts, me.id, 'Your account')
        for (const k of ['displayName', 'organization', 'city', 'country', 'bio']) if (k in patch) a[k] = String(patch[k]).trim()
        if ('phone' in patch) a.phone = normalizePhone(patch.phone)
        return publicAccount(a)
      })
    },
  }

  const accounts = {
    /** GET /api/admin/users?q=&status= */
    list({ q = '', status } = {}) {
      const d = db()
      const needle = q.trim().toLowerCase()
      return d.accounts
        .filter((a) => !status || a.status === status)
        .filter((a) => !needle || [a.displayName, a.email, a.phone, a.organization, a.city, a.country].join(' ').toLowerCase().includes(needle))
        .map((a) => ({ ...publicAccount(a), storyCount: d.stories.filter((s) => s.contributorId === a.id).length, suggestionCount: d.suggestions.filter((s) => s.contributorId === a.id).length }))
    },
    /** GET /api/admin/users/:id — profile plus activity. */
    get(id) {
      const d = db()
      const a = findOr404(d.accounts, id, 'That account')
      return {
        ...publicAccount(a),
        stories: d.stories.filter((s) => s.contributorId === id),
        suggestions: d.suggestions.filter((s) => s.contributorId === id),
        messages: d.messages.filter((m) => m.accountId === id),
        activity: d.activity.filter((x) => x.actor === a.displayName).slice(0, 20),
      }
    },
    /** PATCH /api/admin/users/:id/status */
    setStatus(id, status) {
      if (!Object.values(ACCOUNT_STATUS).includes(status)) throw new ApiError(422, 'Unknown status.')
      return store.write((d) => {
        const a = findOr404(d.accounts, id, 'That account')
        if (a.role === ROLES.EDITOR) throw forbidden('Editor accounts are managed by the backend.')
        a.status = status
        logActivity(d, EDITOR_NAME, status === 'suspended' ? 'suspended' : 'reactivated', { kind: 'account', id, label: a.displayName })
        return publicAccount(a)
      })
    },
  }

  return { auth, accounts }
}

/** GET /api/admin/overview */
export function overviewApi(store) {
  return {
    get() {
      const d = store.read()
      const awaitingStories = d.stories.filter((s) => s.status === 'new' || s.status === 'in_review')
      const awaitingSuggestions = d.suggestions.filter((s) => s.status === 'new' || s.status === 'in_review')
      const openMessages = d.messages.filter((m) => m.status !== 'resolved')
      const drafts = [
        ...d.volumes.filter((x) => x.status === 'draft').map((x) => ({ kind: 'volume', id: x.id, label: x.countryName })),
        ...d.chapters.filter((x) => x.status === 'draft').map((x) => ({ kind: 'chapter', id: x.id, label: x.cityName })),
        ...d.sections.filter((x) => x.status === 'draft').map((x) => ({ kind: 'section', id: x.id, label: x.title })),
        ...d.pages.filter((x) => x.status === 'draft').map((x) => ({ kind: 'page', id: x.id, label: x.title })),
      ]
      return {
        counts: { stories: awaitingStories.length, suggestions: awaitingSuggestions.length, messages: openMessages.length, drafts: drafts.length },
        awaitingStories, awaitingSuggestions, openMessages, drafts,
        activity: d.activity.slice(0, 10),
      }
    },
  }
}
