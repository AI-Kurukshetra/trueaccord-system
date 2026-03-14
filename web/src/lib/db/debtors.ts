import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Debtor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ssn_last4: string | null;
  created_at: string;
};

export async function getDebtors(search?: string): Promise<Debtor[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("debtors")
    .select("id, name, email, phone, address, ssn_last4, created_at")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getDebtorById(id: string): Promise<Debtor | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("debtors")
    .select("id, name, email, phone, address, ssn_last4, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
