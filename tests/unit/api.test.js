import { beforeEach, describe, expect, it } from 'vitest'
import { createMockApi } from '../../src/api/mock/createMockApi.js'
import { createStore, memoryStorage } from '../../src/api/mock/store.js'
import { createSeed } from '../../src/data/seed/index.js'
import { detectVideo } from '../../src/domain/media.js'
import { nextStatuses } from '../../src/domain/workflow.js'

let api, storage, store, sessionId, editorId
const make = () => {
  store = createStore({ storage, key: 'db', version: 1, seed: createSeed })
  return createMockApi({
    store,
    session: { get: () => sessionId, set: (id) => (sessionId = id) },
    editorSession: { get: () => editorId, set: (id) => (editorId = id) },
    testAccess: { enabled: true, contributorId: 'acc_amira', editorId: 'acc_editor' },
    delay: 0,
  })
}

beforeEach(() => {
  storage = memoryStorage()
  sessionId = null
  editorId = 'acc_editor' // most tests act as a signed-in editor
  api = make()
})

const storyForm = (o = {}) => ({ cityId: 'ch_gabes', category: 'taste', format: 'text', title: 'Brik at the corner', excerpt: 'A pastry eaten standing up.', body: 'Crisp, hot, a whole egg inside.', ...o })

describe('story submissions', () => {
  it('requires a signed-in, active contributor', async () => {
    await expect(api.stories.submit(storyForm())).rejects.toMatchObject({ status: 403 })
    await api.auth.signInAsTestUser()
    const s = await api.stories.submit(storyForm())
    expect(s).toMatchObject({ status: 'new', contributorId: 'acc_amira' })
    expect(s.notes).toBeUndefined() // contributors never see internal notes
  })

  it('validates fields and video links', async () => {
    await api.auth.signInAsTestUser()
    await expect(api.stories.submit(storyForm({ title: '' }))).rejects.toMatchObject({ status: 422, fieldErrors: { title: 'Required.' } })
    await expect(api.stories.submit(storyForm({ format: 'video', videoUrl: 'https://vimeo.com/1' }))).rejects.toMatchObject({ status: 422 })
  })

  it('persists across a reload of the store', async () => {
    await api.auth.signInAsTestUser()
    const s = await api.stories.submit(storyForm())
    api = make() // same storage, new instance = page reload
    expect((await api.stories.get(s.id)).title).toBe('Brik at the corner')
  })

  it('needs a message to request changes, and shows it to the contributor', async () => {
    await expect(api.stories.setStatus('sub_001', 'changes_requested')).rejects.toMatchObject({ status: 422 })
    await api.stories.setStatus('sub_001', 'changes_requested', { message: 'Add a photo?' })
    await api.auth.signInAsTestUser()
    const mine = await api.me.submissions()
    expect(mine.stories.find((s) => s.id === 'sub_001').messages.at(-1).text).toBe('Add a photo?')
  })

  it('only turns accepted stories into pages, and never twice', async () => {
    await expect(api.stories.createDraftPage('sub_001', { sectionId: 'sec_gabes_jara' })).rejects.toMatchObject({ status: 409 })
    const first = await api.stories.createDraftPage('sub_004', { sectionId: 'sec_gabes_jara' })
    expect(first).toMatchObject({ created: true, page: { status: 'draft', sectionId: 'sec_gabes_jara' } })
    const again = await api.stories.createDraftPage('sub_004', { sectionId: 'sec_gabes_oasis' })
    expect(again).toMatchObject({ created: false, page: { id: first.page.id } })
    const snap = await api.library.snapshot()
    expect(snap.pages.filter((p) => p.sourceSubmissionId === 'sub_004')).toHaveLength(1)
  })

  it('keeps accepting and publishing separate', async () => {
    const { page } = await api.stories.createDraftPage('sub_004', { sectionId: 'sec_gabes_jara' })
    const before = await api.library.readingOrder('tunisia')
    expect(before.pages.some((p) => p.page?.id === page.id)).toBe(false)
    await api.library.update('page', page.id, { status: 'published' })
    const after = await api.library.readingOrder('tunisia')
    expect(after.pages.some((p) => p.page?.id === page.id)).toBe(true)
  })
})

