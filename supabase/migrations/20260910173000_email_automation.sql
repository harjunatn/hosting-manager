alter table public.invoices
  add column if not exists billing_period_end date;

create unique index if not exists invoices_subscription_period_key
  on public.invoices (subscription_id, billing_period_end)
  where billing_period_end is not null
    and status <> 'VOID';

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  client_contact_id uuid references public.client_contacts (id) on delete set null,
  email_type text not null check (
    email_type in ('INVOICE', 'RENEWAL_REMINDER', 'DEACTIVATION_NOTICE')
  ),
  milestone_days integer,
  period_end date not null,
  recipient_email text not null,
  delivery_email text not null,
  subject text not null,
  provider text not null default 'RESEND',
  provider_message_id text,
  status text not null default 'QUEUED' check (
    status in (
      'QUEUED',
      'SENT',
      'DELIVERED',
      'OPENED',
      'BOUNCED',
      'FAILED',
      'COMPLAINED',
      'SUPPRESSED'
    )
  ),
  error_message text,
  event_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  bounced_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists email_deliveries_provider_message_key
  on public.email_deliveries (provider, provider_message_id)
  where provider_message_id is not null;

create unique index if not exists email_deliveries_invoice_recipient_key
  on public.email_deliveries (invoice_id, email_type, recipient_email)
  where email_type = 'INVOICE';

create unique index if not exists email_deliveries_reminder_key
  on public.email_deliveries (
    subscription_id,
    period_end,
    email_type,
    milestone_days,
    recipient_email
  )
  where email_type in ('RENEWAL_REMINDER', 'DEACTIVATION_NOTICE');

drop trigger if exists email_deliveries_updated_at on public.email_deliveries;
create trigger email_deliveries_updated_at
  before update on public.email_deliveries
  for each row execute function public.set_updated_at();

alter table public.email_deliveries enable row level security;

drop policy if exists email_deliveries_admin_all on public.email_deliveries;
create policy email_deliveries_admin_all on public.email_deliveries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
