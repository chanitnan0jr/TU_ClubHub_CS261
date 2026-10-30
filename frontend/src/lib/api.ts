export const api = {
  async get<T>(url: string): Promise<{ data: T }> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return { data };
  },
};

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

  constructor(
    status: number,
    message: string,
    code?: string,
    fieldErrors: ProblemFieldError[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
}

async function readProblem(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  const problem =
    body !== null && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {}

  const detail = typeof problem.detail === 'string' ? problem.detail : ''
  const code = typeof problem.code === 'string' ? problem.code : undefined
  const fieldErrors = Array.isArray(problem.fieldErrors)
    ? problem.fieldErrors.filter(
        (entry): entry is ProblemFieldError =>
          entry !== null &&
          typeof entry === 'object' &&
          typeof entry.field === 'string' &&
          typeof entry.message === 'string',
      )
    : []

  return new ApiError(response.status, detail, code, fieldErrors)
}

/** Fetches the session's CSRF header, which every write request must send. */
export async function getCsrfHeaders(): Promise<Record<string, string>> {
  const response = await fetch('/api/v1/auth/csrf', {
    credentials: 'same-origin',
  })
  if (!response.ok) throw await readProblem(response)

  const csrf = (await response.json()) as { headerName: string; token: string }
  return { [csrf.headerName]: csrf.token }
}

/**
 * Sends a JSON request to the API with the session cookie. Writes add the CSRF
 * header. Resolves to `undefined` for 204 and throws ApiError for other errors.
 */
export async function apiRequest<T>(
  url: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') Object.assign(headers, await getCsrfHeaders())

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  })

  if (!response.ok) throw await readProblem(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

/** A Thai message for the user; the API's English detail is kept for 400/409. */
export function describeApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 400:
        if (error.fieldErrors.length > 0) {
          return `ข้อมูลไม่ถูกต้อง: ${error.fieldErrors
            .map((entry) => `${entry.field}: ${entry.message}`)
            .join(', ')}`
        }
        return error.message || fallback
      case 401:
        return 'เซสชันหมดอายุหรือยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบอีกครั้ง'
      case 403:
        if (error.code === 'CSRF_INVALID') {
          return 'คำขอไม่ผ่านการตรวจสอบความปลอดภัย (CSRF) กรุณาลองใหม่อีกครั้ง'
        }
        if (error.code === 'ACCOUNT_NOT_ALLOWED') {
          return 'บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ'
        }
        return 'คุณไม่มีสิทธิ์ดำเนินการนี้ (ต้องเป็นกรรมการของชมรมที่เกี่ยวข้อง)'
      case 404:
        return 'ไม่พบข้อมูลที่ต้องการ'
      case 409:
        return error.message || 'ข้อมูลขัดแย้งกับสถานะปัจจุบัน กรุณารีเฟรชแล้วลองใหม่'
      case 503:
        return 'ระบบฐานข้อมูลไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง'
      default:
        return fallback
    }
  }

  if (error instanceof TypeError) {
    return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่'
  }

  return fallback
}

export async function fetchMyApplicationsAPI(userId: string) {
  const response = await fetch('/api/v1/applications/my', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch my applications');
  }

  return response.json();
}