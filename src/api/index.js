// The single entry point the UI uses for data. Today it is backed by the mock
// API over localStorage; swap `createMockApi` for an HTTP client with the same
// method names (see docs/api.md) when the backend exists.
import { createMockApi } from './mock/createMockApi.js'
import { createStore } from './mock/store.js'
import { createSeed, SEED_VERSION } from '../data/seed/index.js'
import { TEST_ACCESS } from '../config.js'

const DB_KEY = 'alf-madina:db'
const SESSION_KEY = 'alf-madina:session'
const EDITOR_SESSION_KEY = 'alf-madina:editor-session'

const safeStorage = (() => {
  try {
    const t = '__probe__'
    window.localStorage.setItem(t, t)
    window.localStorage.removeItem(t)
    return window.localStorage
  } catch {
    const m = new Map()
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }
  }
})()

const store = createStore({ storage: safeStorage, key: DB_KEY, version: SEED_VERSION, seed: createSeed })

const session = {
  get: () => safeStorage.getItem(SESSION_KEY),
  set: (id) => (id ? safeStorage.setItem(SESSION_KEY, id) : safeStorage.removeItem(SESSION_KEY)),
}

const editorSession = {
  get: () => safeStorage.getItem(EDITOR_SESSION_KEY),
  set: (id) => (id ? safeStorage.setItem(EDITOR_SESSION_KEY, id) : safeStorage.removeItem(EDITOR_SESSION_KEY)),
}

// Keep other tabs in sync.
window.addEventListener('storage', (e) => {
  if ([DB_KEY, SESSION_KEY, EDITOR_SESSION_KEY].includes(e.key)) store.reload()
})

export const api = createMockApi({ store, session, editorSession, testAccess: TEST_ACCESS })
export { ApiError } from './errors.js'
