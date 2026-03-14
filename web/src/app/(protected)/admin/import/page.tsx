import { requireRole } from "@/lib/auth/require-role";
import { importDebtorsCSV } from "./actions";
import Link from "next/link";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("admin");
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Import</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Bulk import debtor records from a CSV file.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Expected CSV format</p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
{`name,email,phone,address,ssn_last4
John Smith,john@example.com,555-0100,"123 Main St",4321
Jane Doe,jane@example.com,555-0101,,`}
          </pre>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Required: <code>name</code>. Optional: <code>email</code>, <code>phone</code>, <code>address</code>, <code>ssn_last4</code>.
          </p>
        </div>

        <form action={importDebtorsCSV} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="file" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              CSV file *
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-zinc-700 file:mr-3 file:h-8 file:rounded-md file:border file:border-zinc-200 file:bg-white file:px-3 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-50 dark:text-zinc-300 dark:file:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-300"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Import debtors
            </button>
            <Link
              href="/admin"
              className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
