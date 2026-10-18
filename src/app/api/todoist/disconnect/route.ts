import { NextRequest } from "next/server";
import { TODOIST_AUTH_COOKIE, TODOIST_STATE_COOKIE, todoistCookieOptions, todoistGuard, todoistJson } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const { error } = await todoistGuard(request);
  if (error) return error;
  const response = todoistJson({ connected: false });
  for (const name of [TODOIST_AUTH_COOKIE, TODOIST_STATE_COOKIE]) response.cookies.set(name, "", { ...todoistCookieOptions, maxAge: 0 });
  return response;
}
