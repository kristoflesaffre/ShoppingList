# Todoist backend — frontend handoff

Backend only. No new screens or task mutations. Uses the current Todoist API v1 and OAuth `data:read_write` scope: https://developer.todoist.com/api/v1/.

## Connection and credentials

The Todoist application **Shopping List** is registered. Callback URLs:

- Production: `https://shoppinglist-lesaffre.netlify.app/api/todoist/callback`
- Local HTTPS: `https://localhost:3011/api/todoist/callback`

Server variables: `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`, `TODOIST_REDIRECT_URI`, and `TODOIST_OAUTH_SECRET` (random secret, at least 32 characters). The existing `INSTANT_APP_ADMIN_TOKEN` is also required to verify the Shopping List login. No variable is prefixed `NEXT_PUBLIC_`.

Local credentials are in ignored `.env.local`; production credentials are configured as Netlify production function secrets. Never copy these values into frontend code, prompts, or Git. Preview domains need a separate registered callback and matching environment configuration.

OAuth state expires after 10 minutes. Credentials are encrypted using AES-256-GCM in Secure, HttpOnly, SameSite=Lax cookies, bound to both the Shopping List user and the Todoist client ID. The Todoist secret uses a separate encryption domain from Google and Hue. The browser cannot read the tokens. Logging into a different Shopping List account does not grant access to the first user's Todoist connection.

The connection is **per browser/device**, with a 90-day cookie renewed when tokens refresh. Clearing cookies or using another browser requires reconnecting. Disconnect clears this browser's local connection; revoke the integration in Todoist to remove the external grant as well.

## Requests

All endpoints except the OAuth callback use **POST**, including reads, because token renewal can update the protected cookie. Requests must be same-origin with the configured deployment and include the existing Shopping List auth token. Do not call Todoist directly from the browser.

Use the existing `useGoogleAuthToken()` and `googleAuthHeaders()` from `src/lib/google-client.ts`; despite their names these supply the Instant login, not a Google access token.

```ts
// token comes from useGoogleAuthToken(), called at the top level of your component.
async function todoistRequest(path: string, token: string, body = {}) {
  const response = await fetch(`/api/todoist/${path}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw { status: response.status, ...result };
  return result;
}
```

Keep these requests sequential through one shared frontend loader (especially status, projects, and tasks when the access token expires). The backend coalesces simultaneous refreshes within a running instance, but serverless instances do not share memory. No background polling is needed when the panel is hidden; refresh on opening/focus and on user request, and obey `Retry-After` on HTTP 429. Never render task content/description as unsanitized HTML.

## OAuth connect

`POST /api/todoist/connect` with no body or `{}` returns `{ "url": "https://app.todoist.com/oauth/authorize?..." }`. It also sets a protected short-lived state cookie.

Navigate the **same browser window** to `url` (validate the exact `https://app.todoist.com` origin and `/oauth/authorize` path before assigning it). The user signs into Todoist and approves read and write access. The backend exchanges the code and saves encrypted tokens. Access tokens expire; the backend refreshes them automatically.

The callback redirects to an **existing page**, `/profiel?todoist=connected`, `?todoist=cancelled`, or `?todoist=connection-failed`. Add the desired notice/navigation there in the frontend. Do not invent a separate callback page or expose token responses. Once the result is displayed, remove the parameter with `history.replaceState` and load status.

## Status

`POST /api/todoist/status`

```json
{ "configured": true, "connected": true }
```

Missing server settings: `{ "configured": false, "connected": false }`.
No browser connection: `{ "configured": true, "connected": false }`.
Expired/unusable refresh credentials: `{ "configured": true, "connected": false, "reconnect": true }`.

Status checks the protected local connection and renews tokens when needed; it does not probe Todoist on every request. A grant revoked externally is detected when tasks/projects are requested or a token is refreshed.

## Active tasks

`POST /api/todoist/tasks`

