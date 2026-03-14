# Phase 3 — Payment Processing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable debtors to make one-time payments via Stripe Checkout, agents to create installment payment plans, and agents to issue settlement offers that debtors can accept or reject — with automatic account balance updates throughout.

**Architecture:** Stripe Checkout (server-side redirect flow) handles one-time payments; webhook at `/api/webhooks/stripe` updates `payments` + `accounts` tables on completion. Payment plans and settlements are internal DB-only features with no Stripe dependency. All new DB tables follow existing RLS patterns from Phase 2.

> **Deferred to Phase 4:** Payment retry logic for failed transactions and payment confirmation emails are intentionally deferred — retry requires a scheduler/queue, and emails belong to the Phase 4 communications engine (Resend/SendGrid integration).

**Tech Stack:** Stripe (server SDK only — `stripe` npm package), Supabase (PostgreSQL + RLS), Next.js App Router (server actions + API route handlers), TypeScript, Tailwind CSS v4.

---

## File Map

### New Files
| File | Responsibility |
|---|---|
| `supabase/migrations/20260314160000_phase3_payments.sql` | Create `payments`, `payment_plans`, `settlements` tables with RLS |
| `web/src/lib/stripe.ts` | Singleton Stripe server client |
| `web/src/lib/db/payments.ts` | Query functions for `payments` table |
| `web/src/lib/db/payment-plans.ts` | Query functions for `payment_plans` table |
| `web/src/lib/db/settlements.ts` | Query functions for `settlements` table |
| `web/src/app/api/checkout/route.ts` | POST — create Stripe Checkout session |
| `web/src/app/api/webhooks/stripe/route.ts` | POST — handle Stripe webhook events |
| `web/src/app/(protected)/debtor/pay/[accountId]/page.tsx` | Debtor payment initiation page |
| `web/src/app/(protected)/debtor/pay/success/page.tsx` | Post-payment success page |
| `web/src/app/(protected)/debtor/pay/cancel/page.tsx` | Stripe checkout cancelled page |
| `web/src/app/(protected)/admin/payments/page.tsx` | Admin — all payments overview |
| `web/src/app/(protected)/admin/debtors/[id]/settlements/page.tsx` | Agent/admin — create settlement offer |

### Modified Files
| File | Change |
|---|---|
| `web/src/app/(protected)/debtor/page.tsx` | Add "Pay now" button per account; show settlement offers |
| `web/src/app/(protected)/debtor/actions.ts` *(new)* | Server action: accept/reject settlement |
| `web/src/app/(protected)/admin/debtors/[id]/page.tsx` | Add "Payment plans" section + "Create settlement" link |
| `web/src/app/(protected)/admin/debtors/actions.ts` | Add `createPaymentPlan`, `createSettlement` actions |
| `web/src/app/(protected)/admin/layout.tsx` | Add Payments nav link |
| `web/.env.local.example` | Add Stripe env vars |

---

## Chunk 1: Database & Stripe Foundation

### Task 1: Supabase Migration — Phase 3 Tables

**Files:**
- Create: `supabase/migrations/20260314160000_phase3_payments.sql`

- [ ] **Step 1: Write the migration SQL**

Create file `supabase/migrations/20260314160000_phase3_payments.sql`:

