// Editor (admin) sign-in for the demo. Passwords are checked against salted
// hashes from the seed. Not real security: the backend must replace this.
import { ROLES, ACCOUNT_STATUS } from '../../domain/constants.js'
import { ApiError, forbidden } from '../errors.js'
import { logActivity } from './helpers.js'
import { verifyPassword } from './passwords.js'

/** Account fields that are safe to return to any client. */
export const publicAccount = (a) => {
  if (!a) return null
  const { passwordHash, passwordSalt, ...rest } = a // eslint-disable-line no-unused-vars
  return rest
}

export function editorAuthApi(store, editorSession, testAccess) {
  const current = () => {
    const id = editorSession.get()
    const a = id && store.read().accounts.find((x) => x.id === id)
    return a && a.role === ROLES.EDITOR && a.status === ACCOUNT_STATUS.ACTIVE ? a : null
  }
  const start = (a) => {
    editorSession.set(a.id)
    store.write((d) => logActivity(d, a.displayName, 'signed in to the library desk', { kind: 'account', id: a.id, label: a.displayName }))
    return publicAccount(a)
  }

  return {
    isEditor: () => Boolean(current()),
    api: {
      /** POST /api/admin/auth/login */
      async signIn({ email, password }) {
        if (!email?.trim() || !password) throw new ApiError(422, 'Enter your email and password.', { ...(!email?.trim() && { email: 'Required.' }), ...(!password && { password: 'Required.' }) })
        const a = store.read().accounts.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.role === ROLES.EDITOR)
        if (!(await verifyPassword(a, password))) throw new ApiError(401, 'That email and password do not match an editor account.')
        if (a.status !== ACCOUNT_STATUS.ACTIVE) throw forbidden('This editor account is suspended.')
        return start(a)
      },
      /** Testing shortcut, only while TEST_ACCESS.enabled. Remove before launch. */
      signInAsTestEditor() {
        if (!testAccess?.enabled) throw forbidden('Test access is turned off.')
        const a = store.read().accounts.find((x) => x.id === testAccess.editorId)
        if (!a) throw forbidden('The test editor account does not exist.')
        return start(a)
      },
      /** GET /api/admin/auth/me */
      me: () => publicAccount(current()),
      /** POST /api/admin/auth/logout */
      signOut() {
        editorSession.set(null)
        store.reload()
      },
    },
  }
}
