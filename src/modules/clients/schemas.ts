import { z } from "zod";

export const clientSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required"),
  billing_name: z.string().trim().min(1, "Billing name is required"),
  billing_address: z.string().trim().optional(),
  country: z.string().trim().optional(),
  default_currency: z.enum(["SGD", "THB"]),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  remarks: z.string().trim().optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  is_primary: z.boolean(),
  receive_invoice: z.boolean(),
  receive_reminder: z.boolean(),
});

export const hostingSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  hosting_type: z.string().trim().min(1, "Hosting type is required"),
  project_url: z.string().trim().url("Enter a valid URL").or(z.literal("")).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  remarks: z.string().trim().optional(),
});

export const subscriptionSchema = z
  .object({
    hosting_service_id: z.string().trim().min(1, "Select a hosting service"),
    quantity: z.coerce.number().int().positive(),
    unit_price: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount"),
    currency: z.enum(["SGD", "THB"]),
    start_date: z.string().date("Enter a start date"),
    current_period_end: z.string().date("Enter an expiry date"),
  })
  .refine((value) => value.current_period_end >= value.start_date, {
    message: "Expiry date must be on or after the start date",
    path: ["current_period_end"],
  });

export const rejectPaymentSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required"),
});

export function emptyToNull(value: string | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function checkboxValue(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}
