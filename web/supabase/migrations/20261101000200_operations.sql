-- ============================================================================
-- Operations core: customers, products, orders, shipments, labels, tracking,
-- evidence. RLS policies for these tables live in 20261101000500_rls.sql.
--
-- Cross-tenant integrity: child tables reference parents through composite
-- foreign keys (parent_id, organization_id) so a row can never point at a
-- parent that belongs to another organization.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  channel text not null default 'MANUAL',
  external_ref text,
  display_name text not null check (char_length(display_name) between 1 and 200),
  email text,
  phone text,
  risk_flags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id)
);
create unique index customers_external_ref_uq on public.customers (organization_id, channel, external_ref)
  where external_ref is not null;
create trigger customers_updated_at before update on public.customers
  for each row execute function app.set_updated_at();

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid not null,
  kind text not null default 'SHIPPING' check (kind in ('SHIPPING', 'BILLING')),
  recipient_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country char(2) not null default 'US',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id) references public.customers (id, organization_id) on delete cascade
);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id);
create trigger customer_addresses_updated_at before update on public.customer_addresses
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 100),
  name text not null check (char_length(name) between 1 and 300),
  description text,
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  currency char(3),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  bin_location text, -- where an employee physically finds the product
  image_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  unique (organization_id, sku)
);
create trigger products_updated_at before update on public.products
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Integration connections (declared here because orders reference them).
-- Credentials are NEVER stored here — only a reference (credentials_ref) to a
-- secret held in the environment / secret manager.
-- ---------------------------------------------------------------------------
create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null check (provider ~ '^[A-Z0-9_]+$'),
  kind text not null check (kind in ('COMMERCE_CHANNEL', 'CARRIER', 'NOTIFICATION', 'OTHER')),
  display_name text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED')),
  is_mock boolean not null default false,
  external_account_id text,
  credentials_ref text check (credentials_ref is null or credentials_ref ~ '^[A-Z0-9_]+$'),
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id)
);
create trigger integration_connections_updated_at before update on public.integration_connections
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders + controlled lifecycle
-- ---------------------------------------------------------------------------

