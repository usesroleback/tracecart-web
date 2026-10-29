"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/apiClient";
import { useFormat } from "@/lib/format";
import Button from "@/components/ui/button/Button";
import { input } from "@/components/ui/form/Form";

/** Synonym sets, and the searches that found nothing. */
export function SearchAdmin() {
  const t = useTranslations("catalogAdmin.search");
  const format = useFormat();
  const [sets, setSets] = useState<{ id: string; terms: string[] }[]>([]);
  const [zero, setZero] = useState<{ query: string; count: number; lastSearchedAt: string }[]>([]);
  const [terms, setTerms] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, z] = await Promise.all([
        api.get<{ synonyms: { id: string; terms: string[] }[] }>("/admin/search/synonyms"),
        api.get<{ searches: { query: string; count: number; lastSearchedAt: string }[] }>("/admin/search/zero-results?days=30"),
      ]);
      setSets(s.synonyms);
      setZero(z.searches);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/admin/search/synonyms", { terms: terms.split(",").map((x) => x.trim()).filter(Boolean) });
      setTerms("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/search/synonyms/${id}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="rb-headline text-[28px]">{t("title")}</h1>
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="rb-title">{t("synonyms")}</h2>
          <p className="mb-3 mt-1 text-sm text-ink-muted">{t("synonymsLead")}</p>
          <form onSubmit={add} className="mb-4 flex gap-2">
            <input className={input} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder={t("terms")} aria-label={t("terms")} required />
            <Button type="submit" variant="primary">
              {t("add")}
            </Button>
          </form>
          <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
            {sets.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="flex-1">{s.terms.join(" · ")}</span>
                <Button variant="ghost" size="s" onClick={() => remove(s.id)}>
                  {t("delete")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="rb-title">{t("zero")}</h2>
          <p className="mb-3 mt-1 text-sm text-ink-muted">{t("zeroLead")}</p>
          {zero.length ? (
            <ul className="divide-y divide-line rounded-[var(--radius-m)] border border-line bg-surface-raised">
              {zero.map((z) => (
                <li key={z.query} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1">{z.query}</span>
                  <span className="text-ink-muted">{t("times", { count: z.count })}</span>
                  <span className="text-ink-muted">{format.ago(z.lastSearchedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">{t("zeroEmpty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
