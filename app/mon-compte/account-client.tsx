"use client";

import Link from "next/link";
import { Check, Clock3, LoaderCircle, LogOut, PackageCheck, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ORDER_STATUS_LABELS, type CustomerOrder, type OrderStatus } from "@/lib/order-types";

type CustomerUser = { id: string; email: string; firstName: string; lastName: string };
type AuthMode = "login" | "register" | "forgot";
type AccountState = "loading" | "guest" | "authenticated";

const TRACKING_STAGES: Array<{ status: Exclude<OrderStatus, "cancelled">; label: string }> = [
  { status: "received", label: "Reçue" },
  { status: "confirmed", label: "Confirmée" },
  { status: "preparing", label: "En préparation" },
  { status: "ready", label: "Prête" },
  { status: "completed", label: "Terminée" },
];

function formatDate(value: string, withTime = false) {
  return new Intl.DateTimeFormat("fr-FR", withTime
    ? { dateStyle: "long", timeStyle: "short" }
    : { dateStyle: "long" }).format(new Date(withTime ? value : `${value}T12:00:00`));
}

function safeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function AccountClient() {
  const [accountState, setAccountState] = useState<AccountState>("loading");
  const [mode, setMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await fetch("/api/customer/orders", { cache: "no-store" });
      const result = await response.json() as { orders?: CustomerOrder[]; error?: string };
      if (!response.ok || !result.orders) throw new Error(result.error || "Impossible de charger vos commandes.");
      setOrders(result.orders);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger vos commandes.");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const searchParams = new URLSearchParams(window.location.search);
      const requestedMode = searchParams.get("mode");
      if (requestedMode === "register" || requestedMode === "login") setMode(requestedMode);
      if (searchParams.get("confirmed") === "1") setNotice("Votre adresse e-mail est confirmée. Vous pouvez maintenant vous connecter.");
      if (window.location.hash) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      try {
        const response = await fetch("/api/customer/session", { cache: "no-store" });
        const result = await response.json() as { authenticated?: boolean; user?: CustomerUser | null };
        if (!active) return;
        if (response.ok && result.authenticated && result.user) {
          setUser(result.user);
          setAccountState("authenticated");
          const next = safeNextPath();
          if (next) {
            window.location.assign(next);
            return;
          }
          await loadOrders();
        } else {
          setAccountState("guest");
        }
      } catch {
        if (active) {
          setAccountState("guest");
          setError("Le service de connexion est temporairement indisponible.");
        }
      }
    }
    void loadSession();
    return () => { active = false; };
  }, [loadOrders]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/customer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: form.get("email"),
          password: form.get("password"),
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
        }),
      });
      const result = await response.json() as {
        authenticated?: boolean;
        confirmationRequired?: boolean;
        sent?: boolean;
        user?: CustomerUser | null;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "La connexion a échoué.");
      if (mode === "forgot" && result.sent) {
        setMode("login");
        setNotice("Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d’être envoyé.");
        return;
      }
      if (result.confirmationRequired) {
        setMode("login");
        setNotice("Votre compte est créé. Cliquez sur le lien reçu par e-mail, puis connectez-vous ici.");
        return;
      }
      if (!result.authenticated || !result.user) throw new Error("La session reçue est invalide.");
      setUser(result.user);
      setAccountState("authenticated");
      const next = safeNextPath();
      if (next) {
        window.location.assign(next);
        return;
      }
      await loadOrders();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "La connexion a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    setError("");
    await fetch("/api/customer/session", { method: "DELETE" });
    setUser(null);
    setOrders([]);
    setAccountState("guest");
  }

  if (accountState === "loading") {
    return <main className="account-page account-loading"><LoaderCircle /><span>Ouverture de votre espace…</span></main>;
  }

  if (accountState === "guest") {
    return (
      <main className="account-page account-auth-page">
        <section className="account-intro">
          <span>VOTRE ESPACE PERSONNEL</span>
          <h1>Suivez chaque étape<br />de votre bouquet.</h1>
          <p>Retrouvez vos commandes, leur préparation et les informations de livraison dans un espace privé.</p>
          <ul>
            <li><ShieldCheck /> Accès sécurisé par Supabase Auth</li>
            <li><Clock3 /> Avancement mis à jour par l’atelier</li>
            <li><PackageCheck /> Détails et date souhaitée au même endroit</li>
          </ul>
        </section>
        <section className="account-auth-card">
          <div className="account-auth-icon"><UserRound /></div>
          <div className="account-tabs" role="tablist" aria-label="Connexion ou inscription">
            <button type="button" className={mode === "login" || mode === "forgot" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Connexion</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setError(""); }}>Créer un compte</button>
          </div>
          <h2>{mode === "login" ? "Heureux de vous revoir" : mode === "register" ? "Créer votre espace" : "Mot de passe oublié"}</h2>
          <p>{mode === "login" ? "Connectez-vous pour consulter vos commandes." : mode === "register" ? "Vos prochaines commandes seront automatiquement rattachées à ce compte." : "Recevez un lien sécurisé pour choisir un nouveau mot de passe."}</p>
          <form onSubmit={submit}>
            {mode === "register" && <div className="account-field-row">
              <label>Prénom<input name="firstName" autoComplete="given-name" minLength={2} maxLength={80} required /></label>
              <label>Nom<input name="lastName" autoComplete="family-name" minLength={2} maxLength={80} required /></label>
            </div>}
            <label>Adresse e-mail<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
            {mode !== "forgot" && <label>Mot de passe<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} maxLength={72} required /></label>}
            {mode === "register" && <small>12 caractères minimum avec une majuscule, une minuscule, un chiffre et un symbole.</small>}
            {mode === "login" && <button className="account-forgot-button" type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>Mot de passe oublié ?</button>}
            {mode === "forgot" && <button className="account-forgot-button" type="button" onClick={() => { setMode("login"); setError(""); }}>← Retour à la connexion</button>}
            {notice && <div className="account-notice" role="status">{notice}</div>}
            {error && <div className="account-error" role="alert">{error}</div>}
            <button className="account-primary-button" disabled={submitting}>
              {submitting && <LoaderCircle />}
              {submitting ? "PATIENTEZ…" : mode === "login" ? "SE CONNECTER" : mode === "register" ? "CRÉER MON COMPTE" : "ENVOYER LE LIEN"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="account-page account-dashboard">
      <header className="account-dashboard-header">
        <div><span>MON COMPTE</span><h1>Bonjour{user?.firstName ? ` ${user.firstName}` : ""}</h1><p>{user?.email}</p></div>
        <div className="account-dashboard-actions">
          <button onClick={() => void loadOrders()} disabled={ordersLoading}><RefreshCw className={ordersLoading ? "is-spinning" : ""} />Actualiser</button>
          <button onClick={() => void logout()}><LogOut />Déconnexion</button>
        </div>
      </header>
      <section className="account-orders-section">
        <div className="account-section-heading"><span>SUIVI PERSONNALISÉ</span><h2>Mes commandes</h2><p>L’atelier met à jour chaque étape au fil de la préparation.</p></div>
        {error && <div className="account-error account-global-error" role="alert">{error}</div>}
        {ordersLoading ? <div className="account-orders-empty"><LoaderCircle className="is-spinning" /><p>Chargement de vos commandes…</p></div>
          : orders.length === 0 ? <div className="account-orders-empty"><PackageCheck /><h3>Aucune commande pour le moment</h3><p>Votre prochaine création apparaîtra ici dès sa validation.</p><Link className="outline-button" href="/personnaliser">CRÉER MON BOUQUET</Link></div>
            : <div className="customer-orders">{orders.map((order) => <CustomerOrderCard order={order} key={order.id} />)}</div>}
      </section>
    </main>
  );
}

