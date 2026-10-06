# @reactor-cloud/client

JavaScript client for Reactor. Auth, Postgres data, file storage, and functions for web apps.

```sh
npm install @reactor-cloud/client@beta
```

[reactor.cloud](https://www.reactor.cloud) · [docs](https://github.com/reactor-cloud/reactor/blob/v1.26.10-beta8/docs/clients/javascript.md)

```ts
import { createClient } from "@reactor-cloud/client"

const reactor = createClient("https://<ref>.apps.localhost:18000", anonKey)

const session = await reactor.auth.signInWithPassword({ email, password })

const { data, error } = await reactor
  .from("todos")
  .select("*")
  .eq("user_id", session.user.id)

await reactor.storage.from("files").upload(path, body, { contentType: "text/plain" })
const result = await reactor.functions.invoke("ping", { body: { hello: "world" } })
```

| Surface | Call |
| --- | --- |
| Auth | `reactor.auth` — sign up, password, session, sign out |
| Data | `reactor.from(table)` and `reactor.rpc(name)` — PostgREST |
| Storage | `reactor.storage.from(bucket)` — presigned upload and download |
| Functions | `reactor.functions.invoke(name)`, `reactor.functions.enqueue(name)`, `reactor.functions.task(id)` |
| Queue | `reactor.queue` — create, send, read, peek, subscribe. Needs the service key and `REACTOR_EXTENSIONS=queue` |

The client keeps the session in memory. Pass `session` in the options to restore one. `signInWithOAuth` throws. OAuth is not in this release.

Package version `1.26.10-beta8`.

## License

You can use Reactor as the backend for as many personal or commercial projects as you want. The license only restricts offering it as a competing hosted service.

Business Source License 1.1. Copyright 2026 AtomicoLabs SL and Claudio del Conde. See [LICENSE](LICENSE).
