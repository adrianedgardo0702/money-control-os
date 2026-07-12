-- Adds calendar-aware recurrence fields for fixed/recurring expenses.

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS monthly_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
  ADD COLUMN IF NOT EXISTS weekdays TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS month_days INTEGER[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS annual_month INTEGER,
  ADD COLUMN IF NOT EXISTS annual_day INTEGER,
  ADD COLUMN IF NOT EXISTS interval_number INTEGER,
  ADD COLUMN IF NOT EXISTS interval_type TEXT;

UPDATE public.recurring_expenses
SET
  next_due_date = COALESCE(next_due_date, due_date, next_run_date),
  monthly_amount = CASE
    WHEN COALESCE(monthly_amount, 0) > 0 THEN monthly_amount
    WHEN lower(frequency) IN ('semanal', 'weekly') THEN amount * 52 / 12
    WHEN lower(frequency) IN ('quincenal', 'biweekly') THEN amount * 2
    WHEN lower(frequency) IN ('anual', 'annual') THEN amount / 12
    ELSE amount
  END,
  annual_amount = CASE
    WHEN COALESCE(annual_amount, 0) > 0 THEN annual_amount
    WHEN lower(frequency) IN ('semanal', 'weekly') THEN amount * 52
    WHEN lower(frequency) IN ('quincenal', 'biweekly') THEN amount * 24
    WHEN lower(frequency) IN ('anual', 'annual') THEN amount
    ELSE amount * 12
  END,
  recurrence_type = COALESCE(
    recurrence_type,
    CASE
      WHEN lower(frequency) IN ('semanal', 'weekly') THEN 'weekday'
      WHEN lower(frequency) IN ('quincenal', 'biweekly') THEN 'fixed_month_days'
      WHEN lower(frequency) IN ('anual', 'annual') THEN 'annual_date'
      WHEN lower(frequency) IN ('personalizado', 'custom') THEN 'custom_interval'
      ELSE 'month_day'
    END
  )
WHERE user_id IS NOT NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS business_unit_id TEXT,
  ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS recurring_expenses_next_due_date_idx ON public.recurring_expenses (next_due_date);
CREATE INDEX IF NOT EXISTS recurring_expenses_recurrence_type_idx ON public.recurring_expenses (recurrence_type);
CREATE INDEX IF NOT EXISTS transactions_owner_type_idx ON public.transactions (owner_type);
CREATE INDEX IF NOT EXISTS transactions_business_unit_id_idx ON public.transactions (business_unit_id);
CREATE INDEX IF NOT EXISTS transactions_recurring_expense_id_idx ON public.transactions (recurring_expense_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
