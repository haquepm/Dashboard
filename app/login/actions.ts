"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) redirect("/login?error=missing");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth:sign-in-failed]", {
      code: error.code ?? null,
      status: error.status ?? null,
      message: error.message,
    });
    const params = new URLSearchParams({
      error: "auth_failed",
      code: error.code || "unknown",
      status: String(error.status || "unknown"),
      message: error.message || "No provider message",
    });
    redirect(`/login?${params.toString()}`);
  }

  if (!data.user) redirect("/login?error=auth_failed&code=no_user");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
