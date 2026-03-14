import { getCurrentUserRole } from "@/lib/auth/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentUserRole();

  if (role === "admin")  redirect("/admin");
  if (role === "agent")  redirect("/agent");
  if (role === "client") redirect("/client");
  if (role === "debtor") redirect("/debtor");

  redirect("/login");
}

