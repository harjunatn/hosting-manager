-- Seed auth users, spreadsheet-inspired clients, and a THB example.
-- Passwords for every seed login: password123
-- Safe to re-run: existing rows are skipped / upserted.

create extension if not exists pgcrypto with schema extensions;

-- Admin
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Admin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@example.com"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- JW Marriott portal user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'shiying@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Shiying"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"shiying@example.com"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000002',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- Morganfield's portal user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000003',
  'authenticated',
  'authenticated',
  'bran@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Bran"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000003',
  '{"sub":"00000000-0000-0000-0000-000000000003","email":"bran@example.com"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000003',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

-- THB portal user
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000004',
  'authenticated',
  'authenticated',
  'somchai@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Somchai"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000004',
  '{"sub":"00000000-0000-0000-0000-000000000004","email":"somchai@example.com"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000004',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'ADMIN', 'Admin'),
  ('00000000-0000-0000-0000-000000000002', 'CLIENT', 'Shiying'),
  ('00000000-0000-0000-0000-000000000003', 'CLIENT', 'Bran'),
  ('00000000-0000-0000-0000-000000000004', 'CLIENT', 'Somchai')
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name;

insert into public.clients (
  id, business_name, billing_name, country, default_currency, status
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'JW Marriott Singapore',
    'JW Marriott Singapore South Beach',
    'Singapore',
    'SGD',
    'ACTIVE'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Morganfield''s Suntec',
    'Grand Appetite Partners Pte Ltd',
    'Singapore',
    'SGD',
    'ACTIVE'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Bangkok Demo Kitchen',
    'Bangkok Demo Kitchen Co., Ltd.',
    'Thailand',
    'THB',
    'ACTIVE'
  )
on conflict (id) do nothing;

insert into public.client_contacts (
  client_id, name, email, phone, is_primary, receive_invoice, receive_reminder
) values
  (
    '10000000-0000-0000-0000-000000000001',
    'Shiying',
    'shiying@example.com',
    null,
    true,
    true,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Bran',
    'bran@example.com',
    '+65 9000 0000',
    true,
    true,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Somchai',
    'somchai@example.com',
    null,
    true,
    true,
    true
  );

insert into public.client_users (user_id, client_id) values
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003')
on conflict do nothing;

insert into public.hosting_services (
  id, client_id, name, hosting_type, project_url, status
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '3DVista Hosting',
    '3DVista',
    'https://jwmarriott.example.com/',
    'ACTIVE'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'GoThru Hosting',
    'GoThru',
    'https://360.example.com/morganfields',
    'ACTIVE'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'GoThru Hosting',
    'GoThru',
    'https://360.example.com/bangkok',
    'ACTIVE'
  )
on conflict (id) do nothing;

insert into public.subscriptions (
  id,
  client_id,
  hosting_service_id,
  billing_interval,
  quantity,
  unit_price,
  currency,
  start_date,
  current_period_start,
  current_period_end,
  status
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'YEARLY',
    1,
    250.00,
    'SGD',
    '2023-09-01',
    '2025-09-01',
    '2026-08-31',
    'ACTIVE'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'YEARLY',
    1,
    150.00,
    'SGD',
    '2023-10-01',
    '2025-10-01',
    '2026-09-30',
    'ACTIVE'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'YEARLY',
    1,
    4500.00,
    'THB',
    '2025-01-01',
    '2025-01-01',
    '2025-12-31',
    'ACTIVE'
  )
on conflict (id) do nothing;
