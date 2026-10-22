import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card/Card";

/** Shared card chrome + loading/error/empty states, so every dashboard panel writes them once. */
export function PanelShell({
  title,
  action,
  loading,
  error,
  empty,
  emptyLabel,
  children,
}: {
  title: string;
  action?: ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyLabel: string;
  children: ReactNode;
}) {
  const t = useTranslations("dashboard.panels");
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="rb-title text-[14px]">{title}</h2>
        {action}
      </div>

      {loading && (
        <div className="space-y-2" role="status" aria-label={t("loading")}>
          <div className="h-4 w-2/3 animate-pulse rounded-[var(--radius-xs)] bg-surface-sunken" />
          <div className="h-32 w-full animate-pulse rounded-[var(--radius-xs)] bg-surface-sunken" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-[var(--radius-s)] bg-critical-soft px-3 py-2 text-sm text-critical">{error}</p>
      )}

      {!loading && !error && empty && <p className="text-sm text-ink-muted">{emptyLabel}</p>}

      {!loading && !error && !empty && children}
    </Card>
  );
}
