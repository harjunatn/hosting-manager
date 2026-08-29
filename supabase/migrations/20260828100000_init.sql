-- Hosting subscription management schema, RLS, storage, and financial RPCs.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.user_role as enum ('ADMIN', 'CLIENT');
create type public.client_status as enum ('ACTIVE', 'INACTIVE');
create type public.hosting_status as enum ('ACTIVE', 'INACTIVE');
create type public.subscription_status as enum ('ACTIVE', 'CANCELLED');
create type public.invoice_status as enum ('DRAFT', 'SENT', 'PAID', 'VOID');
create type public.payment_status as enum (
  'PENDING',
  'PENDING_VERIFICATION',
  'PAID',
  'REJECTED'
);
create type public.payment_method as enum ('BANK_TRANSFER');
create type public.billing_interval as enum ('YEARLY');
create type public.currency_code as enum ('SGD', 'THB');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  billing_name text not null,
  billing_address text,
  country text,
  default_currency public.currency_code not null default 'SGD',
  status public.client_status not null default 'ACTIVE',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  is_primary boolean not null default false,
  receive_invoice boolean not null default true,
  receive_reminder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (user_id, client_id)
);

create table public.hosting_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  hosting_type text not null,
  project_url text,
  status public.hosting_status not null default 'ACTIVE',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  hosting_service_id uuid not null references public.hosting_services (id) on delete restrict,
  billing_interval public.billing_interval not null default 'YEARLY',
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  currency public.currency_code not null,
  start_date date not null,
  current_period_start date not null,
  current_period_end date not null,
  status public.subscription_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hosting_service_id)
);

create table public.invoice_sequences (
  year integer primary key,
  last_value integer not null default 0
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  invoice_number text not null unique,
  provider text not null,
  external_invoice_id text,
  issue_date date not null,
  due_date date not null,
  currency public.currency_code not null,
  subtotal numeric(12, 2) not null,
  total numeric(12, 2) not null,
  status public.invoice_status not null default 'DRAFT',
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null,
  amount numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete cascade,
  payment_method public.payment_method not null default 'BANK_TRANSFER',
  amount numeric(12, 2) not null,
  currency public.currency_code not null,
  status public.payment_status not null default 'PENDING',
  receipt_file_url text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payments_one_paid_per_invoice
  on public.payments (invoice_id)
  where status = 'PAID';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger client_contacts_updated_at
  before update on public.client_contacts
  for each row execute function public.set_updated_at();

create trigger hosting_services_updated_at
  before update on public.hosting_services
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id
  from public.client_users
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.allocate_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from timezone('utc', now()))::integer;
  next_val integer;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  insert into public.invoice_sequences as seq (year, last_value)
  values (y, 1)
  on conflict (year) do update
    set last_value = seq.last_value + 1
  returning last_value into next_val;

  return 'INV-' || y::text || '-' || lpad(next_val::text, 4, '0');
end;
$$;

create or replace function public.confirm_bank_transfer_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_invoice public.invoices%rowtype;
  v_sub public.subscriptions%rowtype;
  v_new_start date;
  v_new_end date;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into v_payment
  from public.payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'payment not found';
  end if;

  if v_payment.status <> 'PENDING_VERIFICATION' then
    raise exception 'payment is not pending verification';
  end if;

  select * into v_invoice
  from public.invoices
  where id = v_payment.invoice_id
  for update;

  if v_invoice.status = 'PAID' then
    raise exception 'invoice already paid';
  end if;

  if v_invoice.status = 'VOID' then
    raise exception 'invoice is void';
  end if;

  select * into v_sub
  from public.subscriptions
  where id = v_invoice.subscription_id
  for update;

  -- Expiry grows from the existing period end, never from the payment date.
  v_new_end := (v_sub.current_period_end + interval '1 year')::date;
  v_new_start := (v_sub.current_period_end + interval '1 day')::date;

  update public.payments
  set
    status = 'PAID',
    verified_at = now(),
    verified_by = auth.uid(),
    rejection_reason = null
  where id = p_payment_id;

  update public.invoices
  set status = 'PAID'
  where id = v_invoice.id;

  update public.subscriptions
  set
    current_period_start = v_new_start,
    current_period_end = v_new_end,
    status = 'ACTIVE'
  where id = v_sub.id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, metadata)
  values
    (
      auth.uid(),
      'payment',
      v_payment.id,
      'PAYMENT_CONFIRMED',
      jsonb_build_object('invoice_id', v_invoice.id)
    ),
    (
      auth.uid(),
      'subscription',
      v_sub.id,
      'SUBSCRIPTION_RENEWED',
      jsonb_build_object(
        'previous_period_end', v_sub.current_period_end,
        'current_period_start', v_new_start,
        'current_period_end', v_new_end
      )
    );
end;
$$;

create or replace function public.reject_bank_transfer_payment(
  p_payment_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'rejection reason is required';
  end if;

  update public.payments
  set
    status = 'REJECTED',
    rejection_reason = trim(p_reason),
    verified_at = null,
    verified_by = auth.uid()
  where id = p_payment_id
    and status = 'PENDING_VERIFICATION';

  if not found then
    raise exception 'payment is not pending verification';
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, metadata)
  values (
    auth.uid(),
    'payment',
    p_payment_id,
    'PAYMENT_REJECTED',
    jsonb_build_object('reason', trim(p_reason))
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_users enable row level security;
alter table public.hosting_services enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invoice_sequences enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy clients_admin_all on public.clients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy clients_client_select on public.clients
  for select to authenticated
  using (id = public.current_client_id());

create policy contacts_admin_all on public.client_contacts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy contacts_client_select on public.client_contacts
  for select to authenticated
  using (client_id = public.current_client_id());

create policy client_users_admin_all on public.client_users
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy client_users_self_select on public.client_users
  for select to authenticated
  using (user_id = auth.uid());

create policy hosting_admin_all on public.hosting_services
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy hosting_client_select on public.hosting_services
  for select to authenticated
  using (client_id = public.current_client_id());

create policy subscriptions_admin_all on public.subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy subscriptions_client_select on public.subscriptions
  for select to authenticated
  using (client_id = public.current_client_id());

create policy invoice_sequences_admin on public.invoice_sequences
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invoices_admin_all on public.invoices
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invoices_client_select on public.invoices
  for select to authenticated
  using (client_id = public.current_client_id());

create policy invoice_items_admin_all on public.invoice_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy invoice_items_client_select on public.invoice_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and i.client_id = public.current_client_id()
    )
  );

create policy payments_admin_all on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy payments_client_select on public.payments
  for select to authenticated
  using (client_id = public.current_client_id());

create policy payments_client_insert on public.payments
  for insert to authenticated
  with check (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION')
  );

create policy payments_client_update on public.payments
  for update to authenticated
  using (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION', 'REJECTED')
  )
  with check (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION')
  );

create policy audit_admin_select on public.audit_logs
  for select to authenticated
  using (public.is_admin());

create policy audit_insert_self on public.audit_logs
  for insert to authenticated
  with check (actor_user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy receipts_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_client_id()::text
    )
  );

create policy receipts_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_client_id()::text
    )
  );

create policy receipts_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_client_id()::text
    )
  )
  with check (
    bucket_id = 'payment-receipts'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.current_client_id()::text
    )
  );

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_client_id() to authenticated;
grant execute on function public.allocate_invoice_number() to authenticated;
grant execute on function public.confirm_bank_transfer_payment(uuid) to authenticated;
grant execute on function public.reject_bank_transfer_payment(uuid, text) to authenticated;
