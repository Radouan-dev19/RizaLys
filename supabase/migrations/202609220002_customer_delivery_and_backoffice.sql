-- Customer delivery details and in-store payment workflow for RizaLys orders.

alter table public.orders add column if not exists customer_first_name text;
alter table public.orders add column if not exists customer_last_name text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists customer_notes text;
alter table public.orders add column if not exists payment_method text not null default 'in_store';
alter table public.orders add column if not exists payment_status text not null default 'pending';

alter table public.orders
  add constraint orders_payment_method_check check (payment_method = 'in_store');
alter table public.orders
  add constraint orders_payment_status_check check (payment_status in ('pending', 'paid'));
alter table public.orders
  add constraint orders_delivery_address_requires_payment check (delivery_address is null or payment_status = 'paid');

create index if not exists orders_delivery_date_status_idx
  on public.orders(delivery_date, status);

create or replace function public.create_order(
  p_order jsonb,
  p_flowers jsonb,
  p_extras jsonb default '[]'::jsonb
)
returns table (
  created_order_id uuid,
  order_reference text,
  order_total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_reference text;
  v_flower_total numeric(10, 2);
  v_extras_total numeric(10, 2);
  v_wrapping_price numeric(10, 2);
  v_total numeric(10, 2);
  v_total_stems integer;
  v_extra_count integer;
  v_existing public.orders%rowtype;
begin
  if jsonb_typeof(p_flowers) <> 'array' or jsonb_array_length(p_flowers) = 0 then
    raise exception 'At least one flower is required';
  end if;

  select * into v_existing
  from public.orders
  where client_request_id = (p_order->>'client_request_id')::uuid;

  if found then
    return query select v_existing.id, v_existing.reference, v_existing.total_price;
    return;
  end if;

  select
    coalesce(sum((item->>'quantity')::integer * (item->>'unit_price')::numeric), 0),
    coalesce(sum((item->>'quantity')::integer), 0)
  into v_flower_total, v_total_stems
  from jsonb_array_elements(p_flowers) as item;

  select
    coalesce(sum((item->>'quantity')::integer * (item->>'unit_price')::numeric), 0),
    coalesce(sum((item->>'quantity')::integer), 0)
  into v_extras_total, v_extra_count
  from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) as item;

  if v_total_stems <= 0 then raise exception 'Flower quantities must be positive'; end if;
  if nullif(trim(p_order->>'customer_first_name'), '') is null
    or nullif(trim(p_order->>'customer_last_name'), '') is null
    or nullif(trim(p_order->>'customer_phone'), '') is null
    or nullif(trim(p_order->>'delivery_date'), '') is null then
    raise exception 'Customer and delivery details are required';
  end if;

  v_wrapping_price := coalesce((p_order->>'wrapping_price')::numeric, 0);
  v_total := v_flower_total + v_extras_total + v_wrapping_price;
  v_reference := 'RZ-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));

  insert into public.orders (
    id, client_request_id, reference, wrapping_id, wrapping_name, wrapping_price,
    flower_subtotal, extras_subtotal, total_price, currency, total_stems,
    total_items, selection_snapshot, customer_first_name, customer_last_name,
    customer_phone, delivery_date, delivery_address, customer_notes,
    payment_method, payment_status
  ) values (
    v_order_id,
    (p_order->>'client_request_id')::uuid,
    v_reference,
    p_order->>'wrapping_id',
    p_order->>'wrapping_name',
    v_wrapping_price,
    v_flower_total,
    v_extras_total,
    v_total,
    'EUR',
    v_total_stems,
    v_total_stems + v_extra_count,
    jsonb_build_object('paper', p_order, 'flowers', p_flowers, 'extras', coalesce(p_extras, '[]'::jsonb)),
    trim(p_order->>'customer_first_name'),
    trim(p_order->>'customer_last_name'),
    trim(p_order->>'customer_phone'),
    (p_order->>'delivery_date')::date,
    null,
    nullif(trim(p_order->>'customer_notes'), ''),
    'in_store',
    'pending'
  );

  insert into public.order_flowers (order_id, flower_id, flower_name, quantity, unit_price)
  select v_order_id, item->>'flower_id', item->>'flower_name', (item->>'quantity')::integer, (item->>'unit_price')::numeric
  from jsonb_array_elements(p_flowers) as item;

  insert into public.order_extras (order_id, extra_id, extra_name, quantity, unit_price)
  select v_order_id, item->>'extra_id', item->>'extra_name', (item->>'quantity')::integer, (item->>'unit_price')::numeric
  from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) as item;

  return query select v_order_id, v_reference, v_total;
end;
$$;

revoke all on function public.create_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb) to service_role;
