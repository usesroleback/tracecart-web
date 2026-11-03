"use client";

import { useTranslations } from "next-intl";
import { SessionUser } from "./types";

/** What to call a person's job: their roles, translated, else their account type (a custom role has no translation). */
export function useRoleName(user: SessionUser): string {
  const t = useTranslations("labels");
  const known = (user.roles ?? []).filter((key) => t.has(`systemRole.${key}`));
  return known.length ? known.map((key) => t(`systemRole.${key}` as "systemRole.admin")).join(", ") : t(`role.${user.role}`);
}
