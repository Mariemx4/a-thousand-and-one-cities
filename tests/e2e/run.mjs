// End-to-end checks for the definition of done.
// Run the dev server first (npm run dev), then: npm run test:e2e
// Env: E2E_URL (default http://localhost:5178), CHROME_PATH (Chrome/Edge executable).
import puppeteer from 'puppeteer-core'
import { existsSync } from 'node:fs'

const BASE = process.env.E2E_URL ?? 'http://localhost:5178'
const CHROME = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync)

// Test editor account, see docs/test-accounts.md
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'editor@example.org'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Desk-0ce3e1af-Gabes'

const USER_EMAIL = 'amira.bensalem@example.org'
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Reader-a4b6e9aa-Oasis'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let passed = 0
let failed = 0
const check = (cond, msg) => {
  if (cond) passed++
  else failed++
  console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`)
}
const section = (t) => console.log(`\n${t}`)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const errors = []

async function newPage(width = 1440, height = 900) {
  const p = await browser.newPage()
  const mobile = width < 768
  await p.setViewport({ width, height, isMobile: mobile, hasTouch: mobile })
  p.on('pageerror', (e) => errors.push(e.message))
  return p
}
const go = (p, path) => p.goto(BASE + path, { waitUntil: 'networkidle2' })
const text = (p, sel = 'body') => p.$eval(sel, (e) => e.innerText)
const waitText = (p, t, timeout = 6000) => p.waitForFunction((s) => document.body.innerText.includes(s), { timeout }, t).then(() => true, () => false)
async function clickText(p, selector, t) {
  const ok = await p.evaluate((sel, s) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null && e.textContent.trim().includes(s))
    el?.click()
    return Boolean(el)
  }, selector, t)
  if (!ok) throw new Error(`No visible ${selector} containing “${t}”`)
  await sleep(450)
}
async function fill(p, selector, value) {
  await p.waitForSelector(selector, { visible: true })
  await p.click(selector, { clickCount: 3 })
  await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control')
  await p.keyboard.press('Backspace')
  if (value) await p.type(selector, value)
}
const select = (p, selector, value) => p.select(selector, value)
const autosave = () => sleep(1100)
const progress = (p) => p.$eval('.progress', (e) => e.textContent.trim())

try {
  // ------------------------------------------------------------------
  section('1. Doors, shelves, book, contents, page turns (desktop)')
  let p = await newPage()
  await go(p, '/')
  await p.evaluate(() => { localStorage.clear(); })
  await go(p, '/')
  await p.evaluate(() => window.scrollTo(0, 1200)); await sleep(200)
  check((await p.evaluate(() => window.scrollY)) > 1000, 'page scrolls with the doors closed')
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.click('.leaf-panel .btn-enter'); await sleep(1700)
  check(await p.$eval('.vestibule', (e) => e.classList.contains('is-open')), 'doors open')
  check((await p.$$('.shelf')).length === 6, 'all six continent shelves are visible together')
  const comingSoon = await p.$$eval('.niche-empty', (n) => n.length)
  check(comingSoon === 4, 'the four other shelves say “Coming soon”')
  await p.evaluate(() => window.scrollTo(0, 99999)); await sleep(200)
  check((await p.evaluate(() => window.scrollY)) > 1500, 'page scrolls with the doors open')
  await p.evaluate(() => window.scrollTo(0, 0))
  await p.click('.volume[data-volume="vol_tunisia"]'); await sleep(1600)
  check(p.url().endsWith('/books/tunisia'), 'the Tunisia volume opens in the reader')
  const start = await progress(p)
  const box = await p.$eval('.book-block', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  await p.mouse.click(box.x + box.w * 0.8, box.y + box.h / 2); await sleep(1200)
  const afterRight = await progress(p)
  await p.keyboard.press('ArrowRight'); await sleep(1200)
  await p.mouse.click(box.x + box.w * 0.2, box.y + box.h / 2); await sleep(1200)
  check(afterRight !== start && (await progress(p)) === afterRight, `click right page → forward, left page → back (${start} → ${afterRight})`)
  await clickText(p, '.bar-btn', 'Contents')
  await clickText(p, '.drawer-list button', 'Gabès'); await sleep(1200)
  check((await text(p, '.book')).includes('Where the oasis meets the sea'), 'Contents jumps to the Gabès chapter opener')
  await clickText(p, '.text-btn', 'Back to shelves'); await sleep(900)
  check(await p.$eval('.vestibule', (e) => e.classList.contains('is-open')), 'Back to shelves returns to the open shelves')
  await p.close()

  // ------------------------------------------------------------------
  section('2. Surprise Me, search, atlas')
  p = await newPage()
  await go(p, '/')
  await clickText(p, '.nav-link', 'Surprise Me'); await sleep(1200)
  check(/\/books\/[a-z-]+\/[a-z-]+$/.test(p.url()) && (await p.$('.pg.chapter')) !== null, 'Surprise Me opens a city chapter')
  await go(p, '/')
  await p.click('.icon-btn[aria-label="Search the library"]')
  await p.type('.input-search', 'اللاذقية'); await sleep(500)
  await clickText(p, '.result', 'Latakia'); await sleep(1200)
  check(p.url().endsWith('/books/syria/latakia'), 'Arabic search finds and opens Latakia')
  await go(p, '/')
  await p.evaluate(() => document.getElementById('atlas').scrollIntoView())
  await clickText(p, '.atlas-map > .a-label', 'Gabès'); await sleep(1200)
  check(p.url().endsWith('/books/tunisia/gabes'), 'the atlas opens the Gabès chapter')
  await p.close()

  // ------------------------------------------------------------------
  section('3. Storefront forms → Admin (story, city suggestion, contact)')
  p = await newPage()
  await go(p, '/share-a-story')
  check(await waitText(p, 'Sign in to share a story'), 'sharing a story asks for a contributor account')
  check((await p.$$('.demo-account')).length === 0 && (await text(p)).includes('Sign in as test user'), 'the sign-in shows a form, not a list of users, with one test button')
  await fill(p, '#si-email', USER_EMAIL)
  await fill(p, '#si-password', 'not-the-password-1')
  await clickText(p, 'button[type=submit]', 'Sign in')
  check(await waitText(p, 'do not match'), 'a wrong contributor password is refused')
  await fill(p, '#si-password', USER_PASSWORD)
  await clickText(p, 'button[type=submit]', 'Sign in')
  await p.waitForSelector('#f-cityId')
  check(true, 'the contributor signs in with email and password')
  await select(p, '#f-cityId', 'ch_gabes')
  await select(p, '#f-category', 'experience')
  await fill(p, '#f-title', 'The henna night')
  await fill(p, '#f-excerpt', 'The evening before a wedding in Gabès, when the women gather to paint henna.')
  await fill(p, '#f-body', 'The bride sits in the middle. The oldest aunt mixes the paste.\n\nBy midnight the songs have started.')
  await clickText(p, 'button[type=submit]', 'Send for review')
  check(await waitText(p, 'Your story is with the editors'), 'story submission shows a confirmation')

  await go(p, '/suggest-a-city')
  await fill(p, '#f-city', 'Kairouan')
  await fill(p, '#f-country', 'Tunisia')
  await fill(p, '#f-reason', 'The first Islamic city of the Maghreb, famous for its Great Mosque, carpets and makroudh pastries.')
  await clickText(p, 'button[type=submit]', 'Send suggestion')
  check(await waitText(p, 'Kairouan is on our list'), 'city suggestion shows a confirmation')

  await go(p, '/contact')
  await fill(p, '#f-subject', 'Using photos in a school exhibition')
  await fill(p, '#f-message', 'May we print two photographs from the Gabès chapter for a school exhibition?')
  await clickText(p, 'button[type=submit]', 'Send message')
  check(await waitText(p, 'Your message has reached the editors'), 'contact message shows a confirmation')

  await p.reload({ waitUntil: 'networkidle2' })
  await go(p, '/account')
  check(await waitText(p, 'The henna night') && (await text(p)).includes('Kairouan, Tunisia'), 'after a reload, the contributor sees both submissions in their account')

  // Admin sign-in
  await go(p, '/admin/stories')
  check(p.url().includes('/admin/login'), 'the admin redirects to its login page when signed out')
  await fill(p, '#login-email', ADMIN_EMAIL)
  await fill(p, '#login-password', 'not-the-password')
  await clickText(p, 'button[type=submit]', 'Sign in')
  check(await waitText(p, 'do not match'), 'a wrong password is refused')
  await fill(p, '#login-password', ADMIN_PASSWORD)
  await clickText(p, 'button[type=submit]', 'Sign in'); await sleep(900)
  check(p.url().endsWith('/admin/stories'), 'the editor signs in and lands on the page they asked for')

  // Admin: story
  await go(p, '/admin/stories')
  await clickText(p, '.queue-row', 'The henna night')
  check(await waitText(p, 'Submitted material'), 'Admin finds the story in the queue')
  await clickText(p, '.review-actions .adm-btn', 'Start review')
  await p.type('#note-new', 'Check whether we can name the family.')
  await clickText(p, '.note-form .adm-btn', 'Add note')
  await clickText(p, '.review-actions .adm-btn', 'Accept')
  await clickText(p, '.draft-panel .adm-btn', 'Create draft page')
  await p.waitForSelector('#cp-section')
  await clickText(p, '.dialog .adm-btn', 'Create draft page'); await sleep(1200)
  check(p.url().includes('/admin/library?node=page:'), 'an accepted story becomes a draft page in the Library')
  const storyPageNode = new URL(p.url()).searchParams.get('node')
  await go(p, '/admin/stories')
  await clickText(p, '.queue-row', 'The henna night')
  check(await waitText(p, 'Open in Library') && !(await text(p)).includes('Create draft page'), 'the story now links to its draft instead of offering a duplicate')

  // contributor sees the status, not the note
  await go(p, '/account')
  const acc = await text(p)
  check(acc.includes('Accepted') && !acc.includes('Check whether we can name the family'), 'contributor sees “Accepted” but not the internal note')

  // Admin: suggestion → chapter
  await go(p, '/admin/suggestions')
  await clickText(p, '.queue-row', 'Kairouan')
  await clickText(p, '.review-actions .adm-btn', 'Request more information')
  await p.type('#rv-msg', 'Could your chapter contribute the first stories?')
  await clickText(p, '.dialog .adm-btn', 'Request more information')
  await clickText(p, '.review-actions .adm-btn', 'Accept')
  await clickText(p, '.draft-panel .adm-btn', 'Create draft chapter')
  await p.waitForSelector('#cc-volume')
  await select(p, '#cc-volume', 'vol_tunisia')
  await clickText(p, '.dialog .adm-btn', 'Create draft chapter'); await sleep(1200)
  check(p.url().includes('/admin/library?node=chapter:'), 'an accepted suggestion becomes a draft chapter')
  const chapterNode = new URL(p.url()).searchParams.get('node')

  // Admin: contact
  await go(p, '/admin/inbox')
  await clickText(p, '.queue-row', 'Using photos in a school exhibition')
  await p.type('#reply', 'Yes — please credit each photograph as shown on the page.')
  await clickText(p, '.reply .adm-btn', 'Save draft')
  const inbox = await text(p)
  check(inbox.includes('Draft · not sent') && inbox.includes('Draft saved') && !/\b(email|message) (was )?sent\b/i.test(inbox), 'the reply is saved as a draft and never reported as sent')
  await clickText(p, '.review-actions .adm-btn', 'Mark resolved')
  check(await waitText(p, 'Resolved'), 'the message can be resolved')

  // ------------------------------------------------------------------
  section('4. Draft chapter → section → pages → preview → publish')
  await go(p, `/admin/library?node=${chapterNode}`)
  await fill(p, '#ed-nameAr', 'القيروان')
  await fill(p, '#ed-openingTitle', 'The city of the Great Mosque')
  await fill(p, '#ed-openingText', 'Founded in 670, Kairouan was the first great Islamic city of the Maghreb.')
  await fill(p, '#ed-lat', '35.6781'); await fill(p, '#ed-lng', '10.0963')
  await autosave()
  await p.evaluate(() => [...document.querySelectorAll('.t-ch')].find((n) => n.querySelector('.t-chapter')?.textContent.includes('Kairouan')).querySelector(':scope > .t-add button').click())
  await sleep(900)
  await fill(p, '#ed-title', 'The medina')
  await autosave()
  const inSection = (label) => p.evaluate((l) => [...document.querySelectorAll('.t-sec')].find((n) => n.querySelector('.t-section')?.textContent.includes('The medina')).querySelectorAll('.t-add button').forEach((b) => b.textContent.includes(l) && b.click()), label)
  await inSection('Image page'); await sleep(900)
  await fill(p, '#ed-title', 'Carpet market')
  await clickText(p, '.img-fields .seg button', 'Image URL')
  await fill(p, '#ed-imageUrl', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f5/ETH-BIB-Gab%C3%A8s%2C_Brandung-Dia_247-03566.tif/lossy-page1-1280px-ETH-BIB-Gab%C3%A8s%2C_Brandung-Dia_247-03566.tif.jpg')
  await fill(p, '#ed-alt', 'Rolled carpets stacked against a whitewashed wall.')
  await fill(p, '#ed-videoUrl', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await autosave()
  const imageNode = new URL(p.url()).searchParams.get('node')
  await inSection('Text page'); await sleep(900)
  await fill(p, '#ed-title', 'Makroudh at dawn')
  await fill(p, '#ed-body', 'The bakeries open before the call to prayer.')
  await autosave()
  const textNode = new URL(p.url()).searchParams.get('node')

  await go(p, '/books/tunisia')
  const contentsBefore = await p.evaluate(() => document.body.innerText)
  check(!contentsBefore.includes('Kairouan'), 'the draft chapter is not in the public book')
  await p.click('.icon-btn[aria-label="Search the library"]'); await p.type('.input-search', 'Kairouan'); await sleep(500)
  check((await text(p, '.dialog')).includes('No published chapter matches'), 'the draft chapter is not in public search')

  await go(p, `/admin/library?node=${imageNode}`)
  await clickText(p, '.lib-actions .adm-btn', 'Preview in reader'); await sleep(1300)
  const prev = await text(p)
  check(/admin preview/i.test(prev) && prev.includes('Carpet market') && prev.includes('Watch on YouTube'), 'Admin preview shows the draft image page with its video link')
  const findTextPage = () => p.$$eval('.half .pg.text', (els) => els.map((e) => e.innerText).find((t) => t.includes('Makroudh at dawn')) ?? '')
  let textPage = await findTextPage()
  if (!textPage) { await p.keyboard.press('ArrowRight'); await sleep(1200); textPage = await findTextPage() }
  check(textPage.includes('Makroudh at dawn') && !/watch on/i.test(textPage), 'the text page has no video link')

  // publish chapter, section and both pages
  for (const node of [chapterNode, textNode, imageNode]) {
    await go(p, `/admin/library?node=${node}`)
    await clickText(p, '.status-box .seg button', 'Published'); await sleep(900)
  }
  await p.evaluate(() => [...document.querySelectorAll('.t-section')].find((n) => n.textContent.includes('The medina')).querySelector('.t-main').click())
  await sleep(600)
  await clickText(p, '.status-box .seg button', 'Published'); await sleep(900)
  await go(p, `/admin/library?node=${storyPageNode}`)
  await clickText(p, '.status-box .seg button', 'Published'); await sleep(900)

  await p.reload({ waitUntil: 'networkidle2' })
  await go(p, '/books/tunisia')
  await clickText(p, '.bar-btn', 'Contents')
  const drawer = await text(p, '.drawer')
  check(drawer.includes('Kairouan') && drawer.includes('Gabès'), 'after publishing (and a reload), Kairouan is in the contents')
  await p.keyboard.press('Escape')
  await p.click('.icon-btn[aria-label="Search the library"]'); await p.type('.input-search', 'القيروان'); await sleep(500)
  check((await text(p, '.dialog')).includes('Kairouan'), '…and in search (Arabic too)')
  await p.keyboard.press('Escape')
  await go(p, '/books/tunisia/kairouan')
  let seen = ''
  for (let i = 0; i < 4; i++) { seen += await text(p, '.book'); await p.keyboard.press('ArrowRight'); await sleep(1100) }
  check(seen.includes('Carpet market') && seen.includes('Watch on YouTube') && seen.includes('Makroudh at dawn'), 'the published pages appear in the public reader')
  await go(p, '/books/tunisia/gabes')
  seen = ''
  for (let i = 0; i < 9; i++) { seen += await text(p, '.book'); await p.keyboard.press('ArrowRight'); await sleep(1100) }
  check(seen.includes('The henna night') && seen.includes('Shared by Amira Ben Salem'), 'the contributor’s story is in the public book, credited')
  await go(p, '/account')
  check(await waitText(p, 'Published'), 'the contributor sees their story as Published')
  await p.close()

  // ------------------------------------------------------------------
  section('4b. Registration and test buttons')
  p = await newPage()
  await go(p, '/account')
  if (await p.$('.account-actions')) { await clickText(p, '.account-actions button', 'Sign out') }
  await go(p, '/account?mode=register')
  await fill(p, '#f-displayName', 'Salma Gharbi')
  await fill(p, '#f-email', 'salma.test@example.org')
  await fill(p, '#f-password', 'short')
  await fill(p, '#f-confirmPassword', 'short')
  await clickText(p, 'button[type=submit]', 'Create account')
  const regErrors = await text(p)
  check(regErrors.includes('at least') && regErrors.includes('Please agree') && (await p.$eval('#f-phone', (e) => e.getAttribute('aria-invalid'))) === 'true', 'registration requires a phone number and validates password, country and consent')
  await fill(p, '#f-phone', '+216 22 333 444')
  await fill(p, '#f-password', 'palms-and-sea-2026')
  await fill(p, '#f-confirmPassword', 'palms-and-sea-2026')
  await fill(p, '#f-country', 'Tunisia')
  await fill(p, '#f-city', 'Gabès')
  await clickText(p, '.interest-chips label', 'Taste')
  await p.click('.consent input')
  await clickText(p, 'button[type=submit]', 'Create account')
  check(await waitText(p, 'Your stories') && (await text(p)).includes('Salma Gharbi') && (await text(p)).includes('+21622333444'), 'a new contributor registers (with phone) and lands in their account')
  await clickText(p, '.account-actions button', 'Sign out')
  await go(p, '/account')
  await clickText(p, '.test-access button', 'Sign in as test user')
  check(await waitText(p, 'Amira Ben Salem'), '“Sign in as test user” signs in the test contributor')
  await go(p, '/admin')
  await clickText(p, '.adm-link', 'Sign out'); await sleep(600)
  await go(p, '/admin/login')
  await clickText(p, '.test-access button', 'Sign in as test editor'); await sleep(900)
  check(p.url().endsWith('/admin'), '“Sign in as test editor” opens the library desk')
  await p.close()

  // ------------------------------------------------------------------
  section('5. Phone width')
  p = await newPage(390, 844)
  await go(p, '/')
  check(await p.$eval('.surprise-pill', (e) => e.offsetParent !== null), 'Surprise Me is visible in the phone header')
  const crossing = await p.evaluate(() => {
    const seam = document.querySelector('.vestibule').getBoundingClientRect().width / 2
    return [...document.querySelectorAll('.leaf-panel .postcard, .leaf-panel .m-lockup')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.left < seam - 1 && r.right > seam + 1 }).length
  })
  check(crossing === 0, 'nothing on the door leaves crosses the seam')
  await p.click('.door-sign .btn-enter'); await sleep(1700)
  check((await p.$$eval('.shelf', (s) => s.length)) === 6 && (await p.$eval('.shelves', (e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)) === 1, 'one shelf per row on phones')
  await p.click('.volume[data-volume="vol_syria"]'); await sleep(1600)
  const mbox = await p.$eval('.book-block', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  const m0 = await progress(p)
  await p.mouse.click(mbox.x + mbox.w * 0.8, mbox.y + mbox.h / 2); await sleep(1200)
  const m1 = await progress(p)
  await p.mouse.click(mbox.x + mbox.w * 0.1, mbox.y + mbox.h / 2); await sleep(1200)
  check(m1 !== m0 && (await progress(p)) === m0, `tapping turns pages on the phone reader (${m0} → ${m1} → ${m0})`)
  const phonePages = Number(m0.split('/')[1])
  const p2 = await newPage()
  await go(p2, '/books/syria')
  const desktopSpreads = Number((await progress(p2)).split('/')[1])
  check(phonePages === desktopSpreads * 2 - 2, `no page is lost between the spread (${desktopSpreads} spreads) and the phone reader (${phonePages} pages)`)
  await p2.close()
  await go(p, '/admin/stories')
  check((await p.$eval('.adm-side', (e) => getComputedStyle(e).flexDirection)) === 'row', 'Admin switches to top navigation on phones')
  check((await p.$('.proto-switch')) === null, 'there is no prototype switch: the layout follows the screen size')
  await clickText(p, '.adm-link', 'Sign out'); await sleep(700)
  await go(p, '/admin')
  check(p.url().includes('/admin/login'), 'after signing out, the admin is closed again')
  await p.close()
} catch (e) {
  failed++
  console.log(`  ✗ stopped: ${e.message}`)
}

check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`)
await browser.close()
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
