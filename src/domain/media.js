// Media rules: which links and files the library accepts.
import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from './constants.js'

const VIDEO_HOSTS = [
  { id: 'youtube', label: 'YouTube', test: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/ },
  { id: 'instagram', label: 'Instagram Reel', test: /(^|\.)instagram\.com$/ },
  { id: 'facebook', label: 'Facebook Reel', test: /(^|\.)facebook\.com$|(^|\.)fb\.watch$/ },
]

/**
 * Classify an external video link. Videos are never uploaded; only links to
 * YouTube, Instagram Reels or Facebook Reels are accepted.
 * @returns {null | {id, label, url} | {error}}
 */
export function detectVideo(url) {
  if (!url) return null
  let u
  try {
    u = new URL(url)
  } catch {
    return { error: 'That does not look like a full link.' }
  }
  if (u.protocol !== 'https:') return { error: 'Use an https:// link.' }
  const host = VIDEO_HOSTS.find((h) => h.test.test(u.hostname.replace(/^www\./, '')))
  if (!host) return { error: 'Only YouTube, Instagram Reel or Facebook Reel links.' }
  return { id: host.id, label: host.label, url: u.href }
}

/** An image link must be absolute https. */
export function checkImageUrl(url) {
  if (!url) return null
  try {
    return new URL(url).protocol === 'https:' ? null : 'Image links must start with https://'
  } catch {
    return 'That does not look like a full link.'
  }
}

/** Uploaded images: JPG, PNG or WebP, up to 2 MB in the demo. */
export function checkImageFile(file) {
  if (!file) return 'Choose a file.'
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image.'
  if (file.size > MAX_UPLOAD_BYTES) return 'Images can be up to 2 MB in this demo.'
  return null
}

/** Inline style for a media-level crop (e.g. hiding a lantern-slide mount). */
export const cropStyle = (m) => (m?.crop ? { transform: `scale(${m.crop.scale})`, transformOrigin: m.crop.origin } : undefined)
