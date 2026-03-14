import { requireRole } from "@/lib/auth/require-role";
import { getDebtors } from "@/lib/db/debtors";
import { getClients } from "@/lib/db/clients";
import { getAccountStats } from "@/lib/db/accounts";
import Link from "next/link";

export default async function AdminPage() {
  await requireRole("admin");

  const [debtors, clients, stats] = await Promise.all([
    getDebtors(),
    getClients(),
    getAccountStats(),
  ]);

  const cards = [
    { label: "Total Debtors", value: debtors.length, href: "/admin/debtors" },
    { label: "Total Clients", value: clients.length, href: "/admin/clients" },
    { label: "Total Accounts", value: stats.total, href: "/admin/accounts" },
    { label: "Active Accounts", value: stats.active, href: "/admin/accounts" },
    {
      label: "Outstanding Balance",
      value: `$${stats.totalOutstanding.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      href: "/admin/accounts",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Platform summary — Phase 2
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/debtors/new"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-lg dark:bg-zinc-800">
            +
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Add Debtor</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Create a new debtor profile</p>
          </div>
        </Link>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-lg dark:bg-zinc-800">
            +
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Add Client</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Onboard a new creditor</p>
          </div>
        </Link>
        <Link
          href="/admin/import"
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-lg dark:bg-zinc-800">
            ↑
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Import CSV</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Bulk import debt portfolios</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
