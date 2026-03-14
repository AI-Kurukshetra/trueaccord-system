import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PaymentPlan = {
  id: string;
  account_id: string;
  installment_amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  next_due_date: string;
  total_installments: number;
  paid_count: number;
  status: "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number; debtor?: { name: string } };
};

export async function getPaymentPlansByAccountId(accountId: string): Promise<PaymentPlan[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentPlan[];
}

export async function getActivePaymentPlanByAccountId(accountId: string): Promise<PaymentPlan | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PaymentPlan | null;
}
