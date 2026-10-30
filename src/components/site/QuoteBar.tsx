"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Button from "@/components/ui/button/Button";
import { useCountry } from "@/context/CountryContext";
import { CustomerProfile, ensureCustomerAccount, StaffAccountError, updateProfile } from "@/lib/customer";
import { PriceBlock, ShopPrice } from "./PriceBlock";
import { RequiredMark, RequiredNote } from "@/components/ui/form/Form";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
// Mirrors the API (discovery/video.ts): MP4, MOV or WebM, 20 MB, 30 s (the length is checked there).
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;
const isVideo = (f: File | null) => !!f && VIDEO_TYPES.includes(f.type);

/** A result: what it is and, priced to the visitor's country, one delivered price and the signed offer to buy it with. */
interface Suggestion {
  provider: string;
  url: string;
  title: string;
  imageUrl: string | null;
  price: ShopPrice | null;
  offer: string | null;
}
interface SuggestResult {
  identified: { title: string | null; brand: string | null; model: string | null } | null;
  suggestions: Suggestion[];
  needsDescription: boolean;
  limited: boolean;
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/** A multipart call to the customer API, through the web app's proxy (it attaches the Clerk session). */
async function postForm<T>(path: string, form: FormData, locale: string): Promise<T> {
  const res = await fetch(`/api/tracecart${path}`, { method: "POST", body: form, headers: { "X-Tracecart-Locale": locale } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  return body as T;
}

// What the customer typed and attached, kept across sign-up (which may reload the page).
const DRAFT_KEY = "tracecart:finder-draft";

function saveDraft(what: string, photoDataUrl: string | null, name: string | null) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ what, photo: photoDataUrl, name }));
  } catch {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ what, photo: null, name: null })); // too big for storage: keep the words
    } catch {
      /* storage unavailable: the customer types again */
    }
  }
}

