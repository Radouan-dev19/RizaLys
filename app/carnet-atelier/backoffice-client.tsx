"use client";

import { CalendarDays, CircleDollarSign, ClipboardList, LoaderCircle, LogOut, RefreshCw, Sprout } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type BackofficeOrder, type OrderStatus } from "@/lib/order-types";

type Props = { initiallyAuthenticated: boolean };

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Paris" })
    .format(new Date(`${value}T12:00:00`));
}

function DeliveryAddressEditor({ order, saving, onSave }: { order: BackofficeOrder; saving: boolean; onSave: (address: string) => Promise<void> }) {
  const [address, setAddress] = useState(order.delivery_address ?? "");

  useEffect(() => {
    setAddress(order.delivery_address ?? "");
  }, [order.delivery_address]);

  return (
    <div className="atelier-address-editor">
      <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} maxLength={300} placeholder="Adresse complète, étage, code d’accès…" />
      <button type="button" disabled={saving || address.trim().length < 5 || address.trim() === (order.delivery_address ?? "")} onClick={() => onSave(address.trim())}>
        {saving ? "ENREGISTREMENT…" : order.delivery_address ? "METTRE À JOUR" : "ENREGISTRER LE LIEU"}
      </button>
    </div>
  );
}

export function BackofficeClient({ initiallyAuthenticated }: Props) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<BackofficeOrder[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(initiallyAuthenticated);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/atelier/orders", { cache: "no-store" });
      const result = await response.json() as { orders?: BackofficeOrder[]; error?: string };
      if (response.status === 401) {
        setAuthenticated(false);
        setOrders([]);
        return;
      }
      if (!response.ok || !result.orders) throw new Error(result.error || "Impossible de charger les commandes.");
      setOrders(result.orders);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) void loadOrders();
  }, [authenticated, loadOrders]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/atelier/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { authenticated?: boolean; error?: string };
      if (!response.ok || !result.authenticated) throw new Error(result.error || "Connexion impossible.");
      setPassword("");
      setAuthenticated(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Connexion impossible.");
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/atelier/session", { method: "DELETE" });
    setAuthenticated(false);
    setOrders([]);
    setError("");
  }

  async function updateOrder(orderId: string, changes: { status?: OrderStatus; paymentStatus?: "pending" | "paid"; deliveryAddress?: string }) {
    setUpdatingId(orderId);
    setError("");
    try {
      const response = await fetch("/api/atelier/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, ...changes }),
      });
      const result = await response.json() as { order?: BackofficeOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error || "La commande n’a pas pu être mise à jour.");
      setOrders((current) => current.map((order) => order.id === orderId ? result.order! : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "La commande n’a pas pu être mise à jour.");
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter);
  const stats = useMemo(() => ({
    pending: orders.filter((order) => ["received", "confirmed"].includes(order.status)).length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    revenue: orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total_price), 0),
  }), [orders]);

  if (!authenticated) {
    return (
      <main className="backoffice-page backoffice-login-page">
        <section className="atelier-login-card">
          <Sprout aria-hidden="true" />
          <span>ESPACE CONFIDENTIEL</span>
          <h1>Carnet de l’atelier</h1>
          <p>Connectez-vous pour consulter et préparer les commandes RizaLys.</p>
          <form onSubmit={login}>
            <label htmlFor="atelier-password">Mot de passe</label>
            <input id="atelier-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            {error && <p className="atelier-error" role="alert">{error}</p>}
            <button type="submit" disabled={loading || !password}>
              {loading && <LoaderCircle />}{loading ? "VÉRIFICATION…" : "ENTRER DANS L’ATELIER"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="backoffice-page">
      <header className="atelier-toolbar">
        <div><span>RIZALYS · ESPACE CONFIDENTIEL</span><h1>Carnet de l’atelier</h1></div>
        <div className="atelier-toolbar-actions">
          <button onClick={loadOrders} disabled={loading}><RefreshCw className={loading ? "is-spinning" : ""} />Actualiser</button>
          <button onClick={logout}><LogOut />Déconnexion</button>
        </div>
      </header>

      <section className="atelier-content">
        <div className="atelier-stats">
          <article><ClipboardList /><div><span>À traiter</span><strong>{stats.pending}</strong></div></article>
          <article><CalendarDays /><div><span>En préparation</span><strong>{stats.preparing}</strong></div></article>
          <article><CircleDollarSign /><div><span>Montant enregistré</span><strong>{currency.format(stats.revenue)}</strong></div></article>
        </div>

        <div className="atelier-list-heading">
          <div><span>COMMANDES</span><h2>Planning de préparation</h2></div>
          <label>Afficher
            <select value={filter} onChange={(event) => setFilter(event.target.value as OrderStatus | "all")}>
              <option value="all">Toutes les commandes</option>
              {ORDER_STATUSES.map((status) => <option value={status} key={status}>{ORDER_STATUS_LABELS[status]}</option>)}
            </select>
          </label>
        </div>

        {error && <p className="atelier-global-error" role="alert">{error}</p>}
        {loading && !orders.length ? <div className="atelier-loading"><LoaderCircle />Chargement des commandes…</div> : null}
        {!loading && !visibleOrders.length && !error ? <div className="atelier-empty"><Sprout /><h3>Aucune commande à afficher</h3><p>Les nouvelles commandes apparaîtront ici après leur validation.</p></div> : null}

        <div className="atelier-orders">
          {visibleOrders.map((order) => (
            <article className="atelier-order" key={order.id}>
              <div className="atelier-order-head">
                <div><span>{order.reference}</span><small>Reçue le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(order.created_at))}</small></div>
                <label>Statut
                  <select value={order.status} disabled={updatingId === order.id} onChange={(event) => updateOrder(order.id, { status: event.target.value as OrderStatus })}>
                    {ORDER_STATUSES.map((status) => <option value={status} key={status}>{ORDER_STATUS_LABELS[status]}</option>)}
                  </select>
                </label>
              </div>

              <div className="atelier-order-grid">
                <section className="atelier-customer">
                  <span>CLIENT &amp; LIVRAISON</span>
                  <h3>{order.customer_first_name} {order.customer_last_name}</h3>
                  <a href={`tel:${order.customer_phone.replace(/\s/g, "")}`}>{order.customer_phone}</a>
                  <dl>
                    <div><dt>Date souhaitée</dt><dd>{formatDate(order.delivery_date)}</dd></div>
                    <div><dt>Lieu de livraison</dt><dd>{order.payment_status === "paid"
                      ? <DeliveryAddressEditor order={order} saving={updatingId === order.id} onSave={(address) => updateOrder(order.id, { paymentStatus: "paid", deliveryAddress: address })} />
                      : <span className="atelier-address-locked">À définir après le paiement</span>}
                    </dd></div>
                  </dl>
                  {order.customer_notes && <p className="atelier-customer-note"><strong>Note client :</strong> {order.customer_notes}</p>}
                </section>

                <section className="atelier-composition">
                  <span>COMPOSITION À PRÉPARER</span>
                  <h3>{order.total_stems} tige{order.total_stems > 1 ? "s" : ""} · {order.wrapping_name}</h3>
                  <ul>{order.order_flowers.map((flower) => <li key={flower.flower_id}><strong>{flower.quantity}×</strong><span>{flower.flower_name}</span></li>)}</ul>
                  {order.order_extras.length > 0 && <div className="atelier-extras"><span>EXTRAS</span>{order.order_extras.map((extra) => <p key={extra.extra_id}>{extra.quantity}× {extra.extra_name}</p>)}</div>}
                </section>

                <aside className="atelier-payment">
                  <span>TOTAL</span>
                  <strong>{currency.format(Number(order.total_price))}</strong>
                  <p>Paiement en boutique</p>
                  <label className="atelier-paid-check">
                    <input type="checkbox" checked={order.payment_status === "paid"} disabled={updatingId === order.id} onChange={(event) => updateOrder(order.id, { paymentStatus: event.target.checked ? "paid" : "pending" })} />
                    <span>Payée : {order.payment_status === "paid" ? "oui" : "non"}</span>
                  </label>
                </aside>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
