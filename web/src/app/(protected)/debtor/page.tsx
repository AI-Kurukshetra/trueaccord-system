import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountsByDebtorId } from "@/lib/db/accounts";
import { getPaymentsByDebtorId } from "@/lib/db/payments";
import { getPendingSettlementsByDebtorAccounts } from "@/lib/db/settlements";
import { respondToSettlement } from "./actions";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusColors: Record<string, string> = {
  active:  "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  settled: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  legal:   "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  closed:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const paymentStatusColors: Record<string, string> = {
  completed: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  pending:   "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  failed:    "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  refunded:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function DebtorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireRole("debtor");
  const { error, success } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: debtor } = await supabase
    .from("debtors")
    .select("id, name, email")
    .eq("email", user.email!)
    .maybeSingle();

  if (!debtor) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Your account is being set up. Please contact support.</p>
      </div>
    );
  }

  // Fetch accounts first so we can pass account IDs to settlements query
  const accounts = await getAccountsByDebtorId(debtor.id);
  const accountIds = accounts.map((a) => a.id);

  const [payments, settlements] = await Promise.all([
    getPaymentsByDebtorId(debtor.id),
    getPendingSettlementsByDebtorAccounts(accountIds),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Welcome back, {debtor.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your debt accounts and payment options</p>
      </div>

      {(error || success) && (
        <div className={`rounded-md border p-3 text-sm ${error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300"
        }`}>
          {error ?? success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total balance</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            ${totalBalance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active accounts</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{activeAccounts}</p>
        </div>
      </div>

      {/* Settlement offers */}
      {settlements.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Settlement Offers ({settlements.length})
          </h2>
          <div className="space-y-3">
            {settlements.map((s) => {
              const acceptAction = respondToSettlement.bind(null, s.id, "accepted");
              const rejectAction = respondToSettlement.bind(null, s.id, "rejected");
              return (
                <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        Settlement offer — Account {(s.account as { account_number?: string } | undefined)?.account_number ?? s.account_id.slice(0,8)}
                      </p>
                      <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
                        Pay <strong>${Number(s.offer_amount).toLocaleString()}</strong> to settle{" "}
                        <span className="text-amber-600">(was ${Number(s.original_amount).toLocaleString()})</span>
                      </p>
                      {s.expires_at && (
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                          Expires {new Date(s.expires_at).toLocaleDateString()}
                        </p>
                      )}
                      {s.notes && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{s.notes}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <form action={acceptAction}>
                        <button type="submit" className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Accept
                        </button>
                      </form>
                      <form action={rejectAction}>
                        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Accounts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Accounts ({accounts.length})
        </h2>
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">No accounts found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500">{a.account_number ?? a.id.slice(0, 8)}</span>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      ${Number(a.current_balance).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Original: ${Number(a.original_amount).toLocaleString()}
                      {a.due_date ? ` · Due ${a.due_date}` : ""}
                    </p>
                  </div>
                  {(a.status === "active" && a.current_balance > 0) && (
                    <Link
                      href={`/debtor/pay/${a.id}`}
                      className="shrink-0 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Pay now
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment history */}
      {payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Payment history ({payments.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Account</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {(p.account as { account_number?: string } | undefined)?.account_number ?? p.account_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${paymentStatusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