function CustomerOrderCard({ order }: { order: CustomerOrder }) {
  const currentStage = TRACKING_STAGES.findIndex((stage) => stage.status === order.status);
  const cancelled = order.status === "cancelled";
  return (
    <article className="customer-order-card">
      <header>
        <div><span>COMMANDE</span><strong>{order.reference}</strong><small>Passée le {formatDate(order.created_at, true)}</small></div>
        <div className={`customer-status customer-status--${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</div>
      </header>
      {cancelled ? <div className="customer-cancelled">Cette commande a été annulée. Contactez la boutique si vous avez besoin d’aide.</div> : <ol className="customer-tracking">
        {TRACKING_STAGES.map((stage, index) => <li className={index <= currentStage ? "complete" : ""} key={stage.status}>
          <span>{index < currentStage ? <Check /> : index + 1}</span><small>{stage.label}</small>
        </li>)}
      </ol>}
      <div className="customer-order-content">
        <section><span>VOTRE BOUQUET</span><h3>{order.total_stems} tige{order.total_stems > 1 ? "s" : ""} · {order.wrapping_name}</h3>
          <ul>{order.order_flowers.map((flower) => <li key={flower.flower_id}><strong>{flower.quantity}×</strong>{flower.flower_name}</li>)}</ul>
          {order.order_extras.length > 0 && <div className="customer-order-extras">{order.order_extras.map((extra) => <small key={extra.extra_id}>{extra.quantity}× {extra.extra_name}</small>)}</div>}
        </section>
        <section className="customer-order-delivery"><span>LIVRAISON & RÈGLEMENT</span>
          <dl><div><dt>Date souhaitée</dt><dd>{formatDate(order.delivery_date)}</dd></div><div><dt>Paiement</dt><dd>{order.payment_status === "paid" ? "Réglé en boutique" : "À régler en boutique"}</dd></div><div><dt>Lieu de livraison</dt><dd>{order.delivery_address || (order.payment_status === "paid" ? "À définir avec l’atelier" : "Disponible après le règlement")}</dd></div></dl>
        </section>
        <aside><span>TOTAL</span><strong>{Number(order.total_price).toFixed(2).replace(".00", "")} €</strong><small>Paiement en boutique</small></aside>
      </div>
    </article>
  );
}
