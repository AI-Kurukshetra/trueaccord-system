import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountsByClientId } from "@/lib/db/accounts";

const statusColors: Record<string, string> = {
  active:  "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  settled: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  legal:   "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  closed:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function ClientPortalPage() {
  await requireRole("client");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user!.id)
    .maybeSingle();

  const accounts = profile?.client_id
    ? await getAccountsByClientId(profile.client_id)
    : [];

  const stats = {
    total:      accounts.length,
    active:     accounts.filter((a) => a.status === "active").length,
    settled:    accounts.filter((a) => a.status === "settled").length,
    outstanding: accounts
      .filter((a) => a.status === "active")
      .reduce((s, a) => s + Number(a.current_balance), 0),
    recovered: accounts
      .filter((a) => a.status === "settled")
      .reduce((s, a) => s + (Number(a.original_amount) - Number(a.current_balance)), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Portfolio</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your debt portfolio overview (read-only)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Accounts",     value: stats.total },
          { label: "Active",             value: stats.active },
          { label: "Settled",            value: stats.settled },
          { label: "Outstanding",        value: `$${stats.outstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{c.value}</p>
          </div>
        ))}
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No accounts in your portfolio yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Debtor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Account #</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Original</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Balance</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {(a.debtor as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{a.account_number ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    ${Number(a.original_amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    ${Number(a.current_balance).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{a.due_date ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
