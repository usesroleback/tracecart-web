import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { findHref } from "@/components/site/header/links";
import { storeApi, type ProductDetail } from "@/lib/store";

export type FitQuery = { make?: string; model?: string; year?: string; detail?: string };
type Fitment = ProductDetail["variants"][number]["fitments"][number];

const years = (f: Pick<Fitment, "yearFrom" | "yearTo">) =>
  f.yearFrom && f.yearTo ? (f.yearFrom === f.yearTo ? `${f.yearFrom}` : `${f.yearFrom}–${f.yearTo}`) : f.yearFrom ? `${f.yearFrom}+` : f.yearTo ? `–${f.yearTo}` : "";

/** "Toyota Corolla 2007–2013 (1.6 VVT-i)". */
const fitmentName = (f: Fitment) => [f.make, f.model, years(f)].filter(Boolean).join(" ") + (f.detail ? ` (${f.detail})` : "");

export const partsHref = (kind: string, q: FitQuery) => {
  const params = new URLSearchParams({ kind });
  for (const [k, v] of Object.entries(q)) if (v) params.set(k, v);
  return `/parts?${params}`;
};

/**
 * "Will it fit?" on a product that fits something the customer owns (ADR-080):
 * what the variant is listed to fit, each verified or only possible, and a
 * check against theirs. A plain GET form: it works before JavaScript, and the
 * answer can be shared. Not listed is never "doesn't fit".
 */
export async function FitCheck({ product, sku, query, locale }: { product: ProductDetail; sku: string; query: FitQuery; locale: string }) {
  const t = await getTranslations("store.fit");
  const kind = product.fitmentKind!;
  const variant = product.variants.find((v) => v.sku === sku) ?? product.variants[0];
  const asked = !!(query.make && query.model);
  const year = query.year && /^\d{4}$/.test(query.year) ? Number(query.year) : undefined;
  const result = asked
    ? (
        await storeApi(locale).GET("/catalog/products/{slug}/fit", {
          params: { path: { slug: product.slug }, query: { make: query.make, model: query.model, year, detail: query.detail || undefined, variant: variant.sku } },
        })
      ).data
    : undefined;

  const evidenceLabel = (f: Fitment) => `${t(`evidence.${f.evidence}`)}${f.evidenceRef ? ` (${f.evidenceRef})` : ""}`;
  const field = "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-ink";

  return (
    <section aria-labelledby="fit-check" className="rounded-[var(--radius-m)] border border-line bg-surface-raised p-5">
      <h2 id="fit-check" className="text-lg font-semibold text-ink">
        {t(`title.${kind}`)}
      </h2>

      {variant.fitments.length ? (
        <>
          <p className="mt-2 text-sm text-ink-muted">{t("listedLead")}</p>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {variant.fitments.map((f, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-ink">{fitmentName(f)}</span>
                <span className={f.verified ? "font-medium text-positive" : "text-ink-muted"}>
                  {f.verified ? t("verified") : t("mayFit")} · {evidenceLabel(f)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">{t("noneListed")}</p>
      )}

      <form method="get" className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={t("formLabel")}>
        {product.variants.length > 1 ? <input type="hidden" name="variant" value={variant.sku} /> : null}
        <label className="grid gap-1 text-sm text-ink-muted">
          {t(`make.${kind}`)}
          <input name="fitMake" defaultValue={query.make ?? ""} required maxLength={80} className={field} />
        </label>
        <label className="grid gap-1 text-sm text-ink-muted">
          {t(`model.${kind}`)}
          <input name="fitModel" defaultValue={query.model ?? ""} required maxLength={80} className={field} />
        </label>
        {kind === "VEHICLE" ? (
          <label className="grid gap-1 text-sm text-ink-muted">
            {t("year")}
            <input name="fitYear" defaultValue={query.year ?? ""} inputMode="numeric" pattern="\d{4}" maxLength={4} className={field} />
          </label>
        ) : null}
        <label className="grid gap-1 text-sm text-ink-muted">
          {t(`detail.${kind}`)}
          <input name="fitDetail" defaultValue={query.detail ?? ""} maxLength={80} className={field} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex h-11 items-center rounded-[var(--radius-s)] border border-ink px-5 text-sm font-medium text-ink hover:bg-ink hover:text-ink-inverse">
            {t("check")}
          </button>
        </div>
      </form>

      {result ? (
        <div role="status" className={`mt-4 rounded-[var(--radius-s)] p-4 text-sm ${result.status === "verified" ? "bg-positive/10" : "bg-surface-sunken"}`}>
          <p className="font-semibold text-ink">{t(`result.${result.status}`, { target: result.target ?? "" })}</p>
          {result.matches.length ? (
            <ul className="mt-1 text-ink-muted">
              {result.matches.slice(0, 3).map((m, i) => (
                <li key={i}>
                  {fitmentName(m)} · {evidenceLabel(m)}
                </li>
              ))}
            </ul>
          ) : null}
          {result.missing.length ? <p className="mt-1 text-ink">{t("missing", { fields: result.missing.map((m) => t(`fields.${m}`)).join(", ") })}</p> : null}
          {result.status !== "verified" ? <p className="mt-1 text-ink-muted">{t("notSure")}</p> : null}
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href={partsHref(kind, query)} className="font-medium text-ink underline">
              {t("otherParts", { target: result.target ?? "" })}
            </Link>
            {result.status !== "verified" ? (
              <Link href={findHref(`${product.title} — ${result.target ?? ""}`)} className="font-medium text-ink underline">
                {t("askUs")}
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}
    </section>
  );
}
