# Hosting Subscription Management

Internal admin app and client portal for yearly hosting subscriptions. Replaces the spreadsheet workflow: client → hosting → subscription → invoice → bank-transfer proof → admin verification → renewal.

## Stack

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, Vitest, Playwright.

See [`ROADMAP.md`](ROADMAP.md) for what is still missing before this can replace the spreadsheet.

There is no separate backend. Mutations run as Next.js server actions against Supabase with Row Level Security.

## Setup

Create a Supabase project (cloud is fine). Then:

1. Apply [`supabase/migrations/20260828100000_init.sql`](supabase/migrations/20260828100000_init.sql) to the database.
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

MVP invoices go through `MockInvoiceProvider`. Routing is already split by currency so later:

- SGD → Zoho Books
- THB → FlowAccount

Internal invoice numbers stay `INV-YYYY-NNNN`. Mock external IDs look like `MOCK-ZOHO-000001` / `MOCK-FLOWACCOUNT-000001`.

## Security notes

- Never put the Supabase service role key in client code. It is only for seed/E2E provisioning.
- Payment receipts live in the private `payment-receipts` bucket and are viewed via signed URLs.
- Clients can only read their own company data (RLS).
