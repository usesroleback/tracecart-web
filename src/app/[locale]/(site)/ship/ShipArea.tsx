"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { CustomerProfile, ensureCustomerAccount, StaffAccountError, updateProfile } from "@/lib/customer";
import { HANDLING_FLAGS, HandlingFlag } from "@/lib/types";
import { Field, RequiredNote } from "@/components/ui/form/Form";

const input =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const CUSTOMS = ["CUSTOMER_HANDLES", "TRACECART_COORDINATES", "ALREADY_CLEARED", "UNKNOWN"] as const;
type Customs = (typeof CUSTOMS)[number];

type Place = { contactName: string; phone: string; line1: string; city: string; country: string };
const emptyPlace: Place = { contactName: "", phone: "", line1: "", city: "", country: "" };

/**
 * "Ship my product" (docs/design/use-case-2-ship-existing-goods.md): goods the
 * customer already has, from a pickup address to a delivery address. Like the
 * product finder, it needs a free account so we know who asks and can reply.
 * Only what they know is asked for as required; the rest can stay unknown and
 * staff follow up.
 */
export function ShipArea() {
  const t = useTranslations("ship");
  const locale = useLocale();
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [state, setState] = useState<"loading" | "staff" | "failed" | "ready">("loading");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    ensureCustomerAccount()
      .then((p) => {
        setProfile(p);
        setState("ready");
      })
      .catch((err) => setState(err instanceof StaffAccountError ? "staff" : "failed"));
  }, [isLoaded, isSignedIn]);

  const here = typeof window === "undefined" ? `/${locale}/ship` : window.location.href;

  if (!isLoaded) return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (!isSignedIn) {
    return (
      <Card padding={32} className="mx-auto max-w-lg text-center">
        <h1 className="rb-headline text-[28px]">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("signedOut")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here })}>{t("signUp")}</Button>
          <Button variant="secondary" onClick={() => clerk.openSignIn({ forceRedirectUrl: here, signUpForceRedirectUrl: here })}>
            {t("signIn")}
          </Button>
        </div>
      </Card>
    );
  }
  if (state === "loading") return <p className="text-sm text-ink-muted">{t("loading")}</p>;
  if (state === "failed") return <p className="text-sm text-critical">{t("failed")}</p>;
  if (state === "staff") return <p className="text-sm text-ink-muted">{t("staff")}</p>;
  return <ShipForm profile={profile!} />;
}

