alter table public.debts
add column if not exists debt_type text,
add column if not exists category text,
add column if not exists owner_type text not null default 'personal',
add column if not exists business_unit_id text null,
add column if not exists current_balance numeric(12,2),
add column if not exists minimum_payment numeric(12,2),
add column if not exists recommended_payment numeric(12,2),
add column if not exists extra_payment numeric(12,2),
add column if not exists payment_frequency text not null default 'Mensual',
add column if not exists interest_rate numeric(8,4),
add column if not exists interest_rate_type text not null default 'Anual',
add column if not exists cut_date date,
add column if not exists credit_limit numeric(12,2),
add column if not exists credit_utilization numeric(8,2),
add column if not exists strategy text,
add column if not exists last_payment_date date,
add column if not exists updated_at timestamptz not null default now();

update public.debts
set
  debt_type = coalesce(debt_type, type),
  owner_type = coalesce(owner_type, case when business_id is null then 'personal' else 'business' end),
  business_unit_id = coalesce(business_unit_id, business_id::text, case when business_id is null then 'personal' else null end),
  current_balance = coalesce(current_balance, pending, 0),
  minimum_payment = coalesce(minimum_payment, minimum, 0),
  recommended_payment = coalesce(recommended_payment, minimum_payment, minimum, 0),
  extra_payment = coalesce(extra_payment, 0),
  interest_rate = coalesce(interest_rate, interest, 0),
  interest_rate_type = coalesce(interest_rate_type, 'Anual'),
  credit_limit = coalesce(credit_limit, 0),
  credit_utilization = case
    when coalesce(credit_limit, 0) > 0 then round((coalesce(current_balance, pending, 0) / credit_limit) * 100, 2)
    else coalesce(credit_utilization, 0)
  end,
  strategy = coalesce(strategy, 'Metodo avalancha'),
  updated_at = now();

create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  owner_type text not null default 'personal',
  business_unit_id text null,
  amount numeric(12,2) not null default 0,
  payment_date date not null default current_date,
  due_date date null,
  status text not null default 'paid',
  payment_method text null,
  account_id uuid null references public.accounts(id) on delete set null,
  transaction_id uuid null references public.transactions(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_debt_payments_user_id
on public.debt_payments(user_id);

create index if not exists idx_debt_payments_debt_id
on public.debt_payments(debt_id);

create index if not exists idx_debt_payments_payment_date
on public.debt_payments(payment_date);

create index if not exists idx_debt_payments_status
on public.debt_payments(status);

alter table public.debt_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'debt_payments'
      and policyname = 'Users can read their own debt payments'
  ) then
    create policy "Users can read their own debt payments"
    on public.debt_payments
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'debt_payments'
      and policyname = 'Users can insert their own debt payments'
  ) then
    create policy "Users can insert their own debt payments"
    on public.debt_payments
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'debt_payments'
      and policyname = 'Users can update their own debt payments'
  ) then
    create policy "Users can update their own debt payments"
    on public.debt_payments
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'debt_payments'
      and policyname = 'Users can delete their own debt payments'
  ) then
    create policy "Users can delete their own debt payments"
    on public.debt_payments
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end $$;

notify pgrst, 'reload schema';