describe('city suggestions', () => {
  it('creates a draft chapter once, which appears in contents and search after publishing', async () => {
    const r1 = await api.suggestions.createDraftChapter('sug_003', { volumeId: 'vol_tunisia' })
    const r2 = await api.suggestions.createDraftChapter('sug_003', { volumeId: 'vol_tunisia' })
    expect(r2).toMatchObject({ created: false, chapter: { id: r1.chapter.id } })
    expect((await api.library.search('tozeur'))).toHaveLength(0)
    await api.library.update('chapter', r1.chapter.id, { status: 'published' })
    expect((await api.library.search('tozeur'))).toHaveLength(1)
    const { pages } = await api.library.readingOrder('tunisia')
    expect(pages.find((p) => p.kind === 'contents').entries.map((e) => e.chapter.cityName)).toContain('Tozeur')
  })

  it('can create a new country volume for a city', async () => {
    await api.suggestions.setStatus('sug_001', 'accepted')
    const { chapter } = await api.suggestions.createDraftChapter('sug_001', { newVolume: { continentId: 'cont_africa', countryName: 'Morocco' } })
    const snap = await api.library.snapshot()
    expect(snap.volumes.find((v) => v.id === chapter.volumeId)).toMatchObject({ countryName: 'Morocco', status: 'draft' })
  })
})

describe('contact messages', () => {
  it('saves reply drafts without sending', async () => {
    const m = await api.messages.saveReplyDraft('msg_001', 'Thank you — yes!')
    expect(m.replyDraft.text).toBe('Thank you — yes!')
    expect(m.status).toBe('open')
    expect(m).not.toHaveProperty('sentAt')
  })
})

const registration = (o = {}) => ({ displayName: 'Test Person', email: 'test@example.org', phone: '+216 20 123 456', city: 'Gabès', password: 'lanterns-and-palms-7', confirmPassword: 'lanterns-and-palms-7', country: 'Tunisia', consent: true, ...o })

describe('contact details', () => {
  it('gives every seeded account a phone number and a country', () => {
    expect(store.read().accounts.every((a) => /^\+\d{8,15}$/.test(a.phone) && a.country)).toBe(true)
  })
  it('keeps the phone required when editing a profile', async () => {
    await api.auth.signInAsTestUser()
    await expect(api.auth.updateProfile({ phone: '' })).rejects.toMatchObject({ fieldErrors: { phone: 'Required.' } })
    expect((await api.auth.updateProfile({ phone: '+216 99 000 111' })).phone).toBe('+21699000111')
  })
})

