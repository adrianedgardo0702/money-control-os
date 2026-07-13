create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_type text not null default 'personal',
  business_unit_id text null,
  debt_id uuid null references public.debts(id) on delete set null,
  name text not null,
  bank text null,
  card_type text not null default 'Credito',
  credit_limit numeric(12,2) not null default 0,
  current_balance numeric(12,2) not null default 0,
  available_credit numeric(12,2) not null default 0,
  credit_utilization numeric(8,2) not null default 0,
  cut_date date null,
  payment_due_date date null,
  minimum_payment numeric(12,2) not null default 0,
  recommended_payment numeric(12,2) not null default 0,
  ideal_payment numeric(12,2) not null default 0,
  annual_interest_rate numeric(8,4) not null default 0,
  estimated_monthly_interest numeric(12,2) not null default 0,
  status text not null default 'Saludable',
  account_id uuid null references public.accounts(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards(id) on delete cascade,
  debt_id uuid null references public.debts(id) on delete set null,
  amount numeric(12,2) not null default 0,
  payment_date date not null default current_date,
  payment_method text null,
  account_id uuid null references public.accounts(id) on delete set null,
  transaction_id uuid null references public.transactions(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_credit_cards_user_id
on public.credit_cards(user_id);

create index if not exists idx_credit_cards_owner
on public.credit_cards(owner_type, business_unit_id);

create index if not exists idx_credit_cards_debt_id
on public.credit_cards(debt_id);

create index if not exists idx_credit_cards_payment_due_date
on public.credit_cards(payment_due_date);

create index if not exists idx_credit_card_payments_user_id
on public.credit_card_payments(user_id);

create index if not exists idx_credit_card_payments_card_id
on public.credit_card_payments(credit_card_id);

create index if not exists idx_credit_card_payments_payment_date
on public.credit_card_payments(payment_date);

alter table public.credit_cards enable row level security;
alter table public.credit_card_payments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_cards' and policyname = 'Users can read their own credit cards'
  ) then
    create policy "Users can read their own credit cards"
    on public.credit_cards for select to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_cards' and policyname = 'Users can insert their own credit cards'
  ) then
    create policy "Users can insert their own credit cards"
    on public.credit_cards for insert to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_cards' and policyname = 'Users can update their own credit cards'
  ) then
    create policy "Users can update their own credit cards"
    on public.credit_cards for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_cards' and policyname = 'Users can delete their own credit cards'
  ) then
    create policy "Users can delete their own credit cards"
    on public.credit_cards for delete to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_card_payments' and policyname = 'Users can read their own credit card payments'
  ) then
    create policy "Users can read their own credit card payments"
    on public.credit_card_payments for select to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_card_payments' and policyname = 'Users can insert their own credit card payments'
  ) then
    create policy "Users can insert their own credit card payments"
    on public.credit_card_payments for insert to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_card_payments' and policyname = 'Users can update their own credit card payments'
  ) then
    create policy "Users can update their own credit card payments"
    on public.credit_card_payments for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'credit_card_payments' and policyname = 'Users can delete their own credit card payments'
  ) then
    create policy "Users can delete their own credit card payments"
    on public.credit_card_payments for delete to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.credit_cards to authenticated;
grant select, insert, update, delete on public.credit_card_payments to authenticated;

notify pgrst, 'reload schema';
