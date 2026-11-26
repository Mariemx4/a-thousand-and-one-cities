# Test accounts (demo only)

These credentials exist only in the demo data of this frontend build. They are
not real accounts and must be replaced when the backend is connected.

## Admin (library desk)

Sign in at **/admin/login**.

| Email | Password |
|---|---|
| `editor@example.org` | `Desk-0ce3e1af-Gabes` |

The seed keeps only a salted SHA-256 hash of this password
(`src/data/seed/records.js`). This is a demo gate, not real security: anything
running in the browser can be inspected or changed. Real authentication
(bcrypt, server sessions or JWT, rate limiting) belongs to the backend phase.

## Contributors

Sign in at **/account** with email and password. All seeded contributor accounts
share one test password:

| Email | Password | Note |
|---|---|---|
| `amira.bensalem@example.org` | `Reader-a4b6e9aa-Oasis` | the test user behind “Sign in as test user” |
| `yara.haddad@example.org` | same | |
| `tarek.mansour@example.org` | same | |
| `lina.moreau@example.org` | same | suspended: sign-in is refused |

New accounts can be registered at **/account → Register**.

## Test buttons

“Sign in as test user” (on `/account` and the story form) and “Sign in as test editor”
(on `/admin/login`) skip the password for testing. They are controlled by
`TEST_ACCESS.enabled` in `src/config.js`. Set it to `false` before launch; the buttons
disappear and the API refuses the shortcut.
