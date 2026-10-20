"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from '@/i18n/navigation';

import { api } from "@/lib/apiClient";
import Button from "@/components/ui/button/Button";
import { Card } from "@/components/ui/card/Card";
import { Badge } from "@/components/ui/badge/Badge";
import { GeoDetectResult, Hub } from "@/lib/types";

const inputClasses =
  "h-11 w-full rounded-[var(--radius-s)] border border-line-strong bg-surface-raised px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring";

export function HubSetup({ currentHub }: { currentHub: { id: string; name: string; city: string } | null }) {
  const router = useRouter();
  const t = useTranslations("hubSetup");
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [detect, setDetect] = useState<GeoDetectResult | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string>(currentHub?.id ?? "");
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newHub, setNewHub] = useState({
    name: "",
    city: "",
    country: "",
    countryCode: "",
    latitude: 0,
    longitude: 0,
    timezone: "Africa/Abidjan",
    currency: "XOF",
  });

  useEffect(() => {
    (async () => {
      try {
        const [hubList, geo] = await Promise.all([
          api.get<Hub[]>("/hubs"),
          api.get<GeoDetectResult>("/geo/detect"),
        ]);
        setHubs(hubList);
        setDetect(geo);
        if (!selectedHubId && geo.nearestHubId) setSelectedHubId(geo.nearestHubId);
        if (geo.location) {
          setNewHub((h) => ({ ...h, city: geo.location!.city, country: geo.location!.country }));
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmExisting() {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/me/hub", { hubId: selectedHubId });
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function createAndConfirm() {
    setSaving(true);
    setError(null);
    try {
      await api.patch("/me/hub", { newHub });
      router.push("/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">{t("detecting")}</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="rb-headline text-[32px]">
        {currentHub ? t("titleMine") : t("titleSetup")}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        {t("intro")}
      </p>

      {detect?.location && (
        <p className="mt-4 rounded-[var(--radius-s)] bg-positive-soft px-3 py-2 text-xs text-positive">
          {t("detected", { city: detect.location.city, country: detect.location.country })}
        </p>
      )}

      {!creatingNew ? (
        <div className="mt-5 space-y-3">
          {hubs.map((hub) => (
            <label
              key={hub.id}
              className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-m)] border p-4 transition ${
                selectedHubId === hub.id
                  ? "border-ink bg-surface-sunken"
                  : "border-line bg-surface-raised hover:bg-surface-sunken"
              }`}
            >
              <input
                type="radio"
                name="hub"
                checked={selectedHubId === hub.id}
                onChange={() => setSelectedHubId(hub.id)}
              />
              <div>
                <p className="text-sm font-medium text-ink">
                  {hub.name}
                  {detect?.nearestHubId === hub.id && (
                    <Badge variant="positive" className="ml-2">
                      {t("nearest")}
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-ink-muted">
                  {hub.city}, {hub.country} · {hub.currency}
                </p>
              </div>
            </label>
          ))}

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCreatingNew(true)}
              className="rb-link text-sm font-medium"
            >
              {t("createNew")}
            </button>
            <Button onClick={confirmExisting} disabled={!selectedHubId} loading={saving}>
              {t("confirm")}
            </Button>
          </div>
        </div>
      ) : (
        <Card as="div" className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("field.name")}>
              <input value={newHub.name} onChange={(e) => setNewHub((h) => ({ ...h, name: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label={t("field.currency")}>
              <input
                value={newHub.currency}
                onChange={(e) => setNewHub((h) => ({ ...h, currency: e.target.value }))}
                className={inputClasses}
              />
            </Field>
            <Field label={t("field.city")}>
              <input value={newHub.city} onChange={(e) => setNewHub((h) => ({ ...h, city: e.target.value }))} className={inputClasses} />
            </Field>
            <Field label={t("field.country")}>
              <input
                value={newHub.country}
                onChange={(e) => setNewHub((h) => ({ ...h, country: e.target.value }))}
                className={inputClasses}
              />
            </Field>
            <Field label={t("field.countryCode")}>
              <input
                maxLength={2}
                value={newHub.countryCode}
                onChange={(e) => setNewHub((h) => ({ ...h, countryCode: e.target.value.toUpperCase() }))}
                className={inputClasses}
              />
            </Field>
            <Field label={t("field.timezone")}>
              <input
                value={newHub.timezone}
                onChange={(e) => setNewHub((h) => ({ ...h, timezone: e.target.value }))}
                className={inputClasses}
              />
            </Field>
            <Field label={t("field.latitude")}>
              <input
                type="number"
                value={newHub.latitude}
                onChange={(e) => setNewHub((h) => ({ ...h, latitude: Number(e.target.value) }))}
                className={inputClasses}
              />
            </Field>
            <Field label={t("field.longitude")}>
              <input
                type="number"
                value={newHub.longitude}
                onChange={(e) => setNewHub((h) => ({ ...h, longitude: Number(e.target.value) }))}
                className={inputClasses}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-critical">{error}</p>}

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setCreatingNew(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={createAndConfirm}
              disabled={!newHub.name || !newHub.city || !newHub.country || !newHub.countryCode}
              loading={saving}
            >
              {t("createConfirm")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="rb-label mb-1 block text-ink">{label}</span>
      {children}
    </label>
  );
}
