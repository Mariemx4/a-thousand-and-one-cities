# API boundary

The UI talks to data only through `src/api/index.js`, which exports one `api`
object. Today it is `createMockApi()` (localStorage); in the backend phase it
becomes an HTTP client with the **same method names and return shapes**, and no
screen has to change.

Base path `/api`. Errors use `{ status, message, fieldErrors? }` (`ApiError`):
`422` validation (field errors), `403` not allowed, `404` not found, `409` conflict.

## Public

| Method | Endpoint | Returns |
|---|---|---|
| `api.library.shelves()` | `GET /shelves` | continents in order, each with published volumes (+ cover, first chapter) |
| `api.library.readingOrder(slug, { preview })` | `GET /volumes/:slug/reading-order?preview` | `{ volume, pages }`; `preview` (editors only) includes drafts |
| `api.library.search(q)` | `GET /search?q=` | published chapters matching English or Arabic names |
| `api.library.publishedChapters()` | `GET /chapters?published=true` | for the atlas and the story form |
| `api.library.random()` | `GET /discover/random` | a random published chapter (Surprise Me) |
| `api.library.media(ids)` | `GET /media?ids=` | media assets |
| `api.stories.submit(form)` | `POST /stories` | the new submission (contributor view, no notes) |
| `api.suggestions.submit(form)` | `POST /city-requests` | the new suggestion |
| `api.messages.send(form)` | `POST /contact` | `{ id }` |

## Contributor (signed in)

| Method | Endpoint | Notes |
|---|---|---|
| `api.auth.me()` | `GET /auth/me` | current account or `null` |
| `api.auth.signIn({ email, password })` | `POST /auth/login` | demo checks a salted SHA-256 hash; the backend uses bcrypt + sessions/JWT |
| `api.auth.signInAsTestUser()` | — | testing shortcut, refused when `TEST_ACCESS.enabled` is false |
| `api.auth.register(form)` | `POST /auth/register` | required: name, email, phone, password + confirmation, city, country, consent; optional: organization, bio, interests |
| `api.auth.signOut()` | `POST /auth/logout` | |
| `api.auth.updateProfile(patch)` | `PATCH /auth/me` | name, phone, city, country (required); organization, bio |
| `api.me.submissions()` | `GET /me/submissions` | own stories and suggestions with status and editors’ messages — never internal notes |

## Editors (`/admin`, role `editor`)

Every method in this section returns **401** without an editor session, as does
`readingOrder(slug, { preview: true })`.

| Method | Endpoint |
|---|---|
| `api.editorAuth.signIn({ email, password })` | `POST /admin/auth/login` |
| `api.editorAuth.me()` | `GET /admin/auth/me` |
| `api.editorAuth.signOut()` | `POST /admin/auth/logout` |
| `api.editorAuth.signInAsTestEditor()` | — testing shortcut, refused when `TEST_ACCESS.enabled` is false |

| Method | Endpoint |
|---|---|
| `api.overview.get()` | `GET /admin/overview` |
| `api.library.snapshot()` | `GET /admin/library` (everything, drafts included) |
| `api.library.update(kind, id, patch)` | `PATCH /admin/{volumes\|chapters\|sections\|pages}/:id` |
| `api.library.move(kind, id, ±1)` | `PATCH /admin/{collection}/:id/order` |
| `api.library.createVolume / createChapter / createSection / createPage` | `POST /admin/{collection}` |
| `api.library.remove(kind, id)` | `DELETE /admin/{collection}/:id` (drafts with nothing inside) |
| `api.library.uploadImage(file)` | `POST /admin/media` (Cloudinary upload) |
| `api.stories.list({ status })` · `get(id)` | `GET /admin/stories?status=` · `GET /admin/stories/:id` |
| `api.stories.setStatus(id, status, { message })` | `PATCH /admin/stories/:id/status` |
| `api.stories.addNote(id, text)` | `POST /admin/stories/:id/notes` |
| `api.stories.createDraftPage(id, { sectionId } \| { chapterId, newSectionTitle })` | `POST /admin/stories/:id/draft-page` (idempotent) |
| `api.suggestions.list / get / setStatus / addNote` | `/admin/city-requests…` |
| `api.suggestions.createDraftChapter(id, { volumeId } \| { newVolume })` | `POST /admin/city-requests/:id/draft-chapter` (idempotent) |
| `api.messages.list / get / setStatus / addNote` | `/admin/messages…` |
| `api.messages.saveReplyDraft(id, text)` | `PUT /admin/messages/:id/reply-draft` (never sends) |
| `api.accounts.list({ q, status })` · `get(id)` · `setStatus(id, status)` | `/admin/users…` |

## Freshness
`api.subscribe(fn)` notifies after any write, so `useApi` re-fetches. An HTTP
client can implement it with query invalidation (e.g. TanStack Query) or polling.
