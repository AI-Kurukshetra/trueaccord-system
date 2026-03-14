"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function respondToSettlement(
  settlementId: string,
  response: "accepted" | "rejected"
): Promise<void> {
  await requireRole("debtor");
  const supabase = await createSupabaseServerClient();

  const { data: settlement, error: fetchError } = await supabase
    .from("settlements")
    .select("id, account_id, status, offer_amount")
    .eq("id", settlementId)
    .single();

  if (fetchError || !settlement) {
    redirect("/debtor?error=Settlement+not+found");
  }

  if (settlement.status !== "pending") {
    redirect("/debtor?error=Settlement+already+resolved");
  }

  const { error } = await supabase
    .from("settlements")
    .update({ status: response })
    .eq("id", settlementId);

  if (error) redirect(`/debtor?error=${encodeURIComponent(error.message)}`);

  if (response === "accepted") {
    await supabase
      .from("accounts")
      .update({ current_balance: settlement.offer_amount, status: "settled" })
      .eq("id", settlement.account_id);
  }

  redirect(`/debtor?success=Settlement+${response}`);
}
