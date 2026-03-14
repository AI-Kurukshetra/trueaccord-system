import { requireRole } from "@/lib/auth/require-role";
import { getPayments } from "@/lib/db/payments";

const statusColors: Record<string, string> = {
  completed: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  pending:   "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  failed:    "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  refunded:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const payments = await getPayments();

  const totalCollected = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Payments</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} · $
          {totalCollected.toLocaleString()} collected
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">No payments yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Debtor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Account</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Method</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {(p.debtor as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {(p.account as { account_number?: string } | undefined)?.account_number ?? p.account_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                    ${Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 capitalize dark:text-zinc-400">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
