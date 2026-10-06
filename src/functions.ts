import { request } from "./http.ts"

export function createFunctions(base: string, token: () => string, doFetch: typeof fetch) {
  return {
    async invoke(name: string, options?: { body?: unknown }): Promise<any> {
      const { body } = await request(doFetch, `${base}/fn/v1/${name}`, {
        method: "POST",
        token: token(),
        json: options?.body ?? {},
      })
      return body
    },

    async enqueue(
      name: string,
      options?: { body?: unknown; delaySecs?: number; maxAttempts?: number },
    ): Promise<{ id: string }> {
      const json: Record<string, unknown> = { body: options?.body ?? {} }
      if (options?.delaySecs !== undefined) json.delay_secs = options.delaySecs
      if (options?.maxAttempts !== undefined) json.max_attempts = options.maxAttempts
      const { body } = await request(doFetch, `${base}/fn/v1/${encodeURIComponent(name)}/enqueue`, {
        method: "POST",
        token: token(),
        json,
      })
      return body
    },

    async task(id: string): Promise<{
      id: string
      kind: string
      status: string
      attempts: number
      max_attempts: number
      last_error: string | null
    }> {
      const { body } = await request(doFetch, `${base}/fn/v1/_admin/tasks/${encodeURIComponent(id)}`, {
        token: token(),
      })
      return body
    },
  }
}
