import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
      <h1 className="text-xl font-bold text-white">Create your account</h1>
      <p className="mt-1.5 text-sm text-zinc-400">
        Join the platform to manage and recover debt efficiently.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form action={signup} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-zinc-300">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
          />
          <p className="text-xs text-zinc-600">At least 8 characters.</p>
        </div>

        <button
          type="submit"
          className="mt-2 h-10 w-full rounded-lg bg-white text-sm font-semibold text-black hover:bg-zinc-100 transition-colors"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <a className="font-medium text-white hover:underline" href="/login">
          Sign in
        </a>
      </p>
    </main>
  );
}
