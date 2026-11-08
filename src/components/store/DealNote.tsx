import { getFormatter, getTranslations } from "next-intl/server";

/** "Deal · ends 12 Nov, 18:00", when the shown price is a deal (ADR-070). */
export async function DealNote({ endsAt }: { endsAt: string | null | undefined }) {
  if (!endsAt) return null;
  const t = await getTranslations("store.deals");
  const format = await getFormatter();
  return (
    <p className="text-xs font-medium text-positive">
      {t("ends", { date: format.dateTime(new Date(endsAt), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })}
    </p>
  );
}
