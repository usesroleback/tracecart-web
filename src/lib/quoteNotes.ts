"use client";

import { useTranslations } from "next-intl";
import { QuoteNote } from "./types";

/**
 * Puts a quote note (a code with values, from the API's pricing engine) into
 * the reader's words. Component and field codes inside it are translated too.
 */
export function useQuoteNote() {
  const t = useTranslations("labels");
  return (note: QuoteNote): string => {
    const params: Record<string, string | number> = { ...note.params };
    if (typeof params.component === "string") params.component = t(`priceComponent.${params.component}`);
    if (typeof params.field === "string") params.field = t(`cargoField.${params.field}`);
    return t(`quoteNote.${note.code}`, params);
  };
}
