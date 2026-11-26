# Proposed data model

For the backend phase described in the MVP brief: **Node + Express, MongoDB Atlas,
Cloudinary**. Collections reference each other by id (no nested copies). Types are
MongoDB/Mongoose types. The frontend mock (`src/data/seed/`) uses the same field
names, with stable string ids such as `ch_gabes` in place of ObjectIds.

Every collection also has `createdAt` and `updatedAt` (`Date`, set by the server).

## Library

```
Continent 1─N CountryVolume 1─N CityChapter 1─N ChapterSection 1─N ContentPage
                    │                │                                 │
                    └── cover ───────┴── opening image ── MediaAsset ──┘
```

### Continent — `continents`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `name` | String, required | “Africa” |
| `nameAr` | String | “أفريقيا” |
| `slug` | String, unique | `africa` |
| `displayOrder` | Number | shelf position |

### CountryVolume — `volumes`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `continentId` | ObjectId → continents | index |
| `countryName` | String, required | “Tunisia” |
| `nameAr` | String | localized name |
| `slug` | String, unique | `tunisia`; used in `/books/:slug` |
| `volumeNumber` | Number, unique | printed on the cover |
| `coverMediaId` | ObjectId → media, nullable | |
| `cloth` | enum `oasis` \| `harbour` | bookcloth colour (terracotta / teal) |
| `description` | String | printed on the frontispiece |
| `displayOrder` | Number | order on its shelf |
| `status` | enum `draft` \| `published` | |

### CityChapter — `chapters`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `volumeId` | ObjectId → volumes | index |
| `cityName` | String, required | “Gabès” |
| `nameAr` | String | “قابس” |
| `slug` | String, unique | `gabes`; `/books/tunisia/gabes` |
| `openingTitle` | String | “Where the oasis meets the sea” |
| `openingText` | String | |
| `coverMediaId` | ObjectId → media, nullable | opening image |
| `postmark` | String | “GABÈS · 6000” |
| `coordinates` | `{ lat: Number, lng: Number }`, nullable | places the city on the atlas |
| `displayOrder` | Number | order in the book; drives contents and reading order |
| `status` | enum `draft` \| `published` | |
| `sourceSuggestionId` | ObjectId → cityRequests, nullable | set when created from a suggestion |

### ChapterSection — `sections`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `chapterId` | ObjectId → chapters | index |
| `title` | String, required | “The coastal oasis” |
| `titleAr` | String | |
| `category` | enum `taste` \| `listen` \| `discover` \| `create` \| `experience` \| `travel` \| `secret` | the seven story categories |
| `welcomeText` | String | the section welcome page is generated from this |
| `displayOrder` | Number | |
| `status` | enum `draft` \| `published` | |

### ContentPage — `pages`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `sectionId` | ObjectId → sections | index |
| `type` | enum `text` \| `image` | |
| `title` | String, required | |
| `body` | String | text pages; paragraphs separated by a blank line |
| `mediaId` | ObjectId → media, nullable | image pages: an uploaded asset… |
| `imageUrl` | String (https), nullable | …or an https image link |
| `alt` | String | required before an image page can be published |
| `caption` | String | optional |
| `credit` | String | optional; overrides the media attribution |
| `byline` | String | “Amira Ben Salem · JCI ENIG Gabès Sud”, shown as “Shared by …” |
| `videoUrl` | String (https), nullable | YouTube, Instagram Reel or Facebook Reel only |
| `displayOrder` | Number | |
| `status` | enum `draft` \| `published` | |
| `sourceSubmissionId` | ObjectId → stories, nullable | set when created from a story |

### MediaAsset — `media`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `mediaType` | enum `image` | audio later |
| `sourceKind` | enum `upload` \| `url` | |
| `src` | String | Cloudinary URL (or the external https URL) |
| `publicId` | String, nullable | Cloudinary public id for uploads |
| `title` | String | |
| `attribution` | String | author, year, collection |
| `license` | String | “CC BY-SA 4.0”, “Public domain”… |
| `sourceUrl` | String, nullable | where the file came from |
| `crop` | `{ scale: Number, origin: String }`, nullable | presentation crop (e.g. hide a slide mount) |
| `fileName`, `fileSize`, `mimeType`, `width`, `height` | String / Number | file metadata |

