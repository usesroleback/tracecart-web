import { CarrierServices } from "@/components/tracecart/CarrierServices";
import { serverGet } from "@/lib/serverApi";
import { CarrierService, Hub } from "@/lib/types";

/** The carrier's own routes and rate cards. */
export default async function RoutesPage() {
  const [services, hubs] = await Promise.all([serverGet<CarrierService[]>("/carrier-services"), serverGet<Hub[]>("/hubs")]);
  return <CarrierServices view="carrier" initialServices={services ?? []} hubs={hubs ?? []} />;
}
