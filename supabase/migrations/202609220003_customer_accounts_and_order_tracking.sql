-- Customer accounts and private order tracking for RizaLys.

alter table public.orders add column if not exists customer_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists customer_email text;

create index if not exists orders_customer_user_created_at_idx
  on public.orders(customer_user_id, created_at desc);

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
  v_customer_user_id uuid;
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

  v_customer_user_id := nullif(trim(p_order->>'customer_user_id'), '')::uuid;
  if v_customer_user_id is null
    or not exists (select 1 from auth.users where id = v_customer_user_id)
    or nullif(trim(p_order->>'customer_email'), '') is null then
    raise exception 'An authenticated customer is required';
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
    payment_method, payment_status, customer_user_id, customer_email
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
    'pending',
    v_customer_user_id,
    lower(trim(p_order->>'customer_email'))
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

grant select on public.orders, public.order_flowers, public.order_extras to authenticated;

drop policy if exists customers_read_own_orders on public.orders;
create policy customers_read_own_orders on public.orders
  for select to authenticated
  using (customer_user_id = auth.uid());

drop policy if exists customers_read_own_order_flowers on public.order_flowers;
create policy customers_read_own_order_flowers on public.order_flowers
  for select to authenticated
  using (exists (
    select 1 from public.orders
    where orders.id = order_flowers.order_id
      and orders.customer_user_id = auth.uid()
  ));

drop policy if exists customers_read_own_order_extras on public.order_extras;
create policy customers_read_own_order_extras on public.order_extras
  for select to authenticated
  using (exists (
    select 1 from public.orders
    where orders.id = order_extras.order_id
      and orders.customer_user_id = auth.uid()
  ));

comment on column public.orders.customer_user_id is 'Compte Supabase Auth propriétaire de la commande.';
comment on column public.orders.customer_email is 'Adresse e-mail du compte au moment de la commande.';
