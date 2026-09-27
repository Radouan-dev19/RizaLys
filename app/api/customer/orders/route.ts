import { CustomerAuthConfigurationError, getAuthenticatedCustomer } from "@/lib/customer-auth";
import { SupabaseConfigurationError, supabaseAdminFetch } from "@/lib/supabase-admin";

const orderSelect = [
  "id", "reference", "status", "delivery_date", "delivery_address", "wrapping_name",
  "total_price", "currency", "total_stems", "payment_method", "payment_status", "created_at",
  "order_flowers(flower_id,flower_name,quantity,unit_price,line_total)",
  "order_extras(extra_id,extra_name,quantity,unit_price,line_total)",
].join(",");

export async function GET() {
  try {
    const customer = await getAuthenticatedCustomer();
    if (!customer) {
      return Response.json({ error: "Connexion requise." }, { status: 401 });
    }

    const query = new URLSearchParams({
      select: orderSelect,
      customer_user_id: `eq.${customer.id}`,
      order: "created_at.desc",
    });
    const response = await supabaseAdminFetch(`/rest/v1/orders?${query}`);
    if (!response.ok) {
      console.error("Customer orders fetch failed", response.status, await response.text());
      return Response.json({ error: "Impossible de charger vos commandes." }, { status: 502 });
    }
    return Response.json(
      { orders: await response.json() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof CustomerAuthConfigurationError || error instanceof SupabaseConfigurationError) {
      return Response.json({ error: "L’espace client n’est pas encore configuré." }, { status: 503 });
    }
    console.error("Customer orders route failed", error);
    return Response.json({ error: "Impossible de charger vos commandes." }, { status: 500 });
  }
}
