import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ account_id?: string }>;
}) {
  await requireRole("debtor");
  const { account_id } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-16 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Payment cancelled</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No charge was made. You can try again whenever you&apos;re ready.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {account_id && (
          <Link
            href={`/debtor/pay/${account_id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Try again
          </Link>
        )}
        <Link
          href="/debtor"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