```sql
-- ============================================================
-- Phase 3: payments, payment_plans, settlements
-- ============================================================

-- payments
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  debtor_id        uuid not null references public.debtors(id) on delete cascade,
  amount           numeric(12,2) not null check (amount > 0),
  status           text not null default 'pending'
                   check (status in ('pending','completed','failed','refunded')),
  method           text not null default 'stripe'
                   check (method in ('stripe','manual')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  notes            text,
  created_at       timestamptz not null default now()
);

alter table public.payments enable row level security;

-- Admin & agent can read all payments
create policy "payments_read_admin_agent"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

-- Debtor can read own payments
create policy "payments_read_debtor"
  on public.payments for select
  using (
    debtor_id in (
      select d.id from public.debtors d
      join public.profiles p on p.id = auth.uid()
      where p.role = 'debtor'
        and d.email = (select email from auth.users where id = auth.uid())
    )
  );

-- Admin & agent can insert manual payments
create policy "payments_insert_admin_agent"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

-- Service role (webhooks) can insert/update — covered by service key bypass

-- ============================================================

-- payment_plans
create table if not exists public.payment_plans (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references public.accounts(id) on delete cascade,
  installment_amount  numeric(12,2) not null check (installment_amount > 0),
  frequency           text not null default 'monthly'
                      check (frequency in ('weekly','biweekly','monthly')),
  next_due_date       date not null,
  total_installments  integer not null check (total_installments > 0),
  paid_count          integer not null default 0,
  status              text not null default 'active'
                      check (status in ('active','completed','cancelled')),
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

alter table public.payment_plans enable row level security;

create policy "payment_plans_read_admin_agent"
  on public.payment_plans for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

create policy "payment_plans_write_admin_agent"
  on public.payment_plans for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

-- Debtor can read own payment plans
create policy "payment_plans_read_debtor"
  on public.payment_plans for select
  using (
    account_id in (
      select a.id from public.accounts a
      join public.debtors d on d.id = a.debtor_id
      join public.profiles p on p.id = auth.uid()
      where p.role = 'debtor'
        and d.email = (select email from auth.users where id = auth.uid())
    )
  );

-- ============================================================

-- settlements
create table if not exists public.settlements (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references public.accounts(id) on delete cascade,
  offer_amount     numeric(12,2) not null check (offer_amount > 0),
  original_amount  numeric(12,2) not null,
  status           text not null default 'pending'
                   check (status in ('pending','accepted','rejected','expired')),
  expires_at       timestamptz,
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

alter table public.settlements enable row level security;

create policy "settlements_read_admin_agent"
  on public.settlements for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

create policy "settlements_write_admin_agent"
  on public.settlements for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

-- Debtor can read and update (accept/reject) own settlement offers
create policy "settlements_read_debtor"
  on public.settlements for select
  using (
    account_id in (
      select a.id from public.accounts a
      join public.debtors d on d.id = a.debtor_id
      join public.profiles p on p.id = auth.uid()
      where p.role = 'debtor'
        and d.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "settlements_update_debtor"
  on public.settlements for update
  using (
    account_id in (
      select a.id from public.accounts a
      join public.debtors d on d.id = a.debtor_id
      join public.profiles p on p.id = auth.uid()
      where p.role = 'debtor'
        and d.email = (select email from auth.users where id = auth.uid())
    )
  )
  with check (status in ('accepted','rejected'));
```

- [ ] **Step 2: Apply migration to Supabase**

In Supabase Dashboard → SQL Editor, paste and run the migration.

Or via CLI:
```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject
npx supabase db push
```

Expected: No errors. Three new tables visible in Table Editor: `payments`, `payment_plans`, `settlements`.

- [ ] **Step 3: Verify tables in Supabase**

In Supabase Dashboard → Table Editor, confirm:
- `payments` table exists with columns: `id, account_id, debtor_id, amount, status, method, stripe_payment_intent_id, stripe_checkout_session_id, notes, created_at`
- `payment_plans` table exists with all columns
- `settlements` table exists with all columns

---

### Task 2: Stripe Setup

**Files:**
- Modify: `web/.env.local` (add Stripe vars)
- Modify: `web/.env.local.example`
- Create: `web/src/lib/stripe.ts`

- [ ] **Step 1: Install Stripe server SDK**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npm install stripe
```

Expected: `stripe` added to `package.json` dependencies. No errors.

- [ ] **Step 2: Add Stripe environment variables**

Add to `web/.env.local`:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Add to `web/.env.local.example`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

> Get test keys from: https://dashboard.stripe.com/test/apikeys
> Webhook secret comes after Step 4 (webhook setup).

- [ ] **Step 3: Create Stripe singleton client**

Create `web/src/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});
```

- [ ] **Step 4: Verify build passes**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No TypeScript errors.

---

## Chunk 2: Database Query Layer

### Task 3: DB Query Functions

**Files:**
- Create: `web/src/lib/db/payments.ts`
- Create: `web/src/lib/db/payment-plans.ts`
- Create: `web/src/lib/db/settlements.ts`

- [ ] **Step 1: Create `web/src/lib/db/payments.ts`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Payment = {
  id: string;
  account_id: string;
  debtor_id: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  method: "stripe" | "manual";
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  notes: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number };
  debtor?: { name: string; email: string | null };
};

export async function getPayments(): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, account:accounts(account_number, current_balance), debtor:debtors(name, email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentsByDebtorId(debtorId: string): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, account:accounts(account_number, current_balance)")
    .eq("debtor_id", debtorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentsByAccountId(accountId: string): Promise<Payment[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function getPaymentByCheckoutSession(sessionId: string): Promise<Payment | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .single();
  if (error) return null;
  return data as Payment;
}
```

