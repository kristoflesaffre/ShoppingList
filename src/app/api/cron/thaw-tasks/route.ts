import { NextRequest, NextResponse } from "next/server";
import { isThawRoundAuthorized, runThawRound } from "@/lib/server/todoist-thaw-round";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Aangeroepen door Vercel Cron (`vercel.json`). */
export async function GET(request: NextRequest) {
  if (!isThawRoundAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json(await runThawRound(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "temporarily-unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
