import { NextRequest, NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/apiBase";
import { getServerToken } from "@/lib/session";

const LOCALE_HEADER = "x-tracecart-locale";

async function forward(req: NextRequest, pathParts: string[]) {
  const token = await getServerToken();
  if (!token) {
    const message = req.headers.get(LOCALE_HEADER) === "fr" ? "Session expirée. Reconnectez-vous." : "Your session has ended. Sign in again.";
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
  }

  const targetUrl = `${SERVER_API_URL}/${pathParts.join("/")}${req.nextUrl.search}`;

  // Forward whatever Content-Type the request actually has instead of always
  // forcing application/json — a multipart upload's browser-generated
  // boundary must survive, or the API can't parse the body at all.
  const incomingContentType = req.headers.get("content-type");
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (incomingContentType) headers["Content-Type"] = incomingContentType;
  const locale = req.headers.get(LOCALE_HEADER);
  if (locale) headers["X-TraceCart-Locale"] = locale;

  const init: RequestInit = { method: req.method, headers };

  if (req.method !== "GET" && req.method !== "HEAD") {
    // arrayBuffer(), not text() — text() decodes as UTF-8, which would
    // corrupt binary bytes in an uploaded image.
    const bodyBuffer = await req.arrayBuffer();
    if (bodyBuffer.byteLength > 0) {
      init.body = bodyBuffer;
      if (!incomingContentType) headers["Content-Type"] = "application/json";
    }
  }

  // Hand redirects to the browser rather than following them here: photo
  // routes redirect to a signed storage URL, and fetching the image through
  // this text-based proxy would corrupt it.
  const apiRes = await fetch(targetUrl, { ...init, redirect: "manual" });
  const location = apiRes.headers.get("location");
  if (apiRes.status >= 300 && apiRes.status < 400 && location) {
    return new NextResponse(null, {
      status: apiRes.status,
      headers: { location, "cache-control": apiRes.headers.get("cache-control") ?? "no-store" },
    });
  }

  const text = await apiRes.text();
  const contentType = apiRes.headers.get("content-type") ?? "application/json";

  // A 204 (or any no-content status) must have a null body — the Response
  // constructor throws even on an empty string.
  const hasBody = text.length > 0 && apiRes.status !== 204 && apiRes.status !== 205 && apiRes.status !== 304;

  return new NextResponse(hasBody ? text : null, {
    status: apiRes.status,
    headers: hasBody ? { "content-type": contentType } : undefined,
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forward(req, path);
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forward(req, path);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forward(req, path);
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forward(req, path);
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  return forward(req, path);
}
