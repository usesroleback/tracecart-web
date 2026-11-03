"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { input } from "@/components/ui/form/Form";
import { ApiError, call } from "@/components/checkout/http";

// What console lists share (ADR-049): filters kept in the address, so a view can
// be reloaded, shared or saved; a person's saved views; and the list as a file.

/** A list's filters, read from and written to the URL. `query` is the same string for the same filters. */
export function useListFilters(keys: readonly string[]) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const applied = useMemo(() => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])), [keys, params]);
  const query = useMemo(() => {
    const out = new URLSearchParams();
    for (const k of keys) if (applied[k]) out.set(k, applied[k]);
    return out.toString();
  }, [keys, applied]);
  const apply = useCallback(
    (next: Record<string, string>) => {
      const out = new URLSearchParams();
      for (const k of keys) if (next[k]?.trim()) out.set(k, next[k].trim());
      const text = out.toString();
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
    },
    [keys, pathname, router]
  );
  return { applied, query, apply };
}

interface View {
  id: string;
  name: string;
  query: string;
}

/** A person's saved filters for this list: choose one, save the current ones, or delete one. */
export function SavedViews({ list, query, onApply }: { list: "shipments" | "storeOrders" | "returns"; query: string; onApply: (filters: Record<string, string>) => void }) {
  const t = useTranslations("console.views");
  const [views, setViews] = useState<View[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const current = views.find((v) => v.query === query);

  const reload = useCallback(async () => {
    const res = await call<{ items: View[] }>("GET", `/me/views?list=${list}`);
    setViews(res.items);
  }, [list]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch((e) => setError((e as Error).message));
  }, [reload]);

  async function save() {
    setError(null);
    try {
      await call("POST", "/me/views", { list, name: name.trim(), query });
      setNaming(false);
      setName("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await call("DELETE", `/me/views/${id}`);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {views.length ? (
        <select className={`${input} max-w-[14rem]`} aria-label={t("label")} value={current?.id ?? ""} onChange={(e) => onApply(Object.fromEntries(new URLSearchParams(views.find((v) => v.id === e.target.value)?.query ?? "")))}>
          <option value="">{t("all")}</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      ) : null}
      {current ? (
        <button type="button" className="underline" onClick={() => remove(current.id)}>
          {t("delete")}
        </button>
      ) : query && !naming ? (
        <button type="button" className="underline" onClick={() => setNaming(true)}>
          {t("save")}
        </button>
      ) : null}
      {naming ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input className={`${input} max-w-[12rem]`} aria-label={t("name")} placeholder={t("name")} required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={!name.trim()}>
            {t("saveCta")}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Downloads the list as filtered. Fetched first, so a refusal shows here and not as raw JSON in a tab. */
export function ExportButton({ path, query }: { path: string; query: string }) {
  const t = useTranslations("console.export");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracecart${path}${query ? `?${query}` : ""}`, { headers: { "X-Tracecart-Locale": document.documentElement.lang }, cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ApiError(body?.error?.message ?? t("failed"), res.status, body?.error?.code ?? null, null);
      }
      const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "tracecart.csv";
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Button variant="secondary" loading={busy} onClick={download}>
        {t("cta")}
      </Button>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Says the list is one dashboard queue, and how to see the rest. */
export function QueueChip({ label, onClear }: { label: string; onClear: () => void }) {
  const t = useTranslations("console");
  return (
    <p className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <button type="button" className="underline" onClick={onClear}>
        {t("seeAll")}
      </button>
    </p>
  );
}
