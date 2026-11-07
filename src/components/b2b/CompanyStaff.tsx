"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";
import { useAuth, useClerk } from "@clerk/nextjs";

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "approver" | "buyer";
}

interface Invite {
  id: string;
  email: string;
  role: "approver" | "buyer";
  expiresAt: string;
}

/** Company colleagues: invite a buyer or an approver (ADR-061). */
export function CompanyStaff() {
  const t = useTranslations("b2b.staff");
  const format = useFormat();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState<"b2b_approver" | "b2b_buyer">("b2b_approver");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ members: Member[]; invites: Invite[] }>("GET", "/me/company/staff");
    setMembers(res.members);
    setInvites(res.invites);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [isLoaded, isSignedIn, load]);

  async function run(fn: () => Promise<{ members: Member[]; invites: Invite[] }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      setMembers(res.members);
      setInvites(res.invites);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!isLoaded) return null;
  if (!isSignedIn) {
    return (
      <button type="button" className="rounded-[var(--radius-s)] bg-ink px-5 py-3 font-medium text-ink-inverse" onClick={() => clerk.openSignIn({ forceRedirectUrl: window.location.href })}>
        {t("signIn")}
      </button>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-1 text-[28px]">{t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t("lead")}</p>
      {error ? (
        <p role="alert" className="mb-4 text-sm text-critical">
          {error}
        </p>
      ) : null}
      <form
        className={`${box} mb-6 grid gap-3`}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void run(async () => {
            const res = await call<{ members: Member[]; invites: Invite[] }>("POST", "/me/company/staff", { email, roleKey });
            setEmail("");
            return res;
          });
        }}
      >
        <Field label={t("email")}>
          <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t("role")}>
          <select className={input} value={roleKey} onChange={(e) => setRoleKey(e.target.value as "b2b_approver" | "b2b_buyer")}>
            <option value="b2b_approver">{t("roles.approver")}</option>
            <option value="b2b_buyer">{t("roles.buyer")}</option>
          </select>
        </Field>
        <Button className="mt-1" type="submit" disabled={busy} size="s">
          {t("invite")}
        </Button>
      </form>
      <ul className="grid gap-3">
        {members.map((m) => (
          <li key={m.id} className={box}>
            <p className="font-medium">{m.name}</p>
            <p className="text-ink-muted">{m.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide">{t(`roles.${m.role}`)}</p>
            {m.role !== "admin" ? (
              <Button className="mt-3" type="button" size="s" variant="ghost" disabled={busy} onClick={() => run(() => call("DELETE", `/me/company/staff/${m.id}`))}>
                {t("remove")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {invites.length ? (
        <div className="mt-6">
          <h2 className="rb-title mb-3 text-[14px]">{t("pending")}</h2>
          <ul className="grid gap-3">
            {invites.map((i) => (
              <li key={i.id} className={box}>
                <p className="font-medium">{i.email}</p>
                <p className="text-ink-muted">
                  {t(`roles.${i.role}`)} · {t("expires", { date: format.date(i.expiresAt) })}
                </p>
                <Button className="mt-3" type="button" size="s" variant="ghost" disabled={busy} onClick={() => run(() => call("DELETE", `/me/company/staff/invites/${i.id}`))}>
                  {t("withdraw")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
