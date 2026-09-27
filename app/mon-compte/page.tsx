import type { Metadata } from "next";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "Mon compte | RizaLys",
  description: "Connectez-vous pour suivre la préparation et la livraison de vos commandes RizaLys.",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountClient />;
}
