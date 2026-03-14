"use server";

import { redirect } from "next/navigation";
import { getCurrentUserRole } from "./profile";
import type { Role } from "./roles";

export async function requireRole(...allowed: Role[]): Promise<Role> {
  const role = await getCurrentUserRole();
  if (!role || !allowed.includes(role)) {
    redirect("/dashboard");
  }
  return role;
}
