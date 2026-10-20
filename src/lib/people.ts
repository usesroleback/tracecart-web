import { Role } from "./types";

// What each role is called in the console. No person or city names here:
// a role is a job, not a place.
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Administrateur",
  LOGISTICS_PARTNER: "Transporteur",
};

/** The part of an email before the @ (and before any +tag): "awa.traore+ops@x.com" -> "awa.traore". */
export function nameFromEmail(email: string): string {
  return email.split("@")[0].split("+")[0] || email;
}
