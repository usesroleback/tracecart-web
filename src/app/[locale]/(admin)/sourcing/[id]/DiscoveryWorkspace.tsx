"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/apiClient";
import { useFormat } from "@/lib/format";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { SourcingRequestStatusTag } from "@/components/ui/status/Status";
import { IntentForm } from "@/components/tracecart/IntentForm";
import { destinationOf } from "../SourcingDashboard";
import { DsChevronRightIcon, DsExternalIcon } from "@/icons";
import { DiscoverySpec, DiscoveryState, ProviderOutcome, SourcingCandidate, SpecField } from "@/lib/types";
import { RequiredMark, RequiredNote } from "@/components/ui/form/Form";
import { SourcingQuotes } from "./SourcingQuotes";

const input =
  "h-10 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

const EMPTY_FIELD: SpecField = { value: null, source: null, confidence: null };
const EMPTY_SPEC: DiscoverySpec = {
  title: null,
  category: null,
  productType: null,
  intendedUse: null,
  brand: EMPTY_FIELD,
  manufacturer: EMPTY_FIELD,
  model: EMPTY_FIELD,
  partNumbers: [],
  attributes: [],
  includedItems: [],
  requiredAccessories: [],
  shippingFlags: [],
  hazardous: "unknown",
  identification: "unclear",
  uncertainties: [],
  missingInformation: [],
  searchQueries: [],
};

/**
 * Product discovery for one sourcing request: what the customer showed us,
 * the product spec Claude read from it (every value tagged seen / stated /
 * inferred, editable by staff), a search across providers that says which
 * worked, and the listings found, ranked with their reasons. Staff choose one;
 * the order is created from it. Nothing is bought here.
 */