Optional JSON body:

```json
{ "limit": 50, "cursor": null, "projectId": "a-project-id" }
```

Alternatively use a Todoist filter:

```json
{ "filter": "today | overdue", "limit": 50, "lang": "en" }
```

`filter` and `projectId` are mutually exclusive. `lang` is allowed only with `filter`. `limit` is an integer 1–200 (default 50). `cursor` is opaque: return it unchanged on the next request **with the same filter/project options**. Fetch pages until `nextCursor` is null if you need every active task; never assume the first 50 are all the tasks. Unknown body fields and malformed bodies return 400.

```json
{
  "tasks": [{
    "id": "task-id",
    "content": "Book appointment",
    "description": "Additional notes",
    "projectId": "project-id",
    "sectionId": null,
    "parentId": null,
    "labels": ["personal"],
    "priority": 4,
    "order": 1,
    "completed": false,
    "due": {
      "date": "2026-10-18",
      "datetime": null,
      "timezone": null,
      "recurring": false,
      "description": "Sunday"
    },
    "deadline": null,
    "duration": null,
    "addedAt": "2026-10-17T12:00:00Z",
    "updatedAt": "2026-10-17T12:00:00Z",
    "url": "https://app.todoist.com/app/task/task-id"
  }],
  "nextCursor": null
}
```

Todoist priority **4 is highest** (Todoist UI P1); 1 is normal. Parent/section/project IDs and all resource IDs are strings. Keep due dates without a time as calendar dates to avoid timezone shifts. A due `date` may also contain a time; preserve the source value. `due`, `deadline`, and `duration` can be null. Duration, when provided, has `{ amount, unit }`. Tasks are live reads, with Todoist's order preserved. This endpoint lists active tasks, not completed history.

## Projects

`POST /api/todoist/projects` with optional `{ "limit": 50, "cursor": null }`.

```json
{
  "projects": [{ "id": "project-id", "name": "Personal", "color": "blue", "parentId": null, "favorite": false, "inbox": false, "order": 1 }],
  "nextCursor": null
}
```

Join `task.projectId` to `project.id` for display names. Projects are also paginated. Colors are Todoist color names, not CSS values; map known names to your design system and provide a default for unknown colors.

## Disconnect

`POST /api/todoist/disconnect` → `{ "connected": false }`.
Only clears the Todoist connection in this browser; does not delete tasks, revoke Google/Hue, or sign the user out of Shopping List.

## Errors

Responses always have `Cache-Control: no-store`.

| HTTP | `error` | Frontend action |
|---|---|---|
| 400 | `invalid-request` | Check filter/options; do not loop retries. |
| 401 | `not-signed-in` | Wait for Instant login or offer app sign-in. |
| 403 | `invalid-origin` | Check that frontend, callback and configuration use the same origin. |
| 404 | `not-found` | Requested project/resource no longer exists. |
| 409 | `not-connected` | Offer Connect Todoist; response includes `reconnect: true`. |
| 429 | `rate-limited` | Retry after the response's `Retry-After` delay. |
| 503 | `not-configured` | Server settings missing; do not show an active connect button. |
| 503 | `temporarily-unavailable` | Show retry affordance; keep existing displayed tasks. |

Read and write access (`data:read_write`) is requested. Existing read-only grants must be upgraded by disconnecting and reconnecting Todoist; refreshing an old token cannot grant broader permissions. This scope change does not add write endpoints: there are currently no create, complete, edit, or delete task endpoints. No synchronization jobs, webhooks, or permanent task copies are created.

## Validation

`npx vitest run src/lib/todoist-routes.test.ts`

Covers authentication/origin, read/write OAuth scope, callback state, encrypted user-bound cookies, cancellation, pagination, task mapping, filters, input validation, projects, refresh rotation, revoked credentials, rate limits, outages, and disconnect. The initial consent must still be completed by the user through the future frontend; no full-access developer test token is generated.
