import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isRole, type Role } from "./roles";

export async function getCurrentUserRole(): Promise<Role | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data?.role) return null;
  return isRole(data.role) ? data.role : null;
}

