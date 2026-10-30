import { NextRequest, NextResponse } from "next/server";
import { SERVER_API_URL } from "@/lib/apiBase";
import { getServerToken } from "@/lib/session";

const LOCALE_HEADER = "x-tracecart-locale";

// The visitor's country as the host knows it (Vercel, Cloudflare), so the API
// needn't look the IP up.
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"];

async function forward(req: NextRequest, pathParts: string[]) {
  // Signed out, the call goes without a session: public routes (the shop,
  // the visitor's country) answer, and the API refuses the rest.
  const token = await getServerToken();

  const targetUrl = `${SERVER_API_URL}/${pathParts.join("/")}${req.nextUrl.search}`;

  // Forward whatever Content-Type the request actually has instead of always
  // forcing application/json — a multipart upload's browser-generated
  // boundary must survive, or the API can't parse the body at all.
  const incomingContentType = req.headers.get("content-type");
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (incomingContentType) headers["Content-Type"] = incomingContentType;
  const locale = req.headers.get(LOCALE_HEADER);
  if (locale) headers["X-Tracecart-Locale"] = locale;
  // Who's asking, for their country (GET /geo/country): the browser's IP as
  // this server received it, and the host's country header when it sets one.
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip");
  if (clientIp) headers["X-Tracecart-Client-IP"] = clientIp;
  const hostCountry = COUNTRY_HEADERS.map((h) => req.headers.get(h)).find((v) => v && /^[A-Za-z]{2}$/.test(v));
  if (hostCountry) headers["X-Tracecart-Client-Country"] = hostCountry;

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

  // Without a session, a refusal means signing in (again), said in the page's language.
  if (!token && apiRes.status === 401) {
    const message = req.headers.get(LOCALE_HEADER) === "fr" ? "Session expirée. Reconnectez-vous." : "Your session has ended. Sign in again.";
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 });
  }

  const contentType = apiRes.headers.get("content-type") ?? "application/json";
  // Bytes, not text: an invoice (PDF) or an export must arrive unchanged.
  const body = await apiRes.arrayBuffer();

  // A 204 (or any no-content status) must have a null body — the Response
  // constructor throws even on an empty string.
  const hasBody = body.byteLength > 0 && apiRes.status !== 204 && apiRes.status !== 205 && apiRes.status !== 304;
  const disposition = apiRes.headers.get("content-disposition");

  return new NextResponse(hasBody ? body : null, {
    status: apiRes.status,
    headers: hasBody ? { "content-type": contentType, ...(disposition ? { "content-disposition": disposition } : {}) } : undefined,
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
