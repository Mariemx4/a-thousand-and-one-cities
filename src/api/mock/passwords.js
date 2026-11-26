// Demo password hashing (salted SHA-256 via Web Crypto). Good enough to keep
// plain passwords out of stored demo data; the backend must use bcrypt or argon2.

export async function sha256Hex(text) {
  const bytes = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function newSalt() {
  return [...globalThis.crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password) {
  const salt = newSalt()
  return { passwordSalt: salt, passwordHash: await sha256Hex(`${salt}:${password}`) }
}

export async function verifyPassword(account, password) {
  if (!account?.passwordHash || !password) return false
  return (await sha256Hex(`${account.passwordSalt}:${password}`)) === account.passwordHash
}
