"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";
import { useFormat } from "@/lib/format";

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
}

interface Invite {
  id: string;
  email: string;
  expiresAt: string;
}

export function SellerStaff() {
  const t = useTranslations("sellers.staff");
  const format = useFormat();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<{ members: Member[]; invites: Invite[] }>("GET", "/me/seller/staff");
    setMembers(res.members);
    setInvites(res.invites);
  }, []);

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [load]);

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
        className={`${box} mb-6`}
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void run(async () => {
            const res = await call<{ members: Member[]; invites: Invite[] }>("POST", "/me/seller/staff", { email });
            setEmail("");
            return res;
          });
        }}
      >
        <Field label={t("email")}>
          <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button className="mt-3" type="submit" disabled={busy} size="s">
          {t("invite")}
        </Button>
      </form>
      <ul className="grid gap-3">
        {members.map((m) => (
          <li key={m.id} className={box}>
            <p className="font-medium">{m.name}</p>
            <p className="text-ink-muted">{m.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide">{t(`roles.${m.role}`)}</p>
            {m.role === "staff" ? (
              <Button className="mt-3" type="button" size="s" variant="ghost" disabled={busy} onClick={() => run(() => call("DELETE", `/me/seller/staff/${m.id}`))}>
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
                <p className="text-ink-muted">{t("expires", { date: format.date(i.expiresAt) })}</p>
                <Button className="mt-3" type="button" size="s" variant="ghost" disabled={busy} onClick={() => run(() => call("DELETE", `/me/seller/staff/invites/${i.id}`))}>
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