### Derived, never stored
* **Reading order** — `cover · endpaper · frontispiece · contents · (chapter opener · (section welcome · pages…)…)… · colophon`,
  built from `displayOrder` (`src/domain/library.js → buildReadingOrder`).
* **Page numbers (folios)** — from position in the reading order.
* **Contents** — the ordered published chapters of a volume, each with the folio of its opener.
* **Public visibility** — a page is public only if it *and* its section, chapter and volume are `published`
  (`publicBlockers`). The same rule filters search, the atlas and the shelves.

## People and review

### Account — `users`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `displayName` | String, required | |
| `email` | String, unique, lowercase, required | |
| `phone` | String, required | international format, stored as `+` and digits (`+21620123456`); visible to editors and the account owner |
| `passwordHash` | String | backend only (bcrypt); never in the frontend |
| `role` | enum `contributor` \| `editor` | |
| `status` | enum `active` \| `suspended` | suspended accounts cannot sign in or submit |
| `organization` | String, optional | credited on chapters (“Chapter created with the contribution of …”) |
| `city` | String, required | |
| `country` | String, required | |
| `bio` | String, optional, ≤ 280 | “A line about you” |
| `interests` | [category] | categories the contributor would like to write for |
| `consentAt` | Date | when they accepted review and credit terms |
| `createdAt` | Date | |

### StorySubmission — `stories`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `contributorId` | ObjectId → users | index |
| `cityId` | ObjectId → chapters, nullable | an existing city… |
| `proposedCity` | `{ city: String, country: String }`, nullable | …or a proposed one |
| `category` | enum (seven categories) | |
| `format` | enum `text` \| `image` \| `video` | |
| `title`, `excerpt` | String | |
| `material` | `{ body, imageSrc, alt, caption, videoUrl }` | what was submitted |
| `status` | enum `new` \| `in_review` \| `changes_requested` \| `accepted` \| `declined` | review state, not publication |
| `messages` | `[{ at: Date, from: 'editor'\|'contributor', text }]` | visible to the contributor |
| `notes` | `[{ at: Date, author: String, text }]` | internal, editors only |
| `history` | `[{ at: Date, status, by: ObjectId }]` | audit trail |
| `draftPageId` | ObjectId → pages, nullable | set once; prevents duplicate drafts |

### CitySuggestion — `cityRequests`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `contributorId` | ObjectId → users, nullable | when sent while signed in |
| `reporter` | `{ name, email, organization }` | always present |
| `city`, `country` | String | |
| `reason` | String | |
| `links` | [String] | |
| `status` | enum `new` \| `in_review` \| `needs_info` \| `accepted` \| `declined` | |
| `messages`, `notes`, `history` | as for stories | |
| `draftChapterId` | ObjectId → chapters, nullable | set once; prevents duplicate chapters |

### ContactMessage — `messages`
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `sender` | `{ name, email }` | |
| `accountId` | ObjectId → users, nullable | |
| `subject`, `message` | String | |
| `status` | enum `new` \| `open` \| `resolved` | |
| `notes` | `[{ at, author, text }]` | internal |
| `replyDraft` | `{ text, updatedAt }`, nullable | a draft; sending is a backend feature |

### Activity — `activity`
`{ _id, at: Date, actor: String, verb: String, target: { kind, id, label } }` — the
admin overview feed. Capped (e.g. last 1,000 entries).

## Review rules (shared by mock and backend)
* Allowed status changes are listed in `src/domain/workflow.js`.
* “Request changes” / “Request more information” require a message to the contributor.
* **Review and publication are separate.** Accepting makes a record eligible to become
  draft content; publishing happens in the Library.
* Turning an accepted record into a draft is **idempotent**: a second request returns
  the existing draft (`draftPageId` / `draftChapterId`).

## Suggested indexes
`volumes.slug`, `chapters.slug` (unique) · `chapters.volumeId + displayOrder` ·
`sections.chapterId + displayOrder` · `pages.sectionId + displayOrder` ·
`stories.status + createdAt`, `stories.contributorId` · `cityRequests.status + createdAt` ·
`messages.status + createdAt` · `users.email` (unique) · text index on
`chapters.cityName, chapters.nameAr, volumes.countryName, volumes.nameAr` for search.
