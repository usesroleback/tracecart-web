"use client";

// Calls through the API proxy that keep the error's code (PRICE_CHANGED,
// OUT_OF_STOCK…) and details, which checkout acts on.

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    readonly details: unknown
  ) {
    super(message);
  }
}

/** A JSON body, or a FormData (photos, videos), which the browser sends as multipart with its own boundary. */
export async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const form = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api/tracecart${path}`, {
    method,
    headers: { ...(body !== undefined && !form ? { "Content-Type": "application/json" } : {}), "X-Tracecart-Locale": document.documentElement.lang || "fr", ...headers },
    body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(e.message ?? `Request failed (${res.status})`, res.status, e.code ?? null, e.details ?? null);
  }
  return data as T;
}
