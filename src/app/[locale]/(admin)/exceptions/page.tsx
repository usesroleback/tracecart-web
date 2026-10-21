import { ExceptionsDashboard } from "./ExceptionsDashboard";
import { serverGet } from "@/lib/serverApi";
import { HubException } from "@/lib/types";

export default async function ExceptionsPage() {
  const exceptions = await serverGet<HubException[]>("/exceptions?status=OPEN");
  return <ExceptionsDashboard initialExceptions={exceptions ?? []} />;
}
