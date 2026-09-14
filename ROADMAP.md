# Roadmap to Production

Where this app stands against the original brief, and the phases needed before it can replace the Google Sheet for real.

## The brief, scored

> We are currently using Google Sheet to track all the clients who are hosting their files on our server. They pay us on yearly basis, and we have to send out emails with invoice + reminders manually. Payment is also through bank transfer. I am hoping to automate this with a client facing system where they can see their hosting details, expiry, add payment method, use API to create invoice from our system.

| Brief item | Status | Notes |
|---|---|---|
| Replace spreadsheet as source of truth | Partial | Schema and admin CRUD exist; the real spreadsheet rows have not been imported yet |
| Client-facing portal: hosting details + expiry | Done | `/portal` shows hosting, expiry, renewals paid, invoices |
| Yearly billing cycle | Done | One subscription per hosting; expiry extends on confirmed payment |
| Bank transfer payment | Done | Client uploads receipt, admin verifies, renewal is atomic in one RPC |
| Invoice generation from our system | Partial | SGD uses Zoho Books when configured; THB still uses `MockInvoiceProvider` |
| Send invoice emails automatically | Configuration pending | Resend delivery, Zoho PDF attachments, and event tracking are implemented; domain/webhook setup remains |
| Send reminders automatically | Configuration pending | Daily Supabase Cron and 60/30/15/3/1/-1 catch-up schedule are implemented; Vault secrets and production activation remain |
| Client can add a payment method | **Not started** | No stored payment method, no card/PayNow/GIRO, no auto-charge |

## Is it enough for an MVP?

Yes as an **internal pilot**, no as a **replacement**.

What works today is the full happy path end to end: client → hosting → subscription → invoice → receipt upload → admin verification → expiry extended by one year, with row-level security separating admin from client data and an audit trail on every money-moving action.

What blocks cutover is that the two things the brief calls out as manual pain — **emails and reminders** — are still manual, and the live client list is still only in the spreadsheet. Until Phase 1 and 2 below are done, the team would be doing double entry: this app plus the sheet plus Gmail.

Recommendation: run Phases 1–3 before announcing the portal to any client.

---

## Phase 1 — Migrate the real data

**Why first:** every later phase (reminders, emails, invoicing) sends real messages to real clients. Wrong dates mean wrong money.

- Import the live sheet: business name, billing name, project URL, hosting type, contacts, quantity, fee, currency, start date, expiry, remarks.
- The create-subscription form assumes a brand-new contract (expiry = start + 1 year). Existing clients need their **actual current expiry** preserved. Add an admin-only import path (CSV upload or a seeded SQL script) that writes `start_date` and `current_period_end` independently.
- Backfill the clients missing from the current seed (e.g. MOXIE, HK Infra One).
- Reconcile: every row's derived "renewals paid" must match the sheet's `Renewal Cycle Paid` column. Any mismatch means an import bug, not a rounding quirk.

**Done when:** an admin can open every client in the app and see the same expiry the sheet shows, and the sheet is marked read-only.

## Phase 2 — Transactional email

- Resend is integrated as the transactional provider.
- Wire real sends into the existing flows: invoice sent, receipt received, payment confirmed, payment rejected with reason.
- Attach or link the invoice. The print view at `/admin/invoices/[id]/print` is the basis for a PDF.
- Respect the recipient flags already in the schema: `client_contacts.receive_invoice` and `receive_reminder`.
- Log every send in `audit_logs`, and store enough state to answer "did this client get the invoice?" without opening the mail provider dashboard.
- Handle bounces so a dead contact email becomes visible to the admin instead of failing silently.

**Done when:** "Send invoice" actually delivers the invoice, and no admin needs to open Gmail to bill a client.

## Phase 3 — Reminder engine

The spreadsheet had a `NEXT REMINDER` column. That logic needs to live in code.

- Add a scheduled job (Supabase `pg_cron` + `pg_net` calling the protected Next.js route; Vault holds `app_base_url` and `cron_secret`).
- Schedule: 60 / 30 / 15 / 3 / 1 days before expiry, then a notice one day after expiry.
- Persist which reminder was sent for which subscription and period so a re-run cannot double-send. This is the one part of the system where idempotency matters most.
- Give admins a way to see what is queued, and to suppress reminders for a specific client.

**Done when:** nobody watches a calendar to chase renewals.

