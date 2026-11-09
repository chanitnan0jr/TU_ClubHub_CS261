export interface ProblemFieldError {
  field: string
  code?: string
  message: string
}

/** A non-2xx response, parsed from the API's application/problem+json body. */
export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors: ProblemFieldError[]
  readonly reason?: string
  readonly traceId?: string

  constructor(
    status: number,
    message: string,
    code?: string,
    fieldErrors: ProblemFieldError[] = [],
    reason?: string,
    traceId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = sanitizeFields(fieldErrors)
    this.reason = reason
    this.traceId = traceId
  }
}

// UI-owned texts; never display arbitrary server detail/title/message or HTML.
const CONFLICT_MESSAGES: Record<string, string> = {
  ROUND_NOT_EDITABLE: 'สถานะรอบรับสมัครนี้ไม่อนุญาตให้แก้ไข',
  ROUND_NOT_PUBLISHED: 'รอบรับสมัครนี้ยังไม่ได้เผยแพร่',
  ROUND_STILL_OPEN: 'รอบรับสมัครนี้ยังไม่ปิดรับใบสมัคร',
  RESULTS_ALREADY_PUBLISHED: 'ประกาศผลการคัดเลือกแล้ว จึงดำเนินการนี้ไม่ได้',
  APPLICATIONS_INCOMPLETE: 'ยังพิจารณาใบสมัครไม่ครบ',
  APPLICATION_NOT_ACCEPTED: 'ใบสมัครนี้ยังไม่ได้รับการตอบรับ',
  EXISTING_CLUB_MEMBERSHIP: 'คุณมีสมาชิกภาพของชมรมนี้อยู่แล้ว',
  QUESTION_HAS_ANSWERS: 'แก้ไขหรือลบคำถามนี้ไม่ได้ เพราะมีคำตอบส่งเข้ามาแล้ว',
  VERSION_MISMATCH: 'ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดข้อมูลใหม่ก่อนลองอีกครั้ง',
  RESULTS_NOT_PUBLISHED: 'ยังไม่ประกาศผลการคัดเลือก',
  ALREADY_RESPONDED: 'คุณได้ยืนยันหรือสละสิทธิ์ไปแล้ว',
  CONFIRMATION_DEADLINE_EXPIRED: 'หมดเขตยืนยันสิทธิ์แล้ว',
  INVALID_STATUS_TRANSITION: 'สถานะปัจจุบันไม่อนุญาตให้ดำเนินการนี้',
  ROUND_CANCELLED: 'รอบรับสมัครนี้ถูกยกเลิกแล้ว',
  ROUND_NOT_OPEN: 'รอบรับสมัครนี้ยังไม่เปิดรับใบสมัคร',
  ROUND_CLOSED: 'รอบรับสมัครนี้ปิดรับใบสมัครแล้ว',
  APPLICATION_ALREADY_EXISTS: 'คุณได้ส่งใบสมัครในรอบรับสมัครนี้ไปแล้ว',
  ALREADY_MEMBER: 'คุณเป็นสมาชิกปัจจุบันของชมรมนี้อยู่แล้ว',
  MEMBERSHIP_LIMIT_REACHED: 'คุณเป็นสมาชิกชมรมครบจำนวนสูงสุด 5 ชมรมแล้ว',
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  notifyAuthFailure?: boolean
  signal?: AbortSignal
}

type AuthFailure = 'session-expired' | 'account-not-allowed'
const authFailureListeners = new Set<(failure: AuthFailure) => void>()
let notifiedAuthFailure = false

/** AuthProvider owns navigation/state. The client never emits a Toast. */
export function subscribeAuthFailures(listener: (failure: AuthFailure) => void): () => void {
  authFailureListeners.add(listener)
  return () => { authFailureListeners.delete(listener) }
}

export function resetAuthFailureNotification(): void {
  notifiedAuthFailure = false
}

function notifyFailure(error: ApiError, url: string): void {
  const path = url.split('?')[0]
  if (path.endsWith('/api/v1/auth/login') || path.endsWith('/api/v1/auth/logout')) return
  const failure = error.status === 401 && error.code !== 'AUTHENTICATION_FAILED'
    ? 'session-expired'
    : error.status === 403 && error.code === 'ACCOUNT_NOT_ALLOWED' ? 'account-not-allowed' : undefined
  if (!failure || notifiedAuthFailure) return
  notifiedAuthFailure = true
  authFailureListeners.forEach(listener => listener(failure))
}

