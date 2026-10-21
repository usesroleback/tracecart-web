"use client";

import { api } from "./apiClient";

// The customer's side of the API (/customer/…), through the web app's proxy,
// which attaches the Clerk session. See apps/api/src/modules/customer.

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "CUSTOMER";
}

export interface CustomerRequest {
  id: string;
  description: string;
  status: "OPEN" | "MATCHED" | "CONVERTED" | "CLOSED";
  createdAt: string;
  hasPhoto: boolean;
  choice: { title: string; url: string; imageUrl: string | null } | null;
  order: { reference: string; status: string; link: string } | null;
}

export class StaffAccountError extends Error {}

/** The customer account for the signed-in Clerk user, created on first call. */
export async function ensureCustomerAccount(): Promise<CustomerProfile> {
  const res = await fetch("/api/tracecart/customer/account", {
    method: "POST",
    headers: { "X-TraceCart-Locale": document.documentElement.lang },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (res.status === 409) throw new StaffAccountError(body?.error?.message ?? "staff");
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as CustomerProfile;
}

export const updateProfile = (patch: { name?: string; phone?: string }) => api.patch<CustomerProfile>("/customer/account", patch);
export const listRequests = () => api.get<CustomerRequest[]>("/customer/requests");
