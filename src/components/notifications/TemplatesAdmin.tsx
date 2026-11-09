"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";

interface Channel {
  key: string;
  wired: boolean;
}

interface Template {
  key: string;
  locale: "fr" | "en";
  channel: "EMAIL";
  subject: string;
  body: string;
  defaultSubject: string;
  defaultBody: string;
  overridden: boolean;
}

const KEYS = [
  "order_placed",
  "payment_received",
  "order_cancelled",
  "order_part_shipped",
  "order_shipped",
  "order_line_cancelled",
  "order_delivered",
  "shipment_update",
  "return_update",
  "refund_paid",
] as const;

export function TemplatesAdmin() {
  const t = useTranslations("notificationTemplates");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sel, setSel] = useState<{ key: (typeof KEYS)[number]; locale: "fr" | "en" }>({ key: "order_placed", locale: "fr" });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const show = (row: Template | undefined) => {
    if (!row) return;
    setSubject(row.subject);
    setBody(row.body);
  };

  const load = useCallback(async (pick: { key: (typeof KEYS)[number]; locale: "fr" | "en" }) => {
    try {
      const [ch, tpl] = await Promise.all([
        api.get<{ channels: Channel[] }>("/notification-channels"),
        api.get<{ templates: Template[] }>("/notification-templates"),
      ]);
      setChannels(ch.channels);
      setTemplates(tpl.templates);
      show(tpl.templates.find((x) => x.key === pick.key && x.locale === pick.locale));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load({ key: "order_placed", locale: "fr" });
  }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.patch("/notification-templates", { key: sel.key, locale: sel.locale, subject, body });
      await load(sel);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function revert() {
    setError(null);
    try {
      await api.patch("/notification-templates", { key: sel.key, locale: sel.locale, subject: "", body: "" });
      await load(sel);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      <p className="text-sm text-ink-muted">{t("lead")}</p>
      <section>
        <h2 className="mb-2 text-sm font-medium">{t("channels")}</h2>
        <ul className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <li key={c.key} className="rounded-[var(--radius-s)] border border-line bg-surface-raised px-3 py-1 text-sm">
              <span className="rb-mono-s">{c.key}</span>{" "}
              <span className={c.wired ? "text-positive" : "text-ink-muted"}>{c.wired ? t("wired") : t("unwired")}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_1fr]">
        <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
          {KEYS.flatMap((key) =>
            (["fr", "en"] as const).map((locale) => {
              const row = templates.find((x) => x.key === key && x.locale === locale);
              const active = sel.key === key && sel.locale === locale;
              return (
                <li key={`${key}-${locale}`}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm ${active ? "bg-surface-sunken" : ""}`}
                    onClick={() => {
                      setSel({ key, locale });
                      show(templates.find((x) => x.key === key && x.locale === locale));
                    }}
                  >
                    <span>
                      {t(`keys.${key}`)} · {locale}
                    </span>
                    <span className="text-ink-muted">{row?.overridden ? t("overridden") : t("default")}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <form onSubmit={save} className="flex flex-col gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
          <p className="text-sm text-ink-muted">{t("placeholders")}</p>
          <Field label={t("subject")}>
            <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </Field>
          <Field label={t("body")}>
            <textarea className={`${input} h-auto min-h-[8rem] py-2`} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
            <Button type="button" variant="secondary" onClick={revert}>
              {t("revert")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
