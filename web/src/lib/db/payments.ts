import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Payment = {
  id: string;
  account_id: string;
  debtor_id: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  method: "stripe" | "manual";
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  notes: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number };
  debtor?: { name: string; email: string | null };
};

export async function getPayments(): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, account:accounts(account_number, current_balance), debtor:debtors(name, email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentsByDebtorId(debtorId: string): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, account:accounts(account_number, current_balance)")
    .eq("debtor_id", debtorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentsByAccountId(accountId: string): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentByCheckoutSession(sessionId: string): Promise<Payment | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .single();
  if (error) return null;
  return data as Payment;
}