describe('contributor accounts', () => {
  it('registers with a password, then signs in with it', async () => {
    const a = await api.auth.register(registration())
    expect(a).not.toHaveProperty('passwordHash')
    expect(a.phone).toBe('+21620123456')
    expect((await api.auth.me()).id).toBe(a.id)
    await api.auth.signOut()
    await expect(api.auth.signIn({ email: 'test@example.org', password: 'wrong-password-1' })).rejects.toMatchObject({ status: 401 })
    expect((await api.auth.signIn({ email: 'TEST@example.org', password: 'lanterns-and-palms-7' })).id).toBe(a.id)
  })
  it('validates the registration form', async () => {
    await expect(api.auth.register(registration({ password: 'short', confirmPassword: 'short' }))).rejects.toMatchObject({ fieldErrors: { password: expect.any(String) } })
    await expect(api.auth.register(registration({ confirmPassword: 'different-1' }))).rejects.toMatchObject({ fieldErrors: { confirmPassword: expect.any(String) } })
    await expect(api.auth.register(registration({ consent: false }))).rejects.toMatchObject({ fieldErrors: { consent: expect.any(String) } })
    await expect(api.auth.register(registration({ phone: '' }))).rejects.toMatchObject({ fieldErrors: { phone: 'Required.' } })
    await expect(api.auth.register(registration({ phone: '12345' }))).rejects.toMatchObject({ fieldErrors: { phone: expect.any(String) } })
    await expect(api.auth.register(registration({ city: '' }))).rejects.toMatchObject({ fieldErrors: { city: 'Required.' } })
    await api.auth.register(registration())
    await expect(api.auth.register(registration())).rejects.toMatchObject({ fieldErrors: { email: expect.any(String) } })
  })
  it('blocks suspended accounts from signing in', async () => {
    await api.auth.register(registration({ email: 'lina2@example.org' }))
    const id = (await api.auth.me()).id
    await api.auth.signOut()
    await api.accounts.setStatus(id, 'suspended')
    await expect(api.auth.signIn({ email: 'lina2@example.org', password: 'lanterns-and-palms-7' })).rejects.toMatchObject({ status: 403 })
  })
  it('only allows the test shortcuts while test access is enabled', async () => {
    store = createStore({ storage: memoryStorage(), key: 'db2', version: 1, seed: createSeed })
    const locked = createMockApi({ store, session: { get: () => null, set: () => {} }, editorSession: { get: () => null, set: () => {} }, testAccess: { enabled: false }, delay: 0 })
    await expect(locked.auth.signInAsTestUser()).rejects.toMatchObject({ status: 403 })
    await expect(locked.editorAuth.signInAsTestEditor()).rejects.toMatchObject({ status: 403 })
  })
})

describe('editor sign-in', () => {
  const setPassword = async (password) => {
    const salt = 'testsalt'
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`))
    const hash = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
    store.write((d) => Object.assign(d.accounts.find((a) => a.id === 'acc_editor'), { passwordSalt: salt, passwordHash: hash }))
  }

  it('refuses every admin method and draft previews without an editor session', async () => {
    editorId = null
    await expect(api.overview.get()).rejects.toMatchObject({ status: 401 })
    await expect(api.stories.list()).rejects.toMatchObject({ status: 401 })
    await expect(api.library.update('page', 'pg_gabes_storeys', { title: 'x' })).rejects.toMatchObject({ status: 401 })
    await expect(api.library.readingOrder('tunisia', { preview: true })).rejects.toMatchObject({ status: 401 })
    expect((await api.library.readingOrder('tunisia')).pages.length).toBeGreaterThan(0) // the public reader still works
  })

  it('signs in with the right password only, and never returns the hash', async () => {
    editorId = null
    await setPassword('correct horse')
    await expect(api.editorAuth.signIn({ email: 'editor@example.org', password: 'wrong' })).rejects.toMatchObject({ status: 401 })
    const editor = await api.editorAuth.signIn({ email: 'EDITOR@example.org', password: 'correct horse' })
    expect(editor).not.toHaveProperty('passwordHash')
    expect((await api.overview.get()).counts).toBeDefined()
    await api.editorAuth.signOut()
    await expect(api.overview.get()).rejects.toMatchObject({ status: 401 })
  })

  it('does not let contributor accounts into the desk', async () => {
    editorId = null
    await expect(api.editorAuth.signIn({ email: 'amira.bensalem@example.org', password: 'anything' })).rejects.toMatchObject({ status: 401 })
  })

  it('hides password fields from account listings', async () => {
    const list = await api.accounts.list()
    expect(list.every((a) => !('passwordHash' in a) && !('passwordSalt' in a))).toBe(true)
  })
})

describe('domain helpers', () => {
  it('recognises supported video links', () => {
    expect(detectVideo('https://youtu.be/abc')).toMatchObject({ label: 'YouTube' })
    expect(detectVideo('https://www.instagram.com/reel/x/')).toMatchObject({ label: 'Instagram Reel' })
    expect(detectVideo('http://youtube.com/watch?v=1')).toMatchObject({ error: expect.any(String) })
  })
  it('lists allowed review transitions', () => {
    expect(nextStatuses('story', 'new')).toContain('accepted')
    expect(nextStatuses('message', 'resolved')).toEqual(['open'])
  })
})
