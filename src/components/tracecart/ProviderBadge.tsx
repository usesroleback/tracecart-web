import { Badge } from "@/components/ui/badge/Badge";
import { Provider } from "@/lib/types";

export function ProviderBadge({ provider }: { provider: Provider | null }) {
  if (!provider) {
    return <Badge>Boutique inconnue</Badge>;
  }

  return (
    <Badge variant="accent" className="gap-1.5 pl-1.5">
      {provider.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={provider.logoUrl} alt="" className="h-3.5 w-3.5 rounded-full bg-white object-contain" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-on-accent" />
      )}
      {provider.name}
    </Badge>
  );
}
