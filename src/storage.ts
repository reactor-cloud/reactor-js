import { request } from "./http.ts"

export function createStorage(base: string, token: () => string, doFetch: typeof fetch) {
  return {
    async createBucket(name: string, options?: { public?: boolean }): Promise<void> {
      await request(doFetch, `${base}/storage/v1/bucket`, {
        method: "POST",
        token: token(),
        json: { name, public: options?.public ?? false },
      })
    },

    from(bucket: string) {
      return {
        async getPublicUrl(path: string): Promise<string> {
          const info = await request(doFetch, `${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
            token: token(),
          })
          const root = info.body.public_url_base
          if (!info.body.public || typeof root !== "string" || root.length === 0) {
            throw new Error("bucket is not public")
          }
          const suffix = path.split("/").map(encodeURIComponent).join("/")
          return `${root}/${suffix}`
        },

        async upload(path: string, body: BodyInit, options?: { contentType?: string }): Promise<void> {
          const presign = await request(doFetch, `${base}/storage/v1/object/presign`, {
            method: "POST",
            token: token(),
            json: { bucket, key: path, method: "PUT" },
          })
          const put = await doFetch(presign.body.url, {
            method: "PUT",
            headers: { "content-type": options?.contentType ?? "application/octet-stream" },
            body,
          })
          if (!put.ok) throw new Error(await put.text())
        },

        async download(path: string): Promise<Uint8Array> {
          const presign = await request(doFetch, `${base}/storage/v1/object/presign`, {
            method: "POST",
            token: token(),
            json: { bucket, key: path, method: "GET" },
          })
          const get = await doFetch(presign.body.url)
          if (!get.ok) throw new Error(await get.text())
          return new Uint8Array(await get.arrayBuffer())
        },
      }
    },
  }
}
