import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailDelivery } from "@/lib/supabase/database.types";

export async function listInvoiceEmailDeliveries(invoiceId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("email_deliveries")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data as EmailDelivery[];
}