-- Structural legality of order status transitions. Role- and guard-based rules
-- live in src/core/orders/state-machine.ts; this function is the database
-- backstop so no code path (or bug) can make an illegal jump such as
-- NEW -> SHIPPED. Keep in sync with ORDER_TRANSITIONS (a test enforces parity).
create or replace function app.is_valid_order_transition(from_status text, to_status text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (from_status, to_status) in (
    ('NEW', 'VERIFIED'),
    ('NEW', 'CANCELLED'),
    ('VERIFIED', 'READY_TO_PACK'),
    ('VERIFIED', 'CANCELLED'),
    ('READY_TO_PACK', 'PACKING'),
    ('READY_TO_PACK', 'CANCELLED'),
    ('PACKING', 'LABEL_READY'),
    ('PACKING', 'READY_TO_PACK'),
    ('PACKING', 'CANCELLED'),
    ('LABEL_READY', 'PACKED'),
    ('LABEL_READY', 'PACKING'),
    ('LABEL_READY', 'CANCELLED'),
    ('PACKED', 'AWAITING_VERIFICATION'),
    ('PACKED', 'PACKING'),
    ('PACKED', 'CANCELLED'),
    ('AWAITING_VERIFICATION', 'READY_TO_SHIP'),
    ('AWAITING_VERIFICATION', 'PACKING'),
    ('AWAITING_VERIFICATION', 'CANCELLED'),
    ('READY_TO_SHIP', 'SHIPPED'),
    ('READY_TO_SHIP', 'AWAITING_VERIFICATION'),
    ('READY_TO_SHIP', 'CANCELLED'),
    ('SHIPPED', 'DELIVERED')
  )
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_number text not null check (char_length(order_number) between 1 and 64),
  channel text not null default 'MANUAL' check (channel ~ '^[A-Z0-9_]+$'),
  external_order_id text,
  integration_connection_id uuid,
  customer_id uuid,
  shipping_address_id uuid,
  status text not null default 'NEW' check (status in (
    'NEW', 'VERIFIED', 'READY_TO_PACK', 'PACKING', 'LABEL_READY', 'PACKED',
    'AWAITING_VERIFICATION', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  )),
  status_changed_at timestamptz not null default now(),
  -- Exception overlay: derived from open exceptions; never replaces `status`.
  exception_state text check (exception_state is null or exception_state in (
    'ACTION_REQUIRED', 'AT_RISK', 'TRACKING_ISSUE', 'LABEL_ISSUE',
    'CARRIER_ISSUE', 'CUSTOMER_ISSUE', 'REFUND_RISK'
  )),
  risk_level text not null default 'NONE' check (risk_level in ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  placed_at timestamptz not null default now(),
  ship_by_at timestamptz,
  deliver_by_at timestamptz,
  verified_at timestamptz,
  ready_to_ship_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  currency char(3),
  -- Monetary amounts are nullable on purpose: never invent revenue.
  subtotal_amount numeric(12, 2) check (subtotal_amount is null or subtotal_amount >= 0),
  shipping_amount numeric(12, 2) check (shipping_amount is null or shipping_amount >= 0),
  tax_amount numeric(12, 2) check (tax_amount is null or tax_amount >= 0),
  total_amount numeric(12, 2) check (total_amount is null or total_amount >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  unique (organization_id, order_number),
  check (total_amount is null or currency is not null),
  foreign key (customer_id, organization_id) references public.customers (id, organization_id),
  foreign key (shipping_address_id, organization_id) references public.customer_addresses (id, organization_id),
  foreign key (integration_connection_id, organization_id) references public.integration_connections (id, organization_id)
);
create unique index orders_external_uq on public.orders (organization_id, channel, external_order_id)
  where external_order_id is not null;
create index orders_org_status_idx on public.orders (organization_id, status);
create index orders_org_ship_by_idx on public.orders (organization_id, ship_by_at)
  where status not in ('SHIPPED', 'DELIVERED', 'CANCELLED');
create index orders_org_placed_idx on public.orders (organization_id, placed_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function app.set_updated_at();

create or replace function app.enforce_order_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status not in ('NEW', 'VERIFIED') and coalesce(current_setting('app.allow_status_import', true), '') <> 'on' then
      raise exception 'Orders must be created in NEW or VERIFIED status (got %)', new.status
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not app.is_valid_order_transition(old.status, new.status) then
      raise exception 'Illegal order status transition % -> %', old.status, new.status
        using errcode = '23514';
    end if;
    new.status_changed_at := now();
    case new.status
      when 'VERIFIED' then new.verified_at := coalesce(new.verified_at, now());
      when 'READY_TO_SHIP' then new.ready_to_ship_at := now();
      when 'SHIPPED' then new.shipped_at := coalesce(new.shipped_at, now());
      when 'DELIVERED' then new.delivered_at := coalesce(new.delivered_at, now());
      when 'CANCELLED' then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;
  return new;
end
$$;
create trigger orders_enforce_transition before insert or update of status on public.orders
  for each row execute function app.enforce_order_transition();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  sku text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  external_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  foreign key (product_id, organization_id) references public.products (id, organization_id)
);
create index order_items_order_idx on public.order_items (order_id);
create trigger order_items_updated_at before update on public.order_items
  for each row execute function app.set_updated_at();

-- ---------------------------------------------------------------------------
-- Shipments, labels, tracking
-- ---------------------------------------------------------------------------
create or replace function app.normalize_tracking(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(regexp_replace(coalesce(raw, ''), '[^A-Za-z0-9]', '', 'g')), '')
$$;

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  carrier text check (carrier is null or carrier ~ '^[A-Z0-9_]+$'),
  -- Carrier the platform/buyer expects; compared with `carrier` during verification.
  expected_carrier text check (expected_carrier is null or expected_carrier ~ '^[A-Z0-9_]+$'),
  service_level text,
  tracking_number text,
  tracking_number_normalized text generated always as (app.normalize_tracking(tracking_number)) stored,
  status text not null default 'PENDING' check (status in (
    'PENDING', 'LABEL_READY', 'PACKED', 'READY_TO_SHIP', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED'
  )),
  verification_status text not null default 'UNVERIFIED' check (verification_status in (
    'UNVERIFIED', 'VERIFIED', 'MISMATCH', 'AWAITING_CARRIER', 'CARRIER_ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION'
  )),
  verification_checks jsonb not null default '[]'::jsonb,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  ship_by_at timestamptz,
  -- Only ever set from carrier/platform data, never from an employee claim.
  carrier_accepted_at timestamptz,
  delivered_at timestamptz,
  weight_grams integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade
);
create index shipments_order_idx on public.shipments (order_id);
-- Deliberately NOT unique: imported platform data can contain duplicates and
-- the verification engine must be able to detect and flag them.
create index shipments_tracking_idx on public.shipments (organization_id, tracking_number_normalized)
  where tracking_number_normalized is not null;
create trigger shipments_updated_at before update on public.shipments
  for each row execute function app.set_updated_at();

create table public.shipping_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  shipment_id uuid not null,
  order_id uuid not null,
  source text not null check (source in ('PLATFORM', 'CARRIER', 'MANUAL', 'MOCK')),
  carrier text,
  tracking_number text,
  tracking_number_normalized text generated always as (app.normalize_tracking(tracking_number)) stored,
  -- Value encoded in the printed barcode; what a scanner returns.
  barcode_value text,
  label_format text check (label_format is null or label_format in ('PDF', 'PNG', 'ZPL')),
  storage_bucket text,
  storage_path text,
  external_label_id text,
  status text not null default 'READY' check (status in ('PENDING', 'READY', 'PRINTED', 'VOIDED', 'SUPERSEDED')),
  retrieved_at timestamptz,
  retrieved_by uuid references public.profiles (id) on delete set null,
  printed_at timestamptz,
  printed_by uuid references public.profiles (id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  unique (id, organization_id),
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade,
  foreign key (order_id, organization_id) references public.orders (id, organization_id) on delete cascade,
  check (storage_path is null or storage_path like organization_id::text || '/%')
);
-- At most one active label per shipment.
create unique index shipping_labels_one_active_uq on public.shipping_labels (shipment_id)
  where status in ('PENDING', 'READY', 'PRINTED');
create index shipping_labels_tracking_idx on public.shipping_labels (organization_id, tracking_number_normalized);
create index shipping_labels_barcode_idx on public.shipping_labels (organization_id, barcode_value);
create trigger shipping_labels_updated_at before update on public.shipping_labels
  for each row execute function app.set_updated_at();

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  shipment_id uuid not null,
  carrier text,
  tracking_number text,
  normalized_status text not null check (normalized_status in (
    'LABEL_CREATED', 'ACCEPTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
    'EXCEPTION', 'RETURNED', 'UNKNOWN'
  )),
  event_code text,
  description text,
  location text,
  occurred_at timestamptz not null,
  -- Provenance matters: MANUAL events never count as carrier confirmation.
  source text not null check (source in ('CARRIER_API', 'PLATFORM', 'WEBHOOK', 'MANUAL', 'MOCK')),
  external_event_id text,
  raw jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  foreign key (shipment_id, organization_id) references public.shipments (id, organization_id) on delete cascade
);
create unique index tracking_events_dedupe_uq on public.tracking_events (shipment_id, source, external_event_id)
  where external_event_id is not null;
create index tracking_events_shipment_idx on public.tracking_events (shipment_id, occurred_at desc);
