import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        Create account
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        For now this creates a user in Supabase Auth and a profile row via database trigger.
      </p>

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <form action={signup} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/10 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/10 focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Minimum 8 characters.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
        Already have an account?{" "}
        <a className="font-medium text-zinc-900 hover:underline dark:text-zinc-50" href="/login">
          Log in
        </a>
        .
      </p>
    </main>
  );
}

