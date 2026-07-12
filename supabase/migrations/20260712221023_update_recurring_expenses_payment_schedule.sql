-- Keep recurring expense scheduling and payment history aligned with the app.

alter table public.recurring_expenses
  add column if not exists monthly_amount numeric(12, 2),
  add column if not exists annual_amount numeric(12, 2),
  add column if not exists start_date date,
  add column if not exists next_due_date date,
  add column if not exists last_paid_date date,
  add column if not exists recurrence_type text,
  add column if not exists weekdays text[],
  add column if not exists month_days integer[],
  add column if not exists annual_month integer,
  add column if not exists annual_day integer,
  add column if not exists interval_number integer,
  add column if not exists interval_type text,
  add column if not exists snoozed_until date,
  add column if not exists reminder_days_before integer default 1,
  add column if not exists notifications_enabled boolean default true,
  add column if not exists owner_type text default 'personal',
  add column if not exists business_unit_id text,
  add column if not exists due_date date,
  add column if not exists is_required boolean default true,
  add column if not exists is_active boolean default true,
  add column if not exists payment_method text,
  add column if not exists mode text,
  add column if not exists status text default 'active';

alter table public.recurring_expenses
  alter column reminder_days_before set default 1,
  alter column notifications_enabled set default true;

update public.recurring_expenses
set
  start_date = coalesce(start_date, due_date, next_run_date),
  next_due_date = coalesce(next_due_date, due_date, next_run_date),
  monthly_amount = coalesce(
    monthly_amount,
    case
      when lower(frequency) in ('semanal', 'weekly') then round(amount * 52 / 12, 2)
      when lower(frequency) in ('quincenal', 'biweekly') then round(amount * 2, 2)
      when lower(frequency) in ('anual', 'annual') then round(amount / 12, 2)
      else amount
    end
  ),
  annual_amount = coalesce(
    annual_amount,
    case
      when lower(frequency) in ('semanal', 'weekly') then round(amount * 52, 2)
      when lower(frequency) in ('quincenal', 'biweekly') then round(amount * 24, 2)
      when lower(frequency) in ('anual', 'annual') then amount
      else round(amount * 12, 2)
    end
  ),
  weekdays = coalesce(weekdays, '{}'::text[]),
  month_days = coalesce(month_days, '{}'::integer[]),
  reminder_days_before = coalesce(reminder_days_before, 1),
  notifications_enabled = coalesce(notifications_enabled, true);

alter table public.transactions
  add column if not exists payment_method text,
  add column if not exists owner_type text default 'personal',
  add column if not exists business_unit_id text,
  add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete set null;

create index if not exists idx_transactions_recurring_expense_id
  on public.transactions(recurring_expense_id);

create table if not exists public.recurring_expense_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  owner_type text not null default 'personal',
  business_unit_id text null,
  amount numeric(12, 2) not null default 0,
  due_date date not null,
  paid_date date null,
  status text not null default 'pending',
  payment_method text null,
  transaction_id uuid null references public.transactions(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_expense_payments
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists recurring_expense_id uuid references public.recurring_expenses(id) on delete cascade,
  add column if not exists owner_type text default 'personal',
  add column if not exists business_unit_id text,
  add column if not exists amount numeric(12, 2) default 0,
  add column if not exists due_date date,
  add column if not exists paid_date date,
  add column if not exists status text default 'pending',
  add column if not exists payment_method text,
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.recurring_expense_payments
  alter column business_unit_id type text using business_unit_id::text;

update public.recurring_expense_payments as payment
set user_id = expense.user_id
from public.recurring_expenses as expense
where payment.user_id is null
  and payment.recurring_expense_id = expense.id;

alter table public.recurring_expense_payments
  alter column user_id set not null;

create index if not exists idx_recurring_expense_payments_expense_id
  on public.recurring_expense_payments(recurring_expense_id);

create index if not exists idx_recurring_expense_payments_due_date
  on public.recurring_expense_payments(due_date);

create index if not exists idx_recurring_expense_payments_status
  on public.recurring_expense_payments(status);

create index if not exists idx_recurring_expense_payments_user_id
  on public.recurring_expense_payments(user_id);

alter table public.recurring_expense_payments enable row level security;

grant select, insert, update, delete
  on public.recurring_expenses,
     public.recurring_expense_payments,
     public.transactions
  to authenticated;

drop policy if exists "Users can manage their own recurring expense payments"
  on public.recurring_expense_payments;

create policy "Users can manage their own recurring expense payments"
  on public.recurring_expense_payments
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
