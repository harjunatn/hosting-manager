alter table public.clients
  add column if not exists zoho_contact_id text;

create unique index if not exists clients_zoho_contact_id_key
  on public.clients (zoho_contact_id)
  where zoho_contact_id is not null;

create unique index if not exists invoices_zoho_external_id_key
  on public.invoices (provider, external_invoice_id)
  where provider = 'ZOHO_BOOKS'
    and external_invoice_id is not null;
