"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCountry } from "@/context/CountryContext";
import { useFormat } from "@/lib/format";
import { toMajor } from "@/lib/currency";
import { ApiError, call } from "@/components/checkout/http";
import type { AiResult, AiSearchResult, Chip, Reason } from "@/components/services/types";

const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm";

/**
 * Search by words, a photo or a short video (POST /search/ai): what was read,
 * the products with why each matches, chips to narrow, and "Find it for me"
 * when the catalogue doesn't have it.
 */
export function AiSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const t = useTranslations("ai");
  const { country } = useCountry();
  const [q, setQ] = useState(initialQuery);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "searching" | "done">("idle");
  const [result, setResult] = useState<AiSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the preview follows the picked file
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!q.trim() && !file) return setError(t("needSomething"));
    setState("searching");
    setError(null);
    const form = new FormData();
    if (q.trim()) form.append("q", q.trim());
    if (file) form.append(file.type.startsWith("video/") ? "video" : "photo", file, file.name);
    const params = new URLSearchParams({ currency: "XOF", ...(country ? { country } : {}) });
    try {
      setResult(await call<AiSearchResult>("POST", `/search/ai?${params}`, form));
      setState("done");
    } catch (err) {
      setError(err instanceof ApiError && err.code === "RATE_LIMITED" ? t("rateLimited") : err instanceof Error ? err.message : t("failed"));
      setState("idle");
    }
  }

  function pick(f: File | null) {
    setFile(f);
    if (!f || !f.type.startsWith("image/")) setPreview(null);
  }

  const findHref = result ? `/find?search=${encodeURIComponent(result.searchId)}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}` : "/find";

  return (
    <div className="grid gap-6">
      <form onSubmit={search} className="grid gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-4 sm:p-5">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-ink">{t("describe")}</span>
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder={t("describePlaceholder")}
            className="rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 py-2 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} type="file" accept={ACCEPT} className="sr-only" id="ai-file" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <label htmlFor="ai-file" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-s)] border border-ink px-4 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse">
            <svg viewBox="0 0 20 20" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 7h3l1.5-2h5L14 7h3v9H3z" strokeLinejoin="round" />
              <circle cx="10" cy="11" r="3" />
            </svg>
            {file ? t("changeFile") : t("addFile")}
          </label>
          {file ? (
            <span className="flex items-center gap-2 text-sm text-ink-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="size-11 rounded-[var(--radius-xs)] object-cover" />
              ) : null}
              <span className="max-w-[16ch] truncate">{file.name}</span>
              <button type="button" className="rb-link" onClick={() => { pick(null); if (fileInput.current) fileInput.current.value = ""; }}>
                {t("removeFile")}
              </button>
            </span>
          ) : (
            <span className="text-xs text-ink-muted">{t("fileHint")}</span>
          )}
          <button type="submit" disabled={state === "searching"} className="ml-auto inline-flex h-11 items-center rounded-[var(--radius-s)] bg-ink px-5 font-medium text-ink-inverse hover:opacity-90 disabled:opacity-60">
            {state === "searching" ? t("searching") : t("search")}
          </button>
        </div>
        {error ? <p role="alert" className="text-sm text-critical">{error}</p> : null}
      </form>

      {result ? <Results result={result} findHref={findHref} /> : null}
    </div>
  );
}

