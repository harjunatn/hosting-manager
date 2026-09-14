alter table public.payments
  add column payment_source text not null default 'CLIENT_RECEIPT'
    check (payment_source in ('CLIENT_RECEIPT', 'ADMIN_MANUAL')),
  add column external_payment_id text;

create unique index payments_external_payment_id_unique
  on public.payments (external_payment_id)
  where external_payment_id is not null;

drop policy if exists payments_client_insert on public.payments;
create policy payments_client_insert on public.payments
  for insert to authenticated
  with check (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION')
    and payment_source = 'CLIENT_RECEIPT'
    and external_payment_id is null
  );

drop policy if exists payments_client_update on public.payments;
create policy payments_client_update on public.payments
  for update to authenticated
  using (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION', 'REJECTED')
  )
  with check (
    client_id = public.current_client_id()
    and status in ('PENDING', 'PENDING_VERIFICATION')
    and payment_source = 'CLIENT_RECEIPT'
    and external_payment_id is null
  );

create or replace function public.mark_invoice_paid(
  p_invoice_id uuid,
  p_external_payment_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_sub public.subscriptions%rowtype;
  v_payment_id uuid;
  v_payment_source text;
  v_new_start date;
  v_new_end date;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if p_external_payment_id is null or length(trim(p_external_payment_id)) = 0 then
    raise exception 'external payment id is required';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'invoice not found';
  end if;

  select id into v_payment_id
  from public.payments
  where invoice_id = p_invoice_id
    and status = 'PAID'
  limit 1;

  if found and v_invoice.status = 'PAID' then
    return v_payment_id;
  end if;

  if v_invoice.status <> 'SENT' then
    raise exception 'only sent invoices can be marked paid';
  end if;

  if v_payment_id is not null then
    raise exception 'invoice has a paid payment but is not marked paid';
  end if;

  select * into v_sub
  from public.subscriptions
  where id = v_invoice.subscription_id
  for update;

  if not found then
    raise exception 'subscription not found';
  end if;

  if v_invoice.billing_period_end is not null
    and v_invoice.billing_period_end <> v_sub.current_period_end then
    raise exception 'invoice is for an outdated subscription period';
  end if;

  v_new_end := (v_sub.current_period_end + interval '1 year')::date;
  v_new_start := (v_sub.current_period_end + interval '1 day')::date;

  select id into v_payment_id
  from public.payments
  where invoice_id = p_invoice_id
    and status = 'PENDING_VERIFICATION'
  order by created_at desc
  limit 1
  for update;

  if found then
    v_payment_source := 'CLIENT_RECEIPT';
    update public.payments
    set
      status = 'PAID',
      external_payment_id = trim(p_external_payment_id),
      verified_at = now(),
      verified_by = auth.uid(),
      rejection_reason = null
    where id = v_payment_id;
  else
    v_payment_source := 'ADMIN_MANUAL';
    insert into public.payments (
      invoice_id,
      client_id,
      payment_method,
      amount,
      currency,
      status,
      payment_source,
      external_payment_id,
      submitted_at,
      verified_at,
      verified_by
    )
    values (
      v_invoice.id,
      v_invoice.client_id,
      'BANK_TRANSFER',
      v_invoice.total,
      v_invoice.currency,
      'PAID',
      v_payment_source,
      trim(p_external_payment_id),
      now(),
      now(),
      auth.uid()
    )
    returning id into v_payment_id;
  end if;

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
      v_payment_id,
      'PAYMENT_CONFIRMED',
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'source', v_payment_source,
        'external_payment_id', trim(p_external_payment_id)
      )
    ),
    (
      auth.uid(),
      'subscription',
      v_sub.id,
      'SUBSCRIPTION_RENEWED',
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'payment_id', v_payment_id,
        'source', v_payment_source,
        'previous_period_end', v_sub.current_period_end,
        'current_period_start', v_new_start,
        'current_period_end', v_new_end
      )
    );

  return v_payment_id;
end;
$$;

revoke all on function public.mark_invoice_paid(uuid, text) from public;
grant execute on function public.mark_invoice_paid(uuid, text) to authenticated;
