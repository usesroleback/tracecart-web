import { notFound } from "next/navigation";
import { DiscoveryWorkspace } from "./DiscoveryWorkspace";
import { serverGet } from "@/lib/serverApi";
import { DiscoveryState } from "@/lib/types";

// The API answers 404 for a request outside the admin's hub.
export default async function SourcingDiscoveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await serverGet<DiscoveryState>(`/sourcing-requests/${encodeURIComponent(id)}/discovery`);
  if (!state) notFound();
  return <DiscoveryWorkspace initial={state} />;
}
