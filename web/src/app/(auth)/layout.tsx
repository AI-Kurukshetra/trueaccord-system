import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-50"
          >
            AI Debt Recovery
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-300"
          >
            Dashboard
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

