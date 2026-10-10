import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_AUTH_COOKIE, GOOGLE_STATE_COOKIE } from "@/lib/google-dashboard-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ connected: false });
  response.cookies.delete(GOOGLE_AUTH_COOKIE);
  response.cookies.delete(GOOGLE_STATE_COOKIE);
  return response;
}
