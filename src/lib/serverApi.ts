import { getLocale } from "next-intl/server";
import { SERVER_API_URL } from "./apiBase";
import { getServerToken } from "./session";

export async function serverGet<T>(path: string): Promise<T | null> {
  const token = await getServerToken();
  if (!token) return null;

  const res = await fetch(`${SERVER_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "X-Tracecart-Locale": await getLocale() },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as T;
}
