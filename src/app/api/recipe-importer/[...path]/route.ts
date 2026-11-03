import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const allowed = new Set(["imports", "recipes", "media", "upload", "config"]);
async function proxy(
  request: Request,
  { params }: { params: { path: string[] } },
) {
  const [endpoint, ...rest] = params.path;
  if (
    !allowed.has(endpoint) ||
    rest.length > 1 ||
    rest.some((p) => !/^[a-zA-Z0-9-]+$/.test(p))
  )
    return NextResponse.json(
      { error: "Onbekend importendpoint." },
      { status: 404 },
    );
  const base =
    process.env.RECIPE_IMPORTER_URL ||
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3020" : null);
  if (!base)
    return NextResponse.json(
      {
        error:
          "De video-import is nog niet verbonden. Configureer RECIPE_IMPORTER_URL.",
      },
      { status: 503 },
    );
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Ongeldige oorsprong." },
      { status: 403 },
    );
  if (endpoint !== "config" && !request.headers.get("authorization"))
    return NextResponse.json(
      { error: "Meld je aan om door te gaan." },
      { status: 401 },
    );
  if (
    endpoint === "upload" &&
    Number(request.headers.get("content-length") || 0) > 101 * 1024 * 1024
  )
    return NextResponse.json(
      { error: "Maximaal 100 MB per video." },
      { status: 413 },
    );
  const headers = new Headers();
  const token = request.headers.get("authorization");
  if (token) headers.set("authorization", token);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  try {
    const response = await fetch(
      `${base.replace(/\/$/, "")}/api/${params.path.join("/")}`,
      {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : request.body,
        duplex: "half",
        signal: AbortSignal.timeout(120000),
        cache: "no-store",
        redirect: "error",
      } as RequestInit & { duplex: "half" },
    );
    const out = new Headers({ "Cache-Control": "private, no-store" });
    out.set(
      "Content-Type",
      response.headers.get("content-type") || "application/json",
    );
    return new Response(response.body, {
      status: response.status,
      headers: out,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "De video-import is niet bereikbaar. Start de importer op poort 3020 en de Mac-worker.",
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
