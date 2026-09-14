import { ReactNode } from "react";

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
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        {action}
      </div>

      {loading && (
        <div className="space-y-2" role="status" aria-label="Chargement">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
          <div className="h-32 w-full animate-pulse rounded bg-gray-100 dark:bg-white/5" />
        </div>
      )}

      {!loading && error && (
        <p className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </p>
      )}

      {!loading && !error && empty && <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>}

      {!loading && !error && !empty && children}
    </div>
  );
}
