import { CarrierServices, Carrier } from "@/components/tracecart/CarrierServices";
import { CarrierAccounts } from "@/components/tracecart/CarrierAccounts";
import { serverGet } from "@/lib/serverApi";
import { CarrierService, Hub } from "@/lib/types";

export default async function CarriersPage() {
  const [services, carriers, hubs] = await Promise.all([
    serverGet<CarrierService[]>("/carrier-services"),
    serverGet<Carrier[]>("/carrier-services/carriers"),
    serverGet<Hub[]>("/hubs"),
  ]);
  return (
    <>
      <CarrierAccounts carriers={carriers ?? []} />
      <CarrierServices view="admin" initialServices={services ?? []} carriers={carriers ?? []} hubs={hubs ?? []} />
    </>
  );
}
