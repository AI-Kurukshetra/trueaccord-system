import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await requireRole("debtor");
  const { session_id } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-16 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Payment successful</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Your payment has been processed. Your account balance will update shortly.
        </p>
        {session_id && (
          <p className="mt-1 font-mono text-xs text-zinc-400">Ref: {session_id}</p>
        )}
      </div>
      <Link
        href="/debtor"
        className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
