import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const adminEmail = "admin@example.com";
const password = "password123";

test("admin to client payment renewal happy path", async ({ page }) => {
  test.setTimeout(120_000);
  const suffix = Date.now();
  const businessName = `E2E Client ${suffix}`;
  const contactEmail = `e2e-${suffix}@example.com`;
  const start = "2026-01-01";

  await page.goto("/login");
  await page.getByTestId("login-email").fill(adminEmail);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/admin");

  await page.getByTestId("new-client").click();
  await page.getByTestId("business-name").fill(businessName);
  await page.getByTestId("billing-name").fill(`${businessName} Billing`);
  await page.getByTestId("save-client").click();
  await page.waitForURL(/\/admin\/clients\/.+/);

  const clientUrl = page.url();
  const clientId = clientUrl.split("/admin/clients/")[1]?.split("/")[0];
  expect(clientId).toBeTruthy();

  await page.goto(`/admin/clients/${clientId}/contacts`);
  await page.getByTestId("contact-name").fill("E2E Contact");
  await page.getByTestId("contact-email").fill(contactEmail);
  await page.getByTestId("save-contact").click();
  await expect(page.getByText("E2E Contact")).toBeVisible();

  await page.goto(`/admin/clients/${clientId}/hosting`);
  await page.getByTestId("hosting-name").fill("3DVista Hosting");
  await page.getByTestId("project-url").fill("https://example.com/tour");
  await page.getByTestId("save-hosting").click();
  await expect(page.getByText("3DVista Hosting")).toBeVisible();

  await page.goto(`/admin/clients/${clientId}/subscriptions`);
  await page.getByTestId("subscription-quantity").fill("1");
  await page.getByTestId("subscription-price").fill("250.00");
  await page.getByTestId("subscription-start").fill(start);
  await page.getByTestId("save-subscription").click();
  await expect(page.getByText("31 Dec 2026")).toBeVisible();

  await page.getByTestId("generate-invoice").click();
  await page.waitForURL(/\/admin\/invoices\/.+/);
  await expect(page.getByText("DRAFT")).toBeVisible();
  await expect(page.getByText("Annual 3DVista Hosting")).toBeVisible();

  await page.getByTestId("send-invoice").click();
  await expect(page.getByText("SENT")).toBeVisible();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase env for E2E user provisioning");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: created, error } = await admin.auth.admin.createUser({
    email: contactEmail,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    throw new Error(error?.message ?? "Could not create portal user");
  }
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "CLIENT",
    display_name: "E2E Contact",
  });
  if (profileError) {
    throw profileError;
  }
  const { error: membershipError } = await admin.from("client_users").insert({
    user_id: created.user.id,
    client_id: clientId,
  });
  if (membershipError) {
    throw membershipError;
  }

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await page.getByTestId("login-email").fill(contactEmail);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/portal");

  await expect(page.getByText("3DVista Hosting")).toBeVisible();
  await expect(page.getByText(/250/)).toBeVisible();
  await expect(page.getByText(/year/i)).toBeVisible();
  await expect(page.getByText("Expiry 31 Dec 2026")).toBeVisible();
  await expect(page.getByText(/INV-/)).toBeVisible();

  await page.getByText(/INV-/).first().click();
  await expect(page.getByText("Pay by bank transfer")).toBeVisible();

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByTestId("receipt-file").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByTestId("upload-receipt").click();
  await expect(page.getByText("Waiting for verification")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL("**/login");
  await page.getByTestId("login-email").fill(adminEmail);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/admin");

  await page.goto("/admin/payments");
  await page.getByRole("link", { name: businessName }).click();
  await expect(page.getByText("PENDING VERIFICATION")).toBeVisible();
  await page.getByTestId("confirm-payment").click();
  await expect(page.getByText("PAID")).toBeVisible();

  await page.goto(`/admin/clients/${clientId}/subscriptions`);
  await expect(page.getByText("31 Dec 2027")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByTestId("login-email").fill(contactEmail);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/portal");
  await expect(page.getByText("Expiry 31 Dec 2027")).toBeVisible();
  await expect(page.getByText("PAID").first()).toBeVisible();
  await expect(page.getByText("ACTIVE").first()).toBeVisible();
});
