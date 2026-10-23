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
    // Log only the provider error; never log credentials or form data.
    console.error("[auth:sign-in-failed]", {
      email,
      code: error.code ?? null,
      status: error.status ?? null,
      message: error.message,
    });
    const reason = error.code === "email_not_confirmed"
      ? "email_not_confirmed"
      : error.code === "user_banned"
        ? "user_unavailable"
        : error.status === 429
          ? "rate_limited"
          : "credentials_rejected";
    redirect(`/login?error=${reason}`);
  }

  if (!data.user) redirect("/login?error=credentials_rejected");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
