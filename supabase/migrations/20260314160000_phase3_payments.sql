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

create policy "payments_read_admin_agent"
  on public.payments for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

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

create policy "payments_insert_admin_agent"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin','agent')
    )
  );

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
