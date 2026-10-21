"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Button from "@/components/ui/button/Button";
import { TRACECART_API_URL } from "@/lib/apiBase";

const fieldClasses = "w-full bg-transparent text-sm font-medium text-ink placeholder:text-ink-muted placeholder:font-normal focus:outline-none";
const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

interface Suggestion {
  provider: string;
  url: string;
  title: string;
  merchant: string | null;
  imageUrl: string | null;
  price: number | null;
  currency: string | null;
}
interface SuggestResult {
  identified: { title: string | null; brand: string | null; model: string | null } | null;
  suggestions: Suggestion[];
  needsDescription: boolean;
  limited: boolean;
}

function Field({ label, placeholder, value, onChange, children }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; children?: React.ReactNode }) {
  return (
    <label className="block px-5 py-3">
      <span className="rb-overline">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={fieldClasses} />
        {children}
      </span>
    </label>
  );
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

async function postForm<T>(path: string, form: FormData, locale: string): Promise<T> {
  const res = await fetch(`${TRACECART_API_URL}${path}`, { method: "POST", body: form, headers: { "X-TraceCart-Locale": locale } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

/**
 * docs/brand/tracecart-brand-guidelines.md: "From · To · What · When → Get a
 * quote. No account required; a named person replies within 4 working
 * hours." What can be words, a photo, or both: TraceCart reads the photo,
 * suggests real listings (docs/product-discovery.md, public endpoints), and
 * the request lands in the console as a sourcing request for staff.
 */
export function QuoteBar() {
  const t = useTranslations("site.quoteBar");
  const locale = useLocale();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [what, setWhat] = useState("");
  const [when, setWhen] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [choice, setChoice] = useState<Suggestion | "none" | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      setProblem(t("photoInvalid"));
      return;
    }
    setProblem(null);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  }

  function removePhoto() {
    setPhoto(null);
    setPreview(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function search(e: FormEvent) {
    e.preventDefault();
    if (!what.trim() && !photo) return setProblem(t("needWhat"));
    if (!to.trim()) return setProblem(t("needTo"));
    setProblem(null);
    setSearching(true);
    setChoice(null);
    try {
      const form = new FormData();
      form.append("what", what);
      if (photo) form.append("photo", photo);
      setResult(await postForm<SuggestResult>("/public/discovery/suggest", form, locale));
    } catch (err) {
      // Searching is a help, not a gate: without it the request can still be sent.
      setProblem(err instanceof Error ? err.message : null);
      setResult({ identified: null, suggestions: [], needsDescription: false, limited: true });
    } finally {
      setSearching(false);
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setProblem(null);
    try {
      const form = new FormData();
      Object.entries({ what, from, to, when, ...contact, locale }).forEach(([k, v]) => form.append(k, v));
      if (choice && choice !== "none") form.append("choice", JSON.stringify(choice));
      if (photo) form.append("photo", photo);
      await postForm("/public/discovery/requests", form, locale);
      setSubmitted(true);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : t("failed"));
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div id="quote" className="rounded-[var(--radius-m)] border border-line bg-surface-raised px-6 py-8 text-center shadow-[var(--shadow-1)]">
        <p className="rb-title text-[18px]">{t("submittedTitle")}</p>
        <p className="mt-1 text-sm text-ink-muted">{from ? t("submittedBody", { from, to }) : t("submittedBodyNoFrom", { to })}</p>
      </div>
    );
  }

  const identified = result?.identified && [result.identified.brand, result.identified.model].filter(Boolean).join(" ");
  const money = (s: Suggestion) =>
    s.price != null ? `${s.price.toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}${s.currency ? ` ${s.currency}` : ""}` : t("priceToConfirm");

  return (
    <div id="quote">
      <form onSubmit={search}>
        {/* bundle.css .rb-quote: 2px ink border and the route corner, no shadow. */}
        <div className="grid divide-y divide-line overflow-hidden rounded-[var(--radius-l)_var(--radius-xs)_var(--radius-xs)_var(--radius-xs)] border-2 border-ink bg-surface-raised sm:grid-cols-[1.8fr_1fr_1fr_1fr_auto] sm:divide-x sm:divide-y-0">
          {/* What comes first: the product is the request. Words, a photo, or both; the field also takes a dropped image. */}
          <div
            className={`px-5 py-3 transition-colors ${dragging ? "bg-accent-soft" : ""}`}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                setDragging(true);
              }
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickPhoto(e.dataTransfer.files?.[0]);
            }}
          >
            <label htmlFor="quote-what" className="rb-overline">
              {t("what")}
            </label>
            <span className="mt-1 flex items-center gap-2">
              <input
                id="quote-what"
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder={dragging ? t("dropHere") : t("whatPlaceholder")}
                className={fieldClasses}
              />
              {preview ? (
                <span className="relative flex-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="" className="h-9 w-9 rounded-[var(--radius-xs)] border border-line object-cover" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    aria-label={t("removePhoto")}
                    className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-line bg-surface-raised text-[10px] text-ink"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={t("attach")}
                  title={t("photoHint")}
                  className="inline-flex h-9 flex-none items-center gap-1.5 rounded-[var(--radius-s)] border border-line-strong px-2.5 text-xs font-semibold text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <CameraIcon />
                  {t("photo")}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => pickPhoto(e.target.files?.[0])}
              />
            </span>
          </div>
          <Field label={t("from")} placeholder={t("fromPlaceholder")} value={from} onChange={setFrom} />
          <Field label={t("to")} placeholder={t("toPlaceholder")} value={to} onChange={setTo} />
          <Field label={t("when")} placeholder={t("whenPlaceholder")} value={when} onChange={setWhen} />
          <div className="flex items-center p-3 sm:pl-0">
            <Button type="submit" block className="sm:w-auto" loading={searching}>
              {searching ? t("searching") : t("cta")}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t("disclaimer")}</p>
      </form>

      {problem && (
        <p role="alert" className="mt-3 text-sm text-critical">
          {problem}
        </p>
      )}

      {result && (
        <div ref={panelRef} className="mt-6 rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 sm:p-6" aria-live="polite">
          {result.needsDescription ? (
            <p className="text-sm text-ink">{t("needsDescription")}</p>
          ) : result.suggestions.length === 0 ? (
            <>
              <p className="rb-title text-[18px]">{t("noneTitle")}</p>
              <p className="mt-1 text-sm text-ink-muted">{t("noneBody")}</p>
            </>
          ) : (
            <>
              {identified && <p className="rb-overline">{t("looksLike", { product: identified })}</p>}
              <h3 className="rb-title mt-1 text-[20px]">{t("pickTitle")}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t("pickHint")}</p>
              <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {result.suggestions.map((s) => {
                  const chosen = choice !== "none" && choice?.url === s.url;
                  return (
                    <li key={s.url}>
                      <div
                        className={`flex h-full gap-3 rounded-[var(--radius-m)] border p-3 ${chosen ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line"}`}
                      >
                        <span className="h-16 w-16 flex-none overflow-hidden rounded-[var(--radius-s)] bg-surface-sunken">
                          {s.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.imageUrl} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="line-clamp-2 text-sm font-semibold text-ink hover:underline"
                            aria-label={t("viewPage", { product: s.title })}
                          >
                            {s.title}
                          </a>
                          <span className="mt-0.5 truncate text-xs text-ink-muted">{s.merchant}</span>
                          <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <span className={`text-sm tabular-nums ${s.price != null ? "font-semibold text-ink" : "text-ink-muted"}`}>{money(s)}</span>
                            <Button type="button" size="s" variant={chosen ? "primary" : "secondary"} aria-pressed={chosen} onClick={() => setChoice(s)}>
                              {chosen ? t("chosen") : t("thisOne")}
                            </Button>
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className={`mt-3 text-sm ${choice === "none" ? "font-semibold text-ink" : "rb-link"}`}
                aria-pressed={choice === "none"}
                onClick={() => setChoice("none")}
              >
                {t("none")}
              </button>
            </>
          )}
          {result.limited && result.suggestions.length > 0 && <p className="mt-2 text-xs text-ink-muted">{t("limited")}</p>}

          {!result.needsDescription && (
            <form onSubmit={send} className="mt-6 border-t border-line pt-5">
              <p className="rb-title text-[16px]">{t("contactTitle")}</p>
              {choice && choice !== "none" && <p className="mt-1 text-sm text-ink-muted">{t("chosenSummary", { product: choice.title })}</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="text-sm">
                  <span className="rb-label mb-1 block">{t("name")}</span>
                  <input required className={inputClasses} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" />
                </label>
                <label className="text-sm">
                  <span className="rb-label mb-1 block">{t("phone")}</span>
                  <input required type="tel" className={inputClasses} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" />
                </label>
                <label className="text-sm">
                  <span className="rb-label mb-1 block">{t("email")}</span>
                  <input type="email" className={inputClasses} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />
                </label>
                <Button type="submit" loading={sending}>
                  {sending ? t("sending") : t("send")}
                </Button>
              </div>
            </form>
          )}
          <button type="button" className="rb-link mt-4 text-xs text-ink-muted" onClick={() => setResult(null)}>
            {t("back")}
          </button>
        </div>
      )}
    </div>
  );
}
