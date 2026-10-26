import { NextRequest } from "next/server";
import { youtubeSearch } from "@/lib/server/ambience-routes";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return youtubeSearch(request); }
