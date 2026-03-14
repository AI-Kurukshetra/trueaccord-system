import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Account = {
  id: string;
  debtor_id: string;
  client_id: string;
  account_number: string | null;
  original_amount: number;
  current_balance: number;
  status: "active" | "settled" | "legal" | "closed";
  due_date: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  debtor?: { name: string; email: string | null };
  client?: { name: string; company: string | null };
};

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, debtor_id, client_id, account_number,
      original_amount, current_balance, status,
      due_date, assigned_agent_id, created_at,
      debtor:debtors(name, email),
      client:clients(name, company)
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Account[];
}

export async function getAccountsByDebtorId(debtorId: string): Promise<Account[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, debtor_id, client_id, account_number,
      original_amount, current_balance, status,
      due_date, assigned_agent_id, created_at,
      client:clients(name, company)
    `)
    .eq("debtor_id", debtorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Account[];
}

export async function getAccountsByAgentId(agentId: string): Promise<Account[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, debtor_id, client_id, account_number,
      original_amount, current_balance, status,
      due_date, assigned_agent_id, created_at,
      debtor:debtors(name, email),
      client:clients(name, company)
    `)
    .eq("assigned_agent_id", agentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Account[];
}

export async function getAccountsByClientId(clientId: string): Promise<Account[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(`
      id, debtor_id, client_id, account_number,
      original_amount, current_balance, status,
      due_date, assigned_agent_id, created_at,
      debtor:debtors(name, email)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Account[];
}

export async function getAccountStats(): Promise<{
  total: number;
  active: number;
  totalOutstanding: number;
}> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("status, current_balance");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    total: rows.length,
    active: rows.filter((r) => r.status === "active").length,
    totalOutstanding: rows.reduce((sum, r) => sum + Number(r.current_balance), 0),
  };
}