## Phase 4 — Real invoice providers

`getInvoiceProvider()` branches on currency. Zoho Books is implemented for SGD; FlowAccount remains to be implemented.

- SGD → Zoho Books, THB → FlowAccount.
- Implement the existing `InvoiceProvider` interface, store the real `external_invoice_id` and `invoice_url`.
- Retry and backoff: a provider outage must not lose an invoice that already consumed a number from `invoice_sequences`.
- Decide the source of truth for the invoice document — ours or the provider's — and make the portal link to the same one the client received.
- Tax: SG GST and TH VAT were out of scope for the MVP but are not optional for real invoices. This is where the `subtotal` / `total` split earns its keep.

**Done when:** a generated invoice exists in the accounting system without anyone re-keying it.

## Phase 5 — Payment methods

The brief asks for "add payment method". Today the only method is a manual bank transfer receipt.

- Short path, high value: show PayNow / bank details per currency and keep manual verification, but let the client save which method they use.
- Longer path: Stripe (card, GIRO/direct debit) with auto-charge on renewal, which removes the verification step entirely for those clients.
- Keep bank transfer as a first-class option regardless. Some clients will insist on it.
- Partial payments and overpayments need a decision: the current model assumes one payment equals one invoice total.

**Done when:** a client can renew without an admin touching anything.

## Phase 6 — Client self-service and access

- Invite flow. Right now portal users are created by hand in the Supabase dashboard, which does not scale past the pilot.
- Password reset and email verification.
- More than one user per client company (the schema allows it, the UI does not expose it).
- Let clients update their own contact details, with an audit entry.

## Phase 7 — Admin ergonomics at scale

The current tables render everything. Fine at 10 clients, painful at 200.

- Search, filters, sort, and pagination on clients, invoices, and payments.
- Edit and cancel subscriptions; void invoices (`VOID` exists in the enum with no UI).
- Multi-line invoices, discounts, and credit notes.
- An audit log viewer, since the data is already being written and nobody can read it.
- Bulk actions: generate invoices for everything expiring next month in one pass.

## Phase 8 — Hardening before launch

- **Tests:** an RLS test suite that proves a client cannot read another client's rows; run the Playwright happy path against a real staging Supabase project in CI.
- **CI/CD:** lint, typecheck, unit, and E2E on every pull request. Deploy previews.
- **Environments:** separate staging and production Supabase projects. Never seed demo data into production.
- **Secrets:** rotate keys, confirm `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser bundle, and move the bank details out of `NEXT_PUBLIC_*` if they should not be public.
- **Monitoring:** error tracking (Sentry), uptime checks, and an alert when a scheduled reminder job fails silently.
- **Backups:** confirm point-in-time recovery is on, and actually rehearse a restore.
- **Auth abuse:** rate limit the login route.
- **Storage:** a retention policy for payment receipts, which are financial records.

## Phase 9 — Cutover

- Freeze the spreadsheet, run the final import, diff the two.
- Soft launch the portal to one or two friendly clients (JW Marriott or Morganfield's are the obvious candidates).
- Write a one-page runbook: how to add a client, how to handle a disputed payment, what to do when an invoice provider is down.
- Keep the spreadsheet as a read-only archive for one full renewal cycle.

---

## Decisions already made (do not revisit casually)

- **One subscription per hosting service, forever.** Renewal extends `current_period_end`; it does not create a new subscription row. The unique constraint on `hosting_service_id` enforces this.
- **Confirming a payment *is* the renewal.** There is no separate "Renew" button, and expiry grows from the previous period end rather than the payment date, so a late payment does not shorten the year the client paid for.
- **"Renewals paid" is derived**, not stored. It comes from `start_date` versus `current_period_end`, so it cannot drift out of sync with the dates.
- **Time-based statuses are computed at read time.** `EXPIRING`, `EXPIRED`, and `OVERDUE` need no cron job and cannot go stale.

## Open questions

- GST/VAT: which entity invoices which client, and at what rate?
- Do we want auto-charge at all, or is the yearly invoice-and-verify rhythm actually preferred by these clients?
- Multi-year or multi-hosting contracts: does one client ever need a single invoice covering several hosting services?
- Who owns the invoice PDF long term, us or Zoho/FlowAccount?
- Price changes at renewal: does the new rate apply automatically, or does an admin confirm it each year?
