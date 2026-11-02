import { permanentRedirect } from "next/navigation";

/** "Ship my parcel" became freight, with an estimate from photos (docs ADR-036): old links land there. */
export default async function ShipPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/freight`);
}
