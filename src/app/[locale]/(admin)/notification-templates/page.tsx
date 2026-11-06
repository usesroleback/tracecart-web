import { TemplatesAdmin } from "@/components/notifications/TemplatesAdmin";
import { requirePermission } from "@/lib/session";

export default async function NotificationTemplatesPage() {
  await requirePermission("settings.notification_template.write");
  return <TemplatesAdmin />;
}
