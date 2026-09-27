"use client";

import { CheckCircle2, LoaderCircle, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CART_LABELS, ExtraId, FLOWER_PRICES, FlowerId, useCart, WrapId } from "./cart-context";
import { EXTRA_PRICES } from "@/data/catalog";

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

type CustomerDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  deliveryDate: string;
  notes: string;
};

const emptyCustomer: CustomerDetails = { firstName: "", lastName: "", phone: "", deliveryDate: "", notes: "" };

export function CartDrawer() {
  const cart = useCart();
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [customer, setCustomer] = useState<CustomerDetails>(emptyCustomer);
  const [accountState, setAccountState] = useState<"loading" | "guest" | "authenticated">("loading");
  const flowerLines = (Object.entries(cart.flowers) as [FlowerId, number][]).filter(([, qty]) => qty > 0);
  const extraLines = (Object.entries(cart.extras) as [ExtraId, boolean][]).filter(([, active]) => active);
  const isEmpty = !cart.wrap && flowerLines.length === 0 && extraLines.length === 0;
  const customerComplete = customer.firstName.trim().length >= 2
    && customer.lastName.trim().length >= 2
    && /^[+0-9().\s-]{8,20}$/.test(customer.phone.trim())
    && Boolean(customer.deliveryDate);
  const canSubmit = accountState === "authenticated" && Boolean(cart.wrap) && flowerLines.length > 0 && customerComplete;
  const minimumDeliveryDate = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!cart.drawerOpen) return;
    const controller = new AbortController();
    setAccountState("loading");
    fetch("/api/customer/session", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean; user?: { firstName?: string; lastName?: string } | null }) => {
        setAccountState(result.authenticated ? "authenticated" : "guest");
        if (result.authenticated && result.user) {
          setCustomer((current) => ({
            ...current,
            firstName: current.firstName || result.user?.firstName || "",
            lastName: current.lastName || result.user?.lastName || "",
          }));
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setAccountState("guest");
      });
    return () => controller.abort();
  }, [cart.drawerOpen]);

  function updateCustomer(field: keyof CustomerDetails, value: string) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function closeDrawer() {
    setSubmission({ status: "idle" });
    cart.setDrawerOpen(false);
  }

  async function submitOrder() {
    if (!canSubmit || submission.status === "submitting") return;
    setSubmission({ status: "submitting" });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wrap: cart.wrap, flowers: cart.flowers, extras: cart.extras, customer }),
      });
      const result = await response.json() as { reference?: string; error?: string };
      if (!response.ok || !result.reference) {
        if (response.status === 401) setAccountState("guest");
        throw new Error(result.error || "La commande n’a pas pu être enregistrée.");
      }

      cart.clearCart();
      setCustomer(emptyCustomer);
      setSubmission({ status: "success", reference: result.reference });
    } catch (error) {
      setSubmission({ status: "error", message: error instanceof Error ? error.message : "Une erreur inattendue est survenue." });
    }
  }

  return (
    <div className={cart.drawerOpen ? "drawer-layer drawer-layer--open" : "drawer-layer"} aria-hidden={!cart.drawerOpen}>
      <button className="drawer-backdrop" aria-label="Fermer le panier" onClick={closeDrawer} />
      <aside className="cart-drawer" aria-label="Votre composition">
        <div className="drawer-header"><div><small>VOTRE SÉLECTION</small><h2>Ma composition</h2></div><button onClick={closeDrawer} aria-label="Fermer"><X /></button></div>
        {submission.status === "success" ? (
          <div className="cart-success" role="status">
            <CheckCircle2 />
            <h3>Votre commande a bien été prise en compte</h3>
            <p>Vous devez passer en boutique pour effectuer le règlement. Après le paiement, la livraison pourra être organisée au lieu convenu et à la date souhaitée.</p>
            <strong>{submission.reference}</strong>
            <button className="outline-button" onClick={closeDrawer}>FERMER</button>
          </div>
        ) : isEmpty ? <p className="empty-cart">Votre composition est encore vide.<br />Créez un bouquet qui vous ressemble.</p> : (
          <>
            <div className="cart-lines">
              {cart.wrap && <div className="cart-line"><span>{CART_LABELS.wraps[cart.wrap as WrapId]}</span><em>Inclus</em></div>}
              {flowerLines.map(([id, qty]) => <div className="cart-line" key={id}><span>{CART_LABELS.flowers[id]} × {qty}</span><em>{FLOWER_PRICES[id] * qty} €</em></div>)}
              {extraLines.map(([id]) => <div className="cart-line" key={id}><span>{CART_LABELS.extras[id]}</span><em>{EXTRA_PRICES[id]} €</em></div>)}
            </div>
            {accountState === "authenticated" ? <div className="checkout-details">
              <div className="cart-account-confirmed"><CheckCircle2 /><div><small>COMPTE CONNECTÉ</small><strong>{customer.firstName} {customer.lastName}</strong></div></div>
              <div className="checkout-details-heading"><small>INFORMATIONS DE LIVRAISON</small><h3>Finaliser ma commande</h3></div>
              <label>Téléphone<input type="tel" value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} autoComplete="tel" placeholder="06 00 00 00 00" maxLength={20} required /></label>
              <label>Date de livraison souhaitée<input type="date" min={minimumDeliveryDate} value={customer.deliveryDate} onChange={(event) => updateCustomer("deliveryDate", event.target.value)} required /></label>
              <label>Note pour l’atelier <span>(facultatif)</span><textarea value={customer.notes} onChange={(event) => updateCustomer("notes", event.target.value)} placeholder="Précisions utiles pour la préparation ou la livraison" rows={2} maxLength={500} /></label>
              <p>Le lieu de livraison sera défini avec l’atelier après le paiement en boutique.</p>
            </div> : <div className="cart-account-gate">
              {accountState === "loading" ? <><LoaderCircle /><strong>Vérification de votre compte…</strong></> : <>
                <UserRound />
                <strong>Identifiez-vous pour continuer</strong>
                <p>Connectez-vous pour retrouver vos informations et suivre cette commande depuis votre espace personnel.</p>
                <div className="cart-auth-actions">
                  <Link className="cart-auth-primary" href="/mon-compte?mode=login&next=%2Fpersonnaliser%3Fcart%3Dopen" onClick={() => cart.setDrawerOpen(false)}>SE CONNECTER</Link>
                  <Link className="cart-auth-secondary" href="/mon-compte?mode=register&next=%2Fpersonnaliser%3Fcart%3Dopen" onClick={() => cart.setDrawerOpen(false)}>CRÉER UN COMPTE</Link>
                </div>
              </>}
            </div>}
          </>
        )}
        {!isEmpty && submission.status !== "success" && <>
          <div className="cart-total"><span>Total connu</span><strong>{cart.total} €</strong></div>
          <p className="cart-note">L’emballage est inclus. La composition finale sera confirmée par notre atelier.</p>
          {submission.status === "error" && <p className="cart-submit-message cart-submit-message--error" role="alert">{submission.message}</p>}
          {!flowerLines.length && <p className="cart-submit-message" role="status">Ajoutez au moins une fleur pour valider votre sélection.</p>}
          {flowerLines.length > 0 && accountState === "authenticated" && !customerComplete && <p className="cart-submit-message" role="status">Renseignez le téléphone et la date souhaitée pour continuer.</p>}
          {accountState === "authenticated" && <>
            <p className="cart-payment-note"><strong>Paiement en boutique</strong><span>Aucun paiement ne vous sera demandé en ligne.</span></p>
            <button className="outline-button drawer-submit" onClick={submitOrder} disabled={!canSubmit || submission.status === "submitting"}>
              {submission.status === "submitting" && <LoaderCircle />}
              {submission.status === "submitting" ? "ENREGISTREMENT…" : "VALIDER LA SÉLECTION"}
            </button>
          </>}
          <button className="drawer-clear" onClick={cart.clearCart} disabled={submission.status === "submitting"}>Vider la sélection</button>
        </>}
      </aside>
    </div>
  );
}
