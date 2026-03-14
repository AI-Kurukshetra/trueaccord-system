"use client";

export function DeleteDebtorButton({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex h-9 items-center rounded-md border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400"
        onClick={(e) => {
          if (!confirm("Delete this debtor and all their accounts?")) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