- [ ] **Step 2: Create `web/src/lib/db/payment-plans.ts`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PaymentPlan = {
  id: string;
  account_id: string;
  installment_amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  next_due_date: string;
  total_installments: number;
  paid_count: number;
  status: "active" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number; debtor?: { name: string } };
};

export async function getPaymentPlansByAccountId(accountId: string): Promise<PaymentPlan[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PaymentPlan[];
}

export async function getActivePaymentPlanByAccountId(accountId: string): Promise<PaymentPlan | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payment_plans")
    .select("*")
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PaymentPlan | null;
}
```

- [ ] **Step 3: Create `web/src/lib/db/settlements.ts`**

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Settlement = {
  id: string;
  account_id: string;
  offer_amount: number;
  original_amount: number;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  account?: { account_number: string | null; current_balance: number; debtor?: { name: string; email: string | null } };
};

export async function getSettlementsByAccountId(accountId: string): Promise<Settlement[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Settlement[];
}

export async function getPendingSettlementsByDebtorAccounts(accountIds: string[]): Promise<Settlement[]> {
  if (accountIds.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("settlements")
    .select("*, account:accounts(account_number, current_balance)")
    .in("account_id", accountIds)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Settlement[];
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

---

## Chunk 3: Stripe API Routes

### Task 4: Stripe Checkout API Route

**Files:**
- Create: `web/src/app/api/checkout/route.ts`

- [ ] **Step 1: Create checkout session route**

Create `web/src/app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accountId, amount, debtorId, accountNumber } = body as {
      accountId: string;
      amount: number;
      debtorId: string;
      accountNumber: string | null;
    };

    if (!accountId || !amount || !debtorId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    // Create a pending payment record first
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        account_id: accountId,
        debtor_id: debtorId,
        amount,
        status: "pending",
        method: "stripe",
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100), // Stripe uses cents
            product_data: {
              name: `Debt Payment${accountNumber ? ` — Account ${accountNumber}` : ""}`,
              description: `Payment for account ${accountId}`,
            },
          },
        },
      ],
      metadata: {
        payment_id: payment.id,
        account_id: accountId,
        debtor_id: debtorId,
      },
      success_url: `${baseUrl}/debtor/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/debtor/pay/cancel?account_id=${accountId}`,
    });

    // Store session ID on payment record
    await supabase
      .from("payments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", payment.id);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

---

### Task 5: Stripe Webhook Handler

**Files:**
- Create: `web/src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create the webhook handler**

Create `web/src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client — bypasses RLS for system operations
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { payment_id, account_id } = session.metadata ?? {};

    if (!payment_id || !account_id) {
      console.error("[webhook] missing metadata", session.metadata);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Mark payment as completed
    await supabase
      .from("payments")
      .update({
        status: "completed",
        stripe_payment_intent_id: typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.toString() ?? null,
      })
      .eq("id", payment_id);

    // Get payment amount to reduce balance
    const { data: payment } = await supabase
      .from("payments")
      .select("amount")
      .eq("id", payment_id)
      .single();

    if (payment) {
      // Get current balance
      const { data: account } = await supabase
        .from("accounts")
        .select("current_balance")
        .eq("id", account_id)
        .single();

      if (account) {
        const newBalance = Math.max(0, Number(account.current_balance) - Number(payment.amount));
        await supabase
          .from("accounts")
          .update({
            current_balance: newBalance,
            status: newBalance <= 0 ? "settled" : "active",
          })
          .eq("id", account_id);
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { payment_id } = session.metadata ?? {};
    if (payment_id) {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment_id);
    }
  }

  return NextResponse.json({ received: true });
}

