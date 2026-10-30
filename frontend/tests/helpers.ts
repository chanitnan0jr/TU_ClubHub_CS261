export interface RecordedRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

type Responder = (request: RecordedRequest) => Response

/**
 * Replaces globalThis.fetch with a stub that records each request and answers
 * from `respond`. Returns the recorded requests and a function to restore fetch.
 */
export function stubFetch(respond: Responder) {
  const original = globalThis.fetch
  const requests: RecordedRequest[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: RecordedRequest = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: { ...(init?.headers as Record<string, string> | undefined) },
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    }
    requests.push(request)
    return respond(request)
  }) as typeof fetch

  return {
    requests,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const problem = (status: number, code: string, detail: string, extra = {}) =>
  new Response(JSON.stringify({ status, code, detail, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })

export const csrfResponse = () => json({ headerName: 'X-CSRF-TOKEN', token: 'csrf-token' })
