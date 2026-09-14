-- Daily renewal reminders via Supabase Cron.
-- Secrets stay in Vault; this migration never stores production values.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_renewal_reminders_cron()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault, net
as $$
declare
  app_base_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into app_base_url
  from vault.decrypted_secrets
  where name = 'app_base_url'
  limit 1;

  select decrypted_secret
    into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if app_base_url is null or btrim(app_base_url) = '' then
    raise exception
      'Vault secret app_base_url is missing. Create it before enabling the renewal reminder cron.';
  end if;

  if cron_secret is null or btrim(cron_secret) = '' then
    raise exception
      'Vault secret cron_secret is missing. Create it before enabling the renewal reminder cron.';
  end if;

  select net.http_get(
    url := rtrim(app_base_url, '/') || '/api/cron/renewal-reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || cron_secret,
      'Content-Type',
      'application/json'
    ),
    timeout_milliseconds := 60000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_renewal_reminders_cron() from public;
grant execute on function public.invoke_renewal_reminders_cron() to postgres;

-- Replace any previous schedule with a single named daily job at 00:00 UTC
-- (08:00 Singapore).
do $$
declare
  existing_job_id bigint;
begin
  select j.jobid
    into existing_job_id
  from cron.job j
  where j.jobname = 'renewal-reminders-daily'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'renewal-reminders-daily',
    '0 0 * * *',
    $cron$select public.invoke_renewal_reminders_cron();$cron$
  );
end;
$$;
