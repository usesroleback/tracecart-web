import { useTranslations } from "next-intl";
import { Link } from '@/i18n/navigation';
import { useFormat } from "@/lib/format";

import { Order } from "@/lib/types";
import { OrderStatusTag } from "@/components/ui/status/Status";
import { productPlaceholder } from "@/lib/placeholderImage";

export function AttentionTable({ orders, loading, emptyLabel }: { orders: Order[]; loading: boolean; emptyLabel: string }) {
  const t = useTranslations("orders.table");
  const f = useFormat();
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-[var(--radius-m)] bg-surface-sunken" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>;
  }

  return (
    <div tabIndex={0} className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="rb-overline">
            <th className="pb-2 font-medium normal-case tracking-normal">{t("order")}</th>
            <th className="pb-2 font-medium normal-case tracking-normal">{t("status")}</th>
            <th className="pb-2 font-medium normal-case tracking-normal">{t("destination")}</th>
            <th className="pb-2 pr-0 text-right font-medium normal-case tracking-normal">{t("updated")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="py-2.5 pr-3">
                <Link href="/orders" className="flex items-center gap-2.5 hover:underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.productImageUrl || productPlaceholder(order.id)}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded-[var(--radius-s)] border border-line object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{order.reference}</p>
                    <p className="truncate text-xs text-ink-muted">{order.productName}</p>
                  </div>
                </Link>
              </td>
              <td className="py-2.5 pr-3">
                <OrderStatusTag status={order.status} />
              </td>
              <td className="py-2.5 pr-3 text-xs text-ink-muted">{order.destinationCity}</td>
              <td className="py-2.5 pr-0 text-right text-xs text-ink-muted">{f.ago(order.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
