import { requireRole } from "@/lib/auth/require-role";
import { getDebtorById } from "@/lib/db/debtors";
import { getAccountsByDebtorId } from "@/lib/db/accounts";
import { getClients } from "@/lib/db/clients";
import { updateDebtor, deleteDebtor, createAccount } from "../actions";
import { getPaymentPlansByAccountId } from "@/lib/db/payment-plans";
import { createPaymentPlan, cancelPaymentPlan } from "../actions";
import { getSettlementsByAccountId } from "@/lib/db/settlements";
import { createSettlement } from "../actions";
import { DeleteDebtorButton } from "./DeleteDebtorButton";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function DebtorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireRole("admin", "agent");
  const { id } = await params;
  const { error, success } = await searchParams;

  const [debtor, accounts, clients] = await Promise.all([
    getDebtorById(id),
    getAccountsByDebtorId(id),
    getClients(),
  ]);

  if (!debtor) notFound();

  // Fetch payment plans for all accounts
  const paymentPlans = await Promise.all(
    accounts.map((a) => getPaymentPlansByAccountId(a.id))
  ).then((results) => results.flat());

  const settlements = await Promise.all(
    accounts.map((a) => getSettlementsByAccountId(a.id))
  ).then((results) => results.flat());

  const updateWithId = updateDebtor.bind(null, id);
  const deleteWithId = deleteDebtor.bind(null, id);

  const statusColors: Record<string, string> = {
    active:  "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
    settled: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
    legal:   "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
    closed:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/debtors" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
            ← Debtors
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{debtor.name}</h1>
        </div>
        <DeleteDebtorButton action={deleteWithId} />
      </div>

      {(error || success) && (
        <div className={`rounded-md border p-3 text-sm ${error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300"
        }`}>
          {error ?? success}
        </div>
      )}

      {/* Edit form */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
        <form action={updateWithId} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" name="name" defaultValue={debtor.name} required />
          <Field label="Email" name="email" type="email" defaultValue={debtor.email ?? ""} />
          <Field label="Phone" name="phone" defaultValue={debtor.phone ?? ""} />
          <Field label="Address" name="address" defaultValue={debtor.address ?? ""} />
          <Field label="SSN last 4" name="ssn_last4" defaultValue={debtor.ssn_last4 ?? ""} maxLength={4} pattern="\d{4}" />
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              Save changes
            </button>
          </div>
        </form>
      </section>

      {/* Accounts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Accounts ({accounts.length})
          </h2>
        </div>

        {accounts.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Account #</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Client</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Original</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Balance</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-700 dark:text-zinc-300">{a.account_number ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {(a.client as { name: string } | undefined)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-50">
                      ${Number(a.original_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      ${Number(a.current_balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{a.due_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add account form */}
        <details className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
            + Add account
          </summary>
          <form action={createAccount} className="grid gap-4 border-t border-zinc-100 p-5 sm:grid-cols-2 dark:border-zinc-800">
            <input type="hidden" name="debtor_id" value={debtor.id} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Client *</label>
              <select
                name="client_id"
                required
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company ?? c.name}</option>
                ))}
              </select>
            </div>
            <Field label="Account number" name="account_number" />
            <Field label="Original amount *" name="original_amount" type="number" required placeholder="0.00" />
            <Field label="Current balance *" name="current_balance" type="number" required placeholder="0.00" />
            <Field label="Due date" name="due_date" type="date" />
            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Add account
              </button>
            </div>
          </form>
        </details>
      </section>

      {/* Payment Plans */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Payment Plans ({paymentPlans.length})
        </h2>

        {paymentPlans.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Account</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Installment</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Frequency</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Progress</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Next due</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paymentPlans.map((plan) => {
                  const cancelWithIds = cancelPaymentPlan.bind(null, plan.id, id);
                  return (
                    <tr key={plan.id}>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {accounts.find((a) => a.id === plan.account_id)?.account_number ?? plan.account_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                        ${Number(plan.installment_amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 capitalize">{plan.frequency}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {plan.paid_count}/{plan.total_installments}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{plan.next_due_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          plan.status === "active" ? statusColors.active :
                          plan.status === "completed" ? statusColors.settled :
                          statusColors.closed
                        }`}>{plan.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {plan.status === "active" && (
                          <form action={cancelWithIds}>
                            <button type="submit" className="text-xs text-red-500 hover:underline dark:text-red-400">
                              Cancel
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {accounts.filter((a) => a.status === "active").length > 0 && (
          <details className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              + Create payment plan
            </summary>
            <form action={createPaymentPlan} className="grid gap-4 border-t border-zinc-100 p-5 sm:grid-cols-2 dark:border-zinc-800">
              <input type="hidden" name="debtor_id" value={id} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Account *</label>
                <select
                  name="account_id"
                  required
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="">Select account…</option>
                  {accounts.filter((a) => a.status === "active").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number ?? a.id.slice(0, 8)} — ${Number(a.current_balance).toLocaleString()} balance
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Installment amount *" name="installment_amount" type="number" required placeholder="0.00" />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Frequency *</label>
                <select
                  name="frequency"
                  required
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <Field label="First due date *" name="next_due_date" type="date" required />
              <Field label="Total installments *" name="total_installments" type="number" required placeholder="12" />
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Create plan
                </button>
              </div>
            </form>
          </details>
        )}
      </section>

      {/* Settlements */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Settlement Offers ({settlements.length})
        </h2>

        {settlements.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Account</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Offer</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Original</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {accounts.find((a) => a.id === s.account_id)?.account_number ?? s.account_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                      ${Number(s.offer_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      ${Number(s.original_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        s.status === "accepted" ? statusColors.settled :
                        s.status === "pending"  ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300" :
                        statusColors.closed
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {accounts.filter((a) => a.status === "active").length > 0 && (
          <details className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
              + Create settlement offer
            </summary>
            <form action={createSettlement} className="grid gap-4 border-t border-zinc-100 p-5 sm:grid-cols-2 dark:border-zinc-800">
              <input type="hidden" name="debtor_id" value={id} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Account *</label>
                <select
                  name="account_id"
                  required
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="">Select account…</option>
                  {accounts.filter((a) => a.status === "active").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number ?? a.id.slice(0, 8)} — ${Number(a.current_balance).toLocaleString()} balance
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Settlement offer amount *" name="offer_amount" type="number" required placeholder="0.00" />
              <Field label="Original balance (reference) *" name="original_amount" type="number" required placeholder="0.00" />
              <Field label="Expires on" name="expires_at" type="date" />
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                  placeholder="Optional message to debtor…"
                />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Send offer to debtor
                </button>
              </div>
            </form>
          </details>
        )}
      </section>
    </div>
  );
}

function Field({
  label, name, type = "text", defaultValue, required, maxLength, pattern, placeholder,
}: {
  label: string; name: string; type?: string; defaultValue?: string;
  required?: boolean; maxLength?: number; pattern?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</label>
      <input
        id={name} name={name} type={type} defaultValue={defaultValue}
        required={required} maxLength={maxLength} pattern={pattern} placeholder={placeholder}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </div>
  );
}
