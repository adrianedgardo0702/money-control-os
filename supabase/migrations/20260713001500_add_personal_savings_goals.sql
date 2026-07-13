create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_type text not null default 'personal',
  business_unit_id text null,
  name text not null,
  goal_type text not null default 'Reserva personal',
  target_amount numeric(12,2) not null default 0,
  current_amount numeric(12,2) not null default 0,
  weekly_contribution_target numeric(12,2) not null default 0,
  monthly_contribution_target numeric(12,2) not null default 0,
  target_date date null,
  priority text not null default 'Media',
  account_id uuid null references public.accounts(id) on delete set null,
  is_protected boolean not null default true,
  status text not null default 'Activa',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  savings_goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  contribution_date date not null default current_date,
  account_id uuid null references public.accounts(id) on delete set null,
  payment_method text null,
  transaction_id uuid null references public.transactions(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_savings_goals_user_id
on public.savings_goals(user_id);

create index if not exists idx_savings_goals_owner
on public.savings_goals(owner_type, business_unit_id);

create index if not exists idx_savings_goals_status
on public.savings_goals(status);

create index if not exists idx_savings_goal_contributions_user_id
on public.savings_goal_contributions(user_id);

create index if not exists idx_savings_goal_contributions_goal_id
on public.savings_goal_contributions(savings_goal_id);

alter table public.savings_goals enable row level security;
alter table public.savings_goal_contributions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'Users can read their own savings goals'
  ) then
    create policy "Users can read their own savings goals"
    on public.savings_goals for select to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'Users can insert their own savings goals'
  ) then
    create policy "Users can insert their own savings goals"
    on public.savings_goals for insert to authenticated
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'Users can update their own savings goals'
  ) then
    create policy "Users can update their own savings goals"
    on public.savings_goals for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goals' and policyname = 'Users can delete their own savings goals'
  ) then
    create policy "Users can delete their own savings goals"
    on public.savings_goals for delete to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goal_contributions' and policyname = 'Users can read their own savings contributions'
  ) then
    create policy "Users can read their own savings contributions"
    on public.savings_goal_contributions for select to authenticated
    using ((select auth.uid()) = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'savings_goal_contributions' and policyname = 'Users can insert their own savings contributions'
  ) then
    create policy "Users can insert their own savings contributions"
    on public.savings_goal_contributions for insert to authenticated
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

grant select, insert, update, delete on public.savings_goals to authenticated;
grant select, insert on public.savings_goal_contributions to authenticated;

notify pgrst, 'reload schema';
