// Shared vocabulary of the domain. Pure data, no React, no storage.

/** The seven story categories (MVP brief). Every chapter section is filed under one. */
export const CATEGORIES = [
  { id: 'taste', name: 'Taste', hint: 'Food, drinks, local products' },
  { id: 'listen', name: 'Listen', hint: 'Music and sounds' },
  { id: 'discover', name: 'Discover', hint: 'Places, monuments, nature' },
  { id: 'create', name: 'Create', hint: 'Crafts and art' },
  { id: 'experience', name: 'Experience', hint: 'Traditions and events' },
  { id: 'travel', name: 'Travel', hint: 'Trips and itineraries by budget and duration' },
  { id: 'secret', name: 'Local Secret', hint: 'What tourists usually miss' },
]
export const categoryName = (id) => CATEGORIES.find((c) => c.id === id)?.name ?? 'Section'

/** Publication state of library content (volumes, chapters, sections, pages). */
export const PUBLICATION = { DRAFT: 'draft', PUBLISHED: 'published' }

/** Review states. Review is separate from publication: accepting only makes a record eligible for draft content. */
export const STORY_STATUS = {
  NEW: 'new',
  IN_REVIEW: 'in_review',
  CHANGES_REQUESTED: 'changes_requested',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
}
export const SUGGESTION_STATUS = {
  NEW: 'new',
  IN_REVIEW: 'in_review',
  NEEDS_INFO: 'needs_info',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
}
export const MESSAGE_STATUS = { NEW: 'new', OPEN: 'open', RESOLVED: 'resolved' }
export const ACCOUNT_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended' }
export const ROLES = { CONTRIBUTOR: 'contributor', EDITOR: 'editor' }

/** Human labels and badge tones, shared by storefront and admin. */
export const STATUS_META = {
  draft: { label: 'Draft', tone: 'terracotta' },
  published: { label: 'Published', tone: 'teal' },
  new: { label: 'New', tone: 'plum' },
  in_review: { label: 'In review', tone: 'ink' },
  changes_requested: { label: 'Changes requested', tone: 'terracotta' },
  needs_info: { label: 'More information requested', tone: 'terracotta' },
  accepted: { label: 'Accepted', tone: 'teal' },
  declined: { label: 'Declined', tone: 'mute' },
  open: { label: 'Open', tone: 'ink' },
  resolved: { label: 'Resolved', tone: 'mute' },
  active: { label: 'Active', tone: 'teal' },
  suspended: { label: 'Suspended', tone: 'terracotta' },
}

/** Story formats accepted from contributors. */
export const STORY_FORMATS = [
  { id: 'text', name: 'Written story' },
  { id: 'image', name: 'Photograph' },
  { id: 'video', name: 'Video link' },
]

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
