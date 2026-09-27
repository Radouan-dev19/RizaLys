export const ORDER_STATUSES = ["received", "confirmed", "preparing", "ready", "completed", "cancelled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Reçue",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  completed: "Terminée",
  cancelled: "Annulée",
};

export type BackofficeOrder = {
  id: string;
  reference: string;
  status: OrderStatus;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  delivery_date: string;
  delivery_address: string | null;
  customer_notes: string | null;
  wrapping_name: string;
  total_price: number;
  currency: string;
  total_stems: number;
  payment_method: "in_store";
  payment_status: "pending" | "paid";
  created_at: string;
  order_flowers: Array<{
    flower_id: string;
    flower_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  order_extras: Array<{
    extra_id: string;
    extra_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
};

export type CustomerOrder = Omit<
  BackofficeOrder,
  "customer_first_name" | "customer_last_name" | "customer_phone" | "customer_notes"
>;
