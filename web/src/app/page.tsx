import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12 font-sans dark:bg-black">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          AI Debt Recovery Platform
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Phase 2: Debtor &amp; Account Management. Role-based dashboards for Admin, Agent, Client, and Debtor.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
            href="/signup"
          >
            Create account
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 dark:bg-black/40 dark:text-zinc-300">
          <p className="font-medium">Phase 2 — complete</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Debtors CRUD + search + CSV import</li>
            <li>Accounts management (per debtor)</li>
            <li>Clients (creditors) management</li>
            <li>Role-based dashboards: Admin / Agent / Client / Debtor</li>
          </ul>
          <p className="mt-3 font-medium">Phase 3 — next</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Payment processing (Stripe)</li>
            <li>Payment plans + installments</li>
            <li>Settlement offers</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
