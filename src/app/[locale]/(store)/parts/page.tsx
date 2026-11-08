import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductList } from "@/components/store/ProductCard";
import { findHref } from "@/components/site/header/links";
import { STORE_CURRENCY, storeApi, storeCountry } from "@/lib/store";

type Kind = "VEHICLE" | "DEVICE" | "APPLIANCE";
const KINDS: Kind[] = ["VEHICLE", "DEVICE", "APPLIANCE"];
type Props = { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "store.parts" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

/**
 * "Find parts for my vehicle, device or appliance" (ADR-080): products listed
 * to fit it, those verified first, then those that only may fit. A GET form,
 * so a search can be shared and works without JavaScript.
 */
export default async function PartsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const q = await searchParams;
  const t = await getTranslations("store.parts");
  const tf = await getTranslations("store.fit");
  const kind: Kind = KINDS.includes(q.kind as Kind) ? (q.kind as Kind) : "VEHICLE";
  const one = (v?: string) => (v?.trim() ? v.trim().slice(0, 80) : undefined);
  const make = one(q.make);
  const model = one(q.model);
  const year = q.year && /^\d{4}$/.test(q.year) ? Number(q.year) : undefined;
  const detail = one(q.detail);
  const result =
    make && model
      ? (await storeApi(locale).GET("/catalog/parts", { params: { query: { kind, make, model, year, detail, country: await storeCountry(), currency: STORE_CURRENCY } } })).data
      : undefined;
  const field = "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-ink";

  return (
    <StoreShell>
      <h1 className="rb-headline text-[30px] sm:text-[40px]">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">{t("lead")}</p>

      <form method="get" aria-label={t("title")} className="mt-6 grid max-w-3xl gap-3 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm text-ink-muted">{t("kindLegend")}</legend>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <label key={k} className="inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-line-strong px-3 py-2 text-sm text-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ink-inverse">
                <input type="radio" name="kind" value={k} defaultChecked={k === kind} className="sr-only" />
                {t(`kinds.${k}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm text-ink-muted">
          {tf("make.VEHICLE")} / {tf("make.DEVICE")}
          <input name="make" defaultValue={make ?? ""} required maxLength={80} className={field} />
        </label>
        <label className="grid gap-1 text-sm text-ink-muted">
          {t("modelLabel")}
          <input name="model" defaultValue={model ?? ""} required maxLength={80} className={field} />
        </label>
        <label className="grid gap-1 text-sm text-ink-muted">
          {t("yearLabel")}
          <input name="year" defaultValue={q.year ?? ""} inputMode="numeric" pattern="\d{4}" maxLength={4} className={field} />
        </label>
        <label className="grid gap-1 text-sm text-ink-muted">
          {t("detailLabel")}
          <input name="detail" defaultValue={detail ?? ""} maxLength={80} className={field} />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className="inline-flex h-11 items-center rounded-[var(--radius-s)] bg-ink px-5 text-sm font-medium text-ink-inverse hover:opacity-90">
            {t("search")}
          </button>
        </div>
      </form>

      {result ? (
        <div className="mt-10 grid gap-10">
          {result.missing.length ? (
            <p role="status" className="max-w-3xl rounded-[var(--radius-s)] bg-surface-sunken px-4 py-3 text-sm text-ink">
              {tf("missing", { fields: result.missing.map((m) => tf(`fields.${m}`)).join(", ") })}
            </p>
          ) : null}
          <section aria-labelledby="parts-verified">
            <h2 id="parts-verified" className="rb-title-l">
              {t("verifiedTitle", { target: result.target })}
            </h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">{t("verifiedLead")}</p>
            {result.verified.length ? <ProductList products={result.verified} /> : <p className="text-ink-muted">{t("noneVerified")}</p>}
          </section>
          {result.potential.length ? (
            <section aria-labelledby="parts-potential">
              <h2 id="parts-potential" className="rb-title-l">
                {t("potentialTitle")}
              </h2>
              <p className="mb-4 mt-1 text-sm text-ink-muted">{t("potentialLead")}</p>
              <ProductList products={result.potential} />
            </section>
          ) : null}
          <p className="text-sm text-ink-muted">
            {t("notListed")}{" "}
            <Link href={findHref(t("findNeed", { target: result.target }))} className="font-medium text-ink underline">
              {t("findForMe")}
            </Link>
          </p>
        </div>
      ) : null}
    </StoreShell>
  );
}
