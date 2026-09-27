import { EXTRA_BY_ID, EXTRAS, FLOWERS, WRAP_BY_ID, type ExtraId, type WrapId } from "@/data/catalog";
import { CustomerAuthConfigurationError, getAuthenticatedCustomer } from "@/lib/customer-auth";
import { SupabaseConfigurationError, supabaseAdminFetch } from "@/lib/supabase-admin";

type UnknownRecord = Record<string, unknown>;

class InvalidOrderError extends Error {}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function selectedQuantity(value: unknown, flowerName: string) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) {
    throw new InvalidOrderError(`La quantité choisie pour « ${flowerName} » est invalide.`);
  }
  return value;
}

function requiredText(value: unknown, label: string, minimum: number, maximum: number) {
  if (typeof value !== "string") throw new InvalidOrderError(`${label} est requis.`);
  const text = value.trim();
  if (text.length < minimum || text.length > maximum) throw new InvalidOrderError(`${label} est invalide.`);
  return text;
}

export async function POST(request: Request) {
  try {
    const authenticatedCustomer = await getAuthenticatedCustomer();
    if (!authenticatedCustomer) {
      return Response.json({ error: "Connectez-vous à votre compte pour valider et suivre votre commande." }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (!isRecord(body) || !isRecord(body.flowers) || !isRecord(body.extras) || !isRecord(body.customer)) {
      throw new InvalidOrderError("La sélection envoyée est incomplète.");
    }
    const selectedFlowers = body.flowers;
    const selectedExtras = body.extras;
    const customer = body.customer;

    const firstName = requiredText(customer.firstName, "Le prénom", 2, 80);
    const lastName = requiredText(customer.lastName, "Le nom", 2, 80);
    const phone = requiredText(customer.phone, "Le numéro de téléphone", 8, 20);
    if (!/^[+0-9().\s-]+$/.test(phone)) throw new InvalidOrderError("Le numéro de téléphone est invalide.");
    const deliveryDate = requiredText(customer.deliveryDate, "La date de livraison", 10, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) || Number.isNaN(Date.parse(`${deliveryDate}T12:00:00Z`))) {
      throw new InvalidOrderError("La date de livraison est invalide.");
    }
    if (deliveryDate < new Date().toISOString().slice(0, 10)) {
      throw new InvalidOrderError("La date de livraison ne peut pas être dans le passé.");
    }
    const customerNotes = typeof customer.notes === "string" ? customer.notes.trim() : "";
    if (customerNotes.length > 500) throw new InvalidOrderError("La note de livraison est trop longue.");

    if (typeof body.wrap !== "string" || !(body.wrap in WRAP_BY_ID)) {
      throw new InvalidOrderError("Veuillez choisir un papier d’emballage.");
    }

    const wrap = WRAP_BY_ID[body.wrap as WrapId];
    const flowers = FLOWERS.flatMap((flower) => {
      const quantity = selectedQuantity(selectedFlowers[flower.id], flower.name);
      return quantity > 0 ? [{
        flower_id: flower.id,
        flower_name: flower.name,
        quantity,
        unit_price: flower.price,
      }] : [];
    });

    if (!flowers.length) {
      throw new InvalidOrderError("Ajoutez au moins une fleur avant de valider la sélection.");
    }

    const extras = EXTRAS.flatMap((extra) => {
      const selected = selectedExtras[extra.id];
      if (typeof selected !== "boolean") {
        throw new InvalidOrderError(`La sélection de l’extra « ${extra.name} » est invalide.`);
      }
      return selected ? [{
        extra_id: extra.id as ExtraId,
        extra_name: EXTRA_BY_ID[extra.id].name,
        quantity: 1,
        unit_price: extra.price,
      }] : [];
    });

    const flowerSubtotal = flowers.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const extrasSubtotal = extras.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const totalPrice = flowerSubtotal + extrasSubtotal + wrap.price;
    const clientRequestId = crypto.randomUUID();
    const supabaseResponse = await supabaseAdminFetch("/rest/v1/rpc/create_order", {
      method: "POST",
      body: JSON.stringify({
        p_order: {
          client_request_id: clientRequestId,
          wrapping_id: wrap.id,
          wrapping_name: wrap.name,
          wrapping_price: wrap.price,
          flower_subtotal: flowerSubtotal,
          extras_subtotal: extrasSubtotal,
          total_price: totalPrice,
          currency: "EUR",
          customer_first_name: firstName,
          customer_last_name: lastName,
          customer_phone: phone,
          customer_user_id: authenticatedCustomer.id,
          customer_email: authenticatedCustomer.email,
          delivery_date: deliveryDate,
          customer_notes: customerNotes || null,
          payment_method: "in_store",
          payment_status: "pending",
        },
        p_flowers: flowers,
        p_extras: extras,
      }),
      cache: "no-store",
    });

    if (!supabaseResponse.ok) {
      const details = await supabaseResponse.text();
      console.error("Supabase order creation failed", supabaseResponse.status, details);
      return Response.json({ error: "La commande n’a pas pu être enregistrée. Réessayez dans un instant." }, { status: 502 });
    }

    const result: unknown = await supabaseResponse.json();
    const order = Array.isArray(result) ? result[0] : result;
    if (!isRecord(order) || typeof order.order_reference !== "string") {
      console.error("Unexpected create_order response", result);
      return Response.json({ error: "La réponse du service de commande est invalide." }, { status: 502 });
    }

    return Response.json({
      orderId: order.created_order_id,
      reference: order.order_reference,
      total: order.order_total,
      currency: "EUR",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidOrderError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof SupabaseConfigurationError || error instanceof CustomerAuthConfigurationError) {
      return Response.json({ error: "Votre commande ne peut pas être enregistrée pour le moment. Merci de contacter la boutique." }, { status: 503 });
    }
    if (error instanceof TypeError && error.message === "fetch failed") {
      console.error("Supabase order service is unreachable", error.cause ?? error);
      return Response.json({ error: "Le service de commande est temporairement indisponible. Réessayez dans un instant." }, { status: 503 });
    }
    console.error("Order route failed", error);
    return Response.json({ error: "Une erreur inattendue empêche la validation de la commande." }, { status: 500 });
  }
}
