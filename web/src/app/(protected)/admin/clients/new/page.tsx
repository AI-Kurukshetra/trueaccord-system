import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "../actions";
import Link from "next/link";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole("admin");
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/admin/clients" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">New Client</h1>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      )}

      <form action={createClient} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Field label="Contact name *" name="name" required />
        <Field label="Company" name="company" />
        <Field label="Contact email *" name="contact_email" type="email" required />
        <Field label="Phone" name="phone" type="tel" />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Create client
          </button>
          <Link
            href="/admin/clients"
            className="inline-flex h-9 items-center rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, name, type = "text", required }: {
  label: string; name: string; type?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</label>
      <input
        id={name} name={name} type={type} required={required}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </div>
  );
}
