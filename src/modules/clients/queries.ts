import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  Client,
  ClientContact,
  HostingService,
  Invoice,
  InvoiceItem,
  Payment,
  Subscription,
} from "@/lib/supabase/database.types";

export async function listClients() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("business_name");
  if (error) {
    throw error;
  }
  return data as Client[];
}

export async function getClient(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as Client | null;
}

export async function listContacts(clientId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false });
  if (error) {
    throw error;
  }
  return data as ClientContact[];
}

export async function listAllHosting() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hosting_services")
    .select("*")
    .order("created_at");
  if (error) {
    throw error;
  }
  return data as HostingService[];
}

export async function listHosting(clientId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hosting_services")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) {
    throw error;
  }
  return data as HostingService[];
}

export async function getHosting(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hosting_services")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as HostingService | null;
}

export async function listSubscriptions(clientId?: string) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("subscriptions")
    .select("*")
    .order("current_period_end");
  if (clientId) {
    query = query.eq("client_id", clientId);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data as Subscription[];
}

export async function getSubscription(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as Subscription | null;
}

export async function listInvoices(filters?: {
  clientId?: string;
  subscriptionId?: string;
}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("invoices").select("*").order("created_at", {
    ascending: false,
  });
  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters?.subscriptionId) {
    query = query.eq("subscription_id", filters.subscriptionId);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data as Invoice[];
}

export async function getInvoice(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as Invoice | null;
}

export async function listInvoiceItems(invoiceId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId);
  if (error) {
    throw error;
  }
  return data as InvoiceItem[];
}

export async function listPayments(filters?: {
  clientId?: string;
  status?: Payment["status"];
}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("payments").select("*").order("created_at", {
    ascending: false,
  });
  if (filters?.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  const { data, error } = await query;
  if (error) {
    throw error;
  }
  return data as Payment[];
}

export async function getPayment(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data as Payment | null;
}

export async function getLatestInvoiceBySubscription(
  subscriptionIds: string[],
) {
  if (subscriptionIds.length === 0) {
    return [] as Invoice[];
  }
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .in("subscription_id", subscriptionIds)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data as Invoice[];
}