/** The saved draft, if any (removed as it's read), with its photo as a File again. */
async function takeDraft(): Promise<{ what: string; photo: File | null } | null> {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  const draft = JSON.parse(raw) as { what: string; photo: string | null; name: string | null };
  const blob = draft.photo ? await fetch(draft.photo).then((r) => r.blob()).catch(() => null) : null;
  return { what: draft.what, photo: blob ? new File([blob], draft.name ?? "photo", { type: blob.type }) : null };
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * The homepage's one question: what do you need? The customer describes the
 * product or tool in their own words and/or adds a photo. Seeing the results
 * needs a (free) customer account, so Tracecart knows who asked and can reply:
 * signed out, Find it opens Clerk's sign-up over the page and the search runs
 * once they're in (docs/product-discovery.md). The request lands in the
 * console as a sourcing request linked to their account. Where it goes
 * (from / to / when) is settled later, not asked here.
 */
export function QuoteBar({ initialWhat = "" }: { initialWhat?: string } = {}) {
  const t = useTranslations("site.quoteBar");
  const locale = useLocale();
  // A product page's "Ask for this tool" arrives with the product's name.
  const [what, setWhat] = useState(initialWhat);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [choice, setChoice] = useState<Suggestion | "none" | null>(null);
  const [contact, setContact] = useState({ name: "", phone: "" });
  const [account, setAccount] = useState<CustomerProfile | null>(null);
  const [pending, setPending] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { country } = useCountry();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  // Back from sign-up (possibly after a reload): restore the draft, then search once signed in.
  useEffect(() => {
    takeDraft().then((draft) => {
      if (!draft) return;
      setWhat(draft.what);
      if (draft.photo) {
        setPhoto(draft.photo);
        setPreview(URL.createObjectURL(draft.photo));
      }
      setPending(true);
      document.getElementById("quote")?.scrollIntoView({ block: "center" });
    });
  }, []);

  useEffect(() => {
    if (pending && isLoaded && isSignedIn) {
      // Clerk has just finished signing the customer in: run the search they asked for, once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(false);
      search();
    }
    // search reads the restored draft from state; only the sign-in should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, isLoaded, isSignedIn]);

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const photoOk = PHOTO_TYPES.includes(file.type) && file.size <= PHOTO_MAX_BYTES;
    const videoOk = VIDEO_TYPES.includes(file.type) && file.size <= VIDEO_MAX_BYTES;
    if (!photoOk && !videoOk) {
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

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (!what.trim() && !photo) return setProblem(t("needWhat"));
    if (!isSignedIn) {
      // Results are for account holders: keep the draft, sign up over the page, then search.
      setProblem(t("signUpNeeded"));
      saveDraft(what, photo && !isVideo(photo) ? await readDataUrl(photo).catch(() => null) : null, photo && !isVideo(photo) ? photo.name : null);
      setPending(true);
      const here = window.location.pathname + window.location.search;
      clerk.openSignUp({ forceRedirectUrl: here, signInForceRedirectUrl: here });
      return;
    }
    setProblem(null);
    setSearching(true);
    setChoice(null);
    try {
      const me = account ?? (await ensureCustomerAccount());
      setAccount(me);
      setContact({ name: me.name, phone: me.phone ?? "" });
      const form = new FormData();
      form.append("what", what);
      if (photo) form.append(isVideo(photo) ? "video" : "photo", photo);
      // Priced delivered to where the visitor is.
      if (country) form.append("country", country);
      setResult(await postForm<SuggestResult>("/customer/suggest", form, locale));
    } catch (err) {
      if (err instanceof StaffAccountError) {
        setProblem(t("staffAccount"));
        return;
      }
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
      // The reply goes to the account: keep its name and phone up to date first.
      if (account && (contact.name !== account.name || contact.phone !== (account.phone ?? ""))) {
        setAccount(await updateProfile({ name: contact.name, phone: contact.phone }));
      }
      form.append("what", what);
      form.append("locale", locale);
      if (choice && choice !== "none")
        form.append("choice", JSON.stringify({ provider: choice.provider, url: choice.url, title: choice.title, imageUrl: choice.imageUrl, offer: choice.offer ?? undefined }));
      if (photo) form.append(isVideo(photo) ? "video" : "photo", photo);
      await postForm("/customer/requests", form, locale);
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
        <p className="mt-1 text-sm text-ink-muted">{t("submittedBody")}</p>
        <Link href="/account" className="rb-link mt-4 inline-block text-sm">
          {t("myRequests")}
        </Link>
      </div>
    );
  }

  const identified = result?.identified && [result.identified.brand, result.identified.model].filter(Boolean).join(" ");

  return (
    <div id="quote">
      <form onSubmit={search}>
        {/* bundle.css .rb-quote: 2px ink border and the route corner. The whole box takes a dropped photo. */}
        <div
          className={`overflow-hidden rounded-[var(--radius-l)_var(--radius-xs)_var(--radius-xs)_var(--radius-xs)] border-2 border-ink bg-surface-raised transition-colors ${dragging ? "bg-accent-soft" : ""}`}
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
          <label htmlFor="quote-what" className="rb-overline block px-5 pt-4">
            {t("what")}
          </label>
          <textarea
            id="quote-what"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
            }}
            rows={3}
            maxLength={500}
            placeholder={dragging ? t("dropHere") : t("whatPlaceholder")}
            className="block w-full resize-none bg-transparent px-5 pb-2 pt-1.5 text-base text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-nowrap">
            {preview ? (
              <span className="flex min-w-0 items-center gap-2.5">
                {isVideo(photo) ? (
                  <video src={preview} muted playsInline className="h-10 w-10 flex-none rounded-[var(--radius-xs)] border border-line object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-10 w-10 flex-none rounded-[var(--radius-xs)] border border-line object-cover" />
                )}
                <span className="truncate text-sm text-ink">{photo?.name}</span>
                <button type="button" onClick={removePhoto} className="rb-link flex-none text-xs text-ink-muted">
                  {t("removePhoto")}
                </button>
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                {/* One line: the label never wraps inside the button. */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-10 flex-none items-center gap-2 whitespace-nowrap rounded-[var(--radius-s)] border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <CameraIcon />
                  {t("attach")}
                </button>
                {/* What's accepted, under the button: a line per kind, each on one line. */}
                <span className="text-[11px] leading-snug text-ink-muted">
                  <span className="block whitespace-nowrap">{t("photoHintPhoto")}</span>
                  <span className="block whitespace-nowrap">{t("photoHintVideo")}</span>
                </span>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
            <Button type="submit" loading={searching} className="ml-auto flex-none whitespace-nowrap">
              {searching ? t("searching") : t("cta")}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-muted">{t("disclaimer")}</p>
        <Link href="/ship" className="rb-link mt-1 inline-block text-sm">
          {t("shipInstead")}
        </Link>
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
                          {/* The store stays behind the order: no link to it, no store price. */}
                          <span className="line-clamp-2 text-sm font-semibold text-ink">{s.title}</span>
                          <span className="mt-auto pt-2">
                            <PriceBlock price={s.price} compact />
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
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
              <RequiredNote className="col-span-full" />
              <p className="rb-title text-[16px]">{t("contactTitle")}</p>
              {choice && choice !== "none" && <p className="mt-1 text-sm text-ink-muted">{t("chosenSummary", { product: choice.title })}</p>}
              {account && <p className="mt-1 text-sm text-ink-muted">{t("replyTo", { email: account.email })}</p>}
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="text-sm">
                  <span className="rb-label mb-1 block">{t("name")}<RequiredMark /></span>
                  <input required className={inputClasses} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" />
                </label>
                <label className="text-sm">
                  <span className="rb-label mb-1 block">{t("phone")}<RequiredMark /></span>
                  <input required type="tel" className={inputClasses} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" />
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
