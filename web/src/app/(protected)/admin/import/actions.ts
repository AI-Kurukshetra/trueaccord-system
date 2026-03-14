"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function parseCSV(text: string): string[][] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    );
}

export async function importDebtorsCSV(formData: FormData) {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) redirect("/admin/import?error=No+file+selected");

  const text = await file.text();
  const rows = parseCSV(text);

  if (rows.length < 2) redirect("/admin/import?error=CSV+must+have+a+header+row+and+at+least+one+data+row");

  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const nameIdx    = header.indexOf("name");
  const emailIdx   = header.indexOf("email");
  const phoneIdx   = header.indexOf("phone");
  const addressIdx = header.indexOf("address");
  const ssnIdx     = header.indexOf("ssn_last4");

  if (nameIdx === -1) redirect("/admin/import?error=CSV+must+have+a+%22name%22+column");

  const records = rows.slice(1).map((row) => ({
    name:      row[nameIdx] ?? "",
    email:     emailIdx   >= 0 ? row[emailIdx]   || null : null,
    phone:     phoneIdx   >= 0 ? row[phoneIdx]   || null : null,
    address:   addressIdx >= 0 ? row[addressIdx] || null : null,
    ssn_last4: ssnIdx     >= 0 ? row[ssnIdx]     || null : null,
  })).filter((r) => r.name.length > 0);

  if (records.length === 0) redirect("/admin/import?error=No+valid+rows+found");

  const { error } = await supabase.from("debtors").insert(records);
  if (error) redirect(`/admin/import?error=${encodeURIComponent(error.message)}`);

  redirect(`/admin/debtors?success=${encodeURIComponent(`Imported ${records.length} debtors`)}`);
}