function sanitizeFields(fields: ProblemFieldError[]): ProblemFieldError[] {
  const texts: Record<string, string> = {
    REQUIRED: 'จำเป็นต้องระบุข้อมูล',
    TOO_LONG: 'ข้อมูลยาวเกินกำหนด',
    INVALID_HTTPS_URL: 'กรุณาระบุลิงก์ HTTPS ที่ถูกต้อง',
  }
  return fields.filter(field => typeof field.field === 'string'
    && /^[A-Za-z][A-Za-z0-9_.[\]]{0,159}$/.test(field.field)).map(field => ({
      field: field.field,
      code: typeof field.code === 'string' ? field.code : undefined,
      message: (typeof field.code === 'string' && Object.hasOwn(texts, field.code) && texts[field.code])
        || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    }))
}

function statusMessage(status: number, code?: string, reason?: string): string {
  if (status === 401 && code === 'AUTHENTICATION_FAILED') return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
  if (status === 401) return 'เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบอีกครั้ง'
  if (status === 403 && code === 'CSRF_INVALID') return 'คำขอไม่ผ่านการตรวจสอบความปลอดภัย (CSRF) กรุณาลองใหม่อีกครั้ง'
  if (status === 403 && code === 'ACCOUNT_NOT_ALLOWED') return 'บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ'
  if (status === 403) return 'คุณไม่มีสิทธิ์ดำเนินการนี้'
  if (status === 404) return 'ไม่พบข้อมูลที่ต้องการ'
  if (status === 400) return 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก'
  if (status === 409) return (reason && Object.hasOwn(CONFLICT_MESSAGES, reason) && CONFLICT_MESSAGES[reason])
    || 'ข้อมูลขัดแย้งกับสถานะปัจจุบัน กรุณารีเฟรชแล้วลองใหม่'
  if (status === 429) return 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (status === 503) return 'ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง'
  return 'ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'
}

async function readProblem(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const problem = body !== null && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown> : {}
  const code = typeof problem.code === 'string' ? problem.code : undefined
  const reason = typeof problem.reason === 'string' ? problem.reason : undefined
  const traceId = typeof problem.traceId === 'string' ? problem.traceId : undefined
  const fields = Array.isArray(problem.fieldErrors) ? problem.fieldErrors.filter(
    (entry): entry is ProblemFieldError => entry !== null && typeof entry === 'object'
      && typeof entry.field === 'string' && typeof entry.message === 'string',
  ) : []
  // The HTTP status is authoritative, even if a proxy sends inconsistent JSON.
  return new ApiError(response.status, statusMessage(response.status, code, reason), code, fields, reason, traceId)
}

/** Fetches the session's CSRF header, which every write request must send. */
export async function getCsrfHeaders(notifyAuthFailure = true, signal?: AbortSignal): Promise<Record<string, string>> {
  const csrf = await apiRequest<{ headerName: string; token: string }>('/api/v1/auth/csrf', { notifyAuthFailure, signal })
  if (csrf?.headerName !== 'X-CSRF-TOKEN' || typeof csrf.token !== 'string' || !csrf.token.trim()) {
    throw new Error('ไม่สามารถเตรียมข้อมูลความปลอดภัยของคำขอได้')
  }
  return { [csrf.headerName]: csrf.token }
}

/**
 * Sends a JSON request to the API with the session cookie. Writes add the CSRF
 * header. Resolves to `undefined` for 204 and throws ApiError for other errors.
 */
export async function apiRequest<T>(
  url: string,
  { method = 'GET', body, notifyAuthFailure = true, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') Object.assign(headers, await getCsrfHeaders(notifyAuthFailure, signal))

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    signal,
  })

  if (!response.ok) {
    const error = await readProblem(response)
    if (notifyAuthFailure && !signal?.aborted) notifyFailure(error, url)
    throw error
  }
  if (response.status === 204) return undefined as T

  try { return (await response.json()) as T }
  catch { throw new Error('ไม่สามารถอ่านข้อมูลตอบกลับจากระบบได้') }
}

/** UI text is selected by status/code/reason, never arbitrary server text. */
export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.fieldErrors.length) {
      return `ข้อมูลไม่ถูกต้อง: ${error.fieldErrors.map(field => `${field.field}: ${field.message}`).join(', ')}`
    }
    if ([400, 401, 403, 404, 409, 429, 503].includes(error.status)) {
      return statusMessage(error.status, error.code, error.reason)
    }
    const trace = error.status >= 500 && error.traceId
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(error.traceId)
      ? ` (รหัสอ้างอิง: ${error.traceId})` : ''
    return fallback + trace
  }
  if (error instanceof TypeError) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'
  return fallback
}