function Results({ result, findHref }: { result: AiSearchResult; findHref: string }) {
  const t = useTranslations("ai");
  const u = result.understood;
  return (
    <section aria-live="polite" className="grid gap-5">
      {result.limited ? <p className="rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm text-ink">{t("limited")}</p> : null}
      {result.notAProduct ? <p className="rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm text-ink">{t("notAProduct")}</p> : null}
      {u ? (
        <div className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-4">
          <p className="rb-overline text-ink-muted">{t("understood")}</p>
          <p className="mt-1 text-lg font-medium text-ink">{u.title ?? t("unnamed")}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {[u.category?.name, u.brand, u.model, ...u.attributes.map((a) => `${a.value}${a.unit ? ` ${a.unit}` : ""}`)].filter(Boolean).join(" · ")}
          </p>
        </div>
      ) : null}
      {result.clarifications?.length ? (
        <div className="rounded-[var(--radius-m)] border border-line bg-surface-sunken p-4">
          <p className="rb-overline text-ink-muted">{t("toNarrow")}</p>
          <ul className="mt-2 grid gap-3 text-sm text-ink">
            {result.clarifications.map((q) => (
              <li key={q.key}>
                {q.question}
                {q.options.length ? (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {/* Options are categories ("which kind?"): each opens its own. */}
                    {q.options.map((o) => (
                      <Link key={o.value} href={`/c/${o.value}`} className="rounded-full border border-line-strong bg-surface-raised px-3 py-1.5 hover:border-ink">
                        {o.label}
                      </Link>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {result.chips.length ? (
        <nav aria-label={t("refine")} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-muted">{t("refine")}:</span>
          {result.chips.map((c) => (
            <Link key={chipKey(c)} href={chipHref(c)} className="rounded-full border border-line-strong px-3 py-1.5 text-ink hover:border-ink">
              {c.label}
              {c.kind !== "attribute" ? <span className="ml-1 text-ink-muted">{c.count}</span> : null}
            </Link>
          ))}
        </nav>
      ) : null}
      {result.items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p) => (
            <li key={p.id}>
              <ResultCard product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">{result.needsDescription ? t("needsDescription") : t("nothing")}</p>
      )}
      <div className="rounded-[var(--radius-m)] border border-dashed border-line-strong px-5 py-6 text-center">
        <p className="font-medium text-ink">{t("notIt")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{t("notItLead")}</p>
        <Link href={findHref} className="mt-4 inline-flex rounded-[var(--radius-s)] bg-ink px-5 py-3 text-sm font-medium text-ink-inverse hover:opacity-90">
          {t("findForMe")}
        </Link>
      </div>
    </section>
  );
}

const chipKey = (c: Chip) => (c.kind === "attribute" ? `a:${c.key}:${c.value}` : `${c.kind}:${c.slug}`);
const chipHref = (c: Chip) => (c.kind === "category" ? `/c/${c.slug}` : c.kind === "brand" ? `/b/${c.slug}` : `/c/${c.category}?attr=${encodeURIComponent(`${c.key}:${c.value}`)}`);

function ResultCard({ product }: { product: AiResult }) {
  const t = useTranslations("ai");
  const format = useFormat();
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-m)] border border-line bg-surface-raised hover:shadow-[var(--shadow-1)]">
      <div className="aspect-square bg-surface-sunken">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image.url} alt={product.image.alt} loading="lazy" className="size-full object-contain" />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        {product.brand ? <p className="rb-overline text-ink-muted">{product.brand.name}</p> : null}
        <h3 className="line-clamp-3 text-[15px] font-medium leading-snug text-ink">
          <Link href={`/p/${product.slug}`} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none group-focus-within:underline">
            {product.title}
          </Link>
        </h3>
        <ul className="flex flex-wrap gap-1">
          {product.reasons.map((r, i) => (
            <li key={i} className="rounded-[var(--radius-xs)] bg-surface-sunken px-1.5 py-0.5 text-xs text-ink">
              {reasonText(t, r)}
            </li>
          ))}
        </ul>
        <p className="rb-numeral mt-auto pt-1 font-medium text-ink">
          {format.number(toMajor(product.price.amountMinor, product.price.currency))} {product.price.currency}
        </p>
      </div>
    </article>
  );
}

function reasonText(t: ReturnType<typeof useTranslations<"ai">>, r: Reason): string {
  switch (r.key) {
    case "identifier":
      return t("reasons.identifier", { code: r.code });
    case "brand":
      return t("reasons.brand", { brand: r.brand });
    case "category":
      return t("reasons.category", { category: r.category });
    case "attribute":
      return t("reasons.attribute", { label: r.label, value: `${r.value}${r.unit ? ` ${r.unit}` : ""}` });
    case "words":
      return t("reasons.words");
    case "looksLike":
      return t("reasons.looksLike");
    case "fits":
      return t("reasons.fits", { target: r.target });
    case "mayFit":
      return t("reasons.mayFit", { target: r.target });
  }
}
