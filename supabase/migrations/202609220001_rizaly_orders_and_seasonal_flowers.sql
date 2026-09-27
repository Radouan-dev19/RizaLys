-- RizaLys commerce database. Apply this migration only to the dedicated
-- Supabase project named "rizaly", never to the questionnaire project.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  reference text not null unique,
  status text not null default 'received'
    check (status in ('received', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  wrapping_id text not null,
  wrapping_name text not null,
  wrapping_price numeric(10, 2) not null default 0 check (wrapping_price >= 0),
  flower_subtotal numeric(10, 2) not null check (flower_subtotal >= 0),
  extras_subtotal numeric(10, 2) not null default 0 check (extras_subtotal >= 0),
  total_price numeric(10, 2) not null check (total_price >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),
  total_stems integer not null check (total_stems > 0),
  total_items integer not null check (total_items > 0),
  selection_snapshot jsonb not null,
  atelier_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_flowers (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  flower_id text not null,
  flower_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.order_extras (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  extra_id text not null,
  extra_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.seasonal_flowers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  variety text,
  active_months smallint[] not null default '{}'
    check (active_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  available_in_store boolean not null default false,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  unit_price numeric(10, 2) check (unit_price is null or unit_price >= 0),
  needs_image_generation boolean not null default true,
  image_prompt text,
  image_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_created_at_idx on public.orders(status, created_at desc);
create index if not exists order_flowers_order_id_idx on public.order_flowers(order_id);
create index if not exists order_extras_order_id_idx on public.order_extras(order_id);
create index if not exists seasonal_flowers_available_idx
  on public.seasonal_flowers(available_in_store, needs_image_generation);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists seasonal_flowers_set_updated_at on public.seasonal_flowers;
create trigger seasonal_flowers_set_updated_at
before update on public.seasonal_flowers
for each row execute function public.set_updated_at();

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

  if v_total_stems <= 0 then
    raise exception 'Flower quantities must be positive';
  end if;

  v_wrapping_price := coalesce((p_order->>'wrapping_price')::numeric, 0);
  v_total := v_flower_total + v_extras_total + v_wrapping_price;
  v_reference := 'RZ-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_order_id::text, '-', ''), 1, 8));

  insert into public.orders (
    id, client_request_id, reference, wrapping_id, wrapping_name, wrapping_price,
    flower_subtotal, extras_subtotal, total_price, currency, total_stems,
    total_items, selection_snapshot
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
    jsonb_build_object('paper', p_order, 'flowers', p_flowers, 'extras', coalesce(p_extras, '[]'::jsonb))
  );

  insert into public.order_flowers (order_id, flower_id, flower_name, quantity, unit_price)
  select
    v_order_id,
    item->>'flower_id',
    item->>'flower_name',
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric
  from jsonb_array_elements(p_flowers) as item;

  insert into public.order_extras (order_id, extra_id, extra_name, quantity, unit_price)
  select
    v_order_id,
    item->>'extra_id',
    item->>'extra_name',
    (item->>'quantity')::integer,
    (item->>'unit_price')::numeric
  from jsonb_array_elements(coalesce(p_extras, '[]'::jsonb)) as item;

  return query select v_order_id, v_reference, v_total;
end;
$$;

alter table public.orders enable row level security;
alter table public.order_flowers enable row level security;
alter table public.order_extras enable row level security;
alter table public.seasonal_flowers enable row level security;

revoke all on function public.create_order(jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb) to service_role;

comment on table public.orders is 'Commandes de bouquets reçues depuis le site RizaLys.';
comment on table public.order_flowers is 'Détail des fleurs et quantités de chaque commande.';
comment on table public.order_extras is 'Petites attentions ajoutées à chaque commande.';
comment on table public.seasonal_flowers is 'Fleurs de saison et stock magasin, source de la future génération d’images.';
