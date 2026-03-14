"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createClient(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const name          = String(formData.get("name") ?? "").trim();
  const company       = String(formData.get("company") ?? "").trim() || null;
  const contact_email = String(formData.get("contact_email") ?? "").trim();
  const phone         = String(formData.get("phone") ?? "").trim() || null;

  if (!name || !contact_email) redirect("/admin/clients/new?error=Name+and+email+are+required");

  const { error } = await supabase
    .from("clients")
    .insert({ name, company, contact_email, phone });

  if (error) redirect(`/admin/clients/new?error=${encodeURIComponent(error.message)}`);

  redirect("/admin/clients?success=Client+created");
}

export async function deleteClient(id: string) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) redirect(`/admin/clients?error=${encodeURIComponent(error.message)}`);

  redirect("/admin/clients?success=Client+deleted");
}
