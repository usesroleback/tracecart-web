"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { input } from "@/components/ui/form/Form";
import { call } from "@/components/checkout/http";

const box =
  "rounded-[var(--radius-m)] border border-line bg-surface-raised p-5 text-sm";
type View = "toShip" | "shipped" | "all";

interface Row {
  id: string;
  reference: string;
  orderReference: string;
  status: string;
  shipsItself: boolean;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  shipBy: string | null;
  late: boolean;
  destination: { city: string; countryCode: string };
  carrier: string | null;
  leavesWithLoad: string | null;
  pickup: { from: string; to: string } | null;
  discrepancies: { id: string; type: string; summary: string }[];
  packed: {
    weightGrams: number | null;
    packageCount: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
  } | null;
  photos: { id: string; createdAt: string }[];
  lines: { sku: string; title: string; quantity: number }[];
}

interface Data {
  summary: { toShip: number; late: number; onTimePercent: number | null };
  items: Row[];
}

/** What a seller has to ship, and by when (ADR-091). */
export function SellerOrders() {
  const t = useTranslations("sellers.orders");
  const locale = useLocale();
  const [view, setView] = useState<View>("toShip");
  const [data, setData] = useState<Data | null>(null);
  const [forms, setForms] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const field = (id: string, key: string) =>
    forms[id]?.[key] ?? (key === "count" ? "1" : "");
  const setField = (id: string, key: string, value: string) =>
    setForms({ ...forms, [id]: { ...forms[id], [key]: value } });
  const size = (id: string) =>
    Object.fromEntries(
      (["lengthCm", "widthCm", "heightCm"] as const).flatMap((k) =>
        Number(field(id, k)) > 0 ? [[k, Number(field(id, k))]] : [],
      ),
    );
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const day = (d: string) =>
    new Date(d).toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  const hour = (d: string) =>
    new Date(d).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const load = useCallback(
    async () => setData(await call<Data>("GET", `/seller/orders?view=${view}`)),
    [view],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((e) => setError((e as Error).message));
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const unpacked = (r: Row) => r.status === "PLANNED" || r.status === "PICKING";
  const packed = (r: Row) => r.status === "PACKED" || r.status === "LABELLED";

  return (
    <div className="max-w-3xl">
      <h1 className="rb-headline mb-2 text-[28px]">{t("title")}</h1>
      <p className="text-ink-muted mb-5">{t("lead")}</p>

      {data ? (
        <dl className="mb-5 grid grid-cols-3 gap-3">
          {[
            [t("toShip"), String(data.summary.toShip)],
            [t("late"), String(data.summary.late)],
            [
              t("onTime"),
              data.summary.onTimePercent == null
                ? "–"
                : `${data.summary.onTimePercent} %`,
            ],
          ].map(([k, v]) => (
            <div key={k} className={box}>
              <dt className="rb-label">{k}</dt>
              <dd className="rb-numeral text-xl">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mb-4 flex gap-4" role="tablist">
        {(["toShip", "shipped", "all"] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`text-sm ${view === v ? "font-medium underline" : "text-ink-muted"}`}
          >
            {t(`views.${v}`)}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-critical mb-3">
          {error}
        </p>
      ) : null}
      {data && !data.items.length ? (
        <p className="text-ink-muted">{t("empty")}</p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {data?.items.map((r) => (
          <li key={r.id} className={box}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.reference}</span>
              {r.late ? (
                <Badge variant="critical">{t("isLate")}</Badge>
              ) : (
                <Badge variant="info">{t(`status.${r.status}`)}</Badge>
              )}
            </div>
            <ul className="mb-2">
              {r.lines.map((l) => (
                <li key={l.sku}>
                  {l.title} × {l.quantity}
                </li>
              ))}
            </ul>
            <p className="text-ink-muted">
              {t("to", {
                city: r.destination.city,
                country: r.destination.countryCode,
              })}
              {r.shipBy && r.shipsItself
                ? ` · ${t("shipBy", { date: day(r.shipBy) })}`
                : ""}
              {r.carrier ? ` · ${r.carrier}` : ""}
            </p>
            {!r.shipsItself ? (
              <p className="text-ink-muted mt-2">{t("heldByTracecart")}</p>
            ) : null}
            {r.leavesWithLoad ? (
              <p className="text-ink-muted mt-2">
                {t("waitingLoad", { date: day(r.leavesWithLoad) })}
              </p>
            ) : null}
            {r.pickup ? (
              <p className="mt-2 font-medium">
                {t("pickupAt", {
                  date: day(r.pickup.from),
                  from: hour(r.pickup.from),
                  to: hour(r.pickup.to),
                })}
              </p>
            ) : null}
            {r.discrepancies.map((x) => (
              <p key={x.id} className="text-critical mt-2">
                {t("discrepancy", { summary: x.summary })}
              </p>
            ))}

            {r.rejectedAt ? (
              <p className="text-critical mt-2">
                {t("refused", { reason: r.rejectReason ?? "" })}
              </p>
            ) : null}
            {r.shipsItself &&
            r.status === "PLANNED" &&
            !r.acceptedAt &&
            !r.rejectedAt ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="s"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(() => call("POST", `/seller/orders/${r.id}/accept`))
                  }
                >
                  {t("accept")}
                </Button>
                <input
                  className={`${input} w-56`}
                  aria-label={t("refuseReason")}
                  placeholder={t("refuseReason")}
                  maxLength={300}
                  value={reasons[r.id] ?? ""}
                  onChange={(e) =>
                    setReasons({ ...reasons, [r.id]: e.target.value })
                  }
                />
                <Button
                  size="s"
                  variant="secondary"
                  disabled={busy || (reasons[r.id] ?? "").trim().length < 3}
                  onClick={() =>
                    act(() =>
                      call("POST", `/seller/orders/${r.id}/reject`, {
                        reason: reasons[r.id].trim(),
                      }),
                    )
                  }
                >
                  {t("refuse")}
                </Button>
              </div>
            ) : null}
            {r.shipsItself && unpacked(r) && !r.rejectedAt ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2">
                  {t("weight")}
                  <input
                    className={`${input} w-28`}
                    type="number"
                    min={1}
                    value={field(r.id, "weight")}
                    onChange={(e) => setField(r.id, "weight", e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2">
                  {t("parcels")}
                  <input
                    className={`${input} w-20`}
                    type="number"
                    min={1}
                    value={field(r.id, "count")}
                    onChange={(e) => setField(r.id, "count", e.target.value)}
                  />
                </label>
                <span className="flex items-center gap-1">
                  <span>{t("sizeCm")}</span>
                  {(["lengthCm", "widthCm", "heightCm"] as const).map((k) => (
                    <input
                      key={k}
                      className={`${input} w-20`}
                      type="number"
                      min={1}
                      aria-label={t(k)}
                      placeholder={t(k)}
                      value={field(r.id, k)}
                      onChange={(e) => setField(r.id, k, e.target.value)}
                    />
                  ))}
                </span>
                <Button
                  size="s"
                  disabled={
                    busy ||
                    !(Number(field(r.id, "weight")) > 0) ||
                    !(Number(field(r.id, "count")) > 0)
                  }
                  onClick={() =>
                    act(() =>
                      call("POST", `/seller/orders/${r.id}/ready`, {
                        weightGrams: Number(field(r.id, "weight")),
                        packageCount: Number(field(r.id, "count")),
                        ...size(r.id),
                      }),
                    )
                  }
                >
                  {t("ready")}
                </Button>
              </div>
            ) : null}

            {r.shipsItself && r.packed && r.packed.weightGrams ? (
              <p className="text-ink-muted mt-2">
                {t("declared", {
                  weight: r.packed.weightGrams,
                  count: r.packed.packageCount ?? 1,
                })}
                {r.packed.lengthCm && r.packed.widthCm && r.packed.heightCm
                  ? ` · ${t("declaredSize", { l: r.packed.lengthCm, w: r.packed.widthCm, h: r.packed.heightCm })}`
                  : ""}
              </p>
            ) : null}
            {r.shipsItself && (packed(r) || r.photos.length) ? (
              <div className="mt-3">
                <p className="font-medium">{t("photos")}</p>
                {r.photos.length ? (
                  <ul className="flex flex-wrap gap-x-3">
                    {r.photos.map((p, i) => (
                      <li key={p.id}>
                        <a
                          href={`/api/tracecart/seller/orders/${r.id}/photos/${p.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          {t("photo", { n: i + 1 })}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {packed(r) && r.photos.length < 6 ? (
                  <label className="text-ink-muted mt-1 block">
                    <span className="text-xs">{t("photosHint")}</span>
                    <input
                      className={`${input} mt-1`}
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      disabled={busy}
                      aria-label={t("photos")}
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []).slice(
                          0,
                          6 - r.photos.length,
                        );
                        e.target.value = "";
                        if (!files.length) return;
                        const form = new FormData();
                        for (const f of files) form.append("photos", f, f.name);
                        void act(() =>
                          call("POST", `/seller/orders/${r.id}/photos`, form),
                        );
                      }}
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
            {r.shipsItself && packed(r) && !r.carrier ? (
              <p className="text-ink-muted mt-3">{t("findingCarrier")}</p>
            ) : null}
            {r.shipsItself && packed(r) && r.carrier ? (
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <a
                  href={`/api/tracecart/seller/orders/${r.id}/label.pdf`}
                  className="font-medium underline"
                >
                  {t("label")}
                </a>
                {!r.leavesWithLoad ? (
                  <Button
                    size="s"
                    disabled={busy}
                    onClick={() =>
                      act(() => call("POST", `/seller/orders/${r.id}/handover`))
                    }
                  >
                    {t("handedOver")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
