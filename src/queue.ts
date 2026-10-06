import { request } from "./http.ts"

export type QueueMessage = { msg_id: number; message: unknown; read_ct: number }

export function createQueue(base: string, token: () => string, doFetch: typeof fetch) {
  const path = (name: string) => `${base}/queue/v1/queues/${encodeURIComponent(name)}`
  return {
    async list(): Promise<{ name: string; created_at: string }[]> {
      const { body } = await request(doFetch, `${base}/queue/v1/queues`, { token: token() })
      return body
    },

    async create(name: string): Promise<{ name: string }> {
      const { body } = await request(doFetch, `${base}/queue/v1/queues`, {
        method: "POST",
        token: token(),
        json: { name },
      })
      return body
    },

    async send(name: string, message: unknown, options?: { delaySecs?: number }): Promise<{ msg_id: number }> {
      const json: Record<string, unknown> = { message }
      if (options?.delaySecs !== undefined) json.delay_secs = options.delaySecs
      const { body } = await request(doFetch, `${path(name)}/send`, {
        method: "POST",
        token: token(),
        json,
      })
      return body
    },

    async read(name: string, options?: { vtSecs?: number; qty?: number }): Promise<QueueMessage[]> {
      const json: Record<string, unknown> = {}
      if (options?.vtSecs !== undefined) json.vt_secs = options.vtSecs
      if (options?.qty !== undefined) json.qty = options.qty
      const { body } = await request(doFetch, `${path(name)}/read`, {
        method: "POST",
        token: token(),
        json,
      })
      return body
    },

    async peek(name: string): Promise<QueueMessage[]> {
      const { body } = await request(doFetch, `${path(name)}/peek`, { token: token() })
      return body
    },

    async delete(name: string, msgId: number): Promise<void> {
      await request(doFetch, `${path(name)}/delete`, {
        method: "POST",
        token: token(),
        json: { msg_id: msgId },
      })
    },

    async archive(name: string, msgId: number): Promise<void> {
      await request(doFetch, `${path(name)}/archive`, {
        method: "POST",
        token: token(),
        json: { msg_id: msgId },
      })
    },

    async subscribe(
      name: string,
      options: { functionName: string; vtSecs: number; qty: number; maxReads: number },
    ): Promise<void> {
      await request(doFetch, `${path(name)}/subscriptions`, {
        method: "POST",
        token: token(),
        json: {
          function_name: options.functionName,
          vt_secs: options.vtSecs,
          qty: options.qty,
          max_reads: options.maxReads,
        },
      })
    },

    async unsubscribe(name: string, functionName: string): Promise<void> {
      await request(doFetch, `${path(name)}/subscriptions`, {
        method: "DELETE",
        token: token(),
        json: { function_name: functionName },
      })
    },
  }
}