export function DiscoveryWorkspace({ initial }: { initial: DiscoveryState }) {
  const t = useTranslations("sourcing");
  const f = useFormat();
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const r = state.request;
  const id = r.id;
  const frozen = r.status === "CONVERTED" || r.status === "CLOSED";

  async function act(key: string, fn: () => Promise<DiscoveryState>) {
    setBusy(key);
    setError(null);
    try {
      setState(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("d.failed"));
    } finally {
      setBusy(null);
    }
  }

  const selected = state.candidates.find((c) => c.status === "SELECTED");

  return (
    <div>
      <nav aria-label={t("d.back")} className="flex items-center gap-1.5 text-sm text-ink-muted">
        <Link href="/sourcing" className="rb-link text-ink-muted">
          {t("d.back")}
        </Link>
        <DsChevronRightIcon width={16} height={16} aria-hidden />
        <span aria-current="page">{t("d.title")}</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="rb-overline">{t("d.title")}</p>
          <h1 className="rb-headline mt-1 text-[28px]">{state.spec?.title ?? r.description}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <SourcingRequestStatusTag status={r.status} />
            <span className="text-sm text-ink-muted">
              {t("d.customer", { name: r.customerName, destination: destinationOf(r) ?? t("noDestination"), quantity: f.number(r.quantity) })}
            </span>
          </div>
        </div>
      </div>

      {error && <Alert tone="critical" title={error} className="mt-5" />}
      {r.order && <Alert tone="positive" title={t("d.order.done", { reference: r.order.reference })} className="mt-5" />}

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
        <Inputs state={state} frozen={frozen} busy={busy} act={act} />
        <SpecCard state={state} frozen={frozen} busy={busy} act={act} />
      </div>

      <SearchCard state={state} frozen={frozen} busy={busy} act={act} />

      <CandidatesCard state={state} frozen={frozen} busy={busy} act={act} />

      <SourcingQuotes request={r} selected={selected ?? null} categorySlug={(state.spec as { categorySlug?: string | null } | null)?.categorySlug ?? null} />

      {selected && r.status === "MATCHED" && (
        <Card padding={24} className="mt-4">
          <h2 className="rb-title">{t("d.order.title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("d.order.hint")}</p>
          {converting ? (
            <div className="mt-4">
              <IntentForm
                onCreated={() => router.push("/orders")}
                onCancel={() => setConverting(false)}
                initialProduct={{ url: selected.url, name: selected.title, imageUrl: selected.imageUrl ?? undefined, provider: null, sourcingRequestId: id }}
                initialCustomer={{
                  name: r.customerName,
                  phone: r.customerPhone,
                  email: r.customerEmail,
                  destinationCity: r.destinationCity,
                  destinationCountry: r.destinationCountry,
                  quantity: r.quantity,
                }}
              />
            </div>
          ) : (
            <Button className="mt-4" onClick={() => setConverting(true)}>
              {t("d.order.title")}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

type SectionProps = {
  state: DiscoveryState;
  frozen: boolean;
  busy: string | null;
  act: (key: string, fn: () => Promise<DiscoveryState>) => Promise<void>;
};

function Inputs({ state, frozen, busy, act }: SectionProps) {
  const t = useTranslations("sourcing.d.inputs");
  const f = useFormat();
  const r = state.request;
  const fileRef = useRef<HTMLInputElement>(null);
  const facts: [string, string | null][] = [
    [t("description"), r.description],
    [t("brand"), r.brand],
    [t("model"), r.model],
    [t("partNumber"), r.partNumber],
    [t("category"), r.category],
    [t("budget"), r.budgetMax ? f.money(r.budgetMax, null) : null],
  ];

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    await act("upload", () => api.postForm<DiscoveryState>(`/sourcing-requests/${r.id}/attachments`, form));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Card padding={24}>
      <h2 className="rb-title">{t("title")}</h2>
      <dl className="mt-4 grid gap-3">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        {r.productUrl && (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("productUrl")}</dt>
            <dd className="mt-0.5 truncate">
              <a href={r.productUrl} target="_blank" rel="noopener noreferrer" className="rb-link">
                {r.productUrl}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("files")}</h3>
      {state.attachments.length === 0 ? (
        <p className="mt-1 text-sm text-ink-muted">{t("noFiles")}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {state.attachments.map((a) => (
            <li key={a.id} className="relative">
              <a
                href={`/api/tracecart${a.url}`}
                target="_blank"
                rel="noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-[var(--radius-s)] border border-line bg-surface-sunken"
                title={a.originalName ?? undefined}
              >
                {a.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/tracecart${a.url}`} alt={a.originalName ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center px-1 text-center text-[11px] font-semibold text-ink-muted">
                    PDF
                    <span className="block truncate font-normal">{a.originalName}</span>
                  </span>
                )}
              </a>
              {!frozen && (
                <button
                  type="button"
                  onClick={() => act(`rm-${a.id}`, () => api.delete<DiscoveryState>(`/sourcing-requests/${r.id}/attachments/${a.id}`))}
                  aria-label={t("remove", { name: a.originalName ?? a.kind })}
                  className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-[var(--radius-s)] border border-line bg-surface-raised text-xs text-ink-muted hover:text-ink"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!frozen && (
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm">
          <span className="rb-link">{busy === "upload" ? t("uploading") : t("add")}</span>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="sr-only"
            disabled={busy === "upload"}
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      )}
      <p className="mt-1 text-xs text-ink-muted">{t("hint")}</p>
    </Card>
  );
}

function SourceTag({ field }: { field: { source: string | null; confidence: string | null } }) {
  const t = useTranslations("sourcing.d.spec");
  if (!field.source) return null;
  return (
    <span className="ml-2 text-xs text-ink-muted">
      {t(`source.${field.source}`)}
      {field.confidence ? ` · ${t(`confidence.${field.confidence}`)}` : ""}
    </span>
  );
}

function SpecCard({ state, frozen, busy, act }: SectionProps) {
  const t = useTranslations("sourcing.d.spec");
  const f = useFormat();
  const [editing, setEditing] = useState<DiscoverySpec | null>(null);
  const spec = state.spec;
  const id = state.request.id;
  const ex = state.extraction;

  const read = () => act("extract", () => api.post<DiscoveryState>(`/sourcing-requests/${id}/extract`));

  return (
    <Card padding={24}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="rb-title">{t("title")}</h2>
        {!frozen && !editing && (
          <div className="flex gap-2">
            {state.ai.configured && (
              <Button size="s" variant={spec ? "secondary" : "primary"} onClick={read} loading={busy === "extract"}>
                {spec ? t("reread") : t("read")}
              </Button>
            )}
            <Button size="s" variant="ghost" onClick={() => setEditing(structuredClone(spec ?? EMPTY_SPEC))}>
              {t("edit")}
            </Button>
          </div>
        )}
      </div>

      {busy === "extract" && <p className="mt-3 text-sm text-ink-muted" aria-live="polite">{t("reading")}</p>}
      {!state.ai.configured && !spec && <p className="mt-3 text-sm text-ink-muted">{t("notConfigured")}</p>}
      {ex.status === "FAILED" && ex.error && <Alert tone="critical" title={t("failed", { error: ex.error })} className="mt-3" />}
      {!spec && state.ai.configured && ex.status !== "FAILED" && busy !== "extract" && <p className="mt-3 text-sm text-ink-muted">{t("none")}</p>}

      {editing ? (
        <SpecEditor
          spec={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          saving={busy === "spec"}
          onSave={(clean) =>
            act("spec", async () => {
              const next = await api.put<DiscoveryState>(`/sourcing-requests/${id}/spec`, clean);
              setEditing(null);
              return next;
            })
          }
        />
      ) : (
        spec && (
          <div className="mt-4 grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={spec.identification === "exact_model" ? "inverse" : "outline"}>{t(`identification.${spec.identification}`)}</Badge>
              {spec.hazardous !== "no" && <Badge variant="attn">{t(`hazardous.${spec.hazardous}`)}</Badge>}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["brand", spec.brand],
                  ["model", spec.model],
                  ["manufacturer", spec.manufacturer],
                ] as const
              ).map(([k, field]) =>
                field.value ? (
                  <div key={k}>
                    <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t(`f.${k}`)}</dt>
                    <dd className="mt-0.5 font-[560] text-ink">
                      {field.value}
                      <SourceTag field={field} />
                    </dd>
                  </div>
                ) : null,
              )}
              {spec.partNumbers.length > 0 && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("f.partNumbers")}</dt>
                  <dd className="rb-mono mt-0.5 text-ink">{spec.partNumbers.join(", ")}</dd>
                </div>
              )}
              {(spec.productType || spec.category) && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("f.productType")}</dt>
                  <dd className="mt-0.5 text-ink">{[spec.productType, spec.category].filter(Boolean).join(" · ")}</dd>
                </div>
              )}
            </dl>

            {spec.attributes.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t("attributes")}</h3>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {spec.attributes.map((a, i) => (
                      <tr key={i} className="border-b border-line last:border-b-0">
                        <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ink-muted">{a.name}</th>
                        <td className="py-1.5 text-ink">
                          {a.value}
                          {a.unit ? ` ${a.unit}` : ""}
                          <SourceTag field={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {spec.shippingFlags.length > 0 && (
              <Alert tone="warning" title={t("shipping")}>
                <ul className="list-disc pl-4">
                  {spec.shippingFlags.map((s, i) => (
                    <li key={i}>
                      {s.issue} — {s.reason}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}

            {[
              ["missing", spec.missingInformation],
              ["uncertain", spec.uncertainties],
              ["queries", spec.searchQueries],
            ].map(([k, list]) =>
              (list as string[]).length ? (
                <div key={k as string}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">{t(k as "missing")}</h3>
                  <p className="mt-0.5 text-sm text-ink">{(list as string[]).join(" · ")}</p>
                </div>
              ) : null,
            )}

            <p className="text-xs text-ink-muted">
              {[ex.model && ex.at && t("readBy", { model: ex.model, when: f.dayTime(ex.at) }), ex.editedAt && t("edited", { when: f.dayTime(ex.editedAt) })]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )
      )}
    </Card>
  );
}

/** Staff corrections: what they enter is marked "stated" and sure. */
function SpecEditor({
  spec,
  onChange,
  onCancel,
  onSave,
  saving,
}: {
  spec: DiscoverySpec;
  onChange: (s: DiscoverySpec) => void;
  onCancel: () => void;
  onSave: (spec: DiscoverySpec) => void;
  saving: boolean;
}) {
  const t = useTranslations("sourcing.d.spec");
  const stated = (value: string): SpecField => (value.trim() ? { value: value.trim(), source: "stated", confidence: "high" } : EMPTY_FIELD);
  const set = (patch: Partial<DiscoverySpec>) => onChange({ ...spec, ...patch });

  return (
    <div className="mt-4 grid gap-3">
      <p className="text-xs text-ink-muted">{t("editHint")}</p>
      <label className="text-sm">
        <span className="rb-label mb-1 block">{t("f.title")}</span>
        <input className={input} value={spec.title ?? ""} onChange={(e) => set({ title: e.target.value || null })} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["brand", "model", "manufacturer"] as const).map((k) => (
          <label key={k} className="text-sm">
            <span className="rb-label mb-1 block">{t(`f.${k}`)}</span>
            <input
              className={input}
              value={spec[k].value ?? ""}
              onChange={(e) => set({ [k]: e.target.value === (spec[k].value ?? "") ? spec[k] : stated(e.target.value) })}
            />
          </label>
        ))}
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("f.partNumbers")}</span>
          <input
            className={input}
            value={spec.partNumbers.join(", ")}
            onChange={(e) => set({ partNumbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          />
        </label>
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("f.category")}</span>
          <input className={input} value={spec.category ?? ""} onChange={(e) => set({ category: e.target.value || null })} />
        </label>
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("f.identification")}</span>
          <select
            className={input}
            value={spec.identification}
            onChange={(e) => set({ identification: e.target.value as DiscoverySpec["identification"] })}
          >
            {(["exact_model", "product_family", "product_type", "unclear"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`identification.${k}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="rb-label mb-1 block text-sm">{t("attributes")}</span>
        <div className="grid gap-2">
          {spec.attributes.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${input} min-w-0 flex-1`} aria-label={t("attrName")} placeholder={t("attrName")} value={a.name}
                onChange={(e) => set({ attributes: spec.attributes.map((x, j) => (j === i ? { ...x, name: e.target.value, source: "stated", confidence: "high" } : x)) })} />
              <input className={`${input} min-w-0 flex-1`} aria-label={t("attrValue")} placeholder={t("attrValue")} value={a.value}
                onChange={(e) => set({ attributes: spec.attributes.map((x, j) => (j === i ? { ...x, value: e.target.value, source: "stated", confidence: "high" } : x)) })} />
              <input className={`${input} w-20! flex-none`} aria-label={t("attrUnit")} placeholder={t("attrUnit")} value={a.unit ?? ""}
                onChange={(e) => set({ attributes: spec.attributes.map((x, j) => (j === i ? { ...x, unit: e.target.value || null } : x)) })} />
              <Button type="button" variant="ghost" size="s" onClick={() => set({ attributes: spec.attributes.filter((_, j) => j !== i) })}>
                {t("removeAttr")}
              </Button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="rb-link mt-2 text-sm"
          onClick={() => set({ attributes: [...spec.attributes, { name: "", value: "", unit: null, source: "stated", confidence: "high" }] })}
        >
          {t("addAttr")}
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="s" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          size="s"
          loading={saving}
          onClick={() => onSave({ ...spec, attributes: spec.attributes.filter((a) => a.name.trim() && a.value.trim()) })}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

function ProviderChip({ p }: { p: ProviderOutcome }) {
  const t = useTranslations("sourcing.d.search.status");
  const good = p.status === "ok";
  const label = p.results != null && good ? t("ok", { count: p.results }) : good ? t("ready") : t(p.status);
  return (
    <li className="flex items-center gap-2 text-sm" title={p.detail}>
      <span className={`h-2 w-2 flex-none rounded-full ${good ? "bg-ink" : p.status === "unavailable" || p.status === "disabled" ? "border border-line-strong" : "bg-critical"}`} aria-hidden />
      <span className="font-semibold text-ink">{p.label}</span>
      <span className="text-ink-muted">{label}</span>
    </li>
  );
}

function SearchCard({ state, frozen, busy, act }: SectionProps) {
  const t = useTranslations("sourcing.d.search");
  const f = useFormat();
  const run = state.lastRun;
  // The last run's outcome when there is one; otherwise what would run now.
  const providers = run?.providers.length ? run.providers : state.providers;

  return (
    <Card padding={24} className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="rb-title">{t("title")}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {run ? t("last", { when: f.dayTime(run.startedAt), query: run.query }) : t("never")}
          </p>
        </div>
        {!frozen && (
          <Button
            variant={run ? "secondary" : "primary"}
            loading={busy === "search"}
            onClick={() => act("search", () => api.post<DiscoveryState>(`/sourcing-requests/${state.request.id}/search`))}
          >
            {busy === "search" ? t("running") : run ? t("again") : t("run")}
          </Button>
        )}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2" aria-label={t("title")}>
        {providers.map((p) => (
          <ProviderChip key={p.id} p={p} />
        ))}
      </ul>
    </Card>
  );
}

function CandidatesCard({ state, frozen, busy, act }: SectionProps) {
  const t = useTranslations("sourcing.d");
  const [adding, setAdding] = useState(false);
  const id = state.request.id;
  const decide = (c: SourcingCandidate, status: SourcingCandidate["status"]) =>
    act(`c-${c.id}`, () => api.patch<DiscoveryState>(`/sourcing-requests/${id}/candidates/${c.id}`, { status }));

  return (
    <Card padding={24} className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="rb-title">{t("candidates.title")}</h2>
        {!frozen && !adding && (
          <button type="button" className="rb-link text-sm" onClick={() => setAdding(true)}>
            {t("manual.open")}
          </button>
        )}
      </div>
      {adding && (
        <ManualOffer
          onCancel={() => setAdding(false)}
          saving={busy === "manual"}
          onAdd={(offer) =>
            act("manual", async () => {
              const next = await api.post<DiscoveryState>(`/sourcing-requests/${id}/candidates`, offer);
              setAdding(false);
              return next;
            })
          }
        />
      )}
      {state.candidates.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{t("candidates.empty")}</p>
      ) : (
        <ol className="mt-3 grid">
          {state.candidates.map((c) => (
            <Candidate key={c.id} c={c} frozen={frozen} busy={busy === `c-${c.id}`} decide={decide} />
          ))}
        </ol>
      )}
    </Card>
  );
}

function Candidate({
  c,
  frozen,
  busy,
  decide,
}: {
  c: SourcingCandidate;
  frozen: boolean;
  busy: boolean;
  decide: (c: SourcingCandidate, status: SourcingCandidate["status"]) => void;
}) {
  const t = useTranslations("sourcing.d");
  const f = useFormat();
  const [open, setOpen] = useState(false);
  const rejected = c.status === "REJECTED";
  const chosen = c.status === "SELECTED";

  return (
    <li className={`border-b border-line py-3 last:border-b-0 ${rejected ? "opacity-60" : ""}`}>
      <div className="flex gap-3">
        <span className="h-14 w-14 flex-none overflow-hidden rounded-[var(--radius-s)] border border-line bg-surface-sunken">
          {c.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" loading="lazy" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 font-semibold text-ink hover:underline">
              {c.title}
              <DsExternalIcon width={14} height={14} className="ml-1 inline align-[-2px] text-ink-muted" aria-label={t("candidates.open")} />
            </a>
            <span className="whitespace-nowrap font-semibold tabular-nums text-ink">
              {c.price != null ? f.money(c.price, c.currency) : <span className="font-normal text-ink-muted">{t("candidates.priceUnknown")}</span>}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {[c.merchant, t(`candidates.provider.${c.provider}` as "candidates.provider.manual"), t("candidates.found", { when: f.ago(c.retrievedAt) })]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {c.note && <p className="mt-1 text-sm text-ink">{c.note}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {chosen && <Badge variant="inverse">{t("candidates.chosen")}</Badge>}
            {rejected && <Badge variant="outline">{t("candidates.rejected")}</Badge>}
            <button type="button" className="text-xs text-ink-muted underline" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {t("candidates.score", { score: c.score })} · {t("candidates.why")}
            </button>
            {!frozen && (
              <span className="ml-auto flex gap-2">
                {!chosen && !rejected && (
                  <Button size="s" onClick={() => decide(c, "SELECTED")} loading={busy}>
                    {t("candidates.choose")}
                  </Button>
                )}
                {chosen && (
                  <Button size="s" variant="secondary" onClick={() => decide(c, "PROPOSED")} loading={busy}>
                    {t("candidates.unchoose")}
                  </Button>
                )}
                {!rejected && !chosen && (
                  <Button size="s" variant="ghost" onClick={() => decide(c, "REJECTED")}>
                    {t("candidates.reject")}
                  </Button>
                )}
                {rejected && (
                  <Button size="s" variant="ghost" onClick={() => decide(c, "PROPOSED")} loading={busy}>
                    {t("candidates.restore")}
                  </Button>
                )}
              </span>
            )}
          </div>
          {open && c.scoreReasons && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {c.scoreReasons.map((reason, i) => (
                <li key={i}>
                  <Badge variant={reason.points < 0 ? "critical" : "default"}>
                    {t(`reasons.${reason.key}` as "reasons.brand")}
                    {reason.detail ? ` (${reason.detail})` : ""} {reason.points > 0 ? `+${reason.points}` : reason.points}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

function ManualOffer({
  onAdd,
  onCancel,
  saving,
}: {
  onAdd: (offer: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const t = useTranslations("sourcing.d.manual");
  const [v, setV] = useState({ url: "", title: "", merchant: "", price: "", currency: "", note: "" });
  const field = (k: keyof typeof v) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value }) });

  return (
    <form
      className="mt-3 grid gap-3 rounded-[var(--radius-m)] border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({
          url: v.url,
          title: v.title,
          merchant: v.merchant || undefined,
          price: v.price ? Number(v.price) : undefined,
          currency: v.price && v.currency ? v.currency.toUpperCase() : undefined,
          note: v.note || undefined,
        });
      }}
    >
      <RequiredNote className="col-span-full" />
      <p className="rb-overline">{t("title")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("url")}<RequiredMark /></span>
          <input required type="url" className={input} {...field("url")} />
        </label>
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("product")}<RequiredMark /></span>
          <input required className={input} {...field("title")} />
        </label>
        <label className="text-sm">
          <span className="rb-label mb-1 block">{t("merchant")}</span>
          <input className={input} {...field("merchant")} />
        </label>
        <div className="flex gap-2">
          <label className="flex-1 text-sm">
            <span className="rb-label mb-1 block">{t("price")}</span>
            <input type="number" min="0" step="any" className={input} {...field("price")} />
          </label>
          <label className="w-24 text-sm">
            <span className="rb-label mb-1 block">{t("currency")}</span>
            <input maxLength={3} placeholder="XOF" className={`${input} uppercase`} {...field("currency")} />
          </label>
        </div>
      </div>
      <label className="text-sm">
        <span className="rb-label mb-1 block">{t("note")}</span>
        <input className={input} {...field("note")} />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="s" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit" size="s" loading={saving}>
          {t("add")}
        </Button>
      </div>
    </form>
  );
}
