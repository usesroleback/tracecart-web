// The page's language (<html lang>), so the API answers errors in it.
const localeHeader = (): Record<string, string> =>
  typeof document === "undefined" ? {} : { "X-Tracecart-Locale": document.documentElement.lang };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/tracecart${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...localeHeader(), ...init?.headers },
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  // No Content-Type header here — the browser sets the multipart boundary
  // itself when the body is a FormData, and request() would otherwise force
  // application/json and break the upload.
  postForm: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`/api/tracecart${path}`, { method: "POST", body: formData, headers: localeHeader(), cache: "no-store" });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = data?.error?.message ?? `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data as T;
  },
};
