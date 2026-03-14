export const roles = ["admin", "agent", "client", "debtor"] as const;
export type Role = (typeof roles)[number];

export function isRole(value: string): value is Role {
  return (roles as readonly string[]).includes(value);
}

