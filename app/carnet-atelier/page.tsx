import type { Metadata } from "next";
import { isBackofficeAuthenticated } from "@/lib/backoffice-auth";
import { BackofficeClient } from "./backoffice-client";

export const metadata: Metadata = {
  title: "Carnet de l’atelier | RizaLys",
  robots: { index: false, follow: false, nocache: true },
};

export default async function CarnetAtelierPage() {
  const authenticated = await isBackofficeAuthenticated();
  return <BackofficeClient initiallyAuthenticated={authenticated} />;
}
