import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Settlement = {
  id: string;
  account_id: string;
  offer_amount: number;
  original_amount: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number; debtor?: { name: string; email: string | null } };
};

export async function getSettlementsByAccountId(accountId: string): Promise<Settlement[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Settlement[];
}

export async function getPendingSettlementsByDebtorAccounts(accountIds: string[]): Promise<Settlement[]> {
  if (accountIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*, account:accounts(account_number, current_balance)")
    .in("account_id", accountIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Settlement[];
}
