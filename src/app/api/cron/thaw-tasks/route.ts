import { NextRequest, NextResponse } from "next/server";
import { isThawRoundAuthorized, runThawRound } from "@/lib/server/todoist-thaw-round";
import { todoistConfig } from "@/lib/server/todoist-auth";

export const runtime = "nodejs";

/** Aangeroepen door de geplande Netlify-functie `thaw-tasks`. */
export async function POST(request: NextRequest) {
  if (!isThawRoundAuthorized(request.headers.get("authorization"), todoistConfig().secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json(await runThawRound(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "temporarily-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