function ShipForm({ profile }: { profile: CustomerProfile }) {
  const t = useTranslations("ship");
  const tl = useTranslations("labels");
  const locale = useLocale();
  const [what, setWhat] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<File | null>(null);
  const [pickup, setPickup] = useState<Place>(emptyPlace);
  const [delivery, setDelivery] = useState<Place>({ ...emptyPlace, contactName: profile.name, phone: profile.phone ?? "" });
  const [cargo, setCargo] = useState({ packageCount: "", grossWeightKg: "", lengthCm: "", widthCm: "", heightCm: "", declaredValue: "", declaredValueCurrency: "XOF", readyAt: "", requiredBy: "" });
  const [hard, setHard] = useState(false);
  const [flags, setFlags] = useState<HandlingFlag[]>([]);
  const [customs, setCustoms] = useState<Customs>("UNKNOWN");
  const [documentsNote, setDocumentsNote] = useState("");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const day = (d: string) => (d ? new Date(`${d}T12:00:00Z`).toISOString() : undefined);
  const place = (p: Place) => ({ line1: p.line1.trim(), city: p.city.trim(), country: p.country.trim(), contactName: p.contactName.trim() || undefined, phone: p.phone.trim() || undefined });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // We reply to the account: it needs a phone number.
      if (phone.trim() !== (profile.phone ?? "")) await updateProfile({ phone: phone.trim() });
      const shipment = {
        pickup: place(pickup),
        delivery: place(delivery),
        packageCount: num(cargo.packageCount),
        grossWeightKg: num(cargo.grossWeightKg),
        lengthCm: num(cargo.lengthCm),
        widthCm: num(cargo.widthCm),
        heightCm: num(cargo.heightCm),
        declaredValue: num(cargo.declaredValue),
        declaredValueCurrency: cargo.declaredValue.trim() ? cargo.declaredValueCurrency.trim().toUpperCase() : undefined,
        handlingFlags: flags,
        readyAt: day(cargo.readyAt),
        requiredBy: day(cargo.requiredBy),
        requiredByIsHard: hard && !!cargo.requiredBy,
        customs,
        documentsNote: documentsNote.trim() || undefined,
      };
      const form = new FormData();
      form.append("what", what.trim());
      form.append("quantity", quantity);
      form.append("shipment", JSON.stringify(shipment));
      if (photo) form.append("photo", photo);
      const res = await fetch("/api/tracecart/customer/shipments", { method: "POST", body: form, headers: { "X-TraceCart-Locale": locale } });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? t("failed"));
      }
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Card padding={32} className="mx-auto max-w-lg text-center">
        <h1 className="rb-headline text-[28px]">{t("sent.title")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("sent.body", { email: profile.email })}</p>
        <Link href="/account" className="rb-link mt-4 inline-block text-sm">
          {t("sent.myRequests")}
        </Link>
      </Card>
    );
  }

  const placeFields = (p: Place, set: (p: Place) => void, required: boolean) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("place.line1")} className="sm:col-span-2">
        <input className={input} required={required} value={p.line1} onChange={(e) => set({ ...p, line1: e.target.value })} />
      </Field>
      <Field label={t("place.city")}>
        <input className={input} required={required} value={p.city} onChange={(e) => set({ ...p, city: e.target.value })} />
      </Field>
      <Field label={t("place.country")}>
        <input className={input} required={required} value={p.country} onChange={(e) => set({ ...p, country: e.target.value })} />
      </Field>
      <Field label={t("place.contact")}>
        <input className={input} value={p.contactName} onChange={(e) => set({ ...p, contactName: e.target.value })} />
      </Field>
      <Field label={t("place.phone")}>
        <input className={input} type="tel" value={p.phone} onChange={(e) => set({ ...p, phone: e.target.value })} />
      </Field>
    </div>
  );

  const c = (k: keyof typeof cargo) => (e: React.ChangeEvent<HTMLInputElement>) => setCargo({ ...cargo, [k]: e.target.value });
  const numeric = { type: "number", min: "0", step: "any", className: input } as const;

  return (
    <form onSubmit={submit} className="grid gap-6">
      <RequiredNote className="col-span-full" />
      <div>
        <h1 className="rb-headline text-[32px]">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">{t("intro")}</p>
      </div>

      <Card padding={24}>
        <h2 className="rb-title">{t("goods.title")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
          <Field label={t("goods.what")}>
            <input className={input} required value={what} onChange={(e) => setWhat(e.target.value)} placeholder={t("goods.whatPlaceholder")} />
          </Field>
          <Field label={t("goods.quantity")}>
            <input {...numeric} step="1" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label={t("goods.photo")} className="sm:col-span-2">
            <input type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding={24}>
          <h2 className="rb-title">{t("from")}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">{t("fromHint")}</p>
          <div className="mt-4">{placeFields(pickup, setPickup, true)}</div>
        </Card>
        <Card padding={24}>
          <h2 className="rb-title">{t("to")}</h2>
          <p className="mt-1 text-[13px] text-ink-muted">{t("toHint")}</p>
          <div className="mt-4">{placeFields(delivery, setDelivery, true)}</div>
        </Card>
      </div>

      <Card padding={24}>
        <h2 className="rb-title">{t("cargo.title")}</h2>
        <p className="mt-1 text-[13px] text-ink-muted">{t("cargo.hint")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("cargo.packages")}>
            <input {...numeric} step="1" min="1" value={cargo.packageCount} onChange={c("packageCount")} />
          </Field>
          <Field label={t("cargo.weight")}>
            <input {...numeric} value={cargo.grossWeightKg} onChange={c("grossWeightKg")} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="rb-label mb-1 text-sm text-ink">{t("cargo.dimensions")}</legend>
            <div className="grid grid-cols-3 gap-2">
              <input {...numeric} aria-label={t("cargo.length")} placeholder={t("cargo.length")} value={cargo.lengthCm} onChange={c("lengthCm")} />
              <input {...numeric} aria-label={t("cargo.width")} placeholder={t("cargo.width")} value={cargo.widthCm} onChange={c("widthCm")} />
              <input {...numeric} aria-label={t("cargo.height")} placeholder={t("cargo.height")} value={cargo.heightCm} onChange={c("heightCm")} />
            </div>
          </fieldset>
          <Field label={t("cargo.value")} hint={t("cargo.valueHint")} className="sm:col-span-2">
            <div className="flex gap-2">
              <input {...numeric} className={`${input} min-w-0 flex-1`} value={cargo.declaredValue} onChange={c("declaredValue")} />
              <input className={`${input} w-20! flex-none uppercase`} maxLength={3} aria-label={t("cargo.currency")} value={cargo.declaredValueCurrency} onChange={c("declaredValueCurrency")} />
            </div>
          </Field>
          <Field label={t("cargo.readyAt")}>
            <input type="date" className={input} value={cargo.readyAt} onChange={c("readyAt")} />
          </Field>
          <Field label={t("cargo.requiredBy")}>
            <input type="date" className={input} value={cargo.requiredBy} onChange={c("requiredBy")} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
            <input type="checkbox" checked={hard} disabled={!cargo.requiredBy} onChange={(e) => setHard(e.target.checked)} />
            {t("cargo.hard")}
          </label>
          <fieldset className="sm:col-span-2 lg:col-span-4">
            <legend className="rb-label mb-1 text-sm text-ink">{t("cargo.flags")}</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HANDLING_FLAGS.map((fl) => (
                <label key={fl} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={flags.includes(fl)} onChange={(e) => setFlags(e.target.checked ? [...flags, fl] : flags.filter((x) => x !== fl))} />
                  {tl(`handlingFlag.${fl}`)}
                </label>
              ))}
            </div>
            {(flags.includes("MEDICAL_DEVICE") || flags.includes("DANGEROUS_GOODS")) && <p className="mt-2 text-[13px] text-attn">{t("cargo.regulated")}</p>}
          </fieldset>
        </div>
      </Card>

      <Card padding={24}>
        <h2 className="rb-title">{t("customs.title")}</h2>
        <div className="mt-3 grid gap-2">
          {CUSTOMS.map((option) => (
            <label key={option} className="flex items-start gap-2 text-sm">
              <input type="radio" name="customs" className="mt-1" checked={customs === option} onChange={() => setCustoms(option)} />
              <span>
                <span className="font-semibold text-ink">{t(`customs.${option}.label`)}</span>
                <span className="block text-[13px] text-ink-muted">{t(`customs.${option}.hint`)}</span>
              </span>
            </label>
          ))}
        </div>
        <Field label={t("customs.documents")} hint={t("customs.documentsHint")} className="mt-4">
          <input className={input} value={documentsNote} onChange={(e) => setDocumentsNote(e.target.value)} />
        </Field>
      </Card>

      <Card padding={24}>
        <h2 className="rb-title">{t("reply.title")}</h2>
        <p className="mt-1 text-[13px] text-ink-muted">{t("reply.body", { email: profile.email })}</p>
        <Field label={t("reply.phone")} className="mt-3 max-w-xs">
          <input className={input} type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="l" loading={busy}>
          {t("submit")}
        </Button>
        <p className="text-xs text-ink-muted">{t("disclaimer")}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      )}
    </form>
  );
}
