import { NextRequest } from "next/server";
import { readTodoistResource } from "@/lib/server/todoist-read";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return readTodoistResource(request, "tasks"); }