// Note: App Router route handlers receive raw body natively via req.text() — no body-parser config needed.
```

- [ ] **Step 2: Add `SUPABASE_SERVICE_ROLE_KEY` to environment**

Add to `web/.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Add to `web/.env.local.example`:
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Get from Supabase Dashboard → Project Settings → API → `service_role` key (secret — never expose to client).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Set up Stripe webhook listener for local dev**

Install Stripe CLI if not installed:
```bash
# Download from https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret from the CLI output (starts with `whsec_`) → update `STRIPE_WEBHOOK_SECRET` in `.env.local`. Restart dev server.

---

## Chunk 4: Debtor Payment UI

### Task 6: Debtor Payment Pages

**Files:**
- Create: `web/src/app/(protected)/debtor/pay/[accountId]/page.tsx`
- Create: `web/src/app/(protected)/debtor/pay/success/page.tsx`
- Create: `web/src/app/(protected)/debtor/pay/cancel/page.tsx`
- Create: `web/src/app/(protected)/debtor/actions.ts`
- Modify: `web/src/app/(protected)/debtor/page.tsx`

- [ ] **Step 1: Create debtor server actions file**

Create `web/src/app/(protected)/debtor/actions.ts`:

```typescript
"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function respondToSettlement(
  settlementId: string,
  response: "accepted" | "rejected"
): Promise<void> {
  await requireRole("debtor");
  const supabase = await createSupabaseServerClient();

  const { data: settlement, error: fetchError } = await supabase
    .from("settlements")
    .select("id, account_id, status, offer_amount")
    .eq("id", settlementId)
    .single();

  if (fetchError || !settlement) {
    redirect("/debtor?error=Settlement+not+found");
  }

  if (settlement.status !== "pending") {
    redirect("/debtor?error=Settlement+already+resolved");
  }

  const { error } = await supabase
    .from("settlements")
    .update({ status: response })
    .eq("id", settlementId);

  if (error) redirect(`/debtor?error=${encodeURIComponent(error.message)}`);

  // If accepted, update account balance to the settlement offer amount
  if (response === "accepted") {
    await supabase
      .from("accounts")
      .update({ current_balance: settlement.offer_amount, status: "settled" })
      .eq("id", settlement.account_id);
  }

  redirect(`/debtor?success=Settlement+${response}`);
}
```

- [ ] **Step 2: Create the payment initiation page**

Create `web/src/app/(protected)/debtor/pay/[accountId]/page.tsx`:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import PaymentForm from "./PaymentForm";

export default async function DebtorPayPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  await requireRole("debtor");
  const { accountId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Verify account belongs to this debtor
  const { data: account } = await supabase
    .from("accounts")
    .select("id, account_number, current_balance, original_amount, status, debtor_id, debtor:debtors(id, email)")
    .eq("id", accountId)
    .single();

  if (!account) notFound();

  // Security note: Phase 2 RLS on `accounts` does not restrict debtors from reading
  // arbitrary rows by ID. This application-layer check is the ownership guard.
  // If stricter RLS is needed, add a debtor-select policy to `accounts` joining
  // auth.users email to debtors.email (similar to the pattern in settlements RLS above).
  const debtor = account.debtor as { id: string; email: string | null } | undefined;
  if (!debtor || debtor.email !== user.email) notFound();

  if (account.current_balance <= 0 || account.status === "settled") {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Account Settled</h1>
        <p className="text-sm text-zinc-500">This account has a zero balance and is already settled.</p>
        <Link href="/debtor" className="text-sm font-medium text-zinc-900 underline dark:text-zinc-50">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pt-10">
      <div>
        <Link href="/debtor" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Make a Payment</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Account {account.account_number ?? accountId}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-zinc-500">Current balance</dt>
            <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
              ${Number(account.current_balance).toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500">Original amount</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">
              ${Number(account.original_amount).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <PaymentForm
        accountId={accountId}
        debtorId={debtor.id}
        accountNumber={account.account_number}
        currentBalance={Number(account.current_balance)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create the PaymentForm client component**

Create `web/src/app/(protected)/debtor/pay/[accountId]/PaymentForm.tsx`:

```typescript
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
```

- [ ] **Step 4: Create success page**

Create `web/src/app/(protected)/debtor/pay/success/page.tsx`:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  await requireRole("debtor");
  const { session_id } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-16 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/30">
          <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Payment successful</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Your payment has been processed. Your account balance will update shortly.
        </p>
        {session_id && (
          <p className="mt-1 font-mono text-xs text-zinc-400">Ref: {session_id}</p>
        )}
      </div>
      <Link
        href="/debtor"
        className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Create cancel page**

Create `web/src/app/(protected)/debtor/pay/cancel/page.tsx`:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import Link from "next/link";

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ account_id?: string }>;
}) {
  await requireRole("debtor");
  const { account_id } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6 pt-16 text-center">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Payment cancelled</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          No charge was made. You can try again whenever you're ready.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {account_id && (
          <Link
            href={`/debtor/pay/${account_id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            Try again
          </Link>
        )}
        <Link
          href="/debtor"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Update debtor dashboard to add Pay buttons and show settlements**

