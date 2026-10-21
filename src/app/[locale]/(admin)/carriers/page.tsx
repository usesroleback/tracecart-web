import { CarriersDashboard } from "./CarriersDashboard";
import { serverGet } from "@/lib/serverApi";
import { CarrierService } from "@/lib/types";

export default async function CarriersPage() {
  const [services, carriers] = await Promise.all([
    serverGet<CarrierService[]>("/carrier-services"),
    serverGet<{ id: string; name: string; email: string; phone: string | null }[]>("/carrier-services/carriers"),
  ]);
  return <CarriersDashboard initialServices={services ?? []} carriers={carriers ?? []} />;
}
