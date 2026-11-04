import { createHash } from "node:crypto";

/** Elk uur de ontdooitaken gelijkzetten, ook als de app nergens open staat (`/api/cron/thaw-tasks`). */
export default async () => {
  const secret = process.env.TODOIST_OAUTH_SECRET?.trim() ?? "";
  const key = createHash("sha256").update(`thaw-round:${secret}`).digest("hex");
  const response = await fetch(`${process.env.URL}/api/cron/thaw-tasks`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(25_000),
  });
  console.log("thaw-tasks", response.status, await response.text());
};

export const config = { schedule: "0 * * * *" };
