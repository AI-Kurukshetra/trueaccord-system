import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaymentForm from "./PaymentForm";

export default async function DebtorPayPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await requireRole("debtor");
  const { accountId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: account } = await supabase
    .from("accounts")
    .select("id, account_number, current_balance, original_amount, status, debtor_id, debtor:debtors(id, email)")
    .eq("id", accountId)
    .single();

  if (!account) notFound();

  // Security note: Phase 2 RLS on `accounts` does not restrict debtors from reading
  // arbitrary rows by ID. This application-layer check is the ownership guard.
  const debtor = (account.debtor as unknown) as { id: string; email: string | null } | undefined;
  if (!debtor || debtor.email !== user.email) notFound();

  if (account.current_balance <= 0 || account.status === "settled") {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Account Settled</h1>
        <p className="text-sm text-zinc-500">This account has a zero balance and is already settled.</p>
        <Link href="/debtor" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10">
      <div>
        <Link href="/debtor" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Make a Payment</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Account {(account.account_number as string | null) ?? accountId}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Current balance</dt>
            <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
              ${Number(account.current_balance).toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Original amount</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              ${Number(account.original_amount).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <PaymentForm
        accountId={accountId}
        debtorId={debtor.id}
        accountNumber={account.account_number as string | null}
        currentBalance={Number(account.current_balance)}
      />
    </div>
  );
}
