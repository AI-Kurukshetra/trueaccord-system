import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Client = {
  id: string;
  name: string;
  company: string | null;
  contact_email: string;
  phone: string | null;
  created_at: string;
};

export async function getClients(): Promise<Client[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company, contact_email, phone, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, company, contact_email, phone, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
