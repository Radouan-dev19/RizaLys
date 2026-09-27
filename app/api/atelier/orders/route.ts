import { isBackofficeAuthenticated, requestHasSameOrigin } from "@/lib/backoffice-auth";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-types";
import { SupabaseConfigurationError, supabaseAdminFetch } from "@/lib/supabase-admin";

const orderSelect = [
  "id", "reference", "status", "customer_first_name", "customer_last_name", "customer_phone",
  "delivery_date", "delivery_address", "customer_notes", "wrapping_name", "total_price", "currency",
  "total_stems", "payment_method", "payment_status", "created_at",
  "order_flowers(flower_id,flower_name,quantity,unit_price,line_total)",
  "order_extras(extra_id,extra_name,quantity,unit_price,line_total)",
].join(",");

function configurationResponse(error: unknown) {
  if (error instanceof SupabaseConfigurationError) {
    return Response.json({ error: "La base RizaLys n’est pas encore connectée." }, { status: 503 });
  }
  console.error("Back-office orders request failed", error);
  return Response.json({ error: "Impossible de charger les commandes." }, { status: 500 });
}

export async function GET() {
  if (!await isBackofficeAuthenticated()) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const query = new URLSearchParams({
      select: orderSelect,
      order: "delivery_date.asc,created_at.desc",
    });
    const response = await supabaseAdminFetch(`/rest/v1/orders?${query}`);
    if (!response.ok) {
      console.error("Supabase orders fetch failed", response.status, await response.text());
      return Response.json({ error: "Impossible de charger les commandes." }, { status: 502 });
    }
    return Response.json({ orders: await response.json() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return configurationResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!requestHasSameOrigin(request)) {
    return Response.json({ error: "Requête refusée." }, { status: 403 });
  }
  if (!await isBackofficeAuthenticated()) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json() as { id?: unknown; status?: unknown; paymentStatus?: unknown; deliveryAddress?: unknown };
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) {
      return Response.json({ error: "Commande invalide." }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    if (body.status !== undefined) {
      if (typeof body.status !== "string" || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
        return Response.json({ error: "Statut invalide." }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (body.paymentStatus !== undefined) {
      if (body.paymentStatus !== "pending" && body.paymentStatus !== "paid") {
        return Response.json({ error: "État du paiement invalide." }, { status: 400 });
      }
      updates.payment_status = body.paymentStatus;
      if (body.paymentStatus === "pending") updates.delivery_address = null;
    }

    if (body.deliveryAddress !== undefined) {
      if (body.paymentStatus !== "paid") {
        return Response.json({ error: "Le lieu de livraison ne peut être enregistré qu’après le paiement." }, { status: 400 });
      }
      if (typeof body.deliveryAddress !== "string" || body.deliveryAddress.trim().length < 5 || body.deliveryAddress.trim().length > 300) {
        return Response.json({ error: "Le lieu de livraison est invalide." }, { status: 400 });
      }
      updates.delivery_address = body.deliveryAddress.trim();
    }

    if (!Object.keys(updates).length) {
      return Response.json({ error: "Aucune modification à enregistrer." }, { status: 400 });
    }

    const response = await supabaseAdminFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(body.id)}&select=${encodeURIComponent(orderSelect)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      console.error("Supabase order update failed", response.status, await response.text());
      return Response.json({ error: "La commande n’a pas pu être mise à jour." }, { status: 502 });
    }

    const orders = await response.json() as unknown[];
    return Response.json({ order: orders[0] });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "Requête invalide." }, { status: 400 });
    }
    return configurationResponse(error);
  }
}
