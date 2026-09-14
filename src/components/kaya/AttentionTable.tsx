import Link from "next/link";
import { Order } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { productPlaceholder } from "@/lib/placeholderImage";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

export function AttentionTable({ orders, loading, emptyLabel }: { orders: Order[]; loading: boolean; emptyLabel: string }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-gray-400">
            <th className="pb-2 font-medium">Commande</th>
            <th className="pb-2 font-medium">Statut</th>
            <th className="pb-2 font-medium">Destination</th>
            <th className="pb-2 pr-0 text-right font-medium">Mis à jour</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="py-2.5 pr-3">
                <Link href="/orders" className="flex items-center gap-2.5 hover:underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.productImageUrl || productPlaceholder(order.id)}
                    alt=""
                    className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800 dark:text-white/90">{order.reference}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{order.productName}</p>
                  </div>
                </Link>
              </td>
              <td className="py-2.5 pr-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="py-2.5 pr-3 text-xs text-gray-500 dark:text-gray-400">{order.destinationCity}</td>
              <td className="py-2.5 pr-0 text-right text-xs text-gray-400">{timeAgo(order.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
