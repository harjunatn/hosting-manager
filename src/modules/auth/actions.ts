"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/session";

export type LoginState = { error: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !signInData.user?.email) {
    return { error: "Invalid email or password." };
  }

  // Use the same client + signed-in user id. A fresh getCurrentUser() can miss
  // the just-written session cookies in this same Server Action request.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", signInData.user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return { error: `Could not load profile: ${profileError.message}` };
  }

  if (!profile) {
    await supabase.auth.signOut();
    return {
      error: `Signed in as ${signInData.user.email} (${signInData.user.id}), but no profiles row matches that id. Check you are seeding the same Supabase project as NEXT_PUBLIC_SUPABASE_URL.`,
    };
  }

  revalidatePath("/", "layout");
  redirect(profile.role === "ADMIN" ? "/admin" : "/portal");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function homePathForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    return "/login";
  }
  return user.role === "ADMIN" ? "/admin" : "/portal";
}

export async function revalidateApp() {
  revalidatePath("/", "layout");
}
