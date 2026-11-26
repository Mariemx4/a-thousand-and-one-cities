// Assembles the mock API. Every method returns a Promise (after a short
// simulated latency) so call sites already behave like HTTP calls.
import { ApiError } from '../errors.js'
import { latency } from './helpers.js'
import { libraryApi } from './library.js'
import { submissionsApi } from './submissions.js'
import { messagesApi, accountsApi, overviewApi } from './people.js'
import { editorAuthApi } from './editorAuth.js'

/** Methods that need a signed-in editor (everything under /api/admin). */
const EDITOR_ONLY = {
  library: ['snapshot', 'update', 'move', 'createVolume', 'createChapter', 'createSection', 'createPage', 'remove', 'uploadImage'],
  stories: ['list', 'get', 'setStatus', 'addNote', 'createDraftPage'],
  suggestions: ['list', 'get', 'setStatus', 'addNote', 'createDraftChapter'],
  messages: ['list', 'get', 'setStatus', 'addNote', 'saveReplyDraft'],
  accounts: '*',
  overview: '*',
}

/** Wrap every function so it resolves asynchronously and enforces editor-only access. */
function wrap(namespaces, { delay, isEditor }) {
  const out = {}
  for (const [ns, methods] of Object.entries(namespaces)) {
    out[ns] = {}
    for (const [name, fn] of Object.entries(methods)) {
      const guarded = EDITOR_ONLY[ns] === '*' || EDITOR_ONLY[ns]?.includes(name)
      out[ns][name] = async (...args) => {
        await latency(delay)
        const previewRequest = ns === 'library' && name === 'readingOrder' && args[1]?.preview
        if ((guarded || previewRequest) && !isEditor()) throw new ApiError(401, 'Sign in to the library desk to do this.')
        return structuredClone(await fn(...args))
      }
    }
  }
  return out
}

/**
 * @param {{ store, session, editorSession, testAccess?, delay?: number }} deps
 *   session / editorSession: { get(): string|null, set(id: string|null): void }
 */
export function createMockApi({ store, session, editorSession, testAccess = { enabled: false }, delay = 120 }) {
  const { stories, suggestions, mine } = submissionsApi(store, session)
  const { auth, accounts } = accountsApi(store, session, testAccess)
  const editor = editorAuthApi(store, editorSession, testAccess)
  const api = wrap(
    {
      library: libraryApi(store),
      stories,
      suggestions,
      messages: messagesApi(store, session),
      auth,
      me: { submissions: mine },
      accounts,
      overview: overviewApi(store),
      editorAuth: editor.api,
    },
    { delay, isEditor: editor.isEditor }
  )
  return {
    ...api,
    /** Notify when data may have changed (here: any store write). An HTTP client would use cache invalidation. */
    subscribe: store.subscribe,
    /** Demo only: restore the seed data (editors only). */
    async resetDemo() {
      if (!editor.isEditor()) throw new ApiError(401, 'Sign in to the library desk to do this.')
      store.reset()
    },
  }
}
