import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from 'playwright'

// The caller must start a local mock-auth backend against a freshly created,
// disposable PostgreSQL database. This script deliberately creates test data.
const base = new URL(process.env.APP_URL ?? 'http://127.0.0.1:18080')
const db = process.env.TASK54_TEST_DB_NAME ?? ''
const dbPort = process.env.TASK54_TEST_DB_PORT ?? ''
if (process.env.TASK54_DISPOSABLE_TEST_ENV !== '1' || base.hostname !== '127.0.0.1' ||
    !/^task54_e2e_[a-z0-9_]+$/.test(db) || !/^\d+$/.test(dbPort) || !process.env.PGPASSWORD) {
  throw new Error('Use a disposable task54_e2e_* database on localhost and set TASK54_DISPOSABLE_TEST_ENV=1')
}

const sql = query => execFileSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
  '-h', '127.0.0.1', '-p', dbPort, '-U', 'postgres', '-d', db, '-c', query],
{ encoding: 'utf8' }).trim()
const traceDir = mkdtempSync(join(tmpdir(), 'task54-browser-'))
const token = randomUUID()
function makeRound(label) {
  const title = `Task54 ${label} ${token}`
  const row = sql(`WITH r AS (
    INSERT INTO recruitment_rounds (club_id,title,academic_year,semester,description,opens_at,closes_at,confirmation_deadline,publication_status,published_at,created_by)
    SELECT c.id,'${title}',2569,1,'isolated test',now()-interval '1 day',now()+interval '1 day',now()+interval '2 days','PUBLISHED',now()-interval '1 day',u.id
    FROM clubs c CROSS JOIN users u WHERE c.name='ชมรมเขียนโปรแกรม' AND u.tu_username='seed_admin'
    RETURNING id,club_id), q AS (
    INSERT INTO application_questions (round_id,prompt,is_required,display_order,max_length)
    SELECT id,'คำถามทดสอบ Task54',true,1,1000 FROM r RETURNING round_id)
    SELECT r.id || '|' || r.club_id FROM r JOIN q ON q.round_id=r.id`)
  const [id, club] = row.split('|')
  assert.match(id ?? '', /^\d+$/); assert.match(club ?? '', /^\d+$/)
  return { id, club, title }
}

class ApplicationPage {
  constructor(page, round) { this.page = page; this.round = round }
  async open() {
    await this.page.goto(`${base.origin}/clubs/${this.round.club}/rounds/${this.round.id}/apply`)
    await this.page.getByLabel('เหตุผลที่สนใจเข้าร่วมชมรมนี้').waitFor()
  }
  async fill(motivation, answer, withLink = false) {
    await this.page.getByLabel('เหตุผลที่สนใจเข้าร่วมชมรมนี้').fill(motivation)
    await this.page.getByLabel(/คำถามทดสอบ Task54/).fill(answer)
    if (withLink) {
      await this.page.getByRole('button', { name: /เพิ่มลิงก์เอกสาร/ }).click()
      await this.page.getByLabel('ชื่อ/คำอธิบายเอกสาร').fill(' Portfolio ')
      await this.page.getByLabel('URL ลิงก์เอกสาร').fill(' https://example.edu/portfolio ')
    }
    await this.page.getByRole('button', { name: 'ตรวจสอบข้อมูลใบสมัคร' }).click()
    await this.page.getByRole('checkbox', { name: /ฉันตรวจสอบข้อมูล/ }).check()
  }
  async submit() {
    const pending = this.page.waitForResponse(r => r.request().method() === 'POST' &&
      new URL(r.url()).pathname === `/api/v1/rounds/${this.round.id}/applications`)
    await this.page.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }).click()
    return pending
  }
}

