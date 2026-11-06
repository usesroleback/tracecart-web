"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { Field, input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

// Partners in the console (ADR-045): notices coming in, and the keys and
// webhooks their systems use. The API checks every call.

const box = "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
const KINDS = ["BORDER_CLOSURE", "CAPACITY", "PRICE_CHANGE", "OTHER", "PICKED_UP", "DELAYED", "DAMAGED", "REFUSED", "ARRIVED"] as const;
const ABOUT_A_SHIPMENT = ["PICKED_UP", "DELAYED", "DAMAGED", "REFUSED", "ARRIVED"];
const SCOPES = ["shipments.read", "shipments.write", "shipments.proof", "shipments.cod", "notices.write"] as const;
const EVENTS = ["shipment.assigned", "shipment.status_changed", "notice.acknowledged"] as const;

export interface PartnerPermissions {
  canHandle: boolean;
  canSend: boolean;
  canManage: boolean;
}

interface Notice {
  id: string;
  reference: string;
  kind: string;
  status: "NEW" | "ACKNOWLEDGED";
  source: "API" | "PORTAL";
  organization: { id: string; name: string };
  shipment: { id: string; reference: string; status: string } | null;
  message: string;
  photos: { id: string }[];
  createdAt: string;
}

export function Partners(can: PartnerPermissions & { heading?: string; intro?: string }) {
  const t = useTranslations("partners");
  const [tab, setTab] = useState<"notices" | "access">("notices");
  return (
    <div>
      <h1 className="rb-headline mb-1 text-[28px]">{can.heading ?? t("title")}</h1>
      <p className="mb-6 text-sm text-ink-muted">{can.intro ?? t("lead")}</p>
      {can.canManage ? (
        <div role="tablist" className="mb-6 flex flex-wrap gap-4 border-b border-line">
          {(["notices", "access"] as const).map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`pb-2 text-sm ${tab === x ? "border-b-2 border-ink font-medium text-ink" : "text-ink-muted hover:text-ink"}`}>
              {t(`tabs.${x}`)}
            </button>
          ))}
        </div>
      ) : null}
      {tab === "notices" ? <Notices can={can} /> : <Access />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notices

function Notices({ can }: { can: PartnerPermissions }) {
  const t = useTranslations("partners");
  const format = useFormat();
  const [rows, setRows] = useState<Notice[]>([]);
  const [onlyNew, setOnlyNew] = useState(can.canHandle);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (newOnly: boolean) => {
    const res = await call<{ items: Notice[] }>("GET", `/partner-notices?limit=100${newOnly ? "&status=NEW" : ""}`);
    setRows(res.items);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(can.canHandle).catch((e) => setError((e as Error).message));
  }, [load, can.canHandle]);

  async function acknowledge(id: string) {
    setBusy(true);
    setError(null);
    try {
      await call("POST", `/partner-notices/${id}/acknowledge`);
      await load(onlyNew);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      {can.canSend ? <SendNotice onSent={() => load(onlyNew).catch((e) => setError((e as Error).message))} /> : null}
      {can.canHandle ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => {
              setOnlyNew(e.target.checked);
              load(e.target.checked).catch((err) => setError((err as Error).message));
            }}
          />
          {t("onlyNew")}
        </label>
      ) : null}
      {rows.length === 0 && !error ? <p className="text-ink-muted">{t("noNotices")}</p> : null}
      {rows.map((n) => (
        <div key={n.id} className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>
              <span className="font-medium">{n.organization.name}</span>
              <span className="text-ink-muted"> · {t(`kinds.${n.kind}` as "kinds.OTHER")} · {format.dayTime(n.createdAt)}</span>
            </p>
            <Badge variant={n.status === "NEW" ? "attn" : "positive"}>{t(`statuses.${n.status}`)}</Badge>
          </div>
          <p className="rb-mono-s mt-1 text-ink-muted">
            {n.reference}
            {n.shipment ? ` · ${n.shipment.reference}` : ""}
            {` · ${t(`sources.${n.source}`)}`}
          </p>
          <p className="mt-2 whitespace-pre-line">{n.message}</p>
          {n.photos.length ? (
            <p className="mt-2 flex flex-wrap gap-3">
              {n.photos.map((p, i) => (
                <a key={p.id} href={`/api/tracecart/partner-notices/${n.id}/photos/${p.id}/file`} target="_blank" rel="noreferrer" className="underline">
                  {t("photo", { number: i + 1 })}
                </a>
              ))}
            </p>
          ) : null}
          {can.canHandle && n.status === "NEW" ? (
            <Button variant="secondary" className="mt-3" loading={busy} onClick={() => acknowledge(n.id)}>
              {t("acknowledge")}
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** A partner tells Tracecart something. It goes to staff, not the customer. */
function SendNotice({ onSent }: { onSent: () => void }) {
  const t = useTranslations("partners");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("OTHER");
  const [shipmentRef, setShipmentRef] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsShipment = ABOUT_A_SHIPMENT.includes(kind);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      let shipmentId: string | undefined;
      if (shipmentRef.trim()) {
        const found = await call<{ items: { id: string; reference: string }[] }>("GET", `/shipments?q=${encodeURIComponent(shipmentRef.trim())}&limit=5`);
        shipmentId = found.items.find((s) => s.reference.toLowerCase() === shipmentRef.trim().toLowerCase())?.id;
        if (!shipmentId) throw new Error(t("noSuchShipment"));
      }
      const sent = await call<{ notice: Notice }>("POST", "/partner-notices", { kind, message: message.trim(), idempotencyKey: crypto.randomUUID(), ...(shipmentId ? { shipmentId } : {}) });
      if (files.length) {
        const form = new FormData();
        for (const f of files) form.append("photos", f);
        await call("POST", `/partner-notices/${sent.notice.id}/photos`, form);
      }
      setMessage("");
      setShipmentRef("");
      setFiles([]);
      onSent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className={`${box} grid max-w-xl gap-3`}
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <h2 className="rb-label">{t("send")}</h2>
      <p className="text-ink-muted">{t("sendHint")}</p>
      {error ? (
        <p role="alert" className="text-critical">
          {error}
        </p>
      ) : null}
      <Field label={t("kind")} required>
        <select className={input} value={kind} onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("shipment")} required={needsShipment}>
        <input className={`${input} rb-mono`} required={needsShipment} maxLength={40} value={shipmentRef} onChange={(e) => setShipmentRef(e.target.value)} />
      </Field>
      <Field label={t("message")} required>
        <textarea className={input} rows={3} required maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      <Field label={t("photos")}>
        <input className={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => setFiles([...(e.target.files ?? [])].slice(0, 6))} />
      </Field>
      <Button type="submit" variant="primary" loading={busy} disabled={!message.trim()}>
        {t("sendCta")}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Keys and webhooks

interface Org {
  id: string;
  name: string;
  type: string;
}
interface Key {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
}
interface Delivery {
  id: string;
  type: string;
  status: "PENDING" | "SENT" | "FAILED";
  attempts: number;
  lastStatus: number | null;
  lastError: string | null;
  createdAt: string;
}
interface Hook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  deliveries: Delivery[];
}

const CARRIES_PARCELS = ["CARRIER", "PICKUP_POINT"];

function Access() {
  const t = useTranslations("partners");
  const format = useFormat();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [keys, setKeys] = useState<Key[]>([]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [shown, setShown] = useState<{ label: string; value: string } | null>(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const org = orgs.find((o) => o.id === orgId);
  const allowedScopes = SCOPES.filter((s) => s === "notices.write" || (org && CARRIES_PARCELS.includes(org.type)));

  useEffect(() => {
    call<{ items: Org[] }>("GET", "/partners/organizations")
      .then((r) => setOrgs(r.items))
      .catch((e) => setError((e as Error).message));
  }, []);

  const load = useCallback(async (id: string) => {
    const [k, h] = await Promise.all([call<{ items: Key[] }>("GET", `/partners/${id}/keys`), call<{ items: Hook[] }>("GET", `/partners/${id}/webhooks`)]);
    setKeys(k.items);
    setHooks(h.items);
  }, []);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load(orgId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-critical">
          {error}
        </p>
      ) : null}
      <Field label={t("partner")}>
        <select
          className={`${input} max-w-sm`}
          value={orgId}
          onChange={(e) => {
            setOrgId(e.target.value);
            setShown(null);
            setScopes([]);
            if (e.target.value) load(e.target.value).catch((err) => setError((err as Error).message));
          }}
        >
          <option value="">{t("pick")}</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>

      {shown ? (
        <div role="status" className={`${box} border-ink`}>
          <p className="font-medium">{shown.label}</p>
          <p className="mt-1 text-critical">{t("shownOnce")}</p>
          <p className="rb-mono-s mt-2 break-all">{shown.value}</p>
          <button type="button" className="mt-2 underline" onClick={() => setShown(null)}>
            {t("gotIt")}
          </button>
        </div>
      ) : null}

      {orgId ? (
        <>
          <section className={box}>
            <h2 className="rb-title mb-3">{t("keys")}</h2>
            {keys.length ? (
              <ul className="mb-4 divide-y divide-line">
                {keys.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {k.name} <span className="rb-mono-s text-ink-muted">tcp_{k.prefix}_…</span>
                      <span className="block text-ink-muted">
                        {k.scopes.join(", ")} · {k.lastUsedAt ? t("lastUsed", { when: format.dayTime(k.lastUsedAt) }) : t("neverUsed")}
                      </span>
                    </span>
                    {k.revokedAt ? (
                      <Badge variant="default">{t("revoked")}</Badge>
                    ) : (
                      <Button
                        variant="secondary"
                        loading={busy}
                        onClick={() => {
                          if (window.confirm(t("confirmRevoke", { name: k.name }))) act(() => call("POST", `/partners/${orgId}/keys/${k.id}/revoke`));
                        }}
                      >
                        {t("revoke")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-ink-muted">{t("noKeys")}</p>
            )}
            <form
              className="grid max-w-md gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const made = await call<{ key: string }>("POST", `/partners/${orgId}/keys`, { name: name.trim(), scopes });
                  setShown({ label: t("newKey"), value: made.key });
                  setName("");
                  setScopes([]);
                });
              }}
            >
              <Field label={t("keyName")} required hint={t("keyNameHint")}>
                <input className={input} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <fieldset className="grid gap-1">
                <legend className="rb-label mb-1">{t("scopes")}</legend>
                {allowedScopes.map((s) => (
                  <label key={s} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={scopes.includes(s)} onChange={(e) => setScopes((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))} />
                    <span>
                      <span className="rb-mono-s">{s}</span>
                      <span className="block text-ink-muted">{t(`scopeHints.${s.replace(".", "_")}` as "scopeHints.notices_write")}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" variant="primary" loading={busy} disabled={!scopes.length || !name.trim()}>
                {t("makeKey")}
              </Button>
            </form>
          </section>

          <section className={box}>
            <h2 className="rb-title mb-3">{t("webhooks")}</h2>
            {hooks.length ? (
              <ul className="mb-4 divide-y divide-line">
                {hooks.map((h) => (
                  <li key={h.id} className="py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rb-mono-s break-all">{h.url}</span>
                      {h.active ? (
                        <Button variant="secondary" loading={busy} onClick={() => act(() => call("POST", `/partners/${orgId}/webhooks/${h.id}/disable`))}>
                          {t("disable")}
                        </Button>
                      ) : (
                        <Badge variant="default">{t("disabled")}</Badge>
                      )}
                    </div>
                    <p className="text-ink-muted">{h.events.join(", ")}</p>
                    {h.deliveries.length ? (
                      <ul className="mt-2 space-y-1">
                        {h.deliveries.map((d) => (
                          <li key={d.id} className="text-ink-muted">
                            {format.dayTime(d.createdAt)} · {d.type} · {t(`deliveryStatuses.${d.status}`)}
                            {d.status !== "SENT" && d.lastError ? ` · ${d.lastError}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-ink-muted">{t("noWebhooks")}</p>
            )}
            <form
              className="grid max-w-md gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const made = await call<{ secret: string }>("POST", `/partners/${orgId}/webhooks`, { url: url.trim(), events: [...EVENTS] });
                  setShown({ label: t("newSecret"), value: made.secret });
                  setUrl("");
                });
              }}
            >
              <Field label={t("webhookUrl")} required hint={t("webhookUrlHint")}>
                <input className={`${input} rb-mono`} type="url" required maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} />
              </Field>
              <Button type="submit" variant="primary" loading={busy} disabled={!url.trim()}>
                {t("addWebhook")}
              </Button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
