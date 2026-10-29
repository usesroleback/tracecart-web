"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Badge } from "@/components/ui/badge/Badge";
import { Card } from "@/components/ui/card/Card";
import { DsPlusIcon } from "@/icons";
import type { Carrier } from "./CarrierServices";
import { RequiredMark, RequiredNote } from "@/components/ui/form/Form";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:opacity-60";

/**
 * Carrier accounts. An account is created here with the carrier's email; the
 * carrier signs in with that email and from then on keeps its own routes and
 * rates (Mes routes et tarifs).
 */
export function CarrierAccounts({ carriers }: { carriers: Carrier[] }) {
  const t = useTranslations("orders.carriersPage.accounts");
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [v, setV] = useState({ name: "", email: "", phone: "", locale: "fr" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/carrier-services/carriers", { name: v.name, email: v.email, phone: v.phone.trim() || null, locale: v.locale });
      setV({ name: "", email: "", phone: "", locale: "fr" });
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding={24} className="mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="rb-headline text-xl">{t("title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        {!adding && (
          <Button variant="secondary" startIcon={<DsPlusIcon width={18} height={18} />} onClick={() => setAdding(true)}>
            {t("add")}
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RequiredNote className="col-span-full" />
          <label className="block text-sm">
            <span className="rb-label mb-1 block text-ink">{t("name")}<RequiredMark /></span>
            <input className={input} required value={v.name} onChange={set("name")} />
          </label>
          <label className="block text-sm">
            <span className="rb-label mb-1 block text-ink">{t("email")}<RequiredMark /></span>
            <input className={input} type="email" required value={v.email} onChange={set("email")} />
          </label>
          <label className="block text-sm">
            <span className="rb-label mb-1 block text-ink">{t("phone")}</span>
            <input className={input} value={v.phone} onChange={set("phone")} placeholder="+227..." />
          </label>
          <label className="block text-sm">
            <span className="rb-label mb-1 block text-ink">{t("locale")}</span>
            <select className={input} value={v.locale} onChange={set("locale")}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
          <p className="text-[13px] text-ink-muted sm:col-span-2 lg:col-span-4">{t("hint")}</p>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={busy}>
              {t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t("cancel")}
            </Button>
            {error && <p className="text-sm text-critical">{error}</p>}
          </div>
        </form>
      )}

      {carriers.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
          {carriers.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 text-sm">
              <span>
                <span className="font-semibold">{c.name}</span> <span className="text-ink-muted">· {c.email}</span>
                {c.phone && <span className="text-ink-muted"> · {c.phone}</span>}
              </span>
              {c.signedIn ? <Badge variant="positive">{t("signedIn")}</Badge> : <Badge variant="outline">{t("invited")}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
