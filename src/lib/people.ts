// Role names are translated in messages/*/labels.json (labels.role).

/** The part of an email before the @ (and before any +tag): "awa.traore+ops@x.com" -> "awa.traore". */
export function nameFromEmail(email: string): string {
  return email.split("@")[0].split("+")[0] || email;
}
