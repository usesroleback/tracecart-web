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

export async function call<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`/api/tracecart${path}`, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), "X-Tracecart-Locale": document.documentElement.lang || "fr", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
