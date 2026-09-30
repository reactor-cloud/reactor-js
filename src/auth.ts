import { request } from "./http.ts"

export type User = { id: string; email: string; email_verified_at?: string | null }

export type Session = {
  access_token: string
  refresh_token: string
  user: User
}

export type AuthResult =
  | Session
  | { verification_required: true; user: User }
  | { mfa_required: true; mfa_token: string; factors: string[] }
  | { enrollment_required: true; enroll_token: string; factors: string[] }

function isSession(body: unknown): body is Session {
  return Boolean(body && typeof body === "object" && "access_token" in body && typeof (body as Session).access_token === "string")
}

export function createAuth(base: string, anonKey: string, doFetch: typeof fetch, session: { current: Session | null }) {
  async function save(next: Session): Promise<Session> {
    session.current = next
    return next
  }

  function settle(body: unknown): AuthResult {
    if (isSession(body)) {
      session.current = body
      return body
    }
    return body as AuthResult
  }

  function bearer(token?: string) {
    return token ?? session.current?.access_token
  }

  return {
    getSession(): Session | null {
      return session.current
    },

    async signUp(credentials: { email: string; password: string }): Promise<AuthResult> {
      const { body } = await request(doFetch, `${base}/auth/v1/signup`, {
        method: "POST",
        token: anonKey,
        json: { email: credentials.email, password: credentials.password },
      })
      return settle(body)
    },

    async signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResult> {
      const { body } = await request(doFetch, `${base}/auth/v1/token`, {
        method: "POST",
        token: anonKey,
        json: { email: credentials.email, password: credentials.password },
      })
      return settle(body)
    },

    async signInWithMagicLink(email: string): Promise<void> {
      await request(doFetch, `${base}/auth/v1/magic-link`, {
        method: "POST",
        token: anonKey,
        json: { email },
      })
    },

    async verifyMagicLink(token: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/verify`, {
        method: "POST",
        token: anonKey,
        json: { token },
      })
      return save(body as Session)
    },

    async recover(email: string): Promise<void> {
      await request(doFetch, `${base}/auth/v1/recover`, {
        method: "POST",
        token: anonKey,
        json: { email },
      })
    },

    async completeRecovery(token: string, password: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/recover/complete`, {
        method: "POST",
        token: anonKey,
        json: { token, password },
      })
      return save(body as Session)
    },

    async invite(email: string, serviceKey: string): Promise<void> {
      await request(doFetch, `${base}/auth/v1/invite`, {
        method: "POST",
        token: serviceKey,
        json: { email },
      })
    },

    async acceptInvite(token: string, password: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/invite/accept`, {
        method: "POST",
        token: anonKey,
        json: { token, password },
      })
      return save(body as Session)
    },

    async getUser(): Promise<User> {
      const token = session.current?.access_token
      if (!token) throw new Error("not signed in")
      const { body } = await request(doFetch, `${base}/auth/v1/user`, { token })
      return body as User
    },

    async refreshSession(): Promise<Session> {
      const refresh = session.current?.refresh_token
      if (!refresh) throw new Error("not signed in")
      const { body } = await request(doFetch, `${base}/auth/v1/token`, {
        method: "POST",
        token: anonKey,
        json: { refresh_token: refresh },
      })
      return save(body as Session)
    },

    async signOut(): Promise<void> {
      const refresh = session.current?.refresh_token
      if (!refresh) return
      await request(doFetch, `${base}/auth/v1/logout`, {
        method: "POST",
        json: { refresh_token: refresh },
      })
      session.current = null
    },

    async verifyEmail(input: { token?: string; email?: string; code?: string }): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/verify-email`, {
        method: "POST",
        token: anonKey,
        json: input,
      })
      return save(body as Session)
    },

    async resendVerification(email: string): Promise<void> {
      await request(doFetch, `${base}/auth/v1/verify-email/send`, {
        method: "POST",
        token: anonKey,
        json: { email },
      })
    },

    async verifyTotp(mfaToken: string, code: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/factors/totp`, {
        method: "POST",
        token: anonKey,
        json: { mfa_token: mfaToken, code },
      })
      return save(body as Session)
    },

    async verifyPasskey(mfaToken: string, credential: unknown): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/factors/passkey/verify`, {
        method: "POST",
        token: anonKey,
        json: { ...(credential as object), mfa_token: mfaToken },
      })
      return save(body as Session)
    },

    async verifyRecovery(mfaToken: string, code: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/factors/recovery`, {
        method: "POST",
        token: anonKey,
        json: { mfa_token: mfaToken, code },
      })
      return save(body as Session)
    },

    async enrollTotp(input?: { code?: string; token?: string }): Promise<unknown> {
      const path = input?.code ? "/auth/v1/factors/totp/confirm" : "/auth/v1/factors/totp/start"
      const { body } = await request(doFetch, `${base}${path}`, {
        method: "POST",
        token: bearer(input?.token),
        json: input?.code ? { code: input.code } : {},
      })
      return body
    },

    async enrollPasskey(input?: { credential?: unknown; token?: string }): Promise<unknown> {
      const path = input?.credential ? "/auth/v1/factors/passkey/register" : "/auth/v1/factors/passkey/register/options"
      const { body } = await request(doFetch, `${base}${path}`, {
        method: "POST",
        token: bearer(input?.token),
        json: input?.credential ?? {},
      })
      return body
    },

    async signInWithOAuth(input: { provider: string; redirectTo: string }): Promise<string> {
      const url = `${base}/auth/v1/authorize?provider=${encodeURIComponent(input.provider)}&redirect_to=${encodeURIComponent(input.redirectTo)}`
      if (typeof window !== "undefined" && window.location) window.location.assign(url)
      return url
    },

    async exchangeCode(code: string): Promise<Session> {
      const { body } = await request(doFetch, `${base}/auth/v1/token`, {
        method: "POST",
        token: anonKey,
        json: { code },
      })
      return save(body as Session)
    },
  }
}