Replace the entire content of `web/src/app/(protected)/debtor/page.tsx` with:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAccountsByDebtorId } from "@/lib/db/accounts";
import { getPaymentsByDebtorId } from "@/lib/db/payments";
import { getPendingSettlementsByDebtorAccounts } from "@/lib/db/settlements";
import { respondToSettlement } from "./actions";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusColors: Record<string, string> = {
  active:  "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  settled: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
  legal:   "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  closed:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const paymentStatusColors: Record<string, string> = {
  completed: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  pending:   "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  failed:    "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  refunded:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function DebtorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireRole("debtor");
  const { error, success } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // Get debtor record
  const { data: debtor } = await supabase
    .from("debtors")
    .select("id, name, email")
    .eq("email", user.email!)
    .maybeSingle();

  if (!debtor) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Your account is being set up. Please contact support.</p>
      </div>
    );
  }

  // Fetch accounts first so we can pass account IDs to settlements query
  const accounts = await getAccountsByDebtorId(debtor.id);
  const accountIds = accounts.map((a) => a.id);

  const [payments, settlements] = await Promise.all([
    getPaymentsByDebtorId(debtor.id),
    getPendingSettlementsByDebtorAccounts(accountIds),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.current_balance), 0);
  const activeAccounts = accounts.filter((a) => a.status === "active").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          Welcome back, {debtor.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your debt accounts and payment options</p>
      </div>

      {(error || success) && (
        <div className={`rounded-md border p-3 text-sm ${error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300"
        }`}>
          {error ?? success}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total balance</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            ${totalBalance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active accounts</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{activeAccounts}</p>
        </div>
      </div>

      {/* Settlement offers */}
      {settlements.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Settlement Offers ({settlements.length})
          </h2>
          <div className="space-y-3">
            {settlements.map((s) => {
              const acceptAction = respondToSettlement.bind(null, s.id, "accepted");
              const rejectAction = respondToSettlement.bind(null, s.id, "rejected");
              return (
                <div key={s.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                        Settlement offer — Account {(s.account as { account_number?: string } | undefined)?.account_number ?? s.account_id.slice(0,8)}
                      </p>
                      <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
                        Pay <strong>${Number(s.offer_amount).toLocaleString()}</strong> to settle{" "}
                        <span className="text-amber-600">(was ${Number(s.original_amount).toLocaleString()})</span>
                      </p>
                      {s.expires_at && (
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                          Expires {new Date(s.expires_at).toLocaleDateString()}
                        </p>
                      )}
                      {s.notes && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{s.notes}</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <form action={acceptAction}>
                        <button type="submit" className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                          Accept
                        </button>
                      </form>
                      <form action={rejectAction}>
                        <button type="submit" className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Accounts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Accounts ({accounts.length})
        </h2>
        {accounts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500">No accounts found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500">{a.account_number ?? a.id.slice(0, 8)}</span>
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      ${Number(a.current_balance).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Original: ${Number(a.original_amount).toLocaleString()}
                      {a.due_date ? ` · Due ${a.due_date}` : ""}
                    </p>
                  </div>
                  {(a.status === "active" && a.current_balance > 0) && (
                    <Link
                      href={`/debtor/pay/${a.id}`}
                      className="shrink-0 inline-flex h-9 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Pay now
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment history */}
      {payments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Payment history ({payments.length})
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Account</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {(p.account as { account_number?: string } | undefined)?.account_number ?? p.account_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                      ${Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${paymentStatusColors[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

---

## Chunk 5: Agent & Admin Features

### Task 7: Payment Plans (Agent/Admin)

**Files:**
- Modify: `web/src/app/(protected)/admin/debtors/actions.ts`
- Modify: `web/src/app/(protected)/admin/debtors/[id]/page.tsx`

- [ ] **Step 1: Add `createPaymentPlan` and `cancelPaymentPlan` server actions**

Append to `web/src/app/(protected)/admin/debtors/actions.ts`:

```typescript
// ---- Payment Plans ----

export async function createPaymentPlan(formData: FormData): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountId = String(formData.get("account_id") ?? "").trim();
  const installmentAmount = parseFloat(String(formData.get("installment_amount") ?? "0"));
  const frequency = String(formData.get("frequency") ?? "monthly") as "weekly" | "biweekly" | "monthly";
  const nextDueDate = String(formData.get("next_due_date") ?? "").trim();
  const totalInstallments = parseInt(String(formData.get("total_installments") ?? "0"), 10);
  const debtorId = String(formData.get("debtor_id") ?? "").trim();

  if (!accountId || !installmentAmount || !nextDueDate || !totalInstallments) {
    redirect(`/admin/debtors/${debtorId}?error=All+payment+plan+fields+are+required`);
  }

  const { error } = await supabase.from("payment_plans").insert({
    account_id: accountId,
    installment_amount: installmentAmount,
    frequency,
    next_due_date: nextDueDate,
    total_installments: totalInstallments,
    created_by: user?.id,
  });

  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Payment+plan+created`);
}

export async function cancelPaymentPlan(planId: string, debtorId: string): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("payment_plans")
    .update({ status: "cancelled" })
    .eq("id", planId);
  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Payment+plan+cancelled`);
}
```

> Note: Ensure the file already has `"use server"` at the top, imports `requireRole`, `createSupabaseServerClient`, and `redirect` — they are already there from Phase 2.

- [ ] **Step 2: Add Payment Plans section to debtor detail page**

In `web/src/app/(protected)/admin/debtors/[id]/page.tsx`, add these imports after the existing imports:

```typescript
import { getPaymentPlansByAccountId } from "@/lib/db/payment-plans";
import { createPaymentPlan, cancelPaymentPlan } from "../actions";
```

Then update the data-fetching section (inside the page function, after `const [debtor, accounts, clients]`):

```typescript
// Fetch payment plans for all accounts
const paymentPlans = await Promise.all(
  accounts.map((a) => getPaymentPlansByAccountId(a.id))
).then((results) => results.flat());
```

Then add a Payment Plans section after the existing Accounts section (before the closing `</div>`):

```tsx
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

  {/* Create payment plan form */}
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

---

### Task 8: Settlement Offers (Agent/Admin Creates, Debtor Responds)

**Files:**
- Modify: `web/src/app/(protected)/admin/debtors/actions.ts`
- Modify: `web/src/app/(protected)/admin/debtors/[id]/page.tsx`

- [ ] **Step 1: Add `createSettlement` server action**

Append to `web/src/app/(protected)/admin/debtors/actions.ts`:

```typescript
// ---- Settlements ----

export async function createSettlement(formData: FormData): Promise<void> {
  await requireRole("admin", "agent");
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accountId = String(formData.get("account_id") ?? "").trim();
  const offerAmount = parseFloat(String(formData.get("offer_amount") ?? "0"));
  const originalAmount = parseFloat(String(formData.get("original_amount") ?? "0"));
  const expiresAt = String(formData.get("expires_at") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const debtorId = String(formData.get("debtor_id") ?? "").trim();

  if (!accountId || !offerAmount || !originalAmount) {
    redirect(`/admin/debtors/${debtorId}?error=Account+and+amounts+are+required`);
  }

  const { error } = await supabase.from("settlements").insert({
    account_id: accountId,
    offer_amount: offerAmount,
    original_amount: originalAmount,
    expires_at: expiresAt || null,
    notes: notes || null,
    created_by: user?.id,
  });

  if (error) redirect(`/admin/debtors/${debtorId}?error=${encodeURIComponent(error.message)}`);
  redirect(`/admin/debtors/${debtorId}?success=Settlement+offer+sent+to+debtor`);
}
```

- [ ] **Step 2: Add Settlement Offers section to debtor detail page**

In `web/src/app/(protected)/admin/debtors/[id]/page.tsx`, add import:

```typescript
import { getSettlementsByAccountId } from "@/lib/db/settlements";
import { createPaymentPlan, cancelPaymentPlan, createSettlement } from "../actions";
```

Add settlement data fetching (alongside the paymentPlans fetch):

```typescript
const settlements = await Promise.all(
  accounts.map((a) => getSettlementsByAccountId(a.id))
).then((results) => results.flat());
```

Add Settlements section after Payment Plans section:

```tsx
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

  {/* Create settlement form */}
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

---

## Chunk 6: Admin Payments Overview & Navigation

### Task 9: Admin Payments Page

**Files:**
- Create: `web/src/app/(protected)/admin/payments/page.tsx`
- Modify: `web/src/app/(protected)/admin/layout.tsx`

- [ ] **Step 1: Create admin payments overview page**

Create `web/src/app/(protected)/admin/payments/page.tsx`:

```typescript
import { requireRole } from "@/lib/auth/require-role";
import { getPayments } from "@/lib/db/payments";

const statusColors: Record<string, string> = {
  completed: "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
  pending:   "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300",
  failed:    "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
  refunded:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function AdminPaymentsPage() {
  await requireRole("admin");
  const payments = await getPayments();

  const totalCollected = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Payments</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {payments.length} payment{payments.length !== 1 ? "s" : ""} · $
          {totalCollected.toLocaleString()} collected
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">No payments yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Debtor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Account</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500 dark:text-zinc-400">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Method</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-500">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {(p.debtor as { name: string } | undefined)?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {(p.account as { account_number?: string } | undefined)?.account_number ?? p.account_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-900 dark:text-zinc-50">
                    ${Number(p.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 capitalize dark:text-zinc-400">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Payments link to admin navigation**

In `web/src/app/(protected)/admin/layout.tsx`, the nav is driven by a `navLinks` array at the top of the file. Add `Payments` after `Accounts`:

```typescript
const navLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/debtors", label: "Debtors" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/import", label: "Import" },
];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Final build check**

```bash
cd /home/bacancy/DevangiRami/hk_projects/AppProject/web
npm run build
```

Expected: Build completes with no errors. Warnings about `params` being async are acceptable.

---

## Phase 3 Manual Testing Checklist

After all tasks are complete, verify end-to-end:

**Setup:**
- [ ] Stripe CLI running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] Dev server running: `npm run dev`

**Debtor payment flow:**
- [ ] Log in as debtor (the user whose email matches a debtor record)
- [ ] `/debtor` shows accounts with "Pay now" button on active accounts
- [ ] Clicking "Pay now" navigates to `/debtor/pay/{accountId}` with balance shown
- [ ] Entering amount and clicking "Pay with card" redirects to Stripe Checkout
- [ ] Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] After payment, redirected to `/debtor/pay/success`
- [ ] Back at `/debtor`, account balance is reduced by payment amount
- [ ] Payment appears in payment history table

**Agent — payment plan:**
- [ ] Log in as admin/agent, go to `/admin/debtors/{id}`
- [ ] Payment Plans section visible, "+ Create payment plan" expander works
- [ ] Fill form and submit → redirected back with "Payment plan created" banner
- [ ] Plan appears in payment plans table
- [ ] "Cancel" link cancels the plan (status → cancelled)

**Agent — settlement offer:**
- [ ] On same debtor detail page, "+ Create settlement offer" expander works
- [ ] Fill offer amount, original amount, expiry → submit
- [ ] Redirected back with "Settlement offer sent to debtor" banner
- [ ] Offer appears in settlements table

**Debtor — respond to settlement:**
- [ ] Log in as debtor, `/debtor` shows amber "Settlement Offers" section
- [ ] Click "Accept" → settlement status → accepted, account balance updated to offer amount, status → settled
- [ ] Click "Decline" on a different offer → settlement status → rejected

**Admin payments overview:**
- [ ] `/admin/payments` lists all payments with debtor name, account, amount, status
- [ ] "Payments" link appears in admin nav

---
