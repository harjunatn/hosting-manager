alter table public.invoices
  add column if not exists external_quotation_id text,
  add column if not exists quotation_number text,
  add column if not exists quotation_url text;

create unique index if not exists invoices_zoho_external_quotation_id_key
  on public.invoices (provider, external_quotation_id)
  where provider = 'ZOHO_BOOKS'
    and external_quotation_id is not null;

create table if not exists public.billing_document_locks (
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  period_end date not null,
  created_at timestamptz not null default now(),
  primary key (subscription_id, period_end)
);

alter table public.billing_document_locks enable row level security;

drop policy if exists billing_document_locks_admin_all
  on public.billing_document_locks;
create policy billing_document_locks_admin_all
  on public.billing_document_locks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
