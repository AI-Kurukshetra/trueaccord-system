"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentForm({
  accountId,
  debtorId,
  accountNumber,
  currentBalance,
}: {
  accountId: string;
  debtorId: string;
  accountNumber: string | null;
  currentBalance: number;
}) {
  const [amount, setAmount] = useState(String(currentBalance));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || parsed > currentBalance) {
      setError("Enter a valid amount (max: current balance)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, debtorId, amount: parsed, accountNumber }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (json.error) { setError(json.error); setLoading(false); return; }
      if (json.url) router.push(json.url);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="amount" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Payment amount (USD)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="1"
          max={currentBalance}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <p className="text-xs text-zinc-400">Maximum: ${currentBalance.toLocaleString()}</p>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? "Redirecting to payment…" : "Pay with card →"}
      </button>
      <p className="text-center text-xs text-zinc-400">
        Secured by Stripe. Your card details are never stored on our servers.
      </p>
    </form>
  );
}
