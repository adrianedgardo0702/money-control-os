alter table public.monthly_targets
add column if not exists free_spending_limit numeric(12,2) not null default 0,
add column if not exists savings_goal numeric(12,2) not null default 0,
add column if not exists extra_debt_payment numeric(12,2) not null default 0,
add column if not exists emergency_fund numeric(12,2) not null default 0,
add column if not exists budget_mode text not null default 'balanceado';

update public.monthly_targets
set
  free_spending_limit = coalesce(nullif(free_spending_limit, 0), personal_budget_target, 0),
  extra_debt_payment = coalesce(nullif(extra_debt_payment, 0), debt_payment_target, 0),
  emergency_fund = coalesce(nullif(emergency_fund, 0), reserve_target, 0),
  budget_mode = coalesce(budget_mode, 'balanceado');

notify pgrst, 'reload schema';