const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) })
const context = await browser.newContext()
await context.tracing.start({ screenshots: true, snapshots: true })
const page = await context.newPage()
await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort())
try {
  const first = makeRound('happy')
  const second = makeRound('closed')
  const third = makeRound('suspended')
  const form = new ApplicationPage(page, first)
  await page.goto(`${base.origin}/clubs/${first.club}/rounds/${first.id}/apply`)
  await page.getByRole('heading', { name: 'เข้าสู่ระบบ' }).waitFor()
  await page.getByLabel('รหัสนักศึกษา / TU Great ID').fill('applicant-demo')
  await page.getByLabel('รหัสผ่าน').fill('tu-clubhub-demo')
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await page.getByLabel('เหตุผลที่สนใจเข้าร่วมชมรมนี้').waitFor()
  await page.getByText('applicant-demo@dome.tu.ac.th', { exact: true }).waitFor()
  await page.getByText('Demo Faculty', { exact: true }).waitFor()
  await page.getByText(/^ap•+mo$/).waitFor()
  // Verify the app is connected to this exact disposable database before POSTing.
  const liveForm = await context.request.get(`${base.origin}/api/v1/rounds/${first.id}/application-form`)
  assert.equal(liveForm.status(), 200)
  assert.equal((await liveForm.json()).round.title, first.title)
  const motivationField = page.getByLabel('เหตุผลที่สนใจเข้าร่วมชมรมนี้')
  const answerField = page.getByLabel(/คำถามทดสอบ Task54/)
  await motivationField.fill('😀'.repeat(2000))
  await answerField.fill('😀'.repeat(1000))
  assert.equal(Array.from(await motivationField.inputValue()).length, 2000)
  assert.equal(Array.from(await answerField.inputValue()).length, 1000)
  const motivation = 'ข้อความ <script>window.__task54xss=1</script> 🚀'
  const answer = 'คำตอบ ทดสอบ 🌱'
  await form.fill(` ${motivation} `, ` ${answer} `, true)
  assert.ok((await page.getByRole('main').innerText()).includes(motivation))
  assert.equal(await page.evaluate(() => window.__task54xss), undefined)
  const created = await form.submit()
  assert.equal(created.status(), 201)
  const receipt = await created.json()
  assert.equal(receipt.status, 'SUBMITTED'); assert.match(receipt.id, /^\d+$/)
  await page.getByRole('heading', { name: 'ส่งใบสมัครสำเร็จเรียบร้อยแล้ว!' }).waitFor()
  await page.getByRole('link', { name: 'ไปยังประวัติการสมัคร' }).click()
  const card = page.getByRole('article').filter({ has: page.locator(`a[href="/me/applications/${receipt.id}"]`) })
  await card.waitFor(); assert.match(await card.innerText(), /รอพิจารณา/)
  const saved = JSON.parse(sql(`SELECT json_build_object('status',a.status,'motivation',a.motivation,
    'answer',(SELECT answer_text FROM application_answers WHERE application_id=a.id),
    'url',(SELECT url FROM application_links WHERE application_id=a.id),
    'history',(SELECT count(*) FROM application_status_history WHERE application_id=a.id AND from_status IS NULL AND to_status='SUBMITTED' AND actor_id=a.applicant_id AND changed_at=a.submitted_at))
    FROM applications a WHERE a.id=${receipt.id} AND a.round_id=${first.id}`))
  assert.deepEqual(saved, { status: 'SUBMITTED', motivation, answer, url: 'https://example.edu/portfolio', history: 1 })
  await form.open(); await form.fill('สมัครซ้ำ', 'คำตอบ')
  const duplicate = await form.submit(); assert.equal(duplicate.status(), 409)
  assert.equal((await duplicate.json()).reason, 'APPLICATION_ALREADY_EXISTS')
  assert.equal(Number(sql(`SELECT count(*) FROM applications WHERE round_id=${first.id}`)), 1)
  const closedForm = new ApplicationPage(page, second)
  await closedForm.open(); await closedForm.fill('รอบปิด', 'คำตอบ')
  const chair = await browser.newContext()
  try {
    let csrf = await (await chair.request.get(`${base.origin}/api/v1/auth/csrf`)).json()
    const login = await chair.request.post(`${base.origin}/api/v1/auth/login`, { headers: { [csrf.headerName]: csrf.token }, data: { username: 'student-demo', password: 'tu-clubhub-demo' } })
    assert.equal(login.status(), 200)
    const round = await (await chair.request.get(`${base.origin}/api/v1/clubs/${second.club}/rounds/${second.id}`)).json()
    csrf = await (await chair.request.get(`${base.origin}/api/v1/auth/csrf`)).json()
    const close = await chair.request.patch(`${base.origin}/api/v1/clubs/${second.club}/rounds/${second.id}`, { headers: { [csrf.headerName]: csrf.token }, data: { action: 'CLOSE', version: round.version } })
    assert.equal(close.status(), 200)
  } finally { await chair.close() }
  const closed = await closedForm.submit(); assert.equal(closed.status(), 409)
  assert.equal((await closed.json()).reason, 'ROUND_CLOSED')
  assert.equal(Number(sql(`SELECT count(*) FROM applications WHERE round_id=${second.id}`)), 0)
  const suspendedForm = new ApplicationPage(page, third)
  await suspendedForm.open(); await suspendedForm.fill('บัญชีถูกระงับ', 'คำตอบ')
  sql("UPDATE users SET account_status='SUSPENDED' WHERE tu_username='applicant-demo'")
  try {
    const csrf = page.waitForResponse(r => r.request().method() === 'GET' &&
      new URL(r.url()).pathname === '/api/v1/auth/csrf')
    await page.getByRole('button', { name: 'ยืนยันและส่งใบสมัคร' }).click()
    const denied = await csrf
    assert.equal(denied.status(), 403)
    assert.equal((await denied.json()).code, 'ACCOUNT_NOT_ALLOWED')
    await page.getByRole('heading', { name: 'เข้าสู่ระบบ' }).waitFor()
    await page.getByText('บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ').waitFor()
    assert.equal(Number(sql(`SELECT count(*) FROM applications WHERE round_id=${third.id}`)), 0)
  } finally {
    sql("UPDATE users SET account_status='ACTIVE' WHERE tu_username='applicant-demo'")
  }
  console.log('PASS: browser → HTTP → PostgreSQL; profile, Unicode, receipt/history, duplicate, closed round and suspended account')
  await context.tracing.stop()
} catch (error) {
  await page.screenshot({ path: join(traceDir, 'failure.png'), fullPage: true }).catch(() => {})
  await context.tracing.stop({ path: join(traceDir, 'trace.zip') }).catch(() => {})
  console.error(`Failure evidence: ${traceDir}`)
  throw error
} finally { await context.close(); await browser.close() }
