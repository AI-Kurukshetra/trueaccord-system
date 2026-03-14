import { requireRole } from "@/lib/auth/require-role";
import { getClients } from "@/lib/db/clients";
import { deleteClient } from "./actions";
import Link from "next/link";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireRole("admin");
  const { success, error } = await searchParams;
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{clients.length} creditor{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add client
        </Link>
      </div>

      {(success || error) && (
        <div className={`rounded-md border p-3 text-sm ${error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300"
        }`}>
          {error ?? success}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No clients yet.</p>
          <Link href="/admin/clients/new" className="mt-3 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
            Add the first client
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Company</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">{c.name}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.company ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.contact_email}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteClient.bind(null, c.id)} className="inline">
                      <button type="submit" className="text-xs text-red-500 hover:underline">Delete</button>
                    </form>
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
