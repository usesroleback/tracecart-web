import { notFound } from "next/navigation";
import { ShipmentDetail } from "./ShipmentDetail";
import { serverGet } from "@/lib/serverApi";
import { Order, OrderHistoryEntry } from "@/lib/types";

// The API answers 404 for an order outside the viewer's hub or assignment
// (orders.service.ts assertVisible), so null here means "not yours or gone".
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, history] = await Promise.all([
    serverGet<Order>(`/orders/${encodeURIComponent(id)}`),
    serverGet<OrderHistoryEntry[]>(`/orders/${encodeURIComponent(id)}/history`),
  ]);
  if (!order) notFound();
  return <ShipmentDetail initialOrder={order} initialHistory={history ?? []} />;
}
