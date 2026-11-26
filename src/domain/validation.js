// Form validation shared by the storefront forms and the mock API.
// Each validator returns an object of field → message; empty means valid.
import { detectVideo, checkImageUrl } from './media.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const required = (v) => (typeof v === 'string' ? v.trim() : v) ? null : 'Required.'
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v))

export function validateEmail(v) {
  return !v?.trim() ? 'Required.' : EMAIL.test(v.trim()) ? null : 'Enter a full email address.'
}

export function validateLinks(text) {
  const bad = splitLinks(text).find((l) => {
    try { return !/^https?:$/.test(new URL(l).protocol) } catch { return true }
  })
  return bad ? `“${bad}” is not a full link.` : null
}
export const splitLinks = (text) => String(text ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)

export function validateStory(f) {
  const e = {
    cityId: f.cityId ? null : 'Choose a city.',
    proposedCity: f.cityId === 'other' ? required(f.proposedCity) : null,
    proposedCountry: f.cityId === 'other' ? required(f.proposedCountry) : null,
    category: required(f.category),
    title: required(f.title) || (f.title.trim().length > 90 ? 'Keep the title under 90 characters.' : null),
    excerpt: required(f.excerpt) || (f.excerpt.trim().length > 280 ? 'Keep the description under 280 characters.' : null),
  }
  if (f.format === 'text') e.body = required(f.body)
  if (f.format === 'image') {
    e.image = f.imageDataUrl || f.imageUrl ? checkImageUrl(f.imageDataUrl ? null : f.imageUrl) : 'Add a photograph or an image link.'
    e.alt = required(f.alt)
  }
  if (f.format === 'video') {
    const v = detectVideo(f.videoUrl)
    e.videoUrl = !f.videoUrl ? 'Paste a video link.' : v?.error ?? null
  }
  return clean(e)
}

export function validateSuggestion(f) {
  return clean({
    city: required(f.city),
    country: required(f.country),
    reason: required(f.reason) || (f.reason.trim().length < 20 ? 'Tell us a little more (at least 20 characters).' : null),
    name: required(f.name),
    email: validateEmail(f.email),
    links: validateLinks(f.links),
  })
}

export function validateContact(f) {
  return clean({ name: required(f.name), email: validateEmail(f.email), subject: required(f.subject), message: required(f.message) })
}

/** International phone number: optional +, 8–15 digits, spaces/dashes/brackets allowed. */
export function validatePhone(v) {
  if (!v?.trim()) return 'Required.'
  if (!/^\+?[0-9\s().-]+$/.test(v.trim())) return 'Use digits, spaces and an optional + for the country code.'
  const digits = v.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return 'Enter a full number with its country code, e.g. +216 20 123 456.'
  return null
}

/** Store phones in one shape: "+216 20123456" style, digits only after the +. */
export const normalizePhone = (v) => {
  const t = v.trim()
  return (t.startsWith('+') ? '+' : '') + t.replace(/\D/g, '')
}

export const PASSWORD_MIN = 10

export function validatePassword(pw) {
  if (!pw) return 'Required.'
  if (pw.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (!/[a-zA-Z]/.test(pw) || !/[0-9\W_]/.test(pw)) return 'Mix letters with numbers or symbols.'
  return null
}

/** Profile edits: the same required contact fields as registration. */
export function validateProfile(f) {
  return clean({ displayName: required(f.displayName), phone: validatePhone(f.phone), city: required(f.city), country: required(f.country), bio: (f.bio ?? '').length > 280 ? 'Keep it under 280 characters.' : null })
}

export function validateRegistration(f) {
  return clean({
    displayName: required(f.displayName),
    email: validateEmail(f.email),
    phone: validatePhone(f.phone),
    password: validatePassword(f.password),
    confirmPassword: f.confirmPassword !== f.password ? 'The passwords do not match.' : null,
    city: required(f.city),
    country: required(f.country),
    bio: (f.bio ?? '').length > 280 ? 'Keep it under 280 characters.' : null,
    consent: f.consent ? null : 'Please agree to continue.',
  })
}
