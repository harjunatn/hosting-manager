# Hosting Subscription Management

Internal admin app and client portal for yearly hosting subscriptions. Replaces the spreadsheet workflow: client → hosting → subscription → invoice → bank-transfer proof → admin verification → renewal.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, Vitest, Playwright.

See [`ROADMAP.md`](ROADMAP.md) for what is still missing before this can replace the spreadsheet.

There is no separate backend. Mutations run as Next.js server actions against Supabase with Row Level Security.

## Setup

Create a Supabase project (cloud is fine). Then:

1. Apply every SQL file in [`supabase/migrations`](supabase/migrations) to the database in filename order.
2. Optionally run [`supabase/seed.sql`](supabase/seed.sql) for demo users and clients.
3. Create a private Storage bucket named `payment-receipts` if the migration did not.
4. Copy env and start the app:

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project. Keep `SUPABASE_SERVICE_ROLE_KEY` out of the browser; it is only for seed/E2E.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). `supabase start` is optional local Docker, not required.

Seed logins (password for all: `password123`):

| Role   | Email                 | Destination |
|--------|-----------------------|-------------|
| Admin  | `admin@example.com`   | `/admin`    |
| Client | `shiying@example.com`  | `/portal`   |
| Client | `bran@example.com`    | `/portal`   |
| Client | `somchai@example.com`  | `/portal`   |

Public signup is disabled. Portal users are created in seed SQL (or manually in the Supabase dashboard). There is no invite UI in the MVP.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run e2e
```

Playwright E2E needs a running app plus a Supabase project whose keys are in `.env.local`. Install a browser once with `npx playwright install chromium`.

## Invoice providers

Invoice routing is split by currency:

- SGD → Zoho Books when `ZOHO_BOOKS_ENABLED=true`, otherwise the mock provider
- THB → FlowAccount

Zoho Books is the source of truth for real SGD quotation and invoice numbers
and PDFs. The app stores the returned document IDs, numbers, URLs, and customer mapping. Mock
external IDs look like `MOCK-ZOHO-000001` / `MOCK-FLOWACCOUNT-000001`.

### Zoho Books setup

1. Apply all Supabase migrations, including the `zoho_contact_id` client
   mapping.
2. In Zoho Books, create an active item named `Hosting Renewal`. The name can
   be changed through `ZOHO_HOSTING_ITEM_NAME`.
3. In the [Zoho API Console](https://api-console.zoho.com/), create a Self
   Client for development or a Server-based Application for production.
4. Generate an offline refresh token with these least-privilege scopes:
   `ZohoBooks.contacts.READ`, `ZohoBooks.contacts.CREATE`,
   `ZohoBooks.settings.READ`, `ZohoBooks.invoices.CREATE`, and
   `ZohoBooks.invoices.READ`, `ZohoBooks.estimates.CREATE`, and
   `ZohoBooks.estimates.READ`.
5. Add the server-only variables from `.env.example` to `.env.local`. Set
   `ZOHO_ACCOUNTS_URL` to the account's data-center domain and then set
   `ZOHO_BOOKS_ENABLED=true`.

The provider refreshes short-lived access tokens automatically. Never expose
the client secret or refresh token through `NEXT_PUBLIC_*` variables.

When an admin generates and sends SGD renewal documents, the integration:

1. Finds the `Hosting Renewal` item in Zoho.
2. Reuses the client's saved Zoho contact, finds an exact company-name match,
   or creates a customer and stores its contact ID.
3. Creates a quotation, then creates a linked draft invoice from it.
4. Saves both document identities locally and sends their official PDFs in one
   tracked Resend email.

`ZOHO_INVOICE_TEMPLATE_ID` and `ZOHO_ESTIMATE_TEMPLATE_ID` are optional. When
omitted, Zoho uses the customer's or organization's default PDF templates.

## Email and renewal reminders

Resend sends invoice and reminder emails. Keep delivery in test mode until the
sending domain and real recipient list are approved:

```env
RESEND_ENABLED=true
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="The Red Marker <onboarding@resend.dev>"
EMAIL_DELIVERY_MODE=test
EMAIL_TEST_RECIPIENT=your-own-email@example.com
RESEND_WEBHOOK_SECRET=
CRON_SECRET=use-a-random-secret-of-at-least-16-characters
```

In test mode, the original client email is recorded but every message is
delivered to `EMAIL_TEST_RECIPIENT`, with the intended address included in the
subject. After verifying a domain in Resend, change `RESEND_FROM_EMAIL` to that
domain and set `EMAIL_DELIVERY_MODE=live`.

Apply `supabase/migrations/20260910173000_email_automation.sql` and
`supabase/migrations/20260914010000_add_quotation_metadata.sql` before enabling
email. They add period-level invoice/quotation idempotency and delivery
tracking.

Configure a Resend webhook with this production endpoint:

```text
https://YOUR_DOMAIN/api/webhooks/resend
```

Subscribe to `email.sent`, `email.delivered`, `email.opened`, `email.bounced`,
`email.failed`, `email.complained`, and `email.suppressed`, then copy its signing
secret to `RESEND_WEBHOOK_SECRET`.

### Supabase Cron setup

Reminders are triggered by Supabase `pg_cron` + `pg_net`, not Vercel Cron. Apply
`supabase/migrations/20260914020000_supabase_renewal_cron.sql`, then store the
runtime secrets in Supabase Vault (Dashboard → Database → Vault, or SQL):

```sql
select vault.create_secret('https://YOUR_DOMAIN', 'app_base_url');
select vault.create_secret('use-a-random-secret-of-at-least-16-characters', 'cron_secret');
```

Use the same value as the app's `CRON_SECRET`. The scheduled job
`renewal-reminders-daily` runs at 00:00 UTC (08:00 Singapore) and calls
`/api/cron/renewal-reminders` with `Authorization: Bearer <CRON_SECRET>`.

The route processes the most recently due unsent milestone among
60/30/15/3/1-day pre-expiry reminders and the one-day post-expiry notice.
Catch-up after downtime sends the current due reminder without replaying older
ones. Existing delivery records and database unique indexes prevent duplicate
sends.

To verify a run:

```sql
select * from cron.job where jobname = 'renewal-reminders-daily';
select * from cron.job_run_details order by start_time desc limit 20;
select * from net._http_response order by created desc limit 20;
```

To retry manually after fixing Vault or the app:

```sql
select public.invoke_renewal_reminders_cron();
```

## Security notes

- Never put the Supabase service role key in client code. It is used only by
  trusted server-side provisioning, webhook, and cron code.
- Payment receipts live in the private `payment-receipts` bucket and are viewed via signed URLs.
- Clients can only read their own company data (RLS).
