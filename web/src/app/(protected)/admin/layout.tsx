import Link from "next/link";
import { logout } from "@/app/(protected)/dashboard/actions";

const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/debtors", label: "Debtors" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/import", label: "Import" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Admin
            </span>
            <div className="flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Log out
            </button>
          </form>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
