import { NextRequest } from "next/server";
import { projectorLocal } from "@/lib/server/projector-routes";
import { projectorRemote } from "@/lib/server/projector-relay-routes";
import { temporaryProjectorHost } from "@/lib/server/projector-temporary";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (temporaryProjectorHost(request)) return projectorLocal(request);
  return await projectorRemote(request) ?? projectorLocal(request);
}
