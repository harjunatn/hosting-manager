# User Guide — Hosting Subscription Management

Step-by-step guide for internal demo and pilot.

**App URL:** http://127.0.0.1:3000 (run `npm run dev` first)

**Export to Google Docs:** open Google Docs → File → Open → Upload → select `USER_GUIDE.md`. After import, paste screenshots into each **[PASTE SCREENSHOT HERE]** area.


# Table of Contents

1. Demo accounts
2. Workflow overview
3. Login
4. Admin — set up a new client
5. Admin — create hosting
6. Admin — create subscription
7. Admin — generate and send invoice
8. Client — pay and upload receipt
9. Admin — verify payment
10. After payment is confirmed
11. Special cases
12. Navigation reference
13. Quick demo checklist


# 1. Demo Accounts

**Password for all demo accounts:** password123


## Admin

**Email:** admin@example.com  
**Role:** Admin  
**Landing page after login:** /admin

The admin can manage all clients, hosting, subscriptions, invoices, and payments.


## Client (Portal)

**Email:** shiying@example.com  
**Company:** JW Marriott Singapore  
**Currency:** SGD  
**Landing page after login:** /portal

**Email:** bran@example.com  
**Company:** Morganfield's Suntec  
**Currency:** SGD  
**Landing page after login:** /portal

**Email:** somchai@example.com  
**Company:** Bangkok Demo Kitchen  
**Currency:** THB  
**Landing page after login:** /portal

Each client account can only see its own company data.

**Note:** Public signup is disabled. New portal users must be created manually in Supabase. There is no invite UI in the MVP.


# 2. Workflow Overview

**Step 1 — Admin:** Create client (if not already set up)

**Step 2 — Admin:** Add hosting

**Step 3 — Admin:** Create subscription

**Step 4 — Admin:** Generate invoice

**Step 5 — Admin:** Send invoice

**Step 6 — Client:** View invoice in the portal

**Step 7 — Client:** Bank transfer

**Step 8 — Client:** Upload payment receipt

**Step 9 — Admin:** Confirm payment or reject payment

**Step 10 — System:** If confirmed, subscription expiry moves forward by 1 year (renewal)


## Important points

- One hosting service can have only one subscription. You cannot create a second subscription for the same hosting.
- Next year's renewal uses Generate invoice on the same subscription, not a new subscription row.
- Clients can upload a receipt only after the admin clicks Send invoice (invoice status becomes SENT).
- The MVP does not send emails automatically. Send invoice only changes the status so the client can pay in the portal.


# 3. Login

**Step 1.** Open http://127.0.0.1:3000

**Step 2.** You arrive at the Sign in page

**Step 3.** Enter email and password

**Step 4.** After login:
- Admin is redirected to Dashboard (/admin)
- Client is redirected to Dashboard (/portal)


## SCREENSHOT 01 — Login page

**[PASTE SCREENSHOT HERE]**





# 4. Admin — Set Up a New Client

