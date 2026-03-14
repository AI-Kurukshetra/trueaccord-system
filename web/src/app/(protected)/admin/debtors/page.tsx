import { requireRole } from "@/lib/auth/require-role";
import { getDebtors } from "@/lib/db/debtors";
import Link from "next/link";

export default async function DebtorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string }>;
}) {
  await requireRole("admin", "agent");
  const { q, success } = await searchParams;
  const debtors = await getDebtors(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Debtors</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {debtors.length} record{debtors.length !== 1 ? "s" : ""}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <Link
          href="/admin/debtors/new"
          className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add debtor
        </Link>
      </div>

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
          {success}
        </div>
      )}

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name, email, or phone…"
          className="h-9 w-full max-w-sm rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/debtors"
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
          >
            Clear
          </Link>
        )}
      </form>

      {debtors.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {q ? "No debtors match your search." : "No debtors yet."}
          </p>
          {!q && (
            <Link href="/admin/debtors/new" className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
              Add the first debtor
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {debtors.map((d) => (
                <tr key={d.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{d.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{d.email ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/debtors/${d.id}`}
                      className="text-xs font-medium text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      View
                    </Link>
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
