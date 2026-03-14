import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12 font-sans">
      <main className="w-full max-w-lg">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
            <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            DebtPilot
          </h1>
          <p className="mt-3 text-base text-zinc-400">
            Intelligent collections. Smarter recovery.
          </p>
        </div>

        {/* Auth card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-semibold text-black hover:bg-zinc-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-700 text-sm font-medium text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              Create account
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-6 text-center">
            <div>
              <p className="text-lg font-semibold text-white">4</p>
              <p className="text-xs text-zinc-500">User roles</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Stripe</p>
              <p className="text-xs text-zinc-500">Payments</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-white">AI</p>
              <p className="text-xs text-zinc-500">Powered</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} DebtPilot. All rights reserved.
        </p>
      </main>
    </div>
  );
}
