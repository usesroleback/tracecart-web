"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

/** What the shop still needs before it can price a product (GET /pricing-settings/readiness). */
export interface Readiness {
  ready: boolean;
  hub: { id: string; name: string; currency: string } | null;
  routes: { priced: number; withoutRates: number; countries: string[] };
  /** Each rate a price still needs: 1 `from` = ? `to` (the departure hub's currency). */
  exchangeRates: { missing: { from: string; to: string }[] };
  margins: { set: boolean };
  /** missingHubs: hubs whose routes can't price until their store → hub rate is set. */
  inbound: { set: boolean; missingHubs: string[] };
  customsRates: number;
  /** Countries a price can go to that have no customs rate yet (the price is all-in). */
  customs: { missingCountries: string[] };
}

const EVENT = "tracecart:readiness";

/** Tells every banner and checklist on the page to check again (after a save that may complete a step). */
export const refreshReadiness = () => window.dispatchEvent(new Event(EVENT));

/** The administrateur's setup, checked again on `key` changes and after refreshReadiness(); null while unknown or for other roles. */
export function useReadiness(enabled: boolean, key?: string): Readiness | null {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () =>
      api
        .get<Readiness>("/pricing-settings/readiness")
        .then((r) => live && setReadiness(r))
        // Unknown: say nothing rather than a wrong warning.
        .catch(() => undefined);
    load();
    window.addEventListener(EVENT, load);
    return () => {
      live = false;
      window.removeEventListener(EVENT, load);
    };
  }, [enabled, key]);
  return readiness;
}
