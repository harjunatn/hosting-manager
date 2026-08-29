import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/modules/auth/types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  let clientId: string | null = null;
  if (profile.role === "CLIENT") {
    const { data: membership } = await supabase
      .from("client_users")
      .select("client_id")
      .eq("user_id", user.id)
      .maybeSingle();
    clientId = membership?.client_id ?? null;
  }

  return {
    id: user.id,
    email: user.email,
    role: profile.role,
    displayName: profile.display_name,
    clientId,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/portal");
  }
  return user;
}

export async function requireClient() {
  const user = await requireUser();
  if (user.role !== "CLIENT" || !user.clientId) {
    redirect("/admin");
  }
  return user;
}
