"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createDebtor(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const name     = String(formData.get("name") ?? "").trim();
  const email    = String(formData.get("email") ?? "").trim() || null;
  const phone    = String(formData.get("phone") ?? "").trim() || null;
  const address  = String(formData.get("address") ?? "").trim() || null;
  const ssn_last4 = String(formData.get("ssn_last4") ?? "").trim() || null;

  if (!name) redirect("/admin/debtors/new?error=Name+is+required");

  const { error } = await supabase
    .from("debtors")
    .insert({ name, email, phone, address, ssn_last4 });

  if (error) redirect(`/admin/debtors/new?error=${encodeURIComponent(error.message)}`);

  redirect("/admin/debtors?success=Debtor+created+successfully");
}

export async function updateDebtor(id: string, formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const name     = String(formData.get("name") ?? "").trim();
  const email    = String(formData.get("email") ?? "").trim() || null;
  const phone    = String(formData.get("phone") ?? "").trim() || null;
  const address  = String(formData.get("address") ?? "").trim() || null;
  const ssn_last4 = String(formData.get("ssn_last4") ?? "").trim() || null;

  if (!name) redirect(`/admin/debtors/${id}?error=Name+is+required`);

  const { error } = await supabase
    .from("debtors")
    .update({ name, email, phone, address, ssn_last4 })
    .eq("id", id);

  if (error) redirect(`/admin/debtors/${id}?error=${encodeURIComponent(error.message)}`);

  redirect(`/admin/debtors/${id}?success=Debtor+updated`);
}

export async function deleteDebtor(id: string) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("debtors").delete().eq("id", id);
  if (error) redirect(`/admin/debtors/${id}?error=${encodeURIComponent(error.message)}`);

  redirect("/admin/debtors?success=Debtor+deleted");
}

export async function createAccount(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const debtor_id        = String(formData.get("debtor_id") ?? "");
  const client_id        = String(formData.get("client_id") ?? "");
  const account_number   = String(formData.get("account_number") ?? "").trim() || null;
  const original_amount  = parseFloat(String(formData.get("original_amount") ?? "0"));
  const current_balance  = parseFloat(String(formData.get("current_balance") ?? "0"));
  const due_date         = String(formData.get("due_date") ?? "").trim() || null;

  const { error } = await supabase.from("accounts").insert({
    debtor_id,
    client_id,
    account_number,
    original_amount,
    current_balance,
    due_date,
  });

  if (error) redirect(`/admin/debtors/${debtor_id}?error=${encodeURIComponent(error.message)}`);

  redirect(`/admin/debtors/${debtor_id}?success=Account+added`);
}

// ---- Payment Plans ----

export async function createPaymentPlan(formData: FormData): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountId = String(formData.get("account_id") ?? "").trim();
  const installmentAmount = parseFloat(String(formData.get("installment_amount") ?? "0"));
  const frequency = String(formData.get("frequency") ?? "monthly") as "weekly" | "biweekly" | "monthly";
  const nextDueDate = String(formData.get("next_due_date") ?? "").trim();
  const totalInstallments = parseInt(String(formData.get("total_installments") ?? "0"), 10);
  const debtorId = String(formData.get("debtor_id") ?? "").trim();

  if (!accountId || !installmentAmount || !nextDueDate || !totalInstallments) {
    redirect(`/admin/debtors/${debtorId}?error=All+payment+plan+fields+are+required`);
  }

  const { error } = await supabase.from("payment_plans").insert({
    account_id: accountId,
    installment_amount: installmentAmount,
    frequency,
    next_due_date: nextDueDate,
    total_installments: totalInstallments,
    created_by: user?.id,
  });

  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Payment+plan+created`);
}

export async function cancelPaymentPlan(planId: string, debtorId: string): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("payment_plans")
    .update({ status: "cancelled" })
    .eq("id", planId);
  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Payment+plan+cancelled`);
}

// ---- Settlements ----

export async function createSettlement(formData: FormData): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountId = String(formData.get("account_id") ?? "").trim();
  const offerAmount = parseFloat(String(formData.get("offer_amount") ?? "0"));
  const originalAmount = parseFloat(String(formData.get("original_amount") ?? "0"));
  const expiresAt = String(formData.get("expires_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const debtorId = String(formData.get("debtor_id") ?? "").trim();

  if (!accountId || !offerAmount || !originalAmount) {
    redirect(`/admin/debtors/${debtorId}?error=Account+and+amounts+are+required`);
  }

  const { error } = await supabase.from("settlements").insert({
    account_id: accountId,
    offer_amount: offerAmount,
    original_amount: originalAmount,
    expires_at: expiresAt || null,
    notes: notes || null,
    created_by: user?.id,
  });

  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Settlement+offer+sent+to+debtor`);
}