Skip this section if you are using seed data (JW Marriott, Morganfield's, Bangkok Demo Kitchen).


## 4.1 Open the client list

**Step 1.** Log in as admin@example.com

**Step 2.** Click Clients in the navbar

**Step 3.** Click New client


## SCREENSHOT 02 — Client list (admin)

**[PASTE SCREENSHOT HERE]**





## 4.2 Fill in the client form

**Business name:** Acme Hotel  
**Billing name:** Acme Hotel Pte Ltd  
**Default currency:** SGD or THB  
**Status:** ACTIVE

Click Create client. You will land on the client detail page.


## 4.3 (Optional) Add a contact

**Step 1.** Open the Contacts tab

**Step 2.** Fill in name, email, and phone

**Step 3.** Check Primary and Receive invoice if needed

**Step 4.** Click Add contact

The contact email is for reference. A portal login still needs to be created manually in Supabase if the client does not have one yet.


## SCREENSHOT 03 — Client detail tabs

**[PASTE SCREENSHOT HERE]**





# 5. Admin — Create Hosting

Hosting is the hosted project (name, type, URL). Price and expiry are not set at this stage.


**Step 1.** From the client page, open the Hosting tab

**Step 2.** In the Add hosting panel on the right, fill in the form:

**Name:** 3DVista Hosting  
**Hosting type:** 3DVista or GoThru  
**Project URL:** https://example.com/tour  
**Status:** ACTIVE

**Step 3.** Click Add hosting

**Step 4.** The hosting row appears in the table on the left

To edit existing hosting, click Edit on the table row (change ACTIVE/INACTIVE status, URL, and so on).


## SCREENSHOT 04 — Add hosting form

**[PASTE SCREENSHOT HERE]**





# 6. Admin — Create Subscription

A subscription is the yearly billing contract (price, quantity, start date, expiry).


**Step 1.** Open the Subscription tab

**Step 2.** Fill in the New yearly subscription form:

**Hosting service:** Choose hosting that does not already have a subscription  
**Quantity:** Usually 1  
**Unit price:** Example 250.00  
**Currency:** Matches the client (SGD or THB)  
**Start date:** Contract start date  
**Expiry date:** Calculated automatically (start + 1 year − 1 day)

**Step 3.** Click Create subscription


## SCREENSHOT 05 — Subscription tab

**[PASTE SCREENSHOT HERE]**





## Subscription notes

- Renewals paid is calculated automatically from start date vs expiry (similar to the spreadsheet column).
- If every hosting service already has a subscription, the create form is hidden. Use Generate invoice for the next renewal.


# 7. Admin — Generate and Send Invoice


## 7.1 Generate invoice

**Step 1.** On the Subscription tab, click Generate invoice on the subscription row

**Step 2.** You land on the invoice detail page (initial status: DRAFT)

**Step 3.** Review line items, total, and due date


## SCREENSHOT 06 — Invoice (DRAFT status)

**[PASTE SCREENSHOT HERE]**





## 7.2 Send invoice

**Step 1.** Click Send invoice

**Step 2.** Status changes to SENT

**Step 3.** The client can now view the invoice and upload a transfer receipt


## SCREENSHOT 07 — Invoice (SENT status)

**[PASTE SCREENSHOT HERE]**





**MVP note:** No automatic email is sent. Tell the client manually that the invoice is available in the portal, or share the Print output from the admin invoice page.


# 8. Client — Pay and Upload Receipt


## 8.1 Log in as client

**Step 1.** Log out from admin (Log out button, top right)

**Step 2.** Log in with a client account:
- shiying@example.com for JW Marriott
- bran@example.com for Morganfield's
- somchai@example.com for Bangkok Demo Kitchen


## SCREENSHOT 08 — Client dashboard

**[PASTE SCREENSHOT HERE]**





## 8.2 Open the invoice

**Step 1.** Click Invoices in the menu, or click an invoice from the dashboard

**Step 2.** Click the invoice number (example INV-2026-0001)

**Step 3.** Under Pay by bank transfer, note the bank details (Bank, Account name, Account number, SWIFT from the app configuration)


## SCREENSHOT 09 — Invoice detail (client)

**[PASTE SCREENSHOT HERE]**





## 8.3 Transfer and upload receipt

**Step 1.** The client transfers the invoice total

**Step 2.** In the Upload payment receipt form, choose a file (PDF, JPG, or PNG, max 5 MB)

**Step 3.** Click Upload receipt

**Step 4.** The portal shows Awaiting verification


## SCREENSHOT 10 — Upload payment receipt

**[PASTE SCREENSHOT HERE]**





If the file is too large, an error appears in the form before submit (not a raw server error).


# 9. Admin — Verify Payment


## 9.1 Open the payment queue

**Step 1.** Log back in as admin@example.com

**Step 2.** Click Payments in the menu

**Step 3.** Click a payment with status PENDING VERIFICATION

Alternative: open from the client page → Payments tab


## SCREENSHOT 11 — Payments list

**[PASTE SCREENSHOT HERE]**





## 9.2 Review the receipt

**Step 1.** Open the payment detail page

**Step 2.** View the receipt preview (PDF or image)

**Step 3.** Choose one action:

**Confirm payment** → Invoice becomes PAID, subscription expiry moves forward 1 year

**Reject payment** → Client sees the rejection reason and can upload again


## SCREENSHOT 12 — Payment review (admin)

**[PASTE SCREENSHOT HERE]**





## 9.3 Reject payment (if the receipt is invalid)

**Step 1.** Fill in Rejection reason (required)

**Step 2.** Click Reject payment

**Step 3.** The client sees a Payment not accepted alert with the reason on the invoice page


## SCREENSHOT 13 — Payment rejected (client view)

**[PASTE SCREENSHOT HERE]**





# 10. After Payment Is Confirmed

**Invoice:** Status becomes PAID

**Subscription:** Expiry (current_period_end) moves forward 1 year from the previous expiry

**Renewals paid:** Counter increases automatically

**Client portal:** Upload form disappears because the invoice is paid

**Admin dashboard:** Subscription is no longer PAYMENT DUE


## SCREENSHOT 14 — Admin dashboard after renewal

**[PASTE SCREENSHOT HERE]**





## SCREENSHOT 15 — Client dashboard after payment

**[PASTE SCREENSHOT HERE]**





**Next year's renewal:** Repeat Generate invoice and Send invoice on the same subscription (Section 7).


# 11. Special Cases


## Cannot create a new subscription for the same hosting

**Symptom:** Message that the hosting service already has a subscription.

**Fix:** Use Generate invoice in the subscription table, not Create subscription.


## Client cannot see the invoice

**Fix 1:** Make sure the admin clicked Send invoice (SENT status).

**Fix 2:** Make sure the client logged in with the account linked to the correct company in Supabase (client_users table).


## Seed login fails (cloud Supabase)

Auth users sometimes cannot be seeded via SQL. Create the user manually in Supabase → Authentication → Users, then ensure profiles and client_users rows match.


## Invoice status on the client side

The client portal does not show internal statuses (DRAFT / SENT). Clients only need due date, total, and whether the upload form is available.


# 12. Navigation Reference


## Admin menu (/admin)

**Dashboard** — Renewal and invoice summary

**Clients** — Manage clients, hosting, and subscriptions

**Renewals** — Filter subscriptions by expiry

**Invoices** — All invoices

**Payments** — Verify transfer receipts


## Client menu (/portal)

**Dashboard** — Hosting, subscription, recent invoices

**Invoices** — Invoice list and receipt upload


## Per-client tabs (Admin)

**Overview** — Company info

**Contacts** — Billing contacts

**Hosting** — Project and URL

**Subscription** — Price and expiry

**Invoices** — Invoices for this client

**Payments** — Payments for this client


# 13. Quick Demo Checklist (15 Minutes)

1. Log in as admin → open seed client (JW Marriott)
2. Subscription tab → Generate invoice
3. Send invoice
4. Log out → log in as shiying@example.com
5. Open invoice → upload receipt (file max 5 MB)
6. Log out → log in as admin
7. Payments menu → Confirm payment
8. Check subscription expiry +1 year and Renewals paid increased


# Appendix

This document covers the MVP pilot. Email, automatic reminders, and Zoho/FlowAccount integration are planned for later phases (see ROADMAP.md).
